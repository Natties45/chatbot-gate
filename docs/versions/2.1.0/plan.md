# Version 2.1.0 — NOC Intelligence (Clarify + Escalate + Handoff)

> **Status:** Planned
> **Date:** 2026-07-02
> **Scope:** Add clarification phase before NOC analysis so AI confirms the problem type
  with NOC before answering. Add Escalate and Handoff buttons to the draft phase. Add
  file attachment support for NOC (txt + images). Expand NOC state machine from 3 to 6
  states.

---

## Goals

- Add a **Clarification Phase** before NOC analysis. The AI reads the customer message
  and, if the problem description is ambiguous, asks the NOC follow-up questions with
  structured options before proceeding to category analysis.
- Prevent AI from guessing the wrong category when NOC provides incomplete or vague
  customer messages (e.g., "ลืม password" → portal or VM?).
- Add **Escalate button** to the NOC draft phase. The AI generates an internal
  escalation summary that NOC copies to send to the Operation team.
- Add **Handoff button** to generate email/handoff templates.
- Add **file attachment** support to NOC page (txt + images only, stored on server with
  daily cleanup).
- Expand NOC UI state machine from 3 states to 6 states: idle, clarify, analyze, chat,
  draft, escalate.

---

## Core Decisions

| Topic | Decision |
|-------|----------|
| Clarify approach | AI asks directly + provides 2-5 structured options + "พิมพ์เพิ่มเอง" |
| Clarify max rounds | 2 rounds, then force proceed to analyze |
| Escalate threshold | AI decides — no hardcoded confidence % threshold (uses judgment) |
| Escalate result | AI generates clean internal summary → NOC copies to send to Operation |
| Escalate target | Operation team only (single target in v2.1.0) |
| Handoff result | AI generates email/handoff template using `noc-email.md` prompt |
| File attach types | .txt and images only (png, jpg, gif, webp) |
| File storage | Server disk `/tmp/uploads/` → cron cleanup every 24 hours |
| Clarify prompt source | New file: `prompts/noc-clarify.md` |
| Escalate prompt | Existing `prompts/noc-escalate.md` (same as web1, edit for Operation target) |
| Handoff prompt | Existing `prompts/noc-email.md` (same as web1) |

---

## Documentation Set

| File | Purpose |
|------|---------|
| `plan.md` | Version overview, scope, decisions, states, file changes |
| `mockup.html` | UI mockup for 6-state NOC page |

---

## Architecture Summary

```
User Message → Clarify Phase (NEW) → Analyze → Chat → Draft → Escalate/Handoff
                   │
                   ├── AI asks NOC to confirm category/provide details
                   ├── NOC selects option or types additional info
                   ├── Max 2 clarify rounds
                   └── Then auto-proceed to analyze
```

---

## NOC State Machine (v2.1.0)

```
State 0: IDLE      → No active case. User sees "+ New Case" and case history.
                      Click "+ New Case" → State 1.

State 1: CLARIFY   → NEW. AI reads customer message from NOC, identifies ambiguities.
                      If clear → auto-skip to State 2.
                      If ambiguous → asks NOC with 2-5 options. NOC selects or types.
                      After 2 rounds max or when AI confirms clarity → State 2.

State 2: ANALYZE   → AI analyzes against KB (kbSearch), determines category and
                      confidence. Returns: Category, Confidence, Summary, Response.
                      Buttons: [ร่างคำตอบ] [Feedback]

State 3: CHAT      → NOC continues chatting. AI responds as conversational NOC agent.
                      Buttons: [ร่างคำตอบ] [ขอข้อมูลเพิ่ม]

State 4: DRAFT     → AI generates formal Thai customer response.
                      Buttons: [Copy] [ใช้ร่างนี้] [Escalate] [Handoff]

State 5: ESCALATE  → NEW. AI generates escalation summary for Operation team.
                      NOC copies text, closes case.
                      Case status becomes "escalated" on close.
```

### State Transitions Diagram

```
IDLE ──[+New Case]──▶ CLARIFY ──[data sufficient]──▶ ANALYZE
                         │                              │
                         └──[2 rounds exceeded]─────────┘
                                                         │
                                                         ▼
                                                      CHAT ←──[continue chat]──
                                                         │
                                                    [ร่างคำตอบ]
                                                         │
                                                         ▼
                                                      DRAFT ──[Escalate]──▶ ESCALATE
                                                         │
                                                    [ใช้ร่างนี้] ──▶ Close Case
                                                    [Copy] ──▶ Paste to customer
```

### Quick Action Buttons per State

