# Version 2.2.0 — Operation Intelligence (OpenCode + Multi-Source Research)

> **Status:** Planned
> **Date:** 2026-07-02
> **Scope:** Add clarification phase to Operation chat. Integrate OpenCode as a research
  arm for external information gathering (web search, docs). Add multi-source sequential
  research (KB → OpenCode → Docker). Add progress bar UI during research. Expand
  Operation state machine from 2 to 4 states.

---

## Goals

- Add **Clarification Phase** to Operation chat — same pattern as NOC v2.1.0, adapted
  for technical/system problems.
- Integrate **OpenCode HTTP API** (`opencode:4096`) as a research agent. Operation AI
  can ask OpenCode to search the web, fetch documentation, browse forums, and read
  external technical resources.
- Implement **sequential multi-source research**: KB first → if no match → OpenCode web
  search → if needed → Docker container inspection.
- Add **progress bar UI** showing each research step in real-time.
- Expand Operation states: clarify → research (with progress) → diagnose → act.
- Keep Docker MCP tools read-only (list containers, logs, stats).

---

## Core Decisions

| Topic | Decision |
|-------|----------|
| OpenCode integration | HTTP API: `POST http://opencode:4096/api/chat` |
| OpenCode access level | Full access — trust built-in sandbox, treats it as OLS Operation agent |
| Research order | Sequential: KB → OpenCode → Docker (not parallel) |
| Research display | Progress bar with step labels: "กำลังค้นหา KB..." → "กำลังถาม OpenCode..." |
| Clarify approach | Same pattern as NOC v2.1.0 — ask + options, max 2 rounds |
| Operation states | 4 states: idle (0) → clarify (1) → research (2) → diagnose (3) |
| OpenCode timeout | 120 seconds per call (same as opencode-service.ts) |
| OpenCode fallback | If OpenCode unavailable, Operation still works with KB + Docker only |
| KB → Docker skip | Skip KB search if issue is clearly infrastructure (container, host) |

---

## Documentation Set

| File | Purpose |
|------|---------|
| `plan.md` | Version overview, scope, decisions, states, opencode integration, file changes |
| `opencode-integration.md` | Detailed OpenCode API communication contract, prompts, error handling |

---

## Architecture Summary

```
Operation Engineer types issue
        │
        ▼
   CLARIFY (State 1)
   AI asks clarifying questions, confirms problem type
        │
        ▼
   RESEARCH (State 2) — sequential, with progress bar
   ┌─────────────────────────────────────────────────┐
   │ Step 1: KB Search (kb-mcp)                       │
   │   Found? → include in results                    │
   │   Not found? → continue                          │
   │                                                   │
   │ Step 2: OpenCode Research (opencode:4096)         │
   │   "Search web for: WordPress plugin XYZ bug..."   │
   │   OpenCode → web_search → web_fetch → answer     │
   │   Results returned with source URLs               │
   │                                                   │
   │ Step 3: Docker Inspection (optional)              │
   │   If relevant: container_logs, container_stats    │
   │   Read-only operations only                       │
   └─────────────────────────────────────────────────┘
        │
        ▼
   DIAGNOSE (State 3)
   Structured output: Issue → Cause → Actions → References
   Actions include step-by-step resolution steps
```

---

## Operation State Machine (v2.2.0)

```
State 0: IDLE      → No active case. "+ New Case" button.

State 1: CLARIFY   → AI asks clarifying questions about the operational issue.
                      Max 2 rounds. When sufficient → auto-proceed to State 2.

State 2: RESEARCH  → Sequential multi-source research.
                      UI shows progress bar with current step.
                      KB → OpenCode → Docker (optional).
                      AI collects and merges findings.

State 3: DIAGNOSE  → AI presents structured diagnosis:
                      ## Issue | ## Likely Cause | ## Actions | ## References
                      Buttons: [ถามต่อ] [ร่างคำตอบ] [Export]

State 4: ACT (optional future) → Runbook-style step-by-step guidance.
```

### Quick Action Buttons per State

