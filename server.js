import express from 'express';
import multer from 'multer';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI, { toFile } from 'openai';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.use(express.static(join(__dirname, 'public')));

app.post('/api/process', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '音声ファイルが必要です' });
  }

  try {
    // Step 1: Whisper で文字起こし
    const mimeType = req.file.mimetype || 'audio/webm';
    const ext = getExt(mimeType);
    const audioFile = await toFile(
      new Blob([req.file.buffer], { type: mimeType }),
      `audio.${ext}`,
      { type: mimeType }
    );

    const transcriptionRes = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'ja',
    });

    const transcription = transcriptionRes.text.trim();

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
    res.status(500).json({ error: err.message });
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