| State | Buttons |
|-------|---------|
| CLARIFY (1) | [Send] — NOC types additional info or selects option |
| ANALYZE (2) | [ร่างคำตอบ] [Feedback] |
| CHAT (3) | [ร่างคำตอบ] [ขอข้อมูลเพิ่ม] |
| DRAFT (4) | [Copy] [ใช้ร่างนี้] [Escalate] [Handoff] |
| ESCALATE (5) | [Copy] [ใช้และปิดเคส] |

---

## Feature Scope

### 1. Clarification Phase (`prompts/noc-clarify.md`)

**Prompt behavior:**
- Read customer message from NOC.
- Identify ambiguities: unclear category, missing details, multiple possible
  interpretations.
- If information is sufficient → skip clarify phase, proceed to analyze directly.
- If ambiguous → respond with:
  1. Brief acknowledgment in Thai of what is understood.
  2. Specific question asking what is unclear.
  3. 2-5 structured options NOC can click (buttons rendered by UI from AI response).
  4. Option "อื่นๆ — พิมพ์เพิ่มเติม" for free-text input.
  5. If the issue appears highly technical (confidence <50% based on initial read),
     suggest: "ปัญหานี้อาจต้องส่งต่อทีม Operation — ต้องการ escalate หรือวิเคราะห์ต่อ?"

**Prompt template (`noc-clarify.md`):**
```markdown
You are the NOC clarification assistant. Read the customer message the NOC pasted.

## Rules
1. Identify if the problem description is ambiguous. If it can be interpreted in
   multiple ways, ASK the NOC to clarify before analyzing.
2. If the message is clear enough, respond briefly and auto-proceed to analysis.
3. Provide 2-5 structured options when asking. Always include "อื่นๆ — พิมพ์เพิ่มเติม".
4. If the issue sounds technical beyond NOC scope, suggest escalating to Operation.
5. Respond in Thai, concise, no technical jargon.
6. Do NOT analyze, categorize, or draft responses in this phase.

## Output Format (if clarification needed)
```
🤔 ขอสอบถามเพิ่มเติม:

{one-line summary of what is understood}

{question}

[1] {option 1}
[2] {option 2}
[3] {option 3}
[4] อื่นๆ — พิมพ์เพิ่มเติม
```

## Customer Message
{{MESSAGE}}
```

**UI rendering:**
- AI response contains `[1] ... [2] ... [3] ...` options.
- Frontend parses these and renders as clickable buttons.
- NOC clicks one → selected option sent as message, AI processes.
- Or NOC types free text in the input area.

### 2. Escalate to Operation

**Flow:**
1. NOC is in DRAFT state (State 4) → clicks [Escalate].
2. API sends `promptType: 'escalate'` with session context.
3. AI reads `noc-escalate.md` prompt and generates internal summary.
4. Summary includes: Category, Confidence, Issue summary, Draft response, Reason for
   escalation.
5. Response displayed in chat as assistant message.
6. NOC copies text → sends to Operation team via external channel (email, chat, etc.).
7. NOC clicks [ใช้และปิดเคส] → case closed with status including escalation summary.

**Prompt changes to `noc-escalate.md`:**
- Change target team recommendation: add Operation as primary target.
- Format: clean summary suitable for internal handoff (not customer-facing).

**API:**
- `POST /api/chat/noc` with `{ action: 'message', promptType: 'escalate', message, sessionId }`.
- `promptType: 'escalate'` is already in ALLOWED_PROMPT_TYPES in `noc/route.ts`.
- No new API routes needed — reuse existing `message` action.

### 3. Handoff Generation

**Flow:**
1. NOC clicks [Handoff] button in DRAFT state.
2. API sends `promptType: 'email'` with session context.
3. AI reads `noc-email.md` prompt and generates handoff template.
4. Response displayed as draft card in chat.
5. NOC can copy and use.

**Prompt:** Uses existing `noc-email.md` (reads from `noc-scripts.yaml` via KB).

**API:**
- `promptType: 'email'` already in ALLOWED_PROMPT_TYPES.
- Currently unused in UI — just needs button.

### 4. File Attachment (NOC)

**Supported types:** .txt, .png, .jpg, .jpeg, .gif, .webp
**Max file size:** 5MB per file.
**Storage:** `/tmp/uploads/` on server, organized by `{caseId}/{filename}`.
**Cleanup:** Cron job or scheduler runs every 24 hours, deletes files older than 24
  hours.
**Flow:**
1. NOC clicks 📎 button → file picker opens (txt + image types).
2. File uploaded via `POST /api/upload` → stored in `/tmp/uploads/{caseId}/`.
3. Image files: AI receives path reference. AI can describe image content to NOC.
   (Note: AI text models cannot process images directly — NOC describes the image if
   needed.)
