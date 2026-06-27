# Production Pilot Log - 2026-06-27

## Deployment

- Production root: `/opt/chatbot-gate`
- Compose file: `/opt/chatbot-gate/docker-compose.yml`
- App source: `/opt/chatbot-gate/app`
- Persistent database: `/opt/chatbot-gate/app-data/prod.db`
- Knowledge base mount: `/opt/chatbot-gate/knowledge-base`
- Backup created before deploy:
  - `/opt/chatbot-gate/backups/app-20260627-195128.tgz`
  - `/opt/chatbot-gate/backups/prod-20260627-195128.db`

## Implemented

- Replaced mock login with DB-backed user authentication.
- Added scrypt password hashing and production user seed.
- Added JWT/session helpers using `JWT_SECRET` from server `.env`.
- Added DB-backed admin APIs for accounts, settings, case logs, and KB sync.
- Wired existing admin UI pages to real APIs instead of client-side mock data.
- Updated NOC and Operation chat APIs to require real sessions, enforce role access, and save case history with real user IDs.
- Added Docker startup flow: `prisma db push`, production seed, then `next start`.
- Moved production secrets to `/opt/chatbot-gate/.env` via Compose `env_file`.

## Verification

- Docker build on Ubuntu completed successfully.
- Containers running:
  - `chatbot-gate-web-1`
  - `chatbot-gate-nginx-1`
- Startup logs show:
  - Prisma schema is in sync.
  - Production seed created 5 users.
  - Default settings are present.
  - Next.js server is ready.
- Database counts after deploy:
  - `User`: 5
  - `Setting`: 3
  - `CaseLog`: 5
  - `ChatMessage`: 10
- Seeded users:
  - `admin` / `ADMIN`
  - `noc01` / `NOC`
  - `noc02` / `NOC`
  - `ops01` / `OPERATION`
  - `ops02` / `OPERATION`
- Admin API checks:
  - `/api/auth/login` succeeded with `admin / password`.
  - `/api/auth/me` returned the DB user.
  - `/api/admin/accounts` returned 5 users.
  - `/api/admin/settings` returned persisted settings and `OPENCODE_API_CONFIGURED=false`.
  - `/api/admin/sync` loaded 187 KB entries from `/knowledge-base/knowledge`.
  - `/api/admin/cases` returned 5 existing production cases.
- Role checks:
  - `noc01` can read `/api/admin/cases`.
  - `noc01` receives `403` for `/api/admin/accounts`.
  - `ops01` receives `403` for `/api/chat/noc`.
- Page checks after admin login returned HTTP 200:
  - `/admin/accounts`
  - `/admin/settings`
  - `/admin/sync`
  - `/admin/cases`
  - `/noc/chat`
  - `/operation/chat`

## Remaining Items

- `OPENCODE_API_KEY` is not configured yet, so NOC and Operation chat endpoints correctly return `503` instead of silently using mock AI.
- Live-AI verification requires adding a real key to `/opt/chatbot-gate/.env` and recreating the web container.
- Next.js 15.2.1 still reports a security advisory during build.
- Build logs still show `jose` Edge Runtime warnings for compression APIs.
- Docker Compose warns that the top-level `version` field is obsolete.

## Follow-up Deployment - 20:00 ICT

- Backup created before the follow-up deploy:
  - `/opt/chatbot-gate/backups/app-20260627-195902.tgz`
  - `/opt/chatbot-gate/backups/prod-20260627-195902.db`
- Improved NOC and Operation chat UI behavior when the AI provider is not configured.
- Rebuilt and recreated `chatbot-gate-web-1` successfully.
- Startup logs show the seed step skipped existing users and preserved current data.
- Runtime verification:
  - Admin settings API reports `OPENCODE_API_CONFIGURED=false`.
  - KB sync still loads 187 entries.
  - NOC chat returns `503` with `AI provider is not configured`.
  - Operation chat returns `503` with `AI provider is not configured`.

## Hardening Deployment - 20:04 ICT

- Backup created before the hardening deploy:
  - `/opt/chatbot-gate/backups/app-20260627-200418.tgz`
  - `/opt/chatbot-gate/backups/prod-20260627-200418.db`
- Upgraded Next.js from `15.2.1` to `15.5.19`.
- Narrowed `jose` imports to JWT-specific subpaths; Docker build no longer shows the previous Edge Runtime compression warnings.
- Removed the obsolete Docker Compose top-level `version` field from the production compose file.
- Rebuilt and recreated `chatbot-gate-web-1` successfully.
- Runtime verification:
  - Startup logs show Next.js `15.5.19`.
  - Compose no longer emits the obsolete `version` warning.
  - Admin auth, accounts API, and KB sync checks pass.
  - NOC chat still returns `503` while `OPENCODE_API_KEY` is missing.
  - Database counts remain preserved: 5 users, 3 settings, 5 cases, 10 chat messages.

## Account Management Hardening - 20:10 ICT

- Backup created before the account-management deploy:
  - `/opt/chatbot-gate/backups/app-20260627-200947.tgz`
  - `/opt/chatbot-gate/backups/prod-20260627-200947.db`
- Added password reset controls to the Accounts UI, wired to the existing reset-password API.
- Prevented an admin from deactivating or deleting their own account.
- Rebuilt and recreated `chatbot-gate-web-1` successfully.
- Runtime verification:
  - Self-disable returns `400`.
  - Self-delete returns `400`.
  - A temporary user can be created, password-reset, logged in with the new password, and deleted.
  - Database counts after cleanup remain preserved: 5 users, 3 settings, 5 cases, 10 chat messages.

## Health Endpoint Deployment - 20:14 ICT

