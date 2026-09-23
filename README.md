# AI Summarizer

Веб-приложение для Vercel: текст или голос → краткое резюме.

**API-ключ не хранится в коде и не вводится в браузере.**  
Ключ берётся только из переменных окружения на сервере (`GROQ_API_KEY` / `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`).

## Что будет без ключа

- Сайт откроется, UI доступен.
- Вверху будет предупреждение, что ключ не настроен.
- Кнопки «Сократить» и «Распознать» отключены / вернут ошибку `503`.
- `/api/health` ответит `{ "ok": false, ... }` с текстом, какую переменную добавить.

Пока не задашь хотя бы одну переменную и не сделаешь Redeploy, саммари и голос работать не будут.

## Деплой на Vercel

1. Залей этот репозиторий на GitHub (уже лежит в `darkdaser96-lab/ai-voice-summarizer`).
2. На [vercel.com](https://vercel.com) → **Add New Project** → Import репозиторий.
3. Framework Preset: **Other** (статика + serverless `/api`).
4. В **Settings → Environment Variables** добавь хотя бы один ключ:

| Переменная | Для чего |
|---|---|
| `GROQ_API_KEY` | Саммари + Whisper (бесплатный тариф Groq) |
| `OPENAI_API_KEY` | Саммари + Whisper |
| `ANTHROPIC_API_KEY` | Только саммари (без голоса) |
| `DEFAULT_PROVIDER` | Необязательно: `groq` / `openai` / `anthropic` |

5. Deploy. После смены env нажми **Redeploy**.

Локально для проверки env можно создать `.env.local` (файл в `.gitignore`) и запускать через `vercel dev`.

## Как пользоваться

1. Открой задеплоенный URL.
2. Вставь текст **или** запиши/загрузи аудио → «Распознать».
3. Нажми «Сократить».

## API

- `GET /api/health` — какие провайдеры настроены (без раскрытия ключей).
- `POST /api/summarize` — `{ "text": "...", "provider": "groq" }` → `{ "summary": "..." }`.
- `POST /api/transcribe` — `{ "audioBase64": "...", "mimeType": "audio/webm" }` → `{ "text": "..." }`.

## Стек

- Статический `index.html` + Vercel Serverless Functions в `/api`.
- Ключи только в `process.env` на сервере.