| State | Buttons |
|-------|---------|
| CLARIFY (1) | [Send] — types additional info or selects option |
| RESEARCH (2) | (auto-progress, no buttons needed) |
| DIAGNOSE (3) | [ถามต่อ] [ร่างคำตอบ] [แนบไฟล์เพิ่ม] [Close Case] |

---

## Feature Scope

### 1. Clarification Phase (`prompts/op-clarify.md`)

Same pattern as NOC v2.1.0 but for technical issues:

**Prompt behavior:**
- Read the operation issue description.
- Identify missing technical details: what system, what error, what logs, what
  environment.
- If info sufficient → skip, proceed to research.
- If ambiguous → ask with options tailored to OLS infrastructure:
  - "ปัญหาเกี่ยวกับอะไร?" [1] Container/Service [2] Network [3] Storage [4] VM/Hypervisor
  - "มี error log ไหม?" [1] มี — แนบไฟล์ [2] ยังไม่มี — ช่วยอธิบายอาการ
- Max 2 rounds.

### 2. Sequential Multi-Source Research (`prompts/op-research.md`)

**Flow in `ai-brain.ts`:**

```typescript
// Step 1: KB Search
const kbResult = await kbSearch({ query, limit: 5 }, context);
showProgress("🔍 กำลังค้นหา Knowledge Base...");

if (kbResult.success && kbResult.output) {
  // Found relevant KB entries — use them
} else {
  // Step 2: OpenCode Research
  showProgress("🌐 กำลังค้นหาข้อมูลจากภายนอกด้วย OpenCode...");
  const ocResult = await opencodeResearch(query, context);
}

// Step 3: Docker Inspection (if infrastructure issue)
if (isInfrastructureIssue(category)) {
  showProgress("🐳 กำลังตรวจสอบ Docker containers...");
  const dockerResult = await dockerInspect(context);
}
```

**Progress bar implementation:**
- Server sends progress events via SSE or polling.
- Client renders a progress bar component with step labels.
- Example: `[████████░░] Step 2/3: Searching OpenCode...`

### 3. OpenCode Integration (`src/lib/ai/opencode-client.ts`)

**HTTP contract:**
```
POST http://opencode:4096/api/chat
Content-Type: application/json

{
  "message": "Search for WordPress plugin XYZ bug after update to version 2.3.0.
              Find known issues, fixes, forum discussions. Return with source URLs.",
  "model": "deepseek/deepseek-chat"
}

Response:
{
  "response": "Found 3 relevant results:\n1. WordPress.org support thread: ...\n...",
  "model": "deepseek/deepseek-chat",
  "provider": "groq"
}
```

**OpenCode prompt template:**
```
You are an Operation research assistant for OpenLandscape Cloud (OLS).
Search the web for technical information about the following issue:

{ISSUE_DESCRIPTION}

Requirements:
- Search for known bugs, fixes, forum discussions, documentation.
- Include source URLs for every finding.
- Prioritize official documentation and reputable sources.
- If no results found, state "No external resources found."
- Respond in Thai with technical terms in English.
```

**Timeout and error handling:**
- 120s timeout per OpenCode call.
- On timeout/error: log, continue without OpenCode results.
- AI still produces diagnosis using KB + Docker if available.

### 4. Research → Diagnose Prompt (`prompts/op-diagnose.md`)

**Input:** results from KB, OpenCode, Docker, case history.
**Output:** Structured diagnosis.

```
## Issue
(One-line description)

## Likely Cause
(Root cause with supporting evidence from all sources)

## Actions
1. (Step 1 — specific, with commands if applicable)
2. (Step 2)
3. (Step 3)

## References
- KB: filename.yaml#section (if applicable)
- OpenCode: source URLs from web research
- Docker: container name, log excerpts (if applicable)
- Similar Cases: case IDs from case history
```

---

## Out Of Scope

