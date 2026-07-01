---
status: proposed
date: 2026-07-01
deciders: natties45
consulted: OpenCode
informed: cid-architect, zidane-builder, steiner-deployer
---

# ADR-0004: app2 Free-First LLM Router with MCP Tool Gateway

## Context

`web1` uses opencode as the AI bridge. That design worked for the first app, but app2 has new constraints and goals:

- The app should not depend on opencode as the primary AI runtime.
- The solution should be free-first because there is no budget for paid LLM usage.
- The production server has no GPU, so self-hosted local models should be fallback, not the primary high-quality path.
- The app should keep the original chatbot concept: NOC and Operation pages, Thai response drafting, and case recording.
- MCP should be used as controlled tool access for knowledge, case memory, web retrieval, and read-only operations diagnostics.

## Decision

Build `apps/app2` with an app-owned AI architecture:

1. Use Groq Free as the primary provider.
2. Use `qwen/qwen3-32b` as the primary hosted model.
3. Use Ollama `qwen3:4b` as local fallback.
4. Replace `.opencode` runtime behavior with app2-owned prompt registry, role profiles, tool policies, case memory, and fallback logic.
5. Keep the existing knowledge repo as the source of truth and expose it through `kb-mcp`.
6. Use MCP through an app-controlled gateway with role-based allowlists and read-only defaults.
7. Keep opencode out of the app2 primary path. It may be added later as an optional MCP/tool for second opinion only.

## Rationale

- Groq Free avoids GPU requirements and provides hosted inference at no direct cost within free quota.
- Qwen3 has multilingual and tool-use capabilities suitable for a free-first chatbot.
- Ollama `qwen3:4b` gives a no-cost local fallback when external quota is exhausted or unavailable.
- App-owned prompts and tool policy make behavior easier to debug than routing everything through opencode.
- MCP is a better abstraction for tools than hardcoding every external capability into chat routes.
- Keeping the knowledge repo separate preserves the existing source-of-truth workflow.

## Consequences

Positive:

- app2 can operate without opencode.
- AI behavior becomes app-controlled and auditable.
- Free-first operation is possible with graceful local fallback.
- Tool permissions can be stricter and role-aware.
- Case memory and KB retrieval can be improved independently.

Negative:

- app2 must implement provider routing, prompt handling, MCP integration, and fallback logic itself.
- Free provider quota can still be exhausted.
- Local fallback will be slower and lower quality on CPU.
- More app-side logging and safety design is required.

## Implementation Notes

- Start by reusing `web1` UI, auth, DB, and case lifecycle code where possible.
- Replace `opencode-service.ts` with `llm-router.ts`, provider adapters, and `mcp-gateway.ts`.
- Build `kb-mcp` and `case-history-mcp` first.
- Run app2 alongside web1 until the new architecture is verified.
- Do not redesign the knowledge repo upfront; add indexing/normalization only when evidence shows it is needed.

## Supersedes

This ADR supersedes `ADR-0001: opencode as AI Bridge` for `apps/app2` only. `web1` may continue using opencode until app2 replaces it operationally.
