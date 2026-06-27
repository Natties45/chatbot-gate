# Production Test Log - 2026-06-27

## Scope

Tested the deployed Chatbot Gate MVP at `http://203.154.16.197/login` through Chrome as real users for NOC, Operation, and Admin roles. SSH diagnosis used `root@203.154.16.197` with the project key when browser testing exposed server-side issues.

No UI changes were made. Fixes were limited to backend logic, middleware, response normalization, and deployment configuration.

## Issues Found

- Login API returned `200`, but Chrome stayed on `/login` because the session cookie had `Secure` on an HTTP-only deployment.
- NOC chat attempted to persist case logs, but production SQLite was missing tables and Prisma logged `no such table: main.CaseLog`.
- `/admin/cases` was documented and shown in the sidebar for `NOC` and `OPERATION`, but middleware blocked all `/admin/*` routes for non-admin users.
- NOC response references rendered as `[object Object]` because the API returned source objects while the current UI expected strings.
- Mock NOC confidence used `0.95`, which displayed as `0.95%` instead of `95%`.

## Changes Deployed

- `apps/web/src/app/api/auth/login/route.ts`
  - Cookie `secure` is now based on `COOKIE_SECURE=true`, forwarded HTTPS, or request HTTPS.
  - Cookie path is explicitly `/`.
- `apps/web/src/middleware.ts`
  - `/admin/cases` allows `ADMIN`, `NOC`, and `OPERATION`.
  - Other `/admin/*` paths remain admin-only.
- `apps/web/src/app/api/chat/noc/route.ts`
  - Normalizes `sources` into strings before returning JSON and saving the case.
- `apps/web/src/lib/ai-service.ts`
  - VM creation mock confidence changed from `0.95` to `95`.
- `Dockerfile`
  - Runs `npx prisma db push` before `next start`.
- Deployment config
  - Production Compose uses `COOKIE_SECURE=false`.
  - Nginx proxies port 80 to the web container and forwards `X-Forwarded-Proto`.

## Verification Results

- Docker build on the Ubuntu server completed successfully.
- Containers were running:
  - `chatbot-gate-web-1`
  - `chatbot-gate-nginx-1`
- Startup log showed Prisma schema sync:
  - SQLite database `prod.db`
  - "The database is already in sync with the Prisma schema."
- Browser tests:
  - `noc01 / password` logged in and reached `/noc/chat`.
  - NOC menu showed NOC Chat and Case Logs.
  - NOC test message `TEST-CODEX-20260627 NOC2` returned category `Compute - VM Creation Failure`, confidence `95%`, and source `OpenStack VM Instance FAQ (vm-instance.yaml)`.
  - `noc01` reached `/admin/cases`.
  - `ops01 / password` logged in and reached `/operation/chat`.
  - Operation test log containing connection pool errors returned `Database Connection Pool Exhaustion`.
  - `ops01` reached `/admin/cases` and was redirected away from `/admin/dashboard`.
  - `admin / password` reached `/admin/dashboard` and saw admin, NOC, Operation, Case Logs, Sync, Accounts, and Settings navigation.
- Database verification:
  - Tables present: `AuditLog`, `CaseLog`, `ChatMessage`, `Setting`, `User`.
  - `CaseLog` contained test entries with `TEST-CODEX-20260627`.

## Remaining Warnings

- Next.js 15.2.1 reports a security advisory during install/build and should be upgraded in a separate dependency-hardening task.
- Build logs include `jose` Edge Runtime warnings for compression APIs.
- Local Windows verification is partially blocked by environment-specific issues:
  - PowerShell execution policy blocks `npm.ps1`; `npm.cmd` works.
  - Local Windows ARM build is missing `@libsql/win32-arm64-msvc`, while Linux Docker build succeeds.
