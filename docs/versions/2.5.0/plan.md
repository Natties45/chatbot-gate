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

## 2. Action Plan (Option A) - Prompt Engineering

### 2.1 Update `noc-agent.md`
- **Add Boundary Enforcement Section:** Explicitly forbid answering general knowledge, coding, or off-topic prompts. Enforce fallback to `Confidence: 0%`.
- **Add Prompt Injection Defense:** Add instructions to ignore overriding commands and stick to the NOC role.
- **Clarification Logic:** Detail exact rules on when to trigger Clarify (missing context, ambiguous terms like 'password') and Confirm (high-risk like 'resize').

### 2.2 Update `operation-agent.md`
- **Out of Scope Handling:** Prevent the agent from wrapping non-operational queries (like weather) in the operational output format. Add a rule to return a simple rejection statement if the query is fundamentally not an IT/Ops issue.
- **Prompt Injection Defense:** Prevent the agent from dumping raw logs or system prompts upon user request.

## 3. Pending Action (Option B) - Infrastructure Stability
*Note: Marked for tracking, but DO NOT execute in this patch.*
- The `llama-server` process inside the `ollama` container is crashing (signal: killed) when Groq fails and triggers the local fallback.
- **Hypothesis:** OOM (Out Of Memory) event.
- **Future Fix:** Adjust Docker resource limits (`docker-compose.yml`) or configure smaller context windows for the fallback model (`qwen3:4b`).
