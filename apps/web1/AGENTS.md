# web1 — Agent Rules

## Context

web1 is the active chatbot-gate app: a Next.js (App Router) UI that calls opencode's local HTTP API for AI-powered NOC/Operation chat.

## Layout

```
apps/web1/
├── gate-answer/            ← Agent/prompt definitions (source of truth)
│   ├── agents/             ← noc-agent, noc-closer, operation-agent
│   ├── prompts/            ← Action-specific prompt templates
│   └── templates/          ← Case log templates
├── src/
│   ├── app/
│   │   ├── page.tsx        → redirect to /noc
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   ├── noc/            ← NOC Chat page
│   │   ├── operation/      ← Operation Chat page
│   │   └── api/chat/       ← API routes (noc, operation)
│   ├── components/
│   │   ├── ThemeProvider.tsx
│   │   ├── layout/         ← AppLayout, Sidebar
│   │   └── ui/             ← Button, Card, Badge, Input, Table
│   └── lib/
│       ├── opencode-service.ts
│       └── case-store.ts
├── opencode.json           ← App runtime agent config (noc, operation)
├── package.json
├── Dockerfile
└── gate-answer/
```

## Rules

- `gate-answer/agents/*.md` — Agent system prompts (YAML frontmatter)
- `gate-answer/prompts/*.md` — Prompt templates (use `{{VARIABLE}}` interpolation)
- `gate-answer/templates/*.md` — Structured case log templates
- `src/` — Next.js App Router, Node.js runtime (not Edge)
- Do NOT use `api.opencode.ai` — opencode is a local binary
- Thai for responses, English for technical terms
- Run `npm run lint` and `npm run build` before closing a task

## Version

- `package.json` — single source of truth for current version
- Plans in `docs/versions/<semver>/plan.md`
