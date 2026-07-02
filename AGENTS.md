# chatbot-gate — Agent Rules

## Project Context

chatbot-gate is an AI-powered NOC and Operation support tool. Uses Groq Free API + Ollama local fallback with MCP tools for knowledge retrieval and diagnostics. All AI behavior is defined in `apps/app2/gate-answer-app2/` (agents, prompts, templates, roles).

Project governance agents live in `agents/`. App runtime agents live in `apps/app2/gate-answer-app2/agents/`.

## Layout

```
chatbot-gate/
├── agents/                   ← Project governance agents (vivi, cid, zidane, steiner)
├── apps/app2/                ← Current app (v2.0.0, Groq + Ollama + MCP)
├── apps/app2/gate-answer-app2/ ← App agent/prompt/role definitions
├── docs/                     ← Documentation
├── docs/adr/                 ← Architecture Decision Records
├── docs/versions/            ← Version planning docs
└── mcp/                      ← MCP server source (kb, case-history, docker)
```

## Agent Naming Convention

| Prefix | Role | Scope | Location |
|--------|------|-------|----------|
| `noc-*` | NOC support agent/prompt | Customer issue analysis, Thai response drafting | `apps/app2/gate-answer-app2/agents/` |
| `op-*` | Operation agent/prompt | System log analysis, root cause diagnosis | `apps/app2/gate-answer-app2/prompts/` |
| `vivi-*` | Research agent | Tool discovery, tradeoff analysis | `agents/` |
| `cid-*` | Architecture agent | System design, ADRs, security review | `agents/` |
| `zidane-*` | Builder agent | App code implementation | `agents/` |
| `steiner-*` | Deployer agent | Docker build, deploy, verify | `agents/` |

## Pipeline

```
vivi (research) → cid (architect) → zidane (builder) → steiner (deployer)
```

## Path Rules

- `apps/app2/gate-answer-app2/agents/*.md` — App agent system prompts (YAML frontmatter)
- `apps/app2/gate-answer-app2/prompts/*.md` — Prompt templates (`{{VARIABLE}}`)
- `apps/app2/gate-answer-app2/roles/*.md` — Role definitions (runtime-injectable)
- `apps/app2/gate-answer-app2/templates/*.md` — Case log templates
- `agents/*.md` — Project governance agents
- `apps/app2/` — Next.js App Router, Node.js runtime (not Edge)
- `docs/adr/ADR-NNNN-slug.md` — ADRs with YAML frontmatter
- `docs/versions/<semver>/plan.md` — Version planning docs

## Style Guide

- Thai for responses (technical terms in English)
- Formal tone: open with "เรียน ผู้ใช้บริการ", close with "ขอบคุณครับ"
- Never mention OpenStack, API, CLI, or backend directly
- ADRs: `docs/adr/ADR-NNNN-slug.md` format with YAML frontmatter

## Build History

### 2026-07-02 — Cleanup (removed web1 legacy)

- Removed `apps/web1/`, `tests/`, `packages/shared/`, `skills/`, `mcp/catalog/`, `mcp/profiles/`
- Updated `docker-compose.yml` — web1 service removed, nginx routes `/` to app2
- Updated `Dockerfile.opencode` — standalone `opencode serve` (no web1 bridge)
- Project now single-app: `apps/app2/`

### 2026-07-02 — Production deployment (203.154.16.162)

- Deployed App2 (v2.0.0) full stack to production server `203.154.16.162` (AMD64 Ubuntu)
- **Key details**:
  - **8 containers**: `opencode`, `web1`, `app2`, `ollama`, `nginx`, `docker-mcp`, `kb-mcp`, `case-history-mcp`
  - **Multitenancy**: Nginx routes `/app2` to port 3001 (`app2`) and `/` to port 3000 (`web1`)
  - **Local Fallback**: Preloaded `qwen3:4b` in the `ollama` container
  - **Verification**: Verified Next.js endpoints, SQLite migrations, database seeding, and chat flow successfully

### 2026-06-28 — Production deployment (203.154.16.197)

- Deployed full stack to production server (AMD64 Ubuntu)
- **5 containers**: nginx, web1, opencode, playwright-mcp, docker-mcp
- **Infra docs**: `docs/server-inventory.md`, `docs/deployment-checklist.md`

### 2026-06-28 — Docker deployment setup

- opencode binary มี **built-in free models** — ไม่ต้องใช้ API key เพิ่ม `opencode serve` ก็ใช้งาน AI ได้ทันที
- `Dockerfile.opencode` ใช้ `TARGETPLATFORM` auto-select ARM64/AMD64

## Out of Scope

- Do NOT use `api.opencode.ai` — opencode is a local binary, not a cloud API
- Do NOT hardcode NOC handoff templates — read from knowledge base at runtime
- Project governance agents do NOT modify app code in `apps/app2/` (that is zidane-builder's scope)

## Versioning

- `apps/app2/package.json` — single source of truth for current version (semver)
- `docs/versions/<semver>/plan.md` — planning doc per version (goals, features, files, decisions)
- `docs/versions/<semver>/mockup.html` — UI mockup alongside plan (standalone HTML/CSS)
- `docs/overview.md` — current app state, updated to latest version
- `docs/changelog.md` — consolidated development log
- Before starting a new version: create `docs/versions/<ver>/plan.md` + `mockup.html`, bump `package.json`
