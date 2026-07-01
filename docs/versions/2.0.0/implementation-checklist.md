# Implementation Checklist - app2 v2.0.0

> Purpose: turn the v2.0.0 design into buildable steps without re-deciding architecture during implementation.

---

## Build Boundary

- Build a new `apps/app2` app.
- Reuse `apps/web1` UI, auth, case lifecycle, and history/export patterns where practical.
- Replace `apps/web1/src/lib/opencode-service.ts` with app2-owned LLM routing, prompt registry, and MCP gateway code.
- Keep `apps/web1` running unchanged until app2 is verified.

---

## Phase 0 - Baseline

- [ ] Confirm `docs/adr/ADR-0004-app2-free-first-llm-mcp.md` is accepted or explicitly kept as proposed during prototype.
- [ ] Confirm required env vars: `GROQ_API_KEY`, `OLLAMA_BASE_URL`, `KNOWLEDGE_REPO_PATH`, `MCP_KB_URL`, `MCP_CASE_HISTORY_URL`.
- [ ] Confirm production app2 route shape: `/app2` behind nginx during transition.
- [ ] Confirm app2 dev port; avoid `web1` port `4568`.

---

## Phase 1 - app2 Scaffold

- [ ] Copy or scaffold `apps/app2` from `apps/web1`.
- [ ] Update `apps/app2/package.json` name/version to `app2` / `2.0.0`.
- [ ] Update app branding/sidebar/version labels from web1 to app2.
- [ ] Keep auth routes and role checks: admin, noc, operation.
- [ ] Keep NOC and Operation as separate pages.
- [ ] Keep history, export, settings, and user management routes where still applicable.
- [ ] Remove or isolate opencode-specific UI/settings from app2.

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

- [ ] Start from `apps/web1/prisma/schema.prisma`.
- [ ] Add provider/model fields to `ChatMessage`.
- [ ] Add `ToolCallLog` for MCP visibility.
- [ ] Add `LlmCallLog` for provider attempts and fallback events.
- [ ] Keep `Case.caseId` format and current lifecycle: `in_progress` to `closed`.
- [ ] Decide whether `Case.sessionId` remains an app-generated chat session id or is renamed during app2 build.
- [ ] Generate Prisma client and create migration for app2 only.

---

## Phase 3 - AI Brain

- [ ] Create `apps/app2/gate-answer-app2/roles/noc.md`.
- [ ] Create `apps/app2/gate-answer-app2/roles/operation.md`.
- [ ] Create action prompts for NOC analyze/chat/draft/feedback/close.
- [ ] Create action prompts for Operation chat/close.
- [ ] Implement `prompt-registry.ts` to load prompt files from disk.
- [ ] Implement interpolation for shared variables: `MESSAGE`, `CASE_ID`, `PAGE`, `USER_ROLE`, `RECENT_HISTORY`, `KB_RESULTS`, `CASE_RESULTS`, `FEEDBACK`.
- [ ] Enforce customer-facing Thai style in NOC prompts.

---

## Phase 4 - LLM Router

- [ ] Implement `src/lib/ai/providers/groq.ts` using Groq OpenAI-compatible chat completions.
- [ ] Implement `src/lib/ai/providers/ollama.ts` using Ollama local chat/generate API.
- [ ] Implement `src/lib/ai/llm-router.ts` with provider order: Groq then Ollama.
- [ ] Classify errors: `rate_limit`, `provider_down`, `bad_request`, `auth_error`, `local_unavailable`.
- [ ] Use timeouts: Groq 60s, Ollama 180s, full request 240s.
- [ ] Reduce prompt size when falling back to `qwen3:4b`.
- [ ] Write `LlmCallLog` for every provider attempt.
- [ ] Return model/provider metadata to the API route for message persistence.

---

## Phase 5 - MCP Gateway

- [ ] Implement `src/lib/mcp/tool-policy.ts` with role/page allowlists.
- [ ] Implement `src/lib/mcp/mcp-gateway.ts` with timeout, denial, logging, and result truncation.
- [ ] Build or wire `kb-mcp` with `kb_search`, `kb_read`, `style_guide_read`, `template_read`.
- [ ] Build or wire `case-history-mcp` with `case_search`, `case_read`, `case_similar`.
- [ ] Keep Docker MCP read-only and Operation/Admin only.
- [ ] Keep Playwright MCP dev/test only.
- [ ] Deny destructive Docker/Git/raw shell tools in v2.0.0.

---

## Phase 6 - Chat APIs

- [ ] Replace NOC API calls to `opencodeService.sendSystemMessage` with `aiBrain.runNocAction` or equivalent.
- [ ] Replace Operation API calls to `opencodeService.sendSystemMessage` with `aiBrain.runOperationAction` or equivalent.
- [ ] Preserve existing actions where useful: `init`, `message`, `close`, plus NOC draft/feedback prompt types.
- [ ] Save user and assistant messages with provider/model metadata.
- [ ] Save tool calls and LLM call logs linked to the active case.
- [ ] Make `close` produce parseable JSON summary/detail, with a safe fallback if parsing fails.
- [ ] Return clear 503/friendly errors when both Groq and Ollama are unavailable.

---

## Phase 7 - Settings And Sync

- [ ] Replace opencode settings with LLM, fallback, MCP, and KB sync settings.
- [ ] Add admin-only KB sync status/action routes.
- [ ] Ensure KB sync does not run on every chat request.
- [ ] Store last sync time, commit hash, index status, and last error.
- [ ] Keep API keys server-side only.

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

- [ ] Add app2 Dockerfile/build target if not copied from web1.
- [ ] Add app2, Ollama, kb-mcp, and case-history-mcp to compose/deployment config.
- [ ] Preload Ollama `qwen3:4b` on the server.
- [ ] Mount the knowledge repo read-only for `kb-mcp` runtime reads.
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
- [ ] KB retrieval works through `kb-mcp`.
- [ ] Case history retrieval works through `case-history-mcp`.
- [ ] Cases close with summary/detail saved.
- [ ] Tool and LLM logs are visible enough for debugging.
- [ ] No destructive tools are reachable from app2.
