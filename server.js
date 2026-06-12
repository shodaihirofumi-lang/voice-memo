import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

const ANTHROPIC_API_KEY = (process.env.ANTHROPIC_API_KEY || '').trim();
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

app.use(express.json({ limit: '1mb' }));
app.use(express.static(join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, version: 3 });
});

app.post('/api/organize', async (req, res) => {
  const text = ((req.body && req.body.text) || '').trim();
  if (!text) {
    return res.status(400).json({ error: 'テキストが必要です' });
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      thinking: { type: 'adaptive' },
      messages: [
        {
          role: 'user',
          content: `以下の音声メモを分析して、内容を整理してください。

文字起こし:
"""
${text}
"""

以下のJSON形式のみで返してください（Markdownコードブロック不要）:
{
  "title": "20文字以内のタイトル",
  "summary": "1〜2文の要約",
  "categories": {
    "tasks": ["やること・タスク"],
    "shopping": ["買い物リスト"],
    "ideas": ["アイデア・発想"],
    "reminders": ["覚えておくこと"],
    "notes": ["その他のメモ"]
  }
}

空のカテゴリは省略してください。JSONのみ返してください。`,
        },
      ],
    });

    const rawText = message.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();

    let organized;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      organized = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
    } catch {
      organized = {
        title: '音声メモ',
        summary: text.slice(0, 80),
        categories: { notes: [text] },
      };
    }

    res.json({ success: true, transcription: text, organized });
  } catch (err) {
    console.error('[ERROR]', err);
    let msg = err.message || 'エラーが発生しました';
    if (err.status === 401) {
      msg = 'ClaudeのAPIキーが正しくありません';
    } else if (msg.includes('credit balance')) {
      msg = 'Claude(Anthropic)の残高が不足しています。console.anthropic.com でチャージしてください';
    }
    res.status(500).json({ error: msg });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🎙️  声でメモ: http://localhost:${PORT}`);
});
