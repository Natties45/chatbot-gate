# Changelog

> Consolidated development log. Combines previous PHASE1.md, PHASE1.1.md, PHASE1.2.md, PHASE1.2-1.md.
> Version planning docs & mockups now live under `docs/versions/<semver>/`.

---

## 2026-07-02 — Versions 2.1.0 - 2.4.0 (Planning Phase)

### Roadmap Defined

Completed planning and documentation for 4 upcoming versions covering NOC intelligence,
Operation intelligence, auto KB generation, and CI/CD deployment.

| Version | Scope | Doc |
|---------|-------|-----|
| 2.1.0 | NOC Clarify + Escalate + Handoff + File Attach | `docs/versions/2.1.0/plan.md` |
| 2.2.0 | Operation Clarify + OpenCode Research + Multi-Source | `docs/versions/2.2.0/plan.md` |
| 2.3.0 | Auto KB Generation + Git Push (auto-generated/) | `docs/versions/2.3.0/plan.md` |
| 2.4.0 | CI/CD Deploy Agent + Prompt Volume Mount | `docs/versions/2.4.0/plan.md` |

### Key Decisions (Decision Log)

| # | Topic | Decision |
|---|-------|----------|
| 1 | NOC clarify approach | Ask directly + options, max 2 rounds, AI decides escalate threshold |
| 2 | NOC escalate target | Operation team only — AI generates internal summary |
| 3 | NOC file attach | txt + images, `/tmp/uploads/`, daily cleanup |
| 4 | OpenCode integration | HTTP API `opencode:4096`, full access (trust sandbox) |
| 5 | Operation research | Sequential: KB → OpenCode → Docker (not parallel) |
| 6 | Auto KB format | YAML output to `auto-generated/YYYY-MM-DD/` |
| 7 | Auto KB push | Only `auto-generated/` folder — never push code |
| 8 | KB scheduler | `setInterval` every 60s, DB lock prevents duplicate runs |
| 9 | Deploy trigger | Admin enters tag → Deploy button + nightly tag sync |
| 10 | Deploy rollback | Health check 15s → fail → `docker compose up -d app2` |
| 11 | Prompt editing | Mount volume → edit on server → `restart` (no rebuild) |
| 12 | Settings layout | 5 tabs: Agents > Git > KB Auto > Deploy > Users |



## 2026-07-02 — Version 2.0.0 (Production Deployment & AI Polish)

### Architecture
- Created `apps/app2` based on `web1` but replacing `.opencode` as the bridge.
- **Multitenancy**: nginx routes `/app2` to port 3001 (`app2`) and `/` to port 3000 (`web1`).
- Implemented **Groq Free** API (`qwen/qwen3-32b`) as primary LLM.
- Preloaded **Ollama** (`qwen3:4b`) container on the server as local fallback.
- Added **8 containers** stack: `opencode`, `web1`, `app2`, `ollama`, `nginx`, `docker-mcp`, `kb-mcp`, `case-history-mcp`.

### Key Features
| Feature | Details |
|---------|---------|
| Free-first LLM Router | `ai-brain.ts` handles Groq integration and local fallback routing. |
| MCP Gateway | Replaced legacy tool execution with standard MCP tools for KB and Case History. |
| AI Reasoning Filter | Strips out `<think>` tags from LLM responses before rendering to the frontend for a more human-like response. |

### Files Created/Modified
| File | Action |
|------|--------|
| `apps/app2/` | Created Next.js app based on v1.10.0 codebase. |
| `apps/app2/src/lib/ai/ai-brain.ts` | Created LLM router, prompt interpolation, fallback, and `<think>` block filtering. |
| `docker-compose.yml`, `nginx.conf` | Updated for 8-container stack with `/app2` subpath routing. |

## 2026-06-30 — Version 1.10.0 (Database, RBAC, Settings & Git Sync)

### Architecture
- Integrated **SQLite** via **Prisma ORM** replacing `localStorage` for case storage.
- Added **Role-based Access Control (RBAC)** using cookie-based sessions.
- Added a `Settings` admin dashboard to trigger Git synchronization commands.
- Dropped the `playwright-mcp` service to reduce container overhead (now using 4 services).

### Key Features
| Feature | Details |
|---------|---------|
| Login & Sessions | Added `bcryptjs` password hashing and session management. Default: `admin/admin`. |
| Role-based Sidebar | Dynamically shows menus based on role (`admin`, `noc`, `operation`). |
| DB-Backed Case Lifecycle | Chats are saved to `app.db`. Added auto-generate Case ID (`DDMMYYNN`). |
| History Explorer | Case History pagination with "View details" popup modal. |
| Markdown Export | Download all case logs within a selected date range as a `.md` file. |
| Admin Git Sync | Server-side Git pull, hard reset, and re-clone via secure API endpoints. |

### Files Created/Modified
| File | Action |
|------|--------|
| `apps/web1/prisma/schema.prisma` | Created database schema (User, Session, Case, Message, Setting). |
| `apps/web1/src/lib/auth.ts`, `db.ts`, `case-db.ts` | Created ORM utilities and session verifiers. |
| `apps/web1/src/app/login/page.tsx` | Created login page UI. |
| `apps/web1/src/app/settings/page.tsx` | Created settings & Git Sync UI. |
| `apps/web1/src/app/history/page.tsx` | Created Case History UI. |
| `apps/web1/src/app/api/auth/` & `users/` | Created authentication APIs. |
| `apps/web1/src/app/api/chat/noc/route.ts` | Updated to sync messages to DB. |
| `apps/web1/src/app/api/chat/operation/route.ts` | Updated to sync messages to DB. |
| `docker-compose.yml`, `Dockerfile` | Removed playwright-mcp, mounted DB volume, added seed command. |

