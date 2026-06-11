import express from 'express';
import multer from 'multer';
import Anthropic from '@anthropic-ai/sdk';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || '').trim();
const ANTHROPIC_API_KEY = (process.env.ANTHROPIC_API_KEY || '').trim();

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

app.use(express.static(join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, version: 2 });
});

async function transcribe(buffer, mimeType) {
  const ext = getExt(mimeType);
  const formData = new FormData();
  formData.append('file', new Blob([buffer], { type: mimeType }), `audio.${ext}`);
  formData.append('model', 'whisper-1');
  formData.append('language', 'ja');

  const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: formData,
  });

  if (!r.ok) {
    const body = await r.text().catch(() => '');
    if (r.status === 401) throw new Error('OpenAIのAPIキーが正しくありません');
    throw new Error(`文字起こしに失敗しました (${r.status}): ${body.slice(0, 200)}`);
  }

  const data = await r.json();
  return (data.text || '').trim();
}

app.post('/api/process', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '音声ファイルが必要です' });
  }

  try {
    // Step 1: Whisper で文字起こし
    const mimeType = req.file.mimetype || 'audio/webm';
    const transcription = await transcribe(req.file.buffer, mimeType);

    if (!transcription) {
      return res.json({ success: true, transcription: '', organized: null });
    }

    // Step 2: Claude で内容を整理
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
${transcription}
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
        summary: transcription.slice(0, 80),
        categories: { notes: [transcription] },
      };
    }

    res.json({ success: true, transcription, organized });
  } catch (err) {
    console.error('[ERROR]', err);
    let msg = err.message;
    if (err.status === 401) msg = 'ClaudeのAPIキーが正しくありません';
    res.status(500).json({ error: msg });
  }
});

function getExt(mimetype) {
  const base = mimetype.split(';')[0].trim();
  const map = {
    'audio/webm': 'webm',
    'video/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/mp4': 'm4a',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
  };
  return map[base] || 'webm';
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🎙️  声でメモ: http://localhost:${PORT}`);
});