4. Txt files: content appended to message as `[แนบแล้ว: filename.txt]\n{content}`.
5. On case close: cleanup task removes case directory from `/tmp/uploads/`.

**New API route:**
- `POST /api/upload` — accepts multipart form, stores file, returns path.
- Cleanup via `src/lib/scheduler.ts` or standalone cron in `auto-kb-generator.ts`.

---

## Out Of Scope

- Multi-issue detection and sub-case splitting.
- Auto-escalate without NOC confirmation (always requires NOC click).
- Forward escalate to any team other than Operation (single target in v2.1.0).
- File attachment support beyond txt + images (no PDF, docx, etc.).
- Persisting uploaded files beyond case lifecycle (always cleaned up).
- Clarify phase for Operation page (that comes in v2.2.0).

---

## Implementation Phases

| Phase | Goal | Output |
|-------|------|--------|
| 1 | Create `noc-clarify.md` prompt | New prompt file, tested with sample messages |
| 2 | Add CLARIFY state to NOC page | State 1 with option button rendering, text input, max 2 rounds |
| 3 | Add ESCALATE state + button | State 5, escalate summary display, close flow |
| 4 | Add HANDOFF button | Button in draft state, calls `promptType: 'email'` |
| 5 | Add file upload + cleanup | Upload API, file chip UI, scheduler cleanup |
| 6 | Polish and test | End-to-end NOC flow test, Thai language quality check |

---

## Files to Create / Modify

| File | Action | Purpose |
|------|--------|---------|
| `gate-answer-app2/prompts/noc-clarify.md` | **NEW** | Clarification prompt template |
| `gate-answer-app2/prompts/noc-escalate.md` | **EDIT** | Update target team to Operation |
| `src/app/noc/page.tsx` | **EDIT** | 6-state machine, option buttons, escalate/handoff buttons, file attach |
| `src/app/api/chat/noc/route.ts` | **EDIT** | Support `clarify` + `escalate` promptTypes (already in ALLOWED list) |
| `src/app/api/upload/route.ts` | **NEW** | File upload endpoint |
| `src/lib/ai/ai-brain.ts` | **EDIT** | Route `promptType: 'clarify'` → load `noc-clarify.md` |
| `src/lib/ai/prompt-registry.ts` | **EDIT** | Add `clarify` prompt type to NOC action mapping |
| `src/lib/file-cleanup.ts` | **NEW** | Daily cleanup of `/tmp/uploads/` |
| `src/lib/scheduler.ts` | **NEW** | Shared scheduler for cleanup + future KB auto tasks |
| `src/app/globals.css` | **EDIT** | Add styles for option buttons, file chip (reuse from op) |

---

## Key Technical Decisions

### Clarify Prompt Type Routing

In `prompt-registry.ts`, the `loadActionPrompt` function for NOC currently maps:
```
noc-analyze, noc-draft, noc-email, noc-escalate, noc-feedback, noc-draft-feedback,
noc-chat, noc-close
```

Add: `noc-clarify` → `prompts/noc-clarify.md`

The `ai-brain.ts` `getUserText()` function already handles the clarify case — the user
text is the NOC's selection or free-text response.

### Option Button Parsing

The AI returns text with `[1] ... [2] ... [3] ...` format. Frontend regex:
```typescript
const optionRegex = /^\[(\d+)\]\s+(.+)$/gm;
```
Options extracted → rendered as `<Button>` components. Clicked option → sent as message
text (e.g., `"2"` or `"[2] VM / Instance"`).

### Clarify Loop Counter

Frontend tracks a `clarifyCount` in state. Incremented each time AI responds in clarify
mode. After 2 clarify rounds, auto-send `promptType: 'analyze'` regardless of AI
clarity.

### File Upload API

```typescript
POST /api/upload
Content-Type: multipart/form-data
Body: { file: File, caseId: string }

→ 200 { path: "/tmp/uploads/{caseId}/{filename}" }
→ 413 { error: "File too large" } (max 5MB)
→ 400 { error: "Unsupported file type" }
```

---

## Success Criteria

- NOC pastes vague customer message → AI asks clarifying question with options.
- NOC selects option → AI proceeds to category analysis with correct context.
- AI auto-skips clarify phase when message is already clear.
- Max 2 clarify rounds enforced before forced analyze.
- Escalate button generates internal summary suitable for Operation handoff.
- Handoff button generates email template.
- NOC can attach .txt and image files.
- Uploaded files are cleaned up within 24 hours of case close or upload.
- All 6 NOC states work end-to-end: idle → clarify → analyze → chat → draft →
  escalate/close.
