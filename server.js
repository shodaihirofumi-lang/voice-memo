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
const GROQ_API_KEY = (process.env.GROQ_API_KEY || '').trim();

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

app.use(express.json({ limit: '20mb' }));
app.use(express.static(join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, version: 9, ai: GEMINI_API_KEY ? 'gemini' : 'claude' });
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

// Gemini優先、失敗時はClaudeに自動フォールバック
async function callAI(prompt, maxTokens) {
  if (GEMINI_API_KEY) {
    try {
      const text = await callGemini(prompt, maxTokens);
      return { text, ai: 'gemini' };
    } catch (err) {
      if (!ANTHROPIC_API_KEY) throw err;
      console.warn('[Gemini失敗→Claudeに切替]', err.message);
    }
  }
  const text = await callClaude(prompt, maxTokens);
  return { text, ai: 'claude' };
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
      if (typeof it === 'string') return { text: it.trim(), due: null, done: false, priority: null };
      if (it && typeof it === 'object' && it.text) {
        const due = typeof it.due === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(it.due) ? it.due : null;
        const priority = ['high', 'medium'].includes(it.priority) ? it.priority : null;
        return { text: String(it.text).trim(), due, done: it.done === true, priority };
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
    "tasks": [{"text": "やること", "due": null, "done": false, "priority": "high"}],
    "shopping": [{"text": "買う物", "due": null, "done": false, "priority": null}],
    "ideas": [{"text": "アイデア", "due": null, "done": false, "priority": null}],
    "reminders": [{"text": "覚えておくこと", "due": null, "done": false, "priority": "medium"}],
    "notes": [{"text": "その他のメモ", "due": null, "done": false, "priority": null}]
  }
}

- priorityはtasks・remindersのみ設定: "high"=今日中・緊急、"medium"=近いうちに、null=特に急がない
- 空のカテゴリは省略。JSONのみ返してください。`;

// ===== 音声文字起こし（Gemini）=====

app.post('/api/transcribe', async (req, res) => {
  const { audio, mimeType } = req.body || {};
  if (!audio) return res.status(400).json({ error: '音声データがありません' });

  const audioBuffer = Buffer.from(audio, 'base64');
  const ext = (mimeType || 'audio/webm').includes('mp4') ? 'mp4'
    : (mimeType || '').includes('ogg') ? 'ogg' : 'webm';

  // Groq Whisper（GROQ_API_KEYがあれば優先）
  if (GROQ_API_KEY) {
    try {
      const form = new FormData();
      form.append('file', new Blob([audioBuffer], { type: mimeType || 'audio/webm' }), `rec.${ext}`);
      form.append('model', 'whisper-large-v3');
      form.append('language', 'ja');
      form.append('response_format', 'json');

      const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
        body: form,
      });

      if (!r.ok) {
        const body = await r.text().catch(() => '');
        throw new Error(`Groq APIエラー (${r.status}): ${body.slice(0, 120)}`);
      }

      const data = await r.json();
      return res.json({ text: (data.text || '').trim(), stt: 'groq' });
    } catch (err) {
      console.error('[GROQ STT ERROR]', err.message);
      if (!GEMINI_API_KEY) return res.status(500).json({ error: err.message });
      console.warn('[Groq失敗→Geminiにフォールバック]');
    }
  }

  // Gemini（フォールバック）
  if (!GEMINI_API_KEY) return res.status(503).json({ error: 'GROQ_API_KEYまたはGEMINI_API_KEYを設定してください' });

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [
          { inlineData: { mimeType: mimeType || 'audio/webm', data: audio } },
          { text: 'この音声を文字起こしして、話された内容を日本語でそのままテキストにしてください。文字起こし以外は不要です。' },
        ]}],
        generationConfig: { maxOutputTokens: 2000 },
      }),
    });

    if (!r.ok) {
      const body = await r.text().catch(() => '');
      if (r.status === 429) throw new Error('QUOTA');
      throw new Error(`Gemini APIエラー (${r.status}): ${body.slice(0, 120)}`);
    }

    const data = await r.json();
    const parts = (((data.candidates || [])[0] || {}).content || {}).parts || [];
    const text = parts.map((p) => p.text || '').join('').trim();
    res.json({ text, stt: 'gemini' });
  } catch (err) {
    console.error('[GEMINI STT ERROR]', err);
    const msg = err.message === 'QUOTA'
      ? '文字起こしAI(Gemini)の無料枠が上限に達しました。Groqの無料APIキーをRenderに設定すると安定します（Groqは音声の無料枠が大きい）。'
      : err.message;
    res.status(500).json({ error: msg });
  }
});

// ===== メモの整理 =====

app.post('/api/organize', async (req, res) => {
  const text = ((req.body && req.body.text) || '').trim();
  if (!text) {
    return res.status(400).json({ error: 'テキストが必要です' });
  }

  const today = todayJST();

  try {
    const { text: rawText, ai } = await callAI(
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

    res.json({ success: true, transcription: text, organized, ai });
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
    const { text: rawText, ai } = await callAI(
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

    res.json({ success: true, organized, ai });
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
      const r = await fetch('https://api.todoist.com/api/v1/tasks', {
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
      if (!r.ok) {
        console.warn('[Todoist]', r.status, await r.text().catch(() => ''));
      }
      results.push({ text: content, ok: r.ok });
    } catch (e) {
      console.warn('[Todoist]', e.message);
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
    const { text: summary, ai } = await callAI(
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

    res.json({ success: true, summary, ai });
  } catch (err) {
    console.error('[ERROR]', err);
    res.status(500).json({ error: aiErrorMessage(err) });
  }
});

// ===== AI会話モード =====

app.post('/api/chat', async (req, res) => {
  const question = ((req.body && req.body.question) || '').trim();
  const memosIn = Array.isArray(req.body && req.body.memos) ? req.body.memos.slice(0, 30) : [];

  if (!question) return res.status(400).json({ error: '質問を入力してください' });

  const catLabels = { tasks: 'タスク', shopping: '買い物', ideas: 'アイデア', reminders: 'リマインダー', notes: 'メモ' };
  let context = '';
  for (const m of memosIn) {
    context += `■ ${m.date} ${m.title}\n`;
    for (const [key, label] of Object.entries(catLabels)) {
      for (const it of (m.categories && m.categories[key]) || []) {
        const mark = it.done ? '済' : '未';
        context += `- [${mark}] ${label}: ${it.text}${it.due ? `（期限:${it.due}）` : ''}\n`;
      }
    }
  }

  const today = todayJST();

  try {
    const { text: answer } = await callAI(
      `あなたは私のパーソナルアシスタントです。以下は私の音声メモの記録です。今日は${today.iso}（${today.weekday}曜日）です。

メモ一覧:
"""
${context || '（メモなし）'}
"""

質問: ${question}

メモの内容を参照して、簡潔に日本語で答えてください。メモに関係ない内容は答えないでください。`,
      500
    );
    res.json({ answer });
  } catch (err) {
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
