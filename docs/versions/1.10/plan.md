# Version 1.10 — Auth, Settings, Database, Case History

> **Status:** Planned
> **Date:** 2026-06-29
> **Scope:** Login, user management, per-agent opencode settings, DB-backed case lifecycle, simplified Case History, Markdown export, remove playwright-mcp

---

## Goals

- Add simple login with cookie session and default admin user (`admin` / `admin`)
- Add real user management under Settings with roles: `admin`, `operation`, `noc`
- Replace browser-only localStorage case state with SQLite-backed case lifecycle
- Add Case History with simple columns, modal chat transcript, and Load More pagination
- Add Markdown export by `createdAt` date range, generated from DB on demand
- Keep Settings aligned with current app visual language and collapse advanced agent controls by default
- Remove playwright-mcp because it is not part of the app runtime flow

---

## Documentation Set

| File | Purpose |
|------|---------|
| `plan.md` | Version overview, feature scope, decisions, file impact |
| `ux-ui.md` | Detailed UX/UI behavior, layouts, states, validation |
| `mockup.html` | Standalone interactive visual mockup |
| `technical-design.md` | DB schema, API contracts, auth/session, export, infra design |
| `implementation-checklist.md` | Phased implementation and verification checklist |

---

## Feature Scope

### Login + Session

- Add login page before app access
- Use cookie session, not JWT
- Seed default admin user: `admin` / `admin`
- Disabled users cannot log in
- No forgot password, reset email, OAuth, or MFA in v1.10

### User Management

- Located at bottom of Settings page
- Admin manages real users in DB
- Table columns: `User`, `Role`, `Status`, `Action`
- Actions: `Edit`, `Delete`
- Add/Edit user share the same modal
- Edit mode locks the `User` field
- Password blank on edit means “do not change password”

### Settings

- `opencode` section grouped by agent
- NOC Agent: NOC Model + Advanced (Temperature, Top P)
- Operation Agent: Operation Model + Advanced (Temperature, Top P)
- NOC Closer Agent: Advanced (Temperature only)
- Advanced controls are collapsed by default per agent

### Case Lifecycle

- New case inserts DB row with status `in_progress`
- Every user/assistant/draft message is stored in DB
- Close case asks AI for `{ summary, detail }` only
- Close case updates DB status to `closed`
- Old localStorage cases are not migrated

### Case History

- Columns: `ID`, `User`, `Role`, `Page`, `Created`, `Updated`, `Status`, `Action`
- `ID` is human-readable case ID, format `DDMMYYNN` such as `29066901`
- Default query returns 20 rows
- `Load more` appends 20 rows at a time
- `View` opens modal with full chat history

### Markdown Export

- Export uses `createdAt` date range filters
- Export produces one `.md` file for the selected date range
- Export includes all matching cases and full chat history, independent of table pagination
- File is generated on demand and downloaded by browser
- Server does not store exported `.md` files in v1.10

### Infra Cleanup

- Remove `playwright-mcp` from compose and opencode config
- Keep `docker-mcp` for future Operation/debug use
- SQLite is file-backed and volume-mounted; no database container

---

## Key Decisions

| Decision | Value |
|----------|-------|
| Session | Cookie session |
| Default admin | `admin` / `admin` |
| User roles | `admin`, `operation`, `noc` |
| User status DB | `active`, `disabled` |
| User status UI | `Active`, `Disabled` |
| Case statuses | `in_progress`, `closed` |
| Case ID format | `DDMMYYNN` |
| Case History page size | 20 rows + Load More |
| Export | Markdown download generated from DB |
| AI close output | `{ summary, detail }` only |
| AI file writing | Removed from v1.10 close flow |
| localStorage migration | No migration; start fresh |

---

## Files Changed

### Docs

| File | Version |
|------|---------|
| `docs/versions/1.10/plan.md` | 1.10 |
| `docs/versions/1.10/ux-ui.md` | 1.10 |
| `docs/versions/1.10/mockup.html` | 1.10 |
| `docs/versions/1.10/technical-design.md` | 1.10 |
| `docs/versions/1.10/implementation-checklist.md` | 1.10 |

### App — New Files

| File | Version |
|------|---------|
| `apps/web1/prisma/schema.prisma` | 1.10 |
| `apps/web1/src/lib/db.ts` | 1.10 |
| `apps/web1/src/lib/auth.ts` | 1.10 |
| `apps/web1/src/lib/case-db.ts` | 1.10 |
| `apps/web1/src/lib/settings-db.ts` | 1.10 |
| `apps/web1/src/app/login/page.tsx` | 1.10 |
| `apps/web1/src/app/api/auth/login/route.ts` | 1.10 |
| `apps/web1/src/app/api/auth/logout/route.ts` | 1.10 |
| `apps/web1/src/app/api/users/route.ts` | 1.10 |
| `apps/web1/src/app/settings/page.tsx` | 1.10 |
| `apps/web1/src/app/api/settings/route.ts` | 1.10 |
| `apps/web1/src/app/history/page.tsx` | 1.10 |
| `apps/web1/src/app/api/cases/route.ts` | 1.10 |
| `apps/web1/src/app/api/cases/export/route.ts` | 1.10 |

### App — Modified

| File | Version |
|------|---------|
| `apps/web1/package.json` | 1.10.0, Prisma/auth deps |
| `apps/web1/src/app/page.tsx` | Login-aware redirect |
| `apps/web1/src/app/layout.tsx` | Session-aware shell if needed |
| `apps/web1/src/lib/opencode-service.ts` | Config/provider methods + model override |
| `apps/web1/src/app/api/chat/noc/route.ts` | Auth + DB case lifecycle |
| `apps/web1/src/app/api/chat/operation/route.ts` | Auth + DB case lifecycle |
| `apps/web1/src/app/noc/page.tsx` | Auth + DB case lifecycle + model setting |
| `apps/web1/src/app/operation/page.tsx` | Auth + DB case lifecycle + model setting |
| `apps/web1/src/components/layout/Sidebar/Sidebar.tsx` | Role-aware nav + Case History + Settings |
| `Dockerfile.web1` | Prisma generate/migrate support |

### Gate-Answer — Modified

| File | Version |
|------|---------|
| `gate-answer/prompts/noc-close.md` | Return `summary` + `detail` JSON, no required file write |
| `gate-answer/prompts/op-close.md` | New Operation close prompt with same JSON contract |

### Infra — Modified/Deleted

| File | Version |
|------|---------|
| `docker-compose.yml` | Remove playwright-mcp, add DB volume |
| `docker-compose.dev.yml` | Remove playwright-mcp |
| `.opencode/opencode.json` | Remove `mcp.playwright` |
| `Dockerfile.mcp` | Delete |

---

## Out Of Scope

- User self-registration
- Password reset/forgot password
- MFA/OAuth
- Audit log page
- CSV export
- Migrating existing localStorage cases
- Saving exported Markdown files on server
- Full role-management matrix UI

---

## Links

- UX/UI details: `docs/versions/1.10/ux-ui.md`
- Technical details: `docs/versions/1.10/technical-design.md`
- Implementation steps: `docs/versions/1.10/implementation-checklist.md`
- Visual mockup: `docs/versions/1.10/mockup.html`
