import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

const ANTHROPIC_API_KEY = (process.env.ANTHROPIC_API_KEY || '').trim();
const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || '').trim();
const GEMINI_MODEL = (process.env.GEMINI_MODEL || 'gemini-2.0-flash').trim();

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

app.use(express.json({ limit: '1mb' }));
app.use(express.static(join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, version: 7, ai: GEMINI_API_KEY ? 'gemini' : 'claude' });
});

const WEEKDAYS_JA = ['日', '月', '火', '水', '木', '金', '土'];

function todayJST() {
  const d = new Date(Date.now() + 9 * 3600 * 1000);
  return {
    iso: d.toISOString().slice(0, 10),
    weekday: WEEKDAYS_JA[d.getUTCDay()],
  };
}

// ===== AI呼び出し（GEMINI_API_KEYがあればGemini、なければClaude） =====

async function callClaude(prompt, maxTokens) {
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });
  return message.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
}

async function callGemini(prompt, maxTokens) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens },
    }),
  });

  if (!r.ok) {
    const body = await r.text().catch(() => '');
    if (r.status === 400 && body.includes('API_KEY_INVALID')) {
      throw new Error('GeminiのAPIキーが正しくありません');
    }
    if (r.status === 429) {
      throw new Error('Geminiの無料枠の上限に達しました。しばらくしてからお試しください');
    }
    throw new Error(`Gemini APIエラー (${r.status})`);
  }

  const data = await r.json();
  const parts = (((data.candidates || [])[0] || {}).content || {}).parts || [];
  return parts.map((p) => p.text || '').join('').trim();
}

function callAI(prompt, maxTokens) {
  return GEMINI_API_KEY ? callGemini(prompt, maxTokens) : callClaude(prompt, maxTokens);
}

function aiErrorMessage(err) {
  let msg = err.message || 'エラーが発生しました';
  if (err.status === 401) {
    msg = 'ClaudeのAPIキーが正しくありません';
  } else if (msg.includes('credit balance')) {
    msg = 'Claude(Anthropic)の残高が不足しています。console.anthropic.com でチャージしてください';
  }
  return msg;
}

// ===== 整理結果のパース・正規化 =====

function normalizeItems(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((it) => {
      if (typeof it === 'string') return { text: it.trim(), due: null, done: false };
      if (it && typeof it === 'object' && it.text) {
        const due = typeof it.due === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(it.due) ? it.due : null;
        return { text: String(it.text).trim(), due, done: it.done === true };
      }
      return null;
    })
    .filter((it) => it && it.text);
}

function parseOrganized(rawText) {
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
  const cats = parsed.categories || {};
  const organized = {
    title: String(parsed.title || '音声メモ').slice(0, 40),
    summary: String(parsed.summary || ''),
    categories: {},
  };
  for (const key of ['tasks', 'shopping', 'ideas', 'reminders', 'notes']) {
    const items = normalizeItems(cats[key]);
    if (items.length > 0) organized.categories[key] = items;
  }
  return organized;
}

const JSON_FORMAT_SPEC = `以下のJSON形式のみで返してください（Markdownコードブロック不要）:
{
  "title": "20文字以内のタイトル",
  "summary": "1〜2文の要約",
  "categories": {
    "tasks": [{"text": "やること", "due": null, "done": false}],
    "shopping": [{"text": "買う物", "due": null, "done": false}],
    "ideas": [{"text": "アイデア", "due": null, "done": false}],
    "reminders": [{"text": "覚えておくこと", "due": null, "done": false}],
    "notes": [{"text": "その他のメモ", "due": null, "done": false}]
  }
}

空のカテゴリは省略してください。JSONのみ返してください。`;

// ===== メモの整理 =====

app.post('/api/organize', async (req, res) => {
  const text = ((req.body && req.body.text) || '').trim();
  if (!text) {
    return res.status(400).json({ error: 'テキストが必要です' });
  }

  const today = todayJST();

  try {
    const rawText = await callAI(
      `以下の音声メモを分析して、内容を整理してください。

今日は ${today.iso}（${today.weekday}曜日）です。

文字起こし:
"""
${text}
"""

ルール:
- 複数人の会話が混ざっている場合は、メモの主（主に話している人）の内容だけを整理し、他人の発言や雑談は無視してください
- 「明日」「金曜までに」などの期限・日付表現があれば、今日の日付を基準に "due" をYYYY-MM-DD形式で入れてください。期限がなければ due は null
- "done" は常に false にしてください

${JSON_FORMAT_SPEC}`,
      1500
    );

    let organized;
    try {
      organized = parseOrganized(rawText);
    } catch {
      organized = {
        title: '音声メモ',
        summary: text.slice(0, 80),
        categories: { notes: [{ text, due: null, done: false }] },
      };
    }

    res.json({ success: true, transcription: text, organized });
  } catch (err) {
    console.error('[ERROR]', err);
    res.status(500).json({ error: aiErrorMessage(err) });
  }
});

// ===== 既存メモへの追記（統合） =====