- Parallel research (all 4 sources simultaneously) — sequential only in v2.2.0.
- Auto-execution of Docker commands (remain read-only).
- OpenCode as primary AI path (app2 still uses Groq/Ollama router; OpenCode is a tool).
- Operation escalate to other teams (like NOC v2.1.0).
- Runbook auto-execution.
- Web search MCP tools via app2's MCP gateway (use OpenCode instead).

---

## Implementation Phases

| Phase | Goal | Output |
|-------|------|--------|
| 1 | Create `op-clarify.md` prompt | New prompt file for operation clarification |
| 2 | Create `op-research.md` prompt | Research orchestration prompt template |
| 3 | Create `op-diagnose.md` prompt | Diagnosis format prompt |
| 4 | Build `opencode-client.ts` | HTTP client for opencode API with timeout + error handling |
| 5 | Implement sequential research in `ai-brain.ts` | KB → OpenCode → Docker flow with progress tracking |
| 6 | Add CLARIFY + RESEARCH + DIAGNOSE states to Operation page | UI states, progress bar component |
| 7 | Test end-to-end with real scenarios | WordPress plugin bug, VM slow, network issue |

---

## Files to Create / Modify

| File | Action | Purpose |
|------|--------|---------|
| `gate-answer-app2/prompts/op-clarify.md` | **NEW** | Operation clarification prompt |
| `gate-answer-app2/prompts/op-research.md` | **NEW** | Multi-source research orchestration prompt |
| `gate-answer-app2/prompts/op-diagnose.md` | **NEW** | Structured diagnosis output format |
| `src/lib/ai/opencode-client.ts` | **NEW** | HTTP client for opencode API |
| `src/lib/ai/ai-brain.ts` | **EDIT** | Add research flow: KB → OpenCode → Docker → diagnose |
| `src/lib/ai/prompt-registry.ts` | **EDIT** | Add clarify, research, diagnose for operation role |
| `src/app/operation/page.tsx` | **EDIT** | 4-state machine, progress bar, option buttons |
| `src/app/api/chat/operation/route.ts` | **EDIT** | Support `clarify`, `research`, `diagnose` promptTypes |
| `src/components/ui/ProgressBar/ProgressBar.tsx` | **NEW** | Reusable progress bar component |
| `src/app/globals.css` | **EDIT** | Progress bar styles |

---

## Key Technical Decisions

### Why OpenCode Instead of Web MCP Tools?

- OpenCode is already running in the Docker stack (port 4096).
- OpenCode has built-in web_search, web_fetch, and browsing capabilities.
- OpenCode uses free models — no additional API costs.
- OpenCode has sandbox for safety.
- Avoids duplicating web tool infrastructure.
- OpenCode can reason about search results (not just return raw HTML).

### Sequential vs Parallel Research

**Sequential chosen because:**
- KB is fast (<5s) and often has the answer — if found, skip OpenCode (save time).
- OpenCode may take 20-90s — only invoke when needed.
- Sequential allows smart skipping: if KB has high-confidence match, no need for web
  search.
- Future optimization: KB + case_history can run in parallel as "internal first pass."

### Progress Updates

The research happens on the server (API route). To show progress in UI:
- **Option A (SSE):** Server sends Server-Sent Events. Complex but real-time.
- **Option B (Polling):** Client polls progress endpoint. Simpler.
- **Option C (Optimistic):** Client shows hardcoded step names, server does work.

**Decision:** Option B (polling) for v2.2.0.
- Server stores progress in per-case in-memory state (or SQLite temporary).
- Client polls `GET /api/chat/operation/progress?sessionId=X` every 1 second.
- Progress endpoint returns: `{ step: 2, total: 3, label: "กำลังถาม OpenCode..." }`.

---

## Success Criteria

- Operation engineer types vague issue → AI asks clarifying questions with options.
- Research runs sequential: KB → OpenCode → Docker.
- Progress bar shows current step in real-time.
- OpenCode returns external research results with source URLs.
- Diagnosis output includes Issue, Cause, Actions, References from all sources.
- If OpenCode is unreachable, diagnosis still works with KB + Docker alone.
- All 4 Operation states work end-to-end.
