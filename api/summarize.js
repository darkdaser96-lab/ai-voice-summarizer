const SYSTEM =
  'Ты — ассистент по сокращению текстов. Дай краткое, чёткое резюме на русском языке: 3–5 пунктов, главное сначала.';

function json(res, status, body) {
  res.status(status).json(body);
}

function pickProvider(requested) {
  const available = {
    groq: process.env.GROQ_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
  };
  const order = [];
  if (requested && available[requested]) order.push(requested);
  const preferred = process.env.DEFAULT_PROVIDER;
  if (preferred && available[preferred] && !order.includes(preferred)) order.push(preferred);
  for (const name of ['groq', 'openai', 'anthropic']) {
    if (available[name] && !order.includes(name)) order.push(name);
  }
  if (!order.length) return null;
  const name = order[0];
  return { name, key: available[name] };
}

async function summarizeOpenAICompatible({ key, url, model, text }) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + key,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: text },
      ],
      temperature: 0.3,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error?.message || 'Summarize API error');
    err.status = res.status;
    throw err;
  }
  return data.choices[0].message.content;
}

async function summarizeAnthropic({ key, text }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 500,
      system: SYSTEM,
      messages: [{ role: 'user', content: text }],
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error?.message || 'Anthropic error');
    err.status = res.status;
    throw err;
  }
  return data.content[0].text;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  const text = (req.body && req.body.text ? String(req.body.text) : '').trim();
  const requested = req.body && req.body.provider ? String(req.body.provider) : null;
  if (!text) return json(res, 400, { error: 'Нужен текст для сокращения.' });

  const picked = pickProvider(requested);
  if (!picked) {
    return json(res, 503, {
      error:
        'Ключ не настроен. Добавь GROQ_API_KEY, OPENAI_API_KEY или ANTHROPIC_API_KEY в Environment Variables на Vercel и сделай Redeploy.',
      code: 'NO_API_KEY',
    });
  }

  try {
    let summary;
    if (picked.name === 'groq') {
      summary = await summarizeOpenAICompatible({
        key: picked.key,
        url: 'https://api.groq.com/openai/v1/chat/completions',
        model: 'llama-3.3-70b-versatile',
        text,
      });
    } else if (picked.name === 'openai') {
      summary = await summarizeOpenAICompatible({
        key: picked.key,
        url: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-4o-mini',
        text,
      });
    } else {
      summary = await summarizeAnthropic({ key: picked.key, text });
    }
    return json(res, 200, { summary, provider: picked.name });
  } catch (e) {
    return json(res, e.status || 502, { error: e.message || 'Summarize failed' });
  }
};
