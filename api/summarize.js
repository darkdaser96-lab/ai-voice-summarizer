/**
 * POST /api/summarize
 * Body: { text: string, ratio?: number }
 * Uses GROQ_API_KEY from env. Never expose the key to the client.
 */
const PRIMARY = "qwen/qwen3.8-27b";
const FALLBACK = "openai/gpt-oss-20b";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MAX_CHARS = 100000;

function ratioHint(ratio) {
  if (ratio <= 0.35) return "короткое (~30% исходного объёма)";
  if (ratio <= 0.5) return "среднее (~45% исходного объёма)";
  return "более подробное (~60% исходного объёма)";
}

async function callGroq(apiKey, model, text, ratio) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "Ты сокращаешь текст. Ответь только кратким содержанием на том же языке, что и исходный текст. Без вступлений, заголовков и пояснений. Длина: " +
            ratioHint(ratio) +
            ". Сохрани ключевые факты и смысл.",
        },
        { role: "user", content: text },
      ],
    }),
  });
  return res;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: "no_key",
      message: "GROQ_API_KEY is not set",
    });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  if (!body || typeof body !== "object") body = {};

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const ratio = Number(body.ratio);
  const safeRatio = Number.isFinite(ratio) && ratio > 0 && ratio <= 1 ? ratio : 0.45;

  if (!text) {
    return res.status(400).json({ error: "empty_text" });
  }

  const clipped = text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) : text;
  const models = [PRIMARY, FALLBACK];
  let lastMessage = "groq_failed";

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    try {
      const groqRes = await callGroq(apiKey, model, clipped, safeRatio);
      if (groqRes.status === 404) {
        lastMessage = "model_not_found:" + model;
        continue;
      }
      if (!groqRes.ok) {
        const errBody = await groqRes.text();
        lastMessage = "http_" + groqRes.status + ":" + errBody.slice(0, 300);
        return res.status(502).json({
          error: "groq_failed",
          message: lastMessage,
          model,
        });
      }
      const data = await groqRes.json();
      const summary =
        (data.choices &&
          data.choices[0] &&
          data.choices[0].message &&
          data.choices[0].message.content &&
          String(data.choices[0].message.content).trim()) ||
        "";
      if (!summary) {
        return res.status(502).json({
          error: "groq_failed",
          message: "empty_summary",
          model,
        });
      }
      return res.status(200).json({
        summary,
        model,
        source: "groq",
      });
    } catch (err) {
      lastMessage = String((err && err.message) || err);
      return res.status(502).json({
        error: "groq_failed",
        message: lastMessage,
        model,
      });
    }
  }

  return res.status(502).json({
    error: "groq_failed",
    message: lastMessage,
  });
};
