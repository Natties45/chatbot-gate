# ADR-0002: Production Deployment And Auth Hardening

## Status

Accepted

## Context

The production MVP runs on an Ubuntu server at `203.154.16.197` behind Docker Compose and Nginx. Browser testing found that the login API returned a successful response, but the browser stayed on `/login` because the session cookie was marked `Secure` while the site was served over plain HTTP.

The same production test also found that NOC chat attempted to save case history into SQLite before the production database schema existed, causing Prisma to report `no such table: main.CaseLog`. Role-based navigation showed that NOC and Operation users are expected to access Case Logs, but middleware treated every `/admin/*` route as admin-only.

## Decision

Keep the MVP deployment as a single-server Docker Compose setup with Nginx proxying port 80 to the Next.js web container.

Session cookies must be HTTP-only and same-site, but the `Secure` attribute must be controlled by deployment protocol. For the current HTTP deployment, `COOKIE_SECURE=false` is used. Future HTTPS deployment can set `COOKIE_SECURE=true` without changing application code.

The web container must sync the Prisma schema on startup before running `next start`, using `npx prisma db push`. This keeps the SQLite volume usable after first deploy and after schema changes during the MVP phase.

Case Logs remain under `/admin/cases`, but middleware must explicitly allow `ADMIN`, `NOC`, and `OPERATION` for that route while keeping the rest of `/admin/*` admin-only.

NOC chat responses must normalize API sources into display-safe strings before returning JSON to the browser, preserving the current UI while avoiding `[object Object]` output.

## Consequences

- Login works on the current HTTP production endpoint without requiring a UI change.
- The same code path can later support HTTPS by changing deployment configuration.
- Production startup now repairs missing SQLite schema for MVP deployments.
- NOC and Operation users can access Case Logs as documented, while admin-only pages remain protected.
- Startup schema sync is acceptable for the MVP SQLite deployment, but a future production database should move to explicit migrations and release checks.
- Remaining production hardening items include upgrading Next.js for the reported security advisory and reviewing the `jose` Edge Runtime warning.
