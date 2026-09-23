function json(res, status, body) {
  res.status(status).json(body);
}

function pickWhisper() {
  if (process.env.GROQ_API_KEY) {
    return {
      name: 'groq',
      key: process.env.GROQ_API_KEY,
      url: 'https://api.groq.com/openai/v1/audio/transcriptions',
      model: 'whisper-large-v3',
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      name: 'openai',
      key: process.env.OPENAI_API_KEY,
      url: 'https://api.openai.com/v1/audio/transcriptions',
      model: 'whisper-1',
    };
  }
  return null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  const target = pickWhisper();
  if (!target) {
    return json(res, 503, {
      error:
        'Для голоса нужен GROQ_API_KEY или OPENAI_API_KEY в Environment Variables на Vercel.',
      code: 'NO_API_KEY',
    });
  }

  try {
    const audioBase64 = req.body && req.body.audioBase64 ? String(req.body.audioBase64) : '';
    const mimeType = (req.body && req.body.mimeType) || 'audio/webm';
    const filename = (req.body && req.body.filename) || 'recording.webm';
    if (!audioBase64) {
      return json(res, 400, { error: 'Нужен audioBase64.' });
    }

    const buffer = Buffer.from(audioBase64, 'base64');
    if (!buffer.length) return json(res, 400, { error: 'Пустой аудиофайл.' });
    // ~4.5MB raw limit-ish for serverless comfort
    if (buffer.length > 4.5 * 1024 * 1024) {
      return json(res, 413, { error: 'Аудио слишком большое (лимит ~4.5 МБ).' });
    }

    const form = new FormData();
    const blob = new Blob([buffer], { type: mimeType });
    form.append('file', blob, filename);
    form.append('model', target.model);
    form.append('language', 'ru');
    form.append('response_format', 'json');

    const upstream = await fetch(target.url, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + target.key },
      body: form,
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return json(res, upstream.status, {
        error: data.error?.message || 'Whisper error',
      });
    }
    const text = (data.text || '').trim();
    if (!text) return json(res, 502, { error: 'Пустой результат распознавания' });
    return json(res, 200, { text, provider: target.name });
  } catch (e) {
    return json(res, 502, { error: e.message || 'Transcribe failed' });
  }
};
