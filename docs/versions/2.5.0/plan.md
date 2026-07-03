# Version 2.5.0 Plan

**Goal:** Fix AI intelligence and persona boundaries based on test results from v2.4.0 (Intelligence Testing). The primary focus is updating the System Prompts (Option A) to enforce strict boundary control, while marking the 503 infrastructure issue (Option B) for future resolution.

## References
- Test Results: `docs/test-results-intelligence.md`
- Personas: `openstack-support/AGENTS.md`
- Target Agents: `apps/app2/gate-answer-app2/agents/noc-agent.md`, `apps/app2/gate-answer-app2/agents/operation-agent.md`

## 1. Deep Research & Persona Alignment

Based on cross-referencing with the `openstack-support` repository, the agents must strictly adhere to the following OLS DNA:
- **NOC Agent:** 
  - Must not provide solutions or templates for out-of-scope issues (e.g., cooking recipes, coding, weather). It must reject them with `Category: Generic` and `Confidence: 0%`.
  - Must enforce the "Clarify" state for ambiguous queries (e.g., "forgot password" could be VM or Portal) and "Confirm" state for high-risk queries (e.g., "resize instance").
  - Must use formal Thai ("เรียน ผู้ใช้บริการ", "ขอบคุณครับ").
  - Must mitigate Prompt Injections (e.g., "Ignore all previous instructions...").
- **Operation Agent:**
  - Must not apply its strict diagnostic format (`Issue / Likely Cause / Actions / References`) to out-of-scope non-technical queries. It should reject them gracefully instead of attempting to diagnose why it can't answer them.

## 2. Action Plan (Option A) - Prompt Engineering ✅ COMPLETED

### Root Cause Found
The `prompt-registry.ts` used `readFirstExisting` to load role prompts, which loaded only `roles/*.md` (thin role files) while skipping `agents/*.md` (comprehensive agent definitions with boundary controls). The v2.5.0 boundary enforcement rules were added to `agents/*.md` files that were never loaded — dead code.

### Fixes Applied (7 files)

#### 2.0 `prompt-registry.ts` (Root Cause Fix)
- Changed `loadRolePrompt` from `readFirstExisting` (first-match) to `readAllExisting` (concat all candidates)
- System prompt now includes BOTH `roles/*.md` + `agents/*.md` + action prompt

#### 2.1 `agents/noc-agent.md`
- KB section: removed file-reading instructions ("read the matching YAML file"). Now says "KB results are pre-loaded via context."
- KB Search Strategy: "Read the YAML" → "Correlate with KB results"
- Out-of-Scope: added "UNDER NO CIRCUMSTANCES" + explicit Rejection Pattern with examples
- Prompt Injection: added explicit Thai rejection text + "never reveal" clause
- Clarify/Confirm: strengthened with "MUST NOT provide any generic guide or answer" + Thai examples
- Workflow phases: removed file-system path references

#### 2.2 `agents/operation-agent.md`
- KB section: removed file-reading references
- Out-of-Scope: added "UNDER NO CIRCUMSTANCES" + rejection pattern with ❌/✅ examples
- Prompt Injection: strengthened with explicit Thai rejection text
- Output Format: added exception "For valid IT/Operations queries only. For out-of-scope, use simple rejection."

#### 2.3 `prompts/noc-analyze.md`
- Added `## Priority: Out-of-Scope Check (DO THIS FIRST)` before all instructions
- Out-of-scope → output ONLY rejection block, do not categorize
- KB search instructions: "Read YAML" → "Cross-reference with pre-loaded KB results"

#### 2.4 `prompts/op-send.md`
- Added `## Priority: Out-of-Scope Check (DO THIS FIRST)`
- "If NOT IT ops → do NOT use diagnostic format, respond ONLY with Thai rejection"
- KB search: "Search knowledge base" → "Cross-reference with pre-loaded KB results"

#### 2.5 `prompts/op-diagnose.md`
- Added `## Priority: Out-of-Scope Check (DO THIS FIRST)` with same rejection rule

#### 2.6 `prompts/noc-chat.md`
- Added `## Priority: Out-of-Scope Check` at top
- Strengthened "politely redirect" → "reject it immediately — do not provide any off-topic information"

#### 2.7 `prompts/noc-email.md` + `prompts/noc-draft.md`
- Removed file-reading instructions → "Use pre-loaded templates/style guide"

## 3. Action Plan (Option B) - Infrastructure Stability ✅ COMPLETED

### Root Cause
The `ollama` container has a 4G memory limit. `qwen3:4b` (~2.5GB model weights) + default 32K context KV cache (~1.5GB) + server overhead (~0.5GB) = ~4.5GB peak → exceeds 4G limit → OOM killer sends SIGKILL → `llama-server process has terminated: signal: killed`.

### Fixes Applied (3 files, 4-layer defense)

#### B1: `providers/ollama.ts` — Reduce context window
- Added `num_ctx: 4096` to ollama `/api/chat` request options
- Reduces KV cache from ~1.5GB → ~0.25GB (8x reduction)
- Context capped at 4096 fits fallback prompt (4000 chars ~= 1000 tokens) + output (1024 tokens) = ~2024 tokens

#### B2: `ai-brain.ts` — Reduce fallback prompt size
- `compactForFallback`: `maxChars` 8000 → 4000
- Still preserves: roles + agent boundary controls + action prompt (~1550 chars)
- Remaining ~2450 chars available for KB results + history

#### B3: `docker-compose.yml` — Ollama environment variables
- `OLLAMA_NUM_PARALLEL=1` — single request, reduce memory fragmentation
- `OLLAMA_KEEP_ALIVE=5m` — keep model warm, avoid reload latency
- `OLLAMA_MAX_LOADED_MODELS=1` — only one model in RAM

### Memory After Fixes
```
Model weights:       2.5 GB
KV cache (4K ctx):  0.25 GB
Ollama overhead:     0.5 GB
─────────────────────────
Container RAM:      3.25 GB   ↓ from ~4.5GB (81% of 4G limit)
```
Server upgrade to 8-16GB provides ample headroom for all containers.

## 4. Action Plan (Option C) - Web Admin Update System ✅ Analyzed

### Findings

**Deploy API 500 Error:**
- Root cause: `deploy-agent` container not running on server
- Fix: `docker compose up -d deploy-agent`
- Code is correct — it's a simple Node.js MCP server that runs `git checkout <tag> → docker compose build app2 → docker compose up -d app2 → health check → rollback on failure`
- No code changes needed

**Git Sync `fatal: not a git repository`:**
- Root cause: `git-sync-service.ts` targets KB volume `/root/openstack-support` which has no `.git` directory
- git-sync is designed for KB repo management (pull, reset, push auto-generated), NOT main app repo
- Fix: `git init` + `git remote add` on KB volume, or change `git.localPath` setting
- Not required for app deployment — separate system for KB sync

### Deployment Path for v2.5.0

Manual SSH deploy is the recommended first step, followed by fixing Option C for future one-click deploys.

See `docs/versions/2.5.0/deploy-plan.md` for step-by-step SOP.

### Status After v2.5.0

| Option | Status | What Changed |
|--------|--------|-------------|
| A — Prompt Engineering | ✅ Done | 9 files: prompt-registry + agents + prompts |
| B — Ollama OOM | ✅ Done | 3 files: ollama.ts + ai-brain.ts + docker-compose.yml |
| C — Deploy System | 🔧 Fix on server | restart deploy-agent + init KB git repo (infra, not code) |
| Re-test 17 cases | ⏳ Pending deploy | Need server deploy to verify |