## 2026-06-28 — Phase 1.2-1 (UI Polish + Resume + File Attach)

### Issues Fixed

| # | Issue | Root Cause | Fix |
|---|-------|-----------|-----|
| 1 | NOC N/A badges | `parseAnalysis()` regex mismatch | Removed analysis card — raw text only |
| 2 | Resume blank page | Messages not stored in localStorage | Added `messageStore` in case-store.ts |
| 3 | Preview "(new case)" | Preview never updated | `caseStore.update()` after first message |
| 4 | Duplicate New Case | Both idle-center and header-right | Moved to header only |
| 5 | Full-page scroll | `AppLayout .content overflow-y: auto` | Changed to `hidden`, page manages scroll |
| 6 | File attach no name | Missing chip UI | Added fileAttachChip CSS + state |

### Files Changed

| File | Action |
|------|--------|
| `apps/web1/src/app/noc/page.tsx` | Removed parseAnalysis, resume, preview, layout fix |
| `apps/web1/src/app/operation/page.tsx` | Resume, preview, file chip, layout fix |
| `apps/web1/src/lib/case-store.ts` | Added `update()`, `messageStore` |
| `apps/web1/src/components/layout/AppLayout/AppLayout.module.css` | `overflow-y: hidden` |
| `apps/web1/src/app/globals.css` | Added fileAttachChip |
| `docs/versions/1.0.0/mockup.html` | Updated NOC plain text, Op file chip |

---

## 2026-06-28 — Phase 1.2 (NOC Hybrid + Operation Chat + History)

### Architecture

- NOC: wizard → chat hybrid (3 states: idle/chat/offline, internal state 1/2/3)
- Operation: structured response with op-send.md prompt
- History panel per page (localStorage)
- Quick Action Bar: only "Draft Response" button

### Final Decisions (v3)

| Feature | Decision |
|---------|----------|
| Template/email flow | Removed |
| Separate "Analyze" button | Removed (first message = auto-analyze) |
| Inline buttons in bubble | No — Quick Action Bar only |
| "Close Case" position | Header (beside "+ New Case") |
| Operation Copy | No |
| Home button | Removed (sidebar tab re-click = goHome) |
| stateIndicator | Removed |
| Sidebar goHome | `onActiveClick` prop |

### Files Created/Modified

| File | Action |
|------|--------|
| `gate-answer/prompts/noc-chat.md` | Created |
| `gate-answer/prompts/noc-draft-feedback.md` | Created |
| `apps/web1/src/app/api/chat/noc/route.ts` | +2 promptType |
| `apps/web1/src/app/api/chat/operation/route.ts` | op-send.md integration |
| `apps/web1/src/app/noc/page.tsx` | Rewritten chat hybrid |
| `apps/web1/src/app/operation/page.tsx` | Multiple fixes |
| `apps/web1/src/components/layout/Sidebar/Sidebar.tsx` | Added onActiveClick |
| `apps/web1/src/lib/case-store.ts` | Created |
| `apps/web1/src/app/globals.css` | New classes + --text-on-accent |
| `apps/web1/src/components/ui/Button/Button.module.css` | color → var(--text-on-accent) |

---

## 2026-06-28 — Phase 1.1 (NOC Smart Chat + Prompt-Driven Workflow)

### Architecture: State Machine (11 states)

| State | Description |
|-------|-------------|
| idle | No session — +New Case |
| input | Customer message textarea |
| analyzing | Loading skeleton |
| analysis | Category, Confidence, Summary, Response |
| addInfo | Additional info textarea |
| actionSelect | Choose next step |
| drafting | Loading skeleton |
| draft | Draft response (Thai) |
| sendTemplate | NOC handoff template |
| closing | Loading |
| offline | Error + Retry |

### Prompt Actions

| Prompt | Action |
|--------|--------|
| noc-analyze.md | Analyze + KB matching |
| noc-draft.md | Draft OLS-style response |
| noc-email.md | NOC handoff (dynamic from KB) |
| noc-feedback.md | Re-analyze with additional info |
| noc-close.md | Build mode — save case log |

### Files Created/Modified

| File | Action |
|------|--------|
| `.opencode/opencode.json` | Added noc-closer, adjusted noc-agent permissions |
| `gate-answer/agents/noc-agent.md` | Rewritten (9 categories, KB path, 3 phases) |
| `gate-answer/agents/noc-closer.md` | Created |
| `gate-answer/prompts/noc-analyze.md` | Created (renamed from noc-send.md) |
| `gate-answer/prompts/noc-draft.md` | Created |
| `gate-answer/prompts/noc-email.md` | Created |
| `gate-answer/prompts/noc-feedback.md` | Updated |
| `gate-answer/prompts/noc-close.md` | Updated |
| `apps/web1/src/app/globals.css` | --primary-color, --warning-color, @keyframes spin |
| `apps/web1/src/components/ui/Badge/*` | Created (5 variants) |
| `apps/web1/src/components/layout/AppLayout/*` | Added headerAction prop |
| `apps/web1/src/app/api/chat/noc/route.ts` | Rewritten (promptType, noc-closer) |
| `apps/web1/src/app/noc/page.tsx` | Rewritten (state machine) |
| Removed `gate-answer/prompts/noc-send.md` | Renamed to noc-analyze.md |

---

## 2026-06-27 — Phase 1 (Core opencode Integration)

### Setup

- Installed opencode binary v1.17.9 on 203.154.16.197
- Created systemd service: `opencode serve --hostname 0.0.0.0 --port 4096`
- Created `.opencode/opencode.json` + `gate-answer/`
- Created `apps/web1` (structure, components, pages, API routes, opencode-service)
- Created `docs/architecture.md`
- Removed old docs (current_status.md, old ADRs, old governance/source-of-truth.md)
