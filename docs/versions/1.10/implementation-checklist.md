# Implementation Checklist — Version 1.10

> Use this checklist when implementing v1.10 in `apps/web1` and infra files.

---

## Phase 1 — Docs + Version

- [ ] Confirm `docs/versions/1.10/plan.md` scope
- [ ] Confirm `docs/versions/1.10/ux-ui.md` UX behavior
- [ ] Confirm `docs/versions/1.10/technical-design.md` contracts
- [ ] Confirm `docs/versions/1.10/mockup.html` visual direction
- [ ] Bump `apps/web1/package.json` to `1.10.0`

Verification:

- [ ] Docs folder has 5 files
- [ ] Mockup opens without JavaScript syntax errors

---

## Phase 2 — Dependencies + Prisma

- [ ] Add Prisma/libSQL dependencies to `apps/web1/package.json`
- [ ] Add password hashing dependency (`bcrypt` or `argon2`)
- [ ] Create `apps/web1/prisma/schema.prisma`
- [ ] Add `User`, `Case`, `ChatMessage`, `Setting` models
- [ ] Create Prisma client helper in `src/lib/db.ts`
- [ ] Add seed script for `admin` / `admin`
- [ ] Add DB volume path to Docker config
- [ ] Add Prisma generate step to Docker build

Verification:

- [ ] Prisma client generates successfully
- [ ] DB file is created in volume-mounted path
- [ ] Seed creates admin user once
- [ ] Re-running seed does not duplicate admin

---

## Phase 3 — Auth

- [ ] Create `src/lib/auth.ts`
- [ ] Implement password hash/verify helpers
- [ ] Implement cookie session create/read/destroy helpers
- [ ] Add `/login` page
- [ ] Add `POST /api/auth/login`
- [ ] Add `POST /api/auth/logout`
- [ ] Protect app pages from unauthenticated access
- [ ] Redirect unauthenticated users to `/login`
- [ ] Redirect logged-in users from `/login` to role default page

Verification:

- [ ] `admin` / `admin` can log in
- [ ] Wrong password shows error
- [ ] Disabled user cannot log in
- [ ] Logout clears session
- [ ] Refresh keeps valid session

---

## Phase 4 — Role-Aware Navigation

- [ ] Update Sidebar menu items
- [ ] Show all pages for `admin`
- [ ] Show NOC Chat + Case History for `noc`
- [ ] Show Operation Chat + Case History for `operation`
- [ ] Hide Settings for non-admin users
- [ ] Add server/API role checks, not just UI hiding

Verification:

- [ ] Admin sees all nav items
- [ ] NOC user cannot open Operation page directly
- [ ] Operation user cannot open NOC page directly
- [ ] Non-admin cannot open Settings directly

---

## Phase 5 — User Management

- [ ] Add user list API
- [ ] Add create user API
- [ ] Add edit user API
- [ ] Add delete/disable user behavior
- [ ] Add Account Management section in Settings
- [ ] Add Add/Edit user modal
- [ ] Lock username field in edit mode
- [ ] Validate duplicate username
- [ ] Validate password confirmation
- [ ] Allow blank password on edit to keep current password

Verification:

- [ ] Add user requires password
- [ ] Add user rejects duplicate username
- [ ] Edit user leaves password unchanged when blank
- [ ] Edit user updates role/status
- [ ] Disabled user cannot log in

---

## Phase 6 — Settings / opencode Config

- [ ] Add Settings page route
- [ ] Add `opencode` section
- [ ] Add NOC Model selector
- [ ] Add Operation Model selector
- [ ] Add per-agent Advanced buttons
- [ ] Collapse Advanced by default
- [ ] Save model selection to `Setting` table
- [ ] Load providers/models from opencode config providers endpoint
- [ ] Patch temperature/top_p via opencode config endpoint
- [ ] Pass selected model to chat message requests

Verification:

- [ ] Advanced sections toggle independently
- [ ] Save settings persists after refresh
- [ ] NOC chat sends selected NOC model
- [ ] Operation chat sends selected Operation model
- [ ] Temperature/top_p patch succeeds or shows error

---

## Phase 7 — Git Sync Settings

- [ ] Add Git Sync panel under Settings
- [ ] Store `git.repoUrl`, `git.branch`, `git.localPath`, `git.lastSyncAt`, `git.lastCommit`, `git.lastStatus`, `git.lastLog`
- [ ] Add `GET /api/admin/git-sync/status`
- [ ] Add `POST /api/admin/git-sync/action`
- [ ] Support `check_status`
- [ ] Support `pull_latest` with dirty checkout refusal
- [ ] Support `force_reset_pull` with `RESET` confirmation
- [ ] Support `reclone` with `RECLONE` confirmation
- [ ] Support `change_repo` with temp clone validation before switch
- [ ] Disable Git Sync buttons while action is running
- [ ] Show latest 20 log lines after actions
- [ ] Add admin-only server-side authorization checks
- [ ] Reject raw command payloads

