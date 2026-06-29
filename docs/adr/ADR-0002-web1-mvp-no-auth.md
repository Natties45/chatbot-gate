---
status: accepted
date: 2026-06-27
deciders: natties45
consulted: cid-architect
informed: vivi-researcher
---

# ADR-0002: web1 as MVP — No Login, localStorage

## Context

The old `apps/web` has JWT auth, Prisma/SQLite, role-based dashboards, and incorrect AI integration. We need a clean MVP to validate core opencode integration before adding auth complexity.

## Decision

Create `apps/web1` as a simplified zero-login MVP:
- No authentication
- No database — use localStorage for case persistence
- Direct opencode HTTP calls (no AI wrapper service)
- Single-server deployment with Docker Compose

## Rationale

- **Validate core flow first** — prove that NOC/Operation chat works end-to-end through opencode before adding auth
- **Speed of iteration** — no DB migrations, no login flows, no session management
- **LocalStorage is sufficient** for a single-operator prototype; data loss on browser clear is acceptable at this stage
- **Old app kept as reference** — `apps/web` is deprecated but preserved for auth patterns and DB schema

## Consequences

- No multi-user support — single operator per browser
- Case history is per-browser — no shared state
- Must add auth before any production multi-operator deployment
- Old `apps/web` code will drift; eventually should be removed or rewritten
