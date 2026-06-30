# Technical Design — Version 1.10

> Scope: auth, SQLite persistence, case lifecycle, settings config, Markdown export, infra cleanup.

---

## Architecture Summary

v1.10 changes the app from browser-local case state to DB-backed case lifecycle.

```text
Browser
  └── Next.js web1
        ├── Cookie session auth
        ├── SQLite database
        ├── API routes
        └── opencode HTTP API
```

Key rules:

- DB is source of truth for users, cases, messages, and settings.
- Markdown export is generated on demand from DB.
- AI close flow returns structured JSON only.
- AI no longer writes required `.md` case files.
- Existing localStorage case data is not migrated.

---

## Authentication

### Session Strategy

- Use simple cookie session.
- Do not use JWT in v1.10.
- Store session cookie as HTTP-only.
- Redirect unauthenticated users to `/login`.
- Reject login if user status is `disabled`.

### Default User

Seed default admin:

```text
username: admin
password: admin
role: admin
status: active
```

Production note: password should be changed after deploy.

### Access Control

| Role | Access |
|------|--------|
| `admin` | All pages and APIs |
| `noc` | `/noc`, `/history` filtered to NOC-accessible cases |
| `operation` | `/operation`, `/history` filtered to Operation-accessible cases |

Settings and user management are admin-only.

---

## Database

SQLite via Prisma + libSQL adapter.

No database container. The DB is a file mounted by Docker volume.

### Prisma Schema

```prisma
model User {
  id           String   @id @default(uuid())
  username     String   @unique
  passwordHash String
  role         String   // admin | operation | noc
  status       String   // active | disabled
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model Case {
  id        String   @id @default(uuid())
  caseId    String   @unique // DDMMYYNN, e.g. 29066901
  userId    String
  username  String   // snapshot
  userRole  String   // snapshot: admin | operation | noc
  page      String   // NOC | Operation
  sessionId String
  status    String   // in_progress | closed
  preview   String?
  summary   String?
  detail    String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  closedAt  DateTime?
  messages  ChatMessage[]
}

model ChatMessage {
  id        String   @id @default(uuid())
  caseId    String
  role      String   // user | assistant
  kind      String?  // message | draft | system
  content   String
  createdAt DateTime @default(now())
  case      Case     @relation(fields: [caseId], references: [id])
}

model Setting {
  id        String   @id @default(uuid())
  key       String   @unique
  value     String
  updatedAt DateTime @updatedAt
}
```

### Why Snapshot Username/Role On Case

Cases store `username` and `userRole` snapshots so old logs remain understandable even if a user is renamed, disabled, or role-changed later.

---

## Case ID Generation

Format:

```text
DDMMYYNN
29066901
```

Algorithm:

1. Get current date in app timezone.
2. Convert year to Buddhist year last two digits.
3. Count cases created for the same day.
4. Increment count by 1.
5. Pad sequence to 2 digits.

Example:

```text
29/06/2569 first case  -> 29066901
29/06/2569 second case -> 29066902
```

Sequence is shared across NOC + Operation.

---

## Case Lifecycle

```text
New Case
  ├── auth required
  ├── create opencode session
  └── INSERT Case { status: in_progress, caseId, user snapshot, page }

User Message
  ├── INSERT ChatMessage { role: user, kind: message }
  ├── send to opencode
  └── INSERT ChatMessage { role: assistant, kind: message }

Draft Response
  └── INSERT ChatMessage { role: assistant, kind: draft }

Close Case
  ├── prompt AI for { summary, detail }
  └── UPDATE Case { status: closed, summary, detail, closedAt }
```

LocalStorage:

- v1.10 does not migrate old localStorage cases.
- Existing browser case/message keys can be ignored or cleared on first v1.10 load.

---

## Close Flow JSON Contract

NOC and Operation close prompts must return only JSON-compatible summary data:

```json
{
  "summary": "Customer reported VM unreachable after maintenance window.",
  "detail": "Checked console, restarted the instance, and verified access restored."
}
```

Removed from close output:

- category
- confidence
- status classification beyond `closed`
- required AI-written files

---

## API Routes

### Auth

| Method | Route | Purpose |
|--------|-------|---------|
| `POST` | `/api/auth/login` | Validate credentials, set cookie |
| `POST` | `/api/auth/logout` | Clear cookie |

### Users

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/users` | List users, admin only |
| `POST` | `/api/users` | Add user, admin only |
| `PATCH` | `/api/users/:id` | Edit role/status/password, admin only |
| `DELETE` | `/api/users/:id` | Delete/disable user, admin only |

Implementation can use a single `apps/web1/src/app/api/users/route.ts` with action payloads first if dynamic route is deferred.

### Cases

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/cases` | List cases with filters, limit, cursor |
| `GET` | `/api/cases/:id` | Case detail + messages |
| `GET` | `/api/cases/export` | Markdown export |

List query:

```text
GET /api/cases?from=2026-06-29&to=2026-06-29&page=NOC&status=in_progress&caseId=290669&limit=20&cursor=...
```