- Backup created before the health endpoint deploy:
  - `/opt/chatbot-gate/backups/app-20260627-201357.tgz`
  - `/opt/chatbot-gate/backups/prod-20260627-201357.db`
- Added public sanitized health endpoint at `/api/health`.
- The endpoint reports app version, Next.js version, DB status, seed status, KB status, AI-provider configuration status, and aggregate counts without exposing secrets or case contents.
- Rebuilt and recreated `chatbot-gate-web-1` successfully.
- Runtime verification:
  - `/api/health` returns HTTP `200`.
  - Health status is `ok`.
  - DB, users, settings, and KB checks are `ok`.
  - AI provider status is `missing`, matching the current server `.env`.
  - Counts match production state: 5 users, 3 settings, 5 cases, 10 chat messages, 187 KB entries.

## Live Dashboard Deployment - 20:17 ICT

- Backup created before the live-dashboard deploy:
  - `/opt/chatbot-gate/backups/app-20260627-201716.tgz`
  - `/opt/chatbot-gate/backups/prod-20260627-201716.db`
- Replaced mock Admin Dashboard metrics and recent cases with DB-backed data.
- Added `/api/admin/dashboard`, protected by admin session auth.
- Dashboard now shows live totals for cases, open/pending cases, active users, loaded KB entries, and AI provider status.
- Gate integration cards now reflect actual AI, KB, and outbound hook configuration state.
- Rebuilt and recreated `chatbot-gate-web-1` successfully.
- Runtime verification:
- /api/admin/dashboard returns 5 total cases, 5 active users, 187 KB entries, and ai=missing.
  - Recent cases are loaded from production CaseLog.
  - /admin/dashboard returns HTTP 200 after admin login.

## Audit Logging Deployment - 20:45 ICT

- **Backups associated**:
  - `/opt/chatbot-gate/backups/app-20260627-202100.tgz`
  - `/opt/chatbot-gate/backups/prod-20260627-202100.db`
- **Changes Deployed**:
  - Initialized git on `/opt/chatbot-gate/app` to track `origin/main` repository and cleanly checkout the source code.
  - Resolved a Next.js environment variables build-time inlining issue by changing the database connection URL retrieval in `apps/web/src/lib/db.ts` to `process.env['DATABASE_URL']` (bracket notation).
  - Cleaned up the host environment file `/opt/chatbot-gate/.env` to fix newline formatting (removed literal `n` endings that were mangling keys).
  - Rebuilt and recreated `chatbot-gate-web-1` and `chatbot-gate-nginx-1` containers.
  - Ran `prisma db push` to verify database schema sync.
- **Verification Results**:
  - **API Audit Trigger**: Sent API requests to the `/api/auth/login` and `/api/admin/settings` endpoints, returning valid `401 Unauthorized`, `200 OK` (login success), and `200 OK` (settings update success) responses.
  - **Database Verification**: Queried the `AuditLog` table using Node/Prisma in the container, confirming correct event logging:
    ```json
    [
      {
        id: '11c63422-180c-47e8-a36c-a448c6e13a6e',
        timestamp: 2026-06-27T13:45:21.084Z,
        userId: 'e2ac7887-1c58-4c4c-a40a-1171e27c1843',
        action: 'ADMIN_SETTINGS_UPDATE',
        target: 'settings',
        status: 'SUCCESS',
        ip: '::ffff:172.18.0.3',
        userAgent: 'curl/8.18.0',
        detail: 'Updated KB_REPO_URL, AI_MODEL, or CASE_PUSH_ENDPOINT'
      },
      {
        id: 'b1aef13d-6b4b-4bbc-b870-2d2cf91bd448',
        timestamp: 2026-06-27T13:45:20.976Z,
        userId: 'e2ac7887-1c58-4c4c-a40a-1171e27c1843',
        action: 'AUTH_LOGIN',
        target: 'admin',
        status: 'SUCCESS',
        ip: '::ffff:172.18.0.3',
        userAgent: 'curl/8.18.0',
        detail: null
      },
      {
        id: 'e7a6768b-9db9-4423-93ed-5d335a411a51',
        timestamp: 2026-06-27T13:44:02.580Z,
        userId: 'anonymous',
        action: 'AUTH_LOGIN',
        target: 'admin',
        status: 'FAILURE',
        ip: '::ffff:172.18.0.3',
        userAgent: 'curl/8.18.0',
        detail: 'Invalid credentials or inactive account'
      }
    ]
    ```

---

## Handoff Checklist & Next Steps for Another Engineer

The following tasks are completed or remain to be executed:

### 1. Rebuild & Recreate Container
- [x] Connect to the production server `203.154.16.197` via SSH.
- [x] Navigate to the project root directory: `cd /opt/chatbot-gate`
- [x] Ensure the source folder `/opt/chatbot-gate/app` has the latest code (tracking origin Git).
- [x] Rebuild and recreate the container using Docker Compose.

### 2. Verify Audit Logging Functionality
- [x] Test login success/failure, user management actions, settings update, and KB sync.
- [x] Verify database row insertion in `AuditLog` table.

### 3. Record Audit Log Deployment
- [x] Update log documentation.

### 4. Enable and Verify Live AI
- [ ] When the `OPENCODE_API_KEY` becomes available, add it to `/opt/chatbot-gate/.env`:
  ```env
  OPENCODE_API_KEY="your-actual-api-key-here"
  ```
- [ ] Recreate the container:
  ```bash
  docker compose up -d --force-recreate web
  ```
- [ ] Verify that:
  - `/api/health` status changes to show the AI provider is configured.
  - Admin settings / dashboard report that the AI provider is active/configured.
  - NOC and Operation chatbot interfaces return live AI generated responses instead of `503 Service Unavailable`.

