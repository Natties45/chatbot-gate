# app2 - Agent Rules

## Context

app2 is the v2.0.0 chatbot-gate app. It reuses the web1 NOC/Operation product flow but replaces opencode-as-bridge with an app-owned free-first LLM router, MCP gateway, prompt registry, case memory, and local fallback.

## Layout

```
apps/app2/
├── gate-answer-app2/       <- app2 role/prompt/policy files
├── src/app/noc/            <- NOC chat page
├── src/app/operation/      <- Operation chat page
├── src/app/api/chat/       <- app2 chat API routes
├── src/lib/ai/             <- LLM router, providers, AI brain
├── src/lib/mcp/            <- MCP gateway and tool policy
└── prisma/                 <- app2 SQLite schema and migrations
```

## Rules

- Do not use opencode as the app2 primary AI path.
- Use Groq Free `qwen/qwen3-32b` as primary and Ollama `qwen3:4b` as fallback.
- Keep NOC and Operation as separate pages, prompt profiles, and role policies.
- Keep MCP tools server-controlled with role/page allowlists.
- Deny destructive Docker/Git/raw shell tools in v2.0.0.
- Store API keys only in environment variables or server-side settings.
- Thai for responses; keep technical terms in English when clearer.
- Customer-facing NOC drafts must not mention internal providers, APIs, CLI, backend, or internal tools.

## Verification

Run from `apps/app2` before closing implementation work:

```bash
npm run prisma:generate
npm run lint
npm run build
```
