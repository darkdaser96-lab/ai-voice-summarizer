module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const providers = {
    groq: Boolean(process.env.GROQ_API_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
  };
  const ok = providers.groq || providers.openai || providers.anthropic;
  const whisper = providers.groq || providers.openai;

  const preferredEnv = (process.env.DEFAULT_PROVIDER || '').toLowerCase();
  let preferred = null;
  if (preferredEnv && providers[preferredEnv]) preferred = preferredEnv;
  else if (providers.groq) preferred = 'groq';
  else if (providers.openai) preferred = 'openai';
  else if (providers.anthropic) preferred = 'anthropic';

  res.status(200).json({
    ok,
    providers,
    whisper,
    preferred,
    message: ok
      ? null
      : 'Ключ не настроен. Добавь GROQ_API_KEY, OPENAI_API_KEY или ANTHROPIC_API_KEY в Environment Variables на Vercel и сделай Redeploy. Без ключа сокращение и голос недоступны.',
  });
};