app.post('/api/append', async (req, res) => {
  const text = ((req.body && req.body.text) || '').trim();
  const existing = (req.body && req.body.organized) || null;
  if (!text || !existing || typeof existing !== 'object') {
    return res.status(400).json({ error: 'データが不足しています' });
  }

  const today = todayJST();

  try {
    const rawText = await callAI(
      `既存の音声メモの整理結果に、追加で話された内容を統合してください。

今日は ${today.iso}（${today.weekday}曜日）です。

既存の整理結果(JSON):
${JSON.stringify(existing).slice(0, 8000)}

追加の発言:
"""
${text}
"""

ルール:
- 既存の項目は内容・期限(due)・完了状態(done)をそのまま維持してください
- 追加の発言の内容を適切なカテゴリに追加してください（新規項目の done は false）
- 重複する内容は1つに統合してください
- 「明日」「金曜までに」などの期限表現は今日を基準に due (YYYY-MM-DD) に変換してください
- title と summary は全体を反映して更新してください

${JSON_FORMAT_SPEC}`,
      1500
    );

    let organized;
    try {
      organized = parseOrganized(rawText);
    } catch {
      organized = JSON.parse(JSON.stringify(existing));
      organized.categories = organized.categories || {};
      (organized.categories.notes = organized.categories.notes || []).push({
        text,
        due: null,
        done: false,
      });
    }

    res.json({ success: true, organized });
  } catch (err) {
    console.error('[ERROR]', err);
    res.status(500).json({ error: aiErrorMessage(err) });
  }
});

// ===== Todoist =====

app.post('/api/todoist', async (req, res) => {
  const token = ((req.body && req.body.token) || '').trim();
  let tasks = (req.body && req.body.tasks) || [];

  if (!token) return res.status(400).json({ error: 'Todoistのトークンが必要です' });
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return res.status(400).json({ error: '追加するタスクがありません' });
  }
  tasks = tasks.slice(0, 20);

  const results = [];
  for (const t of tasks) {
    const content = String((t && t.text) || '').trim().slice(0, 500);
    if (!content) continue;
    const body = { content };
    if (t.due && /^\d{4}-\d{2}-\d{2}$/.test(t.due)) body.due_date = t.due;

    try {
      const r = await fetch('https://api.todoist.com/rest/v2/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (r.status === 401 || r.status === 403) {
        return res.status(401).json({ error: 'Todoistトークンが正しくありません。設定で確認してください' });
      }
      results.push({ text: content, ok: r.ok });
    } catch {
      results.push({ text: content, ok: false });
    }
  }

  res.json({
    success: true,
    added: results.filter((r) => r.ok).length,
    results,
  });
});

// ===== 週間まとめ =====

app.post('/api/weekly', async (req, res) => {
  const memosIn = Array.isArray(req.body && req.body.memos) ? req.body.memos.slice(0, 50) : [];
  if (memosIn.length === 0) {
    return res.status(400).json({ error: 'メモがありません' });
  }

  const catLabels = { tasks: 'タスク', shopping: '買い物', ideas: 'アイデア', reminders: 'リマインダー', notes: 'メモ' };
  let digest = '';
  for (const m of memosIn) {
    digest += `■ ${String(m.date || '')} ${String(m.title || '')}\n`;
    const cats = m.categories || {};
    for (const [key, label] of Object.entries(catLabels)) {
      for (const it of cats[key] || []) {
        const mark = it.done ? '済' : '未';
        const due = it.due ? `（期限:${it.due}）` : '';
        digest += `- [${mark}] ${label}: ${String(it.text || '')}${due}\n`;
      }
    }
  }
  digest = digest.slice(0, 12000);

  const today = todayJST();

  try {
    const summary = await callAI(
      `あなたは私の個人秘書です。以下はこの1週間の音声メモの記録です（[済]=完了、[未]=未完了）。今日は ${today.iso}（${today.weekday}曜日）です。

"""
${digest}
"""

この1週間の振り返りを日本語で作ってください。構成:

今週のハイライト（2〜3行）
完了したこと
残っているタスク（期限が近い順）
買い物の残り
出てきたアイデア
来週へのひとこと（1〜2行、前向きに）

ルール: 該当がない見出しは省略。Markdown記号（#や*）は使わず、見出しと「・」の箇条書きのプレーンテキストで。全体で400字程度に。`,
      800
    );

    res.json({ success: true, summary });
  } catch (err) {
    console.error('[ERROR]', err);
    res.status(500).json({ error: aiErrorMessage(err) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🎙️  声でメモ: http://localhost:${PORT}`);
});

// Render無料プランのスリープ対策: 日本時間7時〜24時は10分ごとに自分にアクセス
// （深夜は寝かせて無料枠の使用時間を節約する）
const SELF_URL = process.env.RENDER_EXTERNAL_URL;
if (SELF_URL) {
  setInterval(() => {
    const jstHour = new Date(Date.now() + 9 * 3600 * 1000).getUTCHours();
    if (jstHour >= 7) {
      fetch(`${SELF_URL}/api/health`).catch(() => {});
    }
  }, 10 * 60 * 1000);
}
