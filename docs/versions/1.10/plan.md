# Version 1.10 — Settings Page + Agent Configuration

> **Status:** Planned
> **Date:** 2026-06-29
> **Scope:** Settings page with model/temperature/top_p selection for NOC + Operation agents

---

## Goals

- Add `/settings` page (Sidebar nav) with General + Advanced tabs
- General: model selector for noc-agent + operation-agent
- Advanced: temperature + top_p sliders per agent, persisted via `PATCH /config`
- Selected model passed per-request to override agent default
- All opencode config editable from web UI — no SSH needed

---

## Features

### General Tab — Model Selection
- Dropdown "NOC Model" — populated from `GET /config/providers`
- Dropdown "Operation Model" — same source
- Values stored in localStorage (`settings-store.ts`)
- Chat pages read model from store, pass to `/api/chat/*` routes
- API routes pass `model` field in `POST /session/:id/message` body → opencode overrides agent default

### Advanced Tab — Agent Tuning
- **NOC Agent**: Temperature slider (0.0–1.0), Top P slider (0.0–1.0)
- **Operation Agent**: Temperature slider (0.0–1.0), Top P slider (0.0–1.0)
- **NOC Closer Agent**: Temperature slider (0.0–1.0)
- Values written to opencode server via `PATCH /config` (live, no restart)
- Current values loaded from `GET /config` on page mount

### Data Flow

```
Settings Page
  ├── General: model → localStorage → per-request override
  └── Advanced: temp/top_p → PATCH /config → opencode server
         │
         ▼
  NOC/Operation Chat Page
  ├── reads model from settings-store
  └── sends model in API call body
         │
         ▼
  /api/chat/noc  ──→  opencodeService.sendSystemMessage(..., model)
         │
         ▼
  POST /session/:id/message  { agent, system, parts, model }
```

---

## Architecture Decisions

| ADR | Title |
|-----|-------|
| — | Model override via per-request `model` field (opencode HTTP API supported) |
| — | Temperature/TopP via `PATCH /config` (live update, no agent file edit needed) |
| — | Settings stored in separate `settings-store.ts` (localStorage pattern, like case-store.ts) |

---

## Files Changed

### Docs
| File | Version |
|------|---------|
| `docs/versions/1.10/plan.md` | 1.10 |
| `docs/versions/1.10/mockup.html` | 1.10 |

### App — New Files
| File | Version |
|------|---------|
| `src/lib/settings-store.ts` | 1.10 |
| `src/app/settings/page.tsx` | 1.10 |
| `src/app/api/settings/route.ts` | 1.10 |

### App — Modified
| File | Version |
|------|---------|
| `src/lib/opencode-service.ts` | 1.10 |
| `src/app/api/chat/noc/route.ts` | 1.10 |
| `src/app/api/chat/operation/route.ts` | 1.10 |
| `src/app/noc/page.tsx` | 1.10 |
| `src/app/operation/page.tsx` | 1.10 |
| `src/components/layout/Sidebar/Sidebar.tsx` | 1.10 |
| `package.json` | 1.10.0 |

---

## Mockup

See `docs/versions/1.10/mockup.html` — standalone HTML/CSS mockup for Settings page.
