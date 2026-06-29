# Chatbot Gate — Architecture

> Single source of truth for the Chatbot Gate project.
> Revised 2026-06-28 — replaces all previous docs.

---

## 1. What is opencode?

**opencode** is a free (MIT License) standalone binary from [anomalyco/opencode](https://github.com/anomalyco/opencode). It runs as a **local server** (`opencode serve`) and exposes an HTTP API on port 4096. Users configure their own LLM provider API keys (DeepSeek, Anthropic, OpenAI, etc.) in opencode's UI.

**IMPORTANT:** opencode is NOT a cloud API. There is no `api.opencode.ai/v1/chat/completions` — the old `apps/web` code was wrong.

---

## 2. Architecture

### Production

```
Browser (User)
     │
     ▼
Nginx (:80)                  ← reverse proxy, 300s timeout
     │
     ├── web1 (container, :3000)         ← apps/web1 (Next.js)
     │       │
     │       ▼  HTTP REST (Docker network)
     │   opencode (container, :4096)     ← opencode serve
     │       │
     │       ├── Built-in free models (opencode.ai/zen)
     │       ├── MCP → playwright-mcp:8931/sse
     │       └── MCP → docker-mcp:1234/sse
     │
     ├── playwright-mcp (container, :8931)  ← browser automation
     └── docker-mcp (container, :1234)      ← Docker management

Host-level resources:
  /root/openstack-support/     ← Knowledge Base (mounted read-only into opencode)
```

### Development (Windows Docker Desktop)

```
Browser (User)
     │
     ▼
Next.js App (container, :4568)    ← hot reload, gate-answer mounted as volume
     │
     ├──  HTTP REST
     │   opencode serve (host, :4096)    ← runs on Windows host
     │
     ├── MCP Playwright (container, :8931)    ← browser testing
     │
     └── MCP Docker (container, :1234)       ← Docker management
           │
           └── Docker socket (mounted) → Docker Desktop
```

### Communication flow

1. User opens browser → Nginx (prod) or direct (dev) → Next.js App
2. User clicks "New Case" → frontend calls `/api/chat/{role}/init` → backend creates opencode session via `POST /session`
3. User sends message → frontend calls `/api/chat/{role}/message` → backend loads the **prompt template** for the action, interpolates `{{MESSAGE}}`, sends to opencode via `POST /session/:id/message` with the matching **agent**
4. opencode routes to the configured LLM provider, returns response
5. Response flows back: opencode → backend → frontend → raw text display

### Data flow details

```
Frontend (apps/web1/src/app/noc/page.tsx)
  │
  ▼  fetch POST /api/chat/noc
  │
  ▼
API Route (apps/web1/src/app/api/chat/noc/route.ts)
  │
  ├── 1. Load prompt file from apps/web1/gate-answer/prompts/noc-{promptType}.md
  ├── 2. Interpolate {{MESSAGE}}, {{FEEDBACK}}, {{SESSION_ID}}
  ├── 3. Optionally prepend session history
  └── 4. Call opencodeService.sendSystemMessage(sessionId, agent, systemPrompt, userText)
        │
        ▼  HTTP POST http://host.docker.internal:4096/session/{id}/message
        │
        ▼
      Opencode binary
        │
        ├── Routes to configured agent (noc-agent / operation-agent / noc-closer)
        ├── Appends system prompt from apps/web1/gate-answer/agents/*.md
        └── Calls LLM provider
```

---

## 3. Project Structure

```
chatbot-gate/
├── AGENTS.md                           ← Central project governance rules
├── README.md
├── package.json                        ← npm workspaces (apps/*, packages/*)
├── tsconfig.json
│
├── agents/                             ← Project governance agents
│   ├── vivi-researcher.md
│   ├── cid-architect.md
│   ├── zidane-builder.md
│   └── steiner-deployer.md
│
├── skills/
│   └── docker-deploy/SKILL.md          ← Deployment skill (used by steiner-deployer)
│
├── apps/
│   └── web1/                           ← ACTIVE app (MVP, no login, localStorage)
│       ├── AGENTS.md                   ← App-specific agent rules
│       ├── opencode.json               ← Runtime agent config (noc, operation)
│       ├── gate-answer/                ← Agent & prompt definitions
│       │   ├── agents/                 ← System prompts (YAML frontmatter)
│       │   │   ├── noc-agent.md
│       │   │   ├── noc-closer.md
│       │   │   └── operation-agent.md
│       │   ├── prompts/                ← Action-specific prompt templates
│       │   │   ├── noc-analyze.md
│       │   │   ├── noc-chat.md
│       │   │   ├── noc-close.md
│       │   │   ├── noc-draft.md
│       │   │   ├── noc-draft-feedback.md
│       │   │   ├── noc-email.md
│       │   │   ├── noc-escalate.md
│       │   │   ├── noc-feedback.md
│       │   │   └── op-send.md
│       │   └── templates/              ← Case log templates
│       │       ├── case-log.md
│       │       └── op-case-log.md
│       ├── src/
│       │   ├── app/
│       │   │   ├── page.tsx            → redirect to /noc
│       │   │   ├── globals.css
│       │   │   ├── layout.tsx
│       │   │   ├── noc/page.tsx        ← NOC Chat (hybrid state machine)
│       │   │   ├── operation/page.tsx  ← Operation Chat
│       │   │   └── api/chat/
│       │   │       ├── noc/route.ts
│       │   │       └── operation/route.ts
│       │   ├── components/
│       │   │   ├── ThemeProvider.tsx
│       │   │   ├── layout/AppLayout/
│       │   │   ├── layout/Sidebar/
│       │   │   └── ui/{Button,Card,Badge,Input,Table}/
│       │   └── lib/
│       │       ├── opencode-service.ts ← HTTP client for opencode API
│       │       └── case-store.ts        ← localStorage persistence
│       ├── Dockerfile                  ← Next.js build
│       ├── .env.example
│       ├── .env.production.example
│       └── package.json
│
├── docs/
│   ├── overview.md                     ★ Current app state (latest version)
│   ├── architecture.md                 ← THIS FILE
│   ├── server-inventory.md             ← Production server details
│   ├── deployment-checklist.md         ← Deploy steps + troubleshooting
│   ├── changelog.md                    ← Development log
│   ├── source-of-truth.md
│   ├── adr/                            ← Architecture Decision Records
│   │   ├── ADR-0001-opencode-as-bridge.md
│   │   ├── ADR-0002-web1-mvp-no-auth.md
│   │   └── ADR-0003-playwright-mcp-testing.md
│   └── versions/                       ← Version planning + mockups
│       ├── 1.0.0/
│       │   ├── plan.md
│       │   └── mockup.html
│       └── 1.10/
│           ├── plan.md
│           └── mockup.html
│
├── mcp/                                ← MCP tool catalog + profiles
│   ├── catalog/
│   │   ├── playwright.md
│   │   └── docker.md
│   ├── profiles/
│   │   └── dev-test.md
│   └── docker-server/                  ← Custom Docker MCP server
│       ├── package.json
│       └── server.mjs
│
├── packages/
│   └── shared/                         ← Shared types (minimal)
│
├── docker-compose.yml                  ← Production (Linux)
├── docker-compose.dev.yml              ← Development (Windows Docker Desktop)
├── Dockerfile.opencode                 ← opencode container
├── Dockerfile.mcp                      ← Playwright MCP container
├── Dockerfile.docker-mcp               ← Docker MCP server
├── nginx.conf                          ← Reverse proxy config
└── tests/
    └── web1-smoke.spec.ts              ← Basic Playwright test
```

---

## 4. gate-answer/ — Agent & Prompt Definitions (apps/web1/gate-answer/)

### 4.1 Agents

Each role (NOC, Operation) has a dedicated agent in `apps/web1/gate-answer/agents/`. Agents are **markdown files with YAML frontmatter**.

| Agent | Role | Temperature | Permissions |
|-------|------|-------------|-------------|
| `noc-agent` | NOC support — analyzes customer issues, drafts Thai responses | 0.2 | read=allow (KB paths), edit=deny, bash=deny |
| `noc-closer` | Case closer — saves structured case logs (build mode) | 0.1 | edit=allow, read=templates |
| `operation-agent` | Operations engineer — log analysis, root cause, actions | 0.2 | read=allow, edit=deny, bash=deny |

### 4.2 Prompt Templates

Each **action** has a corresponding prompt template in `apps/web1/gate-answer/prompts/`. Templates wrap user messages before sending to opencode.

#### NOC Prompts

| promptType | Template | Agent | Trigger | Output |
|------------|----------|-------|---------|--------|
| `analyze` | `noc-analyze.md` | noc-agent | First message in session | Category, Confidence, Summary, Sources, Response draft |
| `chat` | `noc-chat.md` | noc-agent | Subsequent messages | Conversational Thai response |
| `draft` | `noc-draft.md` | noc-agent | Quick bar "Draft Response" | Formal Thai response draft |
| `draft-feedback` | `noc-draft-feedback.md` | noc-agent | Revise draft with feedback | Revised draft only |
| `feedback` | `noc-feedback.md` | noc-agent | Re-analyze with additional info | Updated analysis |
| `email` | `noc-email.md` | noc-agent | Generate NOC handoff | Handoff template |
| `escalate` | `noc-escalate.md` | noc-agent | Escalate to senior NOC | Escalation summary |
| `close` | `noc-close.md` | noc-closer | Close case | Case log file |

#### Operation Prompts

| promptType | Template | Agent | Trigger | Output |
|------------|----------|-------|---------|--------|
| `send` | `op-send.md` | operation-agent | Any message | Issue, Cause, Actions, References |

### 4.3 Template Files

When a case is closed, the closer agent saves a structured case log:

- NOC: `cases/noc-{DATE}-{SESSION_ID}.md` (from `templates/case-log.md`)
- Operation: `cases/op-{DATE}-{SESSION_ID}.md` (from `templates/op-case-log.md`)

---

## 5. Session Lifecycle

### NOC Chat

```
[Idle]                                    ← History panel + empty state
  │
  ├── Create New Case → POST /api/chat/noc/init → opencode POST /session
  │                                                        → { sessionId }
  ▼
[Chat: State 1 — not analyzed]            ← No messages yet
  │
  ├── Send first message → promptType=analyze → POST message → AI analysis
  ▼
[Chat: State 2 — analyzed]                ← Analysis displayed, Draft enabled
  │
  ├── Send more messages → promptType=chat (freeform)
  ├── Draft Response → promptType=draft → POST message → Draft card
  │     │
  │     ▼
  │   [Chat: State 3 — drafted]          ← Draft displayed, Copy/Use enabled
  │     │
  │     ├── Use this draft → confirm → Close Case
  │     └── Revise → promptType=draft-feedback → new draft
  │
  ├── Close Case (header button) → confirm → promptType=close
  │     → noc-closer saves case log → goHome
  │
  └── Server offline → [Offline] state → Retry
```

### Operation Chat

```
[Idle]
  │
  ├── Create New Case → POST /api/chat/operation/init → { sessionId }
  ▼
[Chat]                                    ← prefix history if resuming
  │
  ├── Send message → load op-send.md → POST message → structured response
  │   (Issue / Likely Cause / Actions / References)
  │
  ├── File attach → FileReader → chip → content included in message
  ├── Draft Response → quick bar → generate report
  └── Close Case → confirm → noc-closer saves op case log → goHome
```

### Resume Session

Since opencode has no `GET /session/:id/messages` API, message history is stored in localStorage (`messageStore`). On resume:
1. Load messages from `localStorage` for the session ID
2. Create a new opencode session (old session may be expired)
3. Prepend history in the first system prompt as `Previous conversation:\n...`

---

## 6. Prompt Template Variables

| Variable | Source | Used In |
|----------|--------|---------|
| `{{MESSAGE}}` | User input text | All prompts |
| `{{FEEDBACK}}` | NOC feedback/additional info | noc-feedback.md, noc-draft-feedback.md |
| `{{SESSION_ID}}` | Current opencode session ID | noc-close.md |
| `{{CUSTOMER_MESSAGE}}` | Original customer message | noc-analyze.md |

---

## 7. Model Configuration

opencode uses **built-in free models** via `opencode.ai/zen/v1`. No API key required.

### Available Free Models

| Model | Context | Notes |
|-------|---------|-------|
| `big-pickle` | 200K | **Default** — used by noc-agent, operation-agent |
| `mimo-v2.5-free` | 200K | Multimodal (image/audio/video) |
| `nemotron-3-ultra-free` | 1M | Largest context |
| `deepseek-v4-flash-free` | 200K | Reasoning-focused |
| `north-mini-code-free` | 256K | Code-focused |

### Known Issues

- `opencode.ai/zen/v1` may return 500 errors intermittently
- When free API is down, AI calls hang until timeout (120s)
- Fallback options: configure paid API key (OpenAI, Anthropic) or install Ollama

---

## 8. Docker Deployment

### Production (Linux server)

| File | Purpose |
|------|---------|
| `docker-compose.yml` | 5-service stack (nginx, web1, opencode, playwright-mcp, docker-mcp) |
| `Dockerfile.web1` | Next.js production build |
| `Dockerfile.opencode` | opencode CLI binary (ARM64/AMD64 auto-select) |
| `Dockerfile.mcp` | Playwright MCP with Chromium |
| `Dockerfile.docker-mcp` | Docker management MCP server |
| `nginx.conf` | Reverse proxy with 300s timeout |

The web1 container connects to opencode at `http://opencode:4096` (Docker network).

The opencode container mounts the Knowledge Base:
```yaml
volumes:
  - /root/openstack-support:/root/openstack-support:ro
```

### Development (Windows Docker Desktop)

| File | Purpose |
|------|---------|
| `docker-compose.dev.yml` | web1 (hot reload, port 4568) + playwright-mcp (port 8931) + docker-mcp (port 1234) |
| `Dockerfile.mcp` | Playwright MCP server (node:22-slim + @playwright/mcp + Chromium) |

Dev workflow:
```bash
docker compose -f docker-compose.dev.yml up -d
# opencode must run on host (not in Docker)
opencode serve --hostname 0.0.0.0 --port 4096
```

---

## 9. MCP Integration

### Playwright MCP

The Playwright MCP server provides browser automation tools accessible to AI agents:

| Tool | Description |
|------|-------------|
| `browser_navigate` | Navigate to a URL |
| `browser_snapshot` | Get page content/state |
| `browser_click` | Click an element |
| `browser_type` | Type text into an input |
| `browser_screenshot` | Take a screenshot |

This allows AI agents to:
- Run automated UI tests against web1
- Verify state transitions (idle → chat → offline)
- Check error handling (opencode offline → 503)
- Validate dark/light mode rendering

### Docker MCP

The Docker MCP server (`mcp/docker-server/server.mjs`) provides Docker management tools accessible to AI agents:

| Tool | Description | Safety |
|------|-------------|--------|
| `list_containers` | List all containers with status, ports, image | ✅ Read-only |
| `container_logs` | Get recent logs from a container | ✅ Read-only |
| `container_stats` | Get live CPU/memory/network stats | ✅ Read-only |
| `list_images` | List all Docker images | ✅ Read-only |
| `compose_ps` | List Compose stack services | ✅ Read-only |
| `docker_version` | Get Docker version info | ✅ Read-only |
| `start_container` | Start a stopped container | ⚠️ State change |
| `stop_container` | Stop a running container | ⚠️ State change |
| `restart_container` | Restart a container | ⚠️ State change |
| `remove_container` | Remove a container (with optional force) | ⚠️ Destructive |
| `exec_command` | Execute a command inside a running container | ⚠️ Execution |

This allows AI agents to:
- Monitor container health during development
- Restart web1 after config changes
- View container logs to debug issues
- Run Playwright tests inside containers via exec_command
- Check resource usage (CPU/memory)

### MCP Standards (per sphere policy)

- MCP runtime config = project-specific (opencode.json), never global
- Browser MCP: Playwright over Puppeteer
- Both MCP servers run as Docker sidecars, not embedded in the app
- Docker socket is mounted into the docker-mcp container for management access
- MCP servers are configured in `.opencode/opencode.json#mcp` with `type: "remote"`

---

## 10. Key Decisions

| Decision | Reason |
|----------|--------|
| opencode = standalone binary | Not a cloud API; free (MIT), self-hosted |
| Call opencode HTTP API from Next.js | opencode exposes REST API (OpenAPI 3.1 spec) |
| Agent definitions in `apps/web1/gate-answer/` | Separates AI prompt logic from app code |
| Prompt templates per action | Different actions need different wrappers |
| No login in web1 MVP | Test core AI integration first; auth comes later |
| localStorage for case store | No DB dependency; sufficient for single-operator |
| Raw response display | Don't parse/format AI output — iterate later |
| Playwright MCP for testing | Sphere standard; MCP-native; sidecar pattern |
| Docker MCP for container mgmt | Wrap Docker API via MCP SDK; docker socket mount |
| Windows Docker Desktop dev | Match developer environment; host.docker.internal |

---

## 11. Development Workflow

### Prerequisites

```bash
# 1. Install opencode binary
#    Download from https://github.com/anomalyco/opencode/releases
opencode serve --hostname 0.0.0.0 --port 4096

# 2. Configure a provider in opencode UI (http://localhost:4096)
#    /connect → DeepSeek → paste API key

# 3. Clone openstack-support KB alongside this repo
git clone https://github.com/Natties45/openstack-support.git ../openstack-support

# 4. Install and run web1
cd apps/web1
npm install
npm run dev    # → http://localhost:4568
```

### Docker Desktop dev

```bash
# Start all services (web1 hot reload + Playwright MCP + Docker MCP)
docker compose -f docker-compose.dev.yml up -d

# opencode still runs on host (outside Docker)
opencode serve --hostname 0.0.0.0 --port 4096

# Verify MCP servers
curl http://localhost:8931/sse    # Playwright MCP
curl http://localhost:1234/sse    # Docker MCP

# Run Playwright tests
npx playwright test --config=tests/playwright.config.ts
```

### AI-Assisted Testing

With both MCP servers connected to opencode, AI agents can perform integrated workflows:

```bash
# Example: AI can ask in chat
# "List running containers, show web1 logs, then navigate to /noc and screenshot"
```

### Building for production

```bash
npm run build    # builds apps/web1
docker compose up -d   # starts all 5 services
```

See `docs/server-inventory.md` for production server details.
See `docs/deployment-checklist.md` for deployment steps.

---

## 12. Related Projects

| Project | Path | Relationship |
|---------|------|-------------|
| sphere | `../sphere/` | Central AI hub — governance, ADRs, MCP policy |
| openstack-support | `../openstack-support/` | OLS knowledge base (YAML files) |
