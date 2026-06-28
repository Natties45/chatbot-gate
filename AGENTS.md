# chatbot-gate — Agent Rules

## Project Context

chatbot-gate is an AI-powered NOC and Operation support tool. The app calls opencode's local HTTP API to provide AI-assisted chat. All AI behavior is defined in `gate-answer/` (agents, prompts, templates).

## Layout

```
chatbot-gate/
├── gate-answer/           ← Agent/prompt definitions (source of truth)
│   ├── agents/            ← System prompts per role
│   ├── prompts/           ← Action-specific prompt templates
│   └── templates/         ← Case log templates
├── apps/web1/             ← Current app (MVP, no login, localStorage)
├── apps/web/              ← Deprecated (old auth-driven UI)
├── adr/                   ← Architecture Decision Records
├── docs/                  ← Documentation
├── mcp/                   ← MCP tool catalog + profiles
└── agents/                ← Project governance agents
```

## Agent Naming Convention

| Prefix | Role | Scope |
|--------|------|-------|
| `noc-*` | NOC support agent/prompt | Customer issue analysis, Thai response drafting |
| `op-*` | Operation agent/prompt | System log analysis, root cause diagnosis |
| `cid-*` | Architecture agent | System design, ADRs, security review |
| `vivi-*` | Research agent | Tool discovery, tradeoff analysis |

## Path Rules

- `gate-answer/agents/*.md` — Agent system prompts (YAML frontmatter required)
- `gate-answer/prompts/*.md` — Prompt templates (use `{{VARIABLE}}` interpolation)
- `gate-answer/templates/*.md` — Structured case log templates
- `apps/web1/` — Next.js App Router, Node.js runtime (not Edge)
- `agents/*.md` — Project governance agents (plain Markdown)

## Style Guide

- Thai for responses (technical terms in English)
- Formal tone: open with "เรียน ผู้ใช้บริการ", close with "ขอบคุณครับ"
- Never mention OpenStack, API, CLI, or backend directly
- ADRs: `adr/ADR-NNNN-slug.md` format with YAML frontmatter

## Build History

### 2026-06-28 — Production deployment (203.154.16.197)

- Deployed full stack to production server (AMD64 Ubuntu)
- **Key fixes**:
  - Added 120s timeout to `opencode-service.ts` fetch calls (AI responses take 20-90s)
  - Added 300s timeout to `nginx.conf` (proxy_read_timeout, proxy_send_timeout)
  - Mounted `/root/openstack-support/` as read-only volume in opencode container (Knowledge Base)
  - Changed agent configs to use absolute paths `/root/openstack-support/` instead of relative `../openstack-support/`
  - Disabled old systemd `opencode.service` that was blocking port 4096
- **Verified**: NOC flow works end-to-end (21-26s response time with KB access)
- **5 containers**: nginx, web1, opencode, playwright-mcp, docker-mcp
- **Infra docs**: `docs/server-inventory.md`, `docs/deployment-checklist.md`
- log เต็ม: `docs/build-history-2026-06-28-deploy.md`

### 2026-06-28 — Docker deployment setup

- opencode binary มี **built-in free models** — ไม่ต้องใช้ API key เพิ่ม `opencode serve` ก็ใช้งาน AI ได้ทันที
- Linux ARM64 binary มีแล้ว: `opencode-desktop-linux-arm64.deb` (GitHub releases v1.17.11+)
- Docker stack = 5 services: nginx → web1 → opencode → MCPs (playwright + docker)
- `Dockerfile.opencode` ใช้ `TARGETPLATFORM` auto-select ARM64/AMD64
- log เต็ม: `docs/build-history-2026-06-28.md`

## Out of Scope

- Do NOT modify `apps/web/` (deprecated, left for reference only)
- Do NOT use `api.opencode.ai` — opencode is a local binary, not a cloud API
- Do NOT hardcode NOC handoff templates — read from knowledge base at runtime

## Versioning

- `apps/web1/package.json` — single source of truth for current version (semver)
- `docs/versions/<semver>/plan.md` — planning doc per version (goals, features, files, decisions)
- `docs/versions/<semver>/mockup.html` — UI mockup alongside plan (standalone HTML/CSS)
- `docs/changelog.md` — consolidated development log
- Before starting a new version: create `docs/versions/<ver>/plan.md` + `mockup.html`, bump `package.json`
