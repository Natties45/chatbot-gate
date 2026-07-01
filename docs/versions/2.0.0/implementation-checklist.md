# Implementation Checklist - app2 v2.0.0

> Status: In Progress (2026-07-01)
> Purpose: turn the v2.0.0 design into buildable steps without re-deciding architecture during implementation.

---

## Build Boundary

- [x] Build a new `apps/app2` app.
- [x] Reuse `apps/web1` UI, auth, case lifecycle, and history/export patterns where practical.
- [x] Replace `apps/web1/src/lib/opencode-service.ts` with app2-owned LLM routing, prompt registry, and MCP gateway code.
- [x] Keep `apps/web1` running unchanged until app2 is verified.

---

## Phase 0 - Baseline

- [x] Confirm `docs/adr/ADR-0004-app2-free-first-llm-mcp.md` is accepted or explicitly kept as proposed during prototype.
- [x] Confirm required env vars: `GROQ_API_KEY`, `OLLAMA_BASE_URL`, `KNOWLEDGE_REPO_PATH`, `MCP_KB_URL`, `MCP_CASE_HISTORY_URL`.
- [x] Confirm production app2 route shape: `/app2` behind nginx during transition.
- [x] Confirm app2 dev port `4570`; avoids `web1` port `4568`.

---

## Phase 1 - app2 Scaffold

- [x] Scaffold `apps/app2` from `apps/web1`.
- [x] Update `apps/app2/package.json` name/version to `app2` / `2.0.0`.
- [x] Update sidebar to "GATE 2".
- [x] Keep auth routes and role checks: admin, noc, operation.
- [x] Keep NOC and Operation as separate pages.
- [x] Keep history, export, settings, and user management routes.
- [x] Remove or isolate opencode-specific UI/settings from app2.
- [x] Set `basePath: '/app2'` in `next.config.ts`.
- [x] Create `src/lib/api.ts` helper (`apiUrl`) for client-side fetch under `/app2`.
- [x] Update all client `fetch()` calls to use `apiUrl()`.

Reusable web1 starting points:

| Area | Source |
|------|--------|
| Auth | `apps/web1/src/lib/auth.ts`, `src/app/api/auth/*` |
| Case DB helpers | `apps/web1/src/lib/case-db.ts` |
| Routes | `apps/web1/src/app/api/chat/noc/route.ts`, `operation/route.ts` |
| Settings | `apps/web1/src/lib/settings-db.ts`, `src/app/api/settings/route.ts` |
| UI shell | `apps/web1/src/components/layout/*`, `src/app/noc`, `src/app/operation` |

---

## Phase 2 - Database

- [x] Start from `apps/web1/prisma/schema.prisma`.
- [x] Add provider/model fields to `ChatMessage`.
- [x] Add `ToolCallLog` for MCP visibility.
- [x] Add `LlmCallLog` for provider attempts and fallback events.
- [x] Keep `Case.caseId` format and current lifecycle: `in_progress` to `closed`.
- [x] Generate Prisma client and create migrations for app2.
- [x] Fix case ID race condition: retry on unique constraint (3 attempts).

---

## Phase 3 - AI Brain

- [x] Create `apps/app2/gate-answer-app2/roles/noc.md`.
- [x] Create `apps/app2/gate-answer-app2/roles/operation.md`.
- [x] Create action prompts for NOC: analyze, chat, draft, draft-feedback, feedback, close, email, escalate.
- [x] Create action prompts for Operation: chat (op-send), close (op-close).
- [x] Implement `prompt-registry.ts` to load prompt files from disk.
- [x] Implement interpolation for shared variables.
- [x] Enforce customer-facing Thai style in NOC prompts.

---

## Phase 4 - LLM Router

- [x] Implement `src/lib/ai/providers/groq.ts` using Groq OpenAI-compatible chat completions.
- [x] Implement `src/lib/ai/providers/ollama.ts` using Ollama local chat API.
- [x] Implement `src/lib/ai/llm-router.ts` with provider order: Groq then Ollama.
- [x] Classify errors: `rate_limit`, `provider_down`, `bad_request`, `auth_error`, `local_unavailable`.
- [x] Use timeouts: Groq 60s, Ollama 180s.
- [x] Reduce prompt size when falling back to `qwen3:4b`.
- [x] Write `LlmCallLog` for every provider attempt.
- [x] Return model/provider metadata to the API route for message persistence.
- [x] Support role-specific model/temperature override from settings.

