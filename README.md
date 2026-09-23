# Краткое содержание

Голос в браузере (Web Speech API). Сокращение — серверная функция Vercel `/api/summarize` через Groq. Ключ только в env (`GROQ_API_KEY`), в HTML и Git его нет. Если ключа нет или Groq недоступен — локальный extractive JS в браузере.

**Сайт:** https://ai-voice-summarizer.vercel.app

## Переменные окружения (Vercel)

| Имя | Нужна |
|---|---|
| `GROQ_API_KEY` | Да, для серверного сокращения |

Модели: `qwen/qwen3.8-27b`, при 404 — `openai/gpt-oss-20b`.

## Деплой

1. Import репозиторий `darkdaser96-lab/ai-voice-summarizer`.
2. Добавь `GROQ_API_KEY` в Project → Settings → Environment Variables (Production).
3. Deploy.

## Как пользоваться

1. Открой сайт.
2. Вставь текст или нажми **Диктовать**.
3. Выбери краткость и нажми **Сократить**.
