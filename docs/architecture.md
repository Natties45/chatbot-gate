# Chatbot Gate — Architecture

> Single source of truth for the Chatbot Gate project.
> Revised 2026-06-27 — replaces all previous docs.

---

## 1. What is opencode?

**opencode** is a free (MIT License) standalone binary from [anomalyco/opencode](https://github.com/anomalyco/opencode). It is **not a cloud API**. There is no `api.opencode.ai/v1/chat/completions` — the old code was wrong.

opencode runs as a **local server** (`opencode serve` / `opencode web`) and exposes an HTTP API on port 4096. Users configure their own LLM provider API keys (DeepSeek, Anthropic, OpenAI, etc.) in opencode's UI. The opencode README at `openstack-image/build/apps/opencode/` describes how to install it on an Ubuntu server.

---

## 2. Architecture

```
Browser (User)
     │
     ▼
Nginx (:80)
     │
     ├── Next.js App (container, :3000)
     │       │
     │       ▼  HTTP calls
     │   opencode serve (host bare-metal or separate container, :4096)
     │       │
     │       ▼  LLM Provider API
     │   DeepSeek / Anthropic / OpenAI / etc.
     │
     └── static assets
```

### Communication flow

1. User opens browser → Nginx → Next.js App
2. User clicks "New Case" → frontend calls `/api/chat/{role}/init` → backend creates opencode session via `POST /session`
3. User sends message → frontend calls `/api/chat/{role}/message` → backend wraps message with the action-specific **prompt template**, sends to opencode via `POST /session/:id/message` with the appropriate **agent** (noc-agent / operation-agent)
4. opencode routes to the configured LLM provider and returns the response
5. Response flows back: opencode → backend → frontend → user sees raw text

---

## 3. Project Structure

```
chatbot-gate/
├── apps/
│   ├── web/              ← OLD (deprecated, auth-driven UI, wrong AI integration)
│   └── web1/             ← NEW (no login, tests core opencode integration)
│       ├── src/
│       │   ├── app/
│       │   │   ├── globals.css
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx          ← redirect → /noc
│       │   │   ├── noc/
│       │   │   │   └── page.tsx      ← NOC Chat
│       │   │   ├── operation/
│       │   │   │   └── page.tsx      ← Operation Chat
│       │   │   └── api/chat/
│       │   │       ├── noc/route.ts
│       │   │       └── operation/route.ts
│       │   ├── components/
│       │   │   ├── ui/Button/
│       │   │   ├── ui/Card/
│       │   │   ├── layout/AppLayout/
│       │   │   ├── layout/Sidebar/
│       │   │   └── ThemeProvider.tsx
│       │   └── lib/
│       │       └── opencode-service.ts
│       ├── package.json
│       ├── tsconfig.json
│       ├── next.config.ts
│       └── .gitignore
├── .opencode/
│   ├── opencode.json             ← project-level opencode config
│   └── gate-answer/              ← git repo แยก, pull มาใน app
│       ├── agents/
│       │   ├── noc-agent.md
│       │   └── operation-agent.md
│       ├── prompts/
│       │   ├── noc-send.md
│       │   ├── noc-feedback.md
│       │   ├── noc-close.md
│       │   └── op-send.md
│       └── templates/
│           └── case-log.md
├── docs/
│   └── architecture.md           ← THIS FILE
├── README.md
├── package.json
└── tsconfig.json
```

---

## 4. .opencode/gate-answer/ — Agent & Prompt Definitions

### 4.1 Agents

Each role (NOC, Operation) has a dedicated agent defined in `.opencode/gate-answer/agents/`. Agents are **markdown files** with YAML frontmatter. opencode reads them and exposes them via `GET /agent`.

Example `noc-agent.md`:
```
---
description: NOC support agent — responds to customer issues with KB-backed answers
mode: primary
model: deepseek/deepseek-chat
temperature: 0.2
permission:
  edit: deny
  bash: deny
  read: allow
---
You are a NOC support agent.
Rules:
1. Search the knowledge base first before answering
2. Do not modify the customer's original message
3. Respond in Thai with formal tone
4. If confidence < 50%, suggest escalation
...
```

### 4.2 Prompt Templates

Each **action** has a corresponding prompt template in `.opencode/gate-answer/prompts/`. These templates wrap the user's message before sending to opencode.

| Action | Template | When |
|--------|----------|------|
| `noc-send` | `noc-send.md` | NOC sends a message for analysis |
| `noc-feedback` | `noc-feedback.md` | NOC marks AI response as incorrect |
| `noc-close` | `noc-close.md` | NOC closes a case (switches to build mode) |
| `op-send` | `op-send.md` | Operation sends a message |

### 4.3 Template Files

When a case is closed, opencode (in build mode) saves a structured case log to `templates/case-log-{date}.md`. A sync script then copies it to the database.

---

## 5. Session Lifecycle

```
User clicks "New Case"
  │
  ▼
POST /api/chat/{role}/init  ──→  opencode POST /session
  │                                 response: { sessionId }
  ▼
Chat interface opens (empty)
  │
  ▼
User types + sends
  │
  ▼
POST /api/chat/{role}/message ──→  load prompt template
  │                                 wrap { message + template }
  │                                 opencode POST /session/:id/message
  │                                   agent: {role}-agent
  │                                   parts: [{ type: 'text', text: wrappedPrompt }]
  │                                 response: { info, parts }
  ▼
Display AI response (raw text)
  │
  ▼
[Close Case]
  │
  ▼
POST /api/chat/{role}/close  ──→  load close prompt template
  │                                 opencode POST /session/:id/message
  │                                 → build mode, saves template file
  ▼
Back to empty state
```

---

## 6. Model Configuration

Models are configured in the **opencode UI** (port 4096). Users register for a free LLM provider (DeepSeek recommended — free tier at `platform.deepseek.com`) and add their API key to opencode. The admin Settings page in the full app will later provide a dropdown populated from `GET /config/providers`.

Notable free/zero-cost options:
- **OpenCode Zen** — free models provided by the opencode team (registration required)
- **DeepSeek** — free trial credits at `platform.deepseek.com`
- **NVIDIA** — free access at `build.nvidia.com` with account

---

## 7. Deployment (Production)

### 7.1 opencode binary (host)

Install opencode on the Ubuntu host via systemd (see `openstack-image/build/apps/opencode/` for the full guide):

```
/usr/local/bin/opencode
/etc/systemd/system/opencode.service
/etc/opencode/environment   ← OPENCODE_SERVER_PASSWORD
```

Service runs `opencode serve --hostname 0.0.0.0 --port 4096` under user `opencode`.

### 7.2 Next.js app (Docker container)

The Next.js container connects to opencode at `http://host.docker.internal:4096` (or `http://172.17.0.1:4096`).

### 7.3 docker-compose.yml

```yaml
services:
  web:
    build: ./apps/web1
    environment:
      - OPENCODE_SERVER_URL=http://host.docker.internal:4096
    ports:
      - "3000:3000"
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - web
```

---

## 8. Key Decisions

| Decision | Reason |
|----------|--------|
| opencode = standalone binary | Not a cloud API; free (MIT), self-hosted |
| Call opencode HTTP API from Next.js | opencode exposes REST API (OpenAPI 3.1 spec) |
| Agent definitions in `.opencode/` | Separates AI prompt logic from app code |
| Prompt templates per action | Different actions need different wrappers |
| No login in web1 MVP | Test core AI integration first; auth comes later |
| `gate-answer/` as separate git repo | Allow independent updates to prompts/agents |
| Raw response display in MVP | Don't try to parse/format — iterate later |
