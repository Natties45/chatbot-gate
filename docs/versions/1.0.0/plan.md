# Version 1.0.0 — MVP (NOC + Operation Chat)

> **Status:** Released  
> **Date:** 2026-06-27 to 2026-06-28  
> **Scope:** Core opencode integration, NOC hybrid chat, Operation chat, UI polish

---

## Goals

- Integrate opencode HTTP API as AI backend
- Build NOC support chat with wizard→chat hybrid flow
- Build Operation chat for system log analysis
- Deploy production stack (Docker Compose + nginx + MCP services)

---

## Features

### Phase 1 — Core Integration (2026-06-27)
- opencode binary install + systemd serve on port 4096
- `.opencode/opencode.json` agent permissions
- `gate-answer/` agents + prompts framework
- `apps/web1` Next.js App Router scaffold
- API routes: `/api/chat/noc`, `/api/chat/operation`
- `opencode-service.ts` fetch wrapper with 120s timeout
- nginx reverse proxy with 300s timeout
- Production deployment to 203.154.16.197

### Phase 1.1 — State Machine Workflow (2026-06-28)
- 11-state wizard flow (idle → input → analyzing → analysis → ... → offline)
- Prompt-driven actions: analyze, draft, email, feedback, close
- NOC agent with 9 NOC categories + KB path
- NOC closer agent for case log generation
- Badge component (5 variants)
- AppLayout with headerAction prop

### Phase 1.2 — NOC Hybrid + Operation Chat (2026-06-28)
- NOC: wizard → chat hybrid (3 UI states: idle/chat/offline, internal states 1/2/3)
- Operation: structured response via `op-send.md` prompt
- History panel per page (localStorage)
- Quick Action Bar: "Draft Response" button
- Sidebar: onActiveClick for re-click goHome

### Phase 1.2-1 — UI Polish + Resume + File Attach (2026-06-28)
- Removed analysis card → raw text only
- Message resume from localStorage via `messageStore`
- Case preview auto-update after first message
- Single "New Case" button (header only)
- Scroll fix: AppLayout overflow hidden, page manages scroll
- File attach chip UI

---

## Architecture Decisions

| ADR | Title |
|-----|-------|
| ADR-0001 | opencode as bridge between Next.js and LLM |
| ADR-0002 | web1 MVP with no auth |
| ADR-0003 | Playwright MCP for testing |

---

## Files Changed

### Agents & Prompts (`gate-answer/`)
| File | Version |
|------|---------|
| `agents/noc-agent.md` | 1.0.0 |
| `agents/noc-closer.md` | 1.0.0 |
| `agents/op-agent.md` | 1.0.0 |
| `prompts/noc-analyze.md` | 1.0.0 |
| `prompts/noc-draft.md` | 1.0.0 |
| `prompts/noc-draft-feedback.md` | 1.0.0 |
| `prompts/noc-email.md` | 1.0.0 |
| `prompts/noc-feedback.md` | 1.0.0 |
| `prompts/noc-close.md` | 1.0.0 |
| `prompts/op-send.md` | 1.0.0 |
| `prompts/noc-chat.md` | 1.0.0 |

### App (`apps/web1/`)
| File | Version |
|------|---------|
| `src/app/noc/page.tsx` | 1.0.0 |
| `src/app/operation/page.tsx` | 1.0.0 |
| `src/app/api/chat/noc/route.ts` | 1.0.0 |
| `src/app/api/chat/operation/route.ts` | 1.0.0 |
| `src/lib/case-store.ts` | 1.0.0 |
| `src/lib/opencode-service.ts` | 1.0.0 |
| `src/components/layout/AppLayout/*` | 1.0.0 |
| `src/components/layout/Sidebar/*` | 1.0.0 |
| `src/components/ui/Badge/*` | 1.0.0 |
| `src/components/ui/Button/*` | 1.0.0 |
| `src/app/globals.css` | 1.0.0 |

### Infrastructure
| File | Version |
|------|---------|
| `.opencode/opencode.json` | 1.0.0 |
| `Dockerfile.opencode` | 1.0.0 |
| `Dockerfile.web1` | 1.0.0 |
| `docker-compose.yml` | 1.0.0 |
| `nginx.conf` | 1.0.0 |

---

## Mockup

See `docs/versions/1.0.0/mockup.html` — standalone HTML/CSS mockup for NOC + Operation UI (Phase 1.2).
