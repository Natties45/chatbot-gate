# chatbot-gate

AI-powered NOC and Operation support tool. A thin web UI wrapper around the [opencode](https://opencode.ai) local HTTP API.

## Architecture

```
Browser → Nginx → Next.js (web1) ──HTTP──→ opencode serve (:4096) ──→ LLM Provider
```

Full design: [docs/architecture.md](docs/architecture.md)

## Project Layout

```
apps/web1/            ← Current app (MVP, no login)
apps/web1/gate-answer/ ← Agent/prompt definitions
agents/               ← Project governance agents
docs/                 ← Documentation
docs/adr/             ← Architecture Decision Records
skills/               ← Project skills
mcp/                  ← MCP tool catalog + profiles
```

## Quick Start

```bash
# 1. Install opencode
#    Download from https://github.com/anomalyco/opencode/releases
opencode serve --hostname 0.0.0.0 --port 4096

# 2. Configure a provider in opencode UI (http://localhost:4096)
#    /connect → DeepSeek / Anthropic / etc.

# 3. Run the app
npm install
npm run dev
# → http://localhost:4568/noc
```

## Docker (Development)

```bash
docker compose -f docker-compose.dev.yml up -d
# opencode must run on host (outside Docker)
opencode serve --hostname 0.0.0.0 --port 4096
```

## Docker (Production)

```bash
docker compose up -d
# 5 services: nginx, web1, opencode, playwright-mcp, docker-mcp
# opencode uses built-in free models (no API key needed)
```

Production server: `203.154.16.197` — see [docs/server-inventory.md](docs/server-inventory.md)
Deployment steps: [docs/deployment-checklist.md](docs/deployment-checklist.md)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Run web1 on port 4568 |
| `npm run build` | Build web1 for production |
| `npm run lint` | Lint web1 |
| `npm run dev:docker` | Start Docker dev stack |

## Documentation

| File | Description |
|------|-------------|
| `docs/overview.md` | Current app state (always latest version) |
| `docs/architecture.md` | Full architecture, data flow, deployment |
| `docs/server-inventory.md` | Production server details (single source of truth) |
| `docs/deployment-checklist.md` | Deploy steps + troubleshooting |
| `docs/changelog.md` | Development log |
| `docs/adr/` | Architecture Decision Records |
| `apps/web1/gate-answer/agents/*.md` | Agent system prompts |
| `apps/web1/gate-answer/prompts/*.md` | Action prompt templates |
| `AGENTS.md` | AI agent rules and conventions |

## Key Decisions

- **opencode** is a standalone local binary (MIT), NOT a cloud API
- **web1** is the current MVP — no auth, localStorage for cases
- **Prompt templates** live in `apps/web1/gate-answer/`, inside the app directory
- **Playwright MCP** is the standard browser testing tool