Verification:

- [ ] Check Status updates branch/commit/status without changing files
- [ ] Pull Latest succeeds on clean checkout
- [ ] Pull Latest refuses dirty checkout
- [ ] Force Reset + Pull requires `RESET`
- [ ] Re-clone Repo requires `RECLONE`
- [ ] Change Repo fails safely when URL/branch is invalid
- [ ] Non-admin cannot access Git Sync UI or API

---

## Phase 8 — Case Lifecycle DB

- [ ] Add case ID generation helper (`DDMMYYNN`)
- [ ] On New Case, create opencode session
- [ ] On New Case, insert `Case` with `in_progress`
- [ ] Store user snapshot: `userId`, `username`, `userRole`
- [ ] Store `page`: `NOC` or `Operation`
- [ ] On user message, insert `ChatMessage`
- [ ] On assistant response, insert `ChatMessage`
- [ ] On draft, insert `ChatMessage` with `kind=draft`
- [ ] Stop relying on localStorage for source of truth
- [ ] Clear/ignore old localStorage case data

Verification:

- [ ] First case of day gets ID like `29066901`
- [ ] Second case of same day gets `29066902`
- [ ] NOC and Operation share daily sequence
- [ ] Messages persist after refresh
- [ ] Draft messages appear in stored chat history

---

## Phase 9 — Close Flow

- [ ] Update `noc-close.md` to return `{ summary, detail }`
- [ ] Create `op-close.md`
- [ ] Remove required AI `.md` file writing from close flow
- [ ] Parse AI JSON safely
- [ ] Update case to `closed`
- [ ] Set `closedAt`
- [ ] Store summary/detail

Verification:

- [ ] Closing NOC case updates status to Closed
- [ ] Closing Operation case updates status to Closed
- [ ] Closed case modal shows summary/detail
- [ ] In-progress case modal does not show summary/detail panel

---

## Phase 10 — Case History

- [ ] Add Case History page route
- [ ] Add table columns: `ID`, `User`, `Role`, `Page`, `Created`, `Updated`, `Status`, `Action`
- [ ] Add filters: From, To, Page, Status, Case ID
- [ ] Default From/To to today
- [ ] Add server-side `limit=20`
- [ ] Add Load More button
- [ ] Add View modal
- [ ] Modal shows chat bubbles and draft cards
- [ ] Role-filter case access for non-admin users

Verification:

- [ ] Initial load shows max 20 rows
- [ ] Load More appends 20 rows
- [ ] Filters use `createdAt` date range
- [ ] View modal opens correct case
- [ ] NOC user does not see Operation-only cases
- [ ] Operation user does not see NOC-only cases

---

## Phase 11 — Markdown Export

- [ ] Add `/api/cases/export`
- [ ] Export by `createdAt` date range
- [ ] Export all matching rows, not only visible paginated rows
- [ ] Generate single Markdown file
- [ ] Single-day filename: `case-history-YYYY-MM-DD.md`
- [ ] Date-range filename: `case-history-YYYY-MM-DD-to-YYYY-MM-DD.md`
- [ ] Include case metadata
- [ ] Include summary/detail for closed cases
- [ ] Include full chat history
- [ ] Return no-file message when no cases match

Verification:

- [ ] Export today downloads `.md`
- [ ] Export date range downloads one `.md`
- [ ] Export includes in-progress cases
- [ ] Export includes closed summary/detail
- [ ] Export includes draft messages

---

## Phase 12 — Infra Cleanup

- [ ] Remove `playwright-mcp` from `docker-compose.yml`
- [ ] Remove `playwright-mcp` from `docker-compose.dev.yml`
- [ ] Remove `mcp.playwright` from `.opencode/opencode.json`
- [ ] Delete `Dockerfile.mcp`
- [ ] Add DB volume for web1
- [ ] Keep nginx timeout settings
- [ ] Keep docker-mcp

Verification:

- [ ] Production stack runs with 4 containers
- [ ] web1 can read/write SQLite DB
- [ ] opencode still serves chat requests
- [ ] nginx still handles long AI responses

---

## Phase 13 — Final Verification

- [ ] `npm run build` passes in `apps/web1`
- [ ] Login works
- [ ] User management works for admin
- [ ] Role navigation works
- [ ] NOC case lifecycle works
- [ ] Operation case lifecycle works
- [ ] Case History works
- [ ] Markdown export works
- [ ] Settings save/load works
- [ ] Git Sync status/action flow works for admin
- [ ] Docker stack builds
- [ ] Production deploy checklist updated after implementation

---

## Post-Implementation Docs

Update these after implementation is verified:

- [ ] `docs/overview.md` current version and DB/containers
- [ ] `docs/architecture.md` new auth/DB/case lifecycle diagram
- [ ] `docs/changelog.md` v1.10 entry
- [ ] `docs/deployment-checklist.md` DB migration/seed/deploy steps