Pagination:

- Default `limit=20`.
- `Load more` sends returned cursor.
- Export ignores cursor and exports all matching filters.

### Settings

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/settings` | Load settings + opencode config/providers |
| `PATCH` | `/api/settings` | Save settings and patch opencode config |

### Git Sync

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/admin/git-sync/status` | Return repo config, branch, commit, dirty state, last log |
| `POST` | `/api/admin/git-sync/action` | Run an allowlisted Git Sync action |

Action payload:

```json
{
  "action": "pull_latest",
  "repoUrl": "optional for change_repo only",
  "branch": "optional for change_repo only",
  "confirm": "RESET or RECLONE for destructive actions"
}
```

Allowed action values:

- `check_status`
- `pull_latest`
- `force_reset_pull`
- `reclone`
- `change_repo`

Do not expose raw shell command execution through the API.

---

## Chat API Changes

Existing routes remain:

```text
POST /api/chat/noc
POST /api/chat/operation
```

Changes:

- Require auth.
- `init` creates DB Case.
- `message` writes user/assistant ChatMessage.
- `draft` writes draft ChatMessage.
- `close` updates Case with AI summary/detail.
- Request body may include selected model from settings.

---

## Markdown Export

Input:

```text
from=2026-06-29
to=2026-06-30
page=NOC|Operation|all
status=in_progress|closed|all
caseId=optional
```

Filename:

| Range | Filename |
|-------|----------|
| same day | `case-history-2026-06-29.md` |
| multi-day | `case-history-2026-06-29-to-2026-06-30.md` |

Output includes:

- Date range summary
- Total counts
- Cases grouped by date
- Case metadata
- Closed summary/detail when available
- Full chat history

No server-side archive is written in v1.10.

---

## Settings Storage

Use `Setting` table for app settings:

| Key | Value |
|-----|-------|
| `noc.model` | selected model string |
| `operation.model` | selected model string |
| `noc-agent.temperature` | numeric string |
| `noc-agent.top_p` | numeric string |
| `operation-agent.temperature` | numeric string |
| `operation-agent.top_p` | numeric string |
| `noc-closer.temperature` | numeric string |
| `git.repoUrl` | configured repository URL |
| `git.branch` | branch to sync, default `main` |
| `git.localPath` | local checkout path |
| `git.lastSyncAt` | ISO timestamp of last successful sync |
| `git.lastCommit` | last known commit hash/message |
| `git.lastStatus` | `synced`, `dirty`, `syncing`, `error`, `not_configured` |
| `git.lastLog` | last command output, trimmed to recent lines |

Model selectors use provider/model list from opencode `GET /config/providers`.

Advanced agent config patches opencode with `PATCH /config`.

### Git Sync Execution

Git Sync runs server-side only in the web app container or a helper available to it.

Implementation rules:

- Use a fixed working directory from `git.localPath`; do not accept arbitrary paths from the browser.
- Validate repo URL and branch before saving `change_repo`.
- For `change_repo`, clone into a temporary directory first, then switch active path after success.
- For `pull_latest`, refuse to run when checkout is dirty.
- For `force_reset_pull`, require `confirm=RESET`.
- For `reclone`, require `confirm=RECLONE`.
- Apply a timeout, recommended `120s`.
- Capture stdout/stderr and store trimmed output in `git.lastLog`.
- Log the authenticated admin username, action, start/end time, and result.

Command mapping is internal, for example:

| Action | Internal behavior |
|--------|-------------------|
| `check_status` | status, branch, commit inspection only |
| `pull_latest` | fetch + fast-forward pull |
| `force_reset_pull` | fetch + hard reset to `origin/<branch>` + clean untracked files |
| `reclone` | fresh clone from configured repo/branch |
| `change_repo` | temp clone new URL/branch, then update settings |

The UI may describe actions in friendly labels, but it must not display or accept editable shell commands.

---

## Infrastructure

Production containers after v1.10:

| Container | Keep |
|-----------|------|
| nginx | yes |
| web1 | yes |
| opencode | yes |
| docker-mcp | yes |
| playwright-mcp | no |

SQLite volume:

```text
web1-data:/app/apps/web1/data
DATABASE_URL=file:/app/apps/web1/data/app.db
```

Exact path can be adjusted during implementation, but it must be volume-mounted.

---

## Security Notes

- Hash passwords before storage.
- Do not store plaintext passwords except in docs as seed credential.
- Cookie must be HTTP-only.
- Admin-only APIs must check session role.
- Git Sync APIs are admin-only and must reject raw command payloads.
- Git Sync must not allow arbitrary local paths from the browser.
- Disabled users cannot create new sessions.
- Case History must filter by role for non-admin users.

---

## Open Implementation Choices

These are recommended defaults unless changed later:

| Topic | Default |
|-------|---------|
| Password hash | bcrypt or argon2 |
| Pagination | cursor-based |
| Markdown export | route returns file response |
| Delete user | hard delete if no cases, otherwise disable preferred |
| Old localStorage | clear/ignore |