---

## Phase 5 - MCP Gateway

- [x] Implement `src/lib/mcp/tool-policy.ts` with role/page allowlists.
- [x] Implement `src/lib/mcp/mcp-gateway.ts` with timeout, denial, logging, and result truncation.
- [x] Wire `kb-mcp` client (`src/lib/mcp/kb-mcp-client.ts`).
- [x] Wire `case-history-mcp` client (`src/lib/mcp/case-history-mcp-client.ts`).
- [x] Keep Docker MCP read-only and Operation/Admin only.
- [x] Deny destructive Docker/Git/raw shell tools in v2.0.0.
- [ ] **BLOCKER**: `kb-mcp` and `case-history-mcp` server implementations not yet built.
  - `Dockerfile.kb-mcp` and `Dockerfile.case-history-mcp` not yet created.
  - `mcp/servers/kb-mcp/` and `mcp/servers/case-history-mcp/` not yet created.
  - App2 gracefully degrades without them (empty KB/case context in prompts).

---

## Phase 6 - Chat APIs

- [x] Replace NOC API calls with `aiBrain.runChatAction`.
- [x] Replace Operation API calls with `aiBrain.runChatAction`.
- [x] Preserve existing actions: `init`, `message`, `close`, plus NOC draft/feedback.
- [x] Save user and assistant messages with provider/model metadata.
- [x] Save tool calls and LLM call logs linked to the active case.
- [x] Make `close` produce parseable JSON summary/detail with safe fallback.
- [x] Return clear errors when providers are unavailable.
- [x] Fix auth/case ownership: `getCaseBySessionId` now validates `userId` and `page`.

---

## Phase 7 - Settings And Sync

- [x] Replace opencode settings with LLM, fallback, MCP, and KB sync settings.
- [x] Add admin-only KB sync status/action routes.
- [x] Add admin-only Git sync status/action routes.
- [x] Store last sync time, commit hash, index status, and last error.
- [x] Keep API keys server-side only.
- [x] Role-specific model/temperature settings now actually used by runtime.
- [x] Seed admin uses env vars (`APP2_ADMIN_USERNAME`, `APP2_ADMIN_PASSWORD`).

---

## Phase 8 - Evaluation

- [ ] Create Thai NOC eval cases for common customer issues.
- [ ] Create NOC ambiguous/draft-quality eval cases.
- [ ] Create Operation log/incident eval cases.
- [ ] Create fallback eval cases that force Ollama.
- [ ] Verify forbidden terms are not exposed in customer-facing drafts.
- [ ] Verify tool-call logs are useful but sanitized.

---

## Phase 9 - Deploy Alongside web1

- [x] Add app2 Dockerfile/build target (port 3001).
- [x] Add app2 and Ollama to docker-compose.yml.
- [x] Update nginx.conf with `/app2` route (port 3001).
- [x] Set `basePath: '/app2'` in Next.js config.
- [ ] Preload Ollama `qwen3:4b` on the server (during actual deploy).
- [ ] Mount the knowledge repo read-only for app2.
- [ ] Route `/app2` to app2 in nginx while `/` remains web1.
- [ ] Verify rollback by leaving web1 unchanged.

---

## Verification Commands

Run from `apps/app2` after implementation:

```bash
npm run prisma:generate
npm run lint
npm run build
```

If migrations are created:

```bash
npm run prisma:migrate
```

---

## Cutover Readiness

- [ ] NOC chat answers without opencode.
- [ ] Operation chat answers without opencode.
- [ ] Groq primary path works with `qwen/qwen3-32b`.
- [ ] Ollama fallback works with `qwen3:4b`.
- [ ] KB retrieval works through `kb-mcp` (server not yet built).
- [ ] Case history retrieval works through `case-history-mcp` (server not yet built).
- [ ] Cases close with summary/detail saved.
- [ ] Tool and LLM logs are visible enough for debugging.
- [ ] No destructive tools are reachable from app2.
