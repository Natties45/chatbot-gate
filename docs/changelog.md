# Changelog

> Consolidated development log. Combines previous PHASE1.md, PHASE1.1.md, PHASE1.2.md, PHASE1.2-1.md.
> Version planning docs & mockups now live under `docs/versions/<semver>/`.

---

## 2026-06-28 — Phase 1.2-1 (UI Polish + Resume + File Attach)

### Issues Fixed

| # | Issue | Root Cause | Fix |
|---|-------|-----------|-----|
| 1 | NOC N/A badges | `parseAnalysis()` regex mismatch | Removed analysis card — raw text only |
| 2 | Resume blank page | Messages not stored in localStorage | Added `messageStore` in case-store.ts |
| 3 | Preview "(new case)" | Preview never updated | `caseStore.update()` after first message |
| 4 | Duplicate New Case | Both idle-center and header-right | Moved to header only |
| 5 | Full-page scroll | `AppLayout .content overflow-y: auto` | Changed to `hidden`, page manages scroll |
| 6 | File attach no name | Missing chip UI | Added fileAttachChip CSS + state |

### Files Changed

| File | Action |
|------|--------|
| `apps/web1/src/app/noc/page.tsx` | Removed parseAnalysis, resume, preview, layout fix |
| `apps/web1/src/app/operation/page.tsx` | Resume, preview, file chip, layout fix |
| `apps/web1/src/lib/case-store.ts` | Added `update()`, `messageStore` |
| `apps/web1/src/components/layout/AppLayout/AppLayout.module.css` | `overflow-y: hidden` |
| `apps/web1/src/app/globals.css` | Added fileAttachChip |
| `docs/versions/1.0.0/mockup.html` | Updated NOC plain text, Op file chip |

---

## 2026-06-28 — Phase 1.2 (NOC Hybrid + Operation Chat + History)

### Architecture

- NOC: wizard → chat hybrid (3 states: idle/chat/offline, internal state 1/2/3)
- Operation: structured response with op-send.md prompt
- History panel per page (localStorage)
- Quick Action Bar: only "Draft Response" button

### Final Decisions (v3)

| Feature | Decision |
|---------|----------|
| Template/email flow | Removed |
| Separate "Analyze" button | Removed (first message = auto-analyze) |
| Inline buttons in bubble | No — Quick Action Bar only |
| "Close Case" position | Header (beside "+ New Case") |
| Operation Copy | No |
| Home button | Removed (sidebar tab re-click = goHome) |
| stateIndicator | Removed |
| Sidebar goHome | `onActiveClick` prop |

### Files Created/Modified

| File | Action |
|------|--------|
| `gate-answer/prompts/noc-chat.md` | Created |
| `gate-answer/prompts/noc-draft-feedback.md` | Created |
| `apps/web1/src/app/api/chat/noc/route.ts` | +2 promptType |
| `apps/web1/src/app/api/chat/operation/route.ts` | op-send.md integration |
| `apps/web1/src/app/noc/page.tsx` | Rewritten chat hybrid |
| `apps/web1/src/app/operation/page.tsx` | Multiple fixes |
| `apps/web1/src/components/layout/Sidebar/Sidebar.tsx` | Added onActiveClick |
| `apps/web1/src/lib/case-store.ts` | Created |
| `apps/web1/src/app/globals.css` | New classes + --text-on-accent |
| `apps/web1/src/components/ui/Button/Button.module.css` | color → var(--text-on-accent) |

---

## 2026-06-28 — Phase 1.1 (NOC Smart Chat + Prompt-Driven Workflow)

### Architecture: State Machine (11 states)

| State | Description |
|-------|-------------|
| idle | No session — +New Case |
| input | Customer message textarea |
| analyzing | Loading skeleton |
| analysis | Category, Confidence, Summary, Response |
| addInfo | Additional info textarea |
| actionSelect | Choose next step |
| drafting | Loading skeleton |
| draft | Draft response (Thai) |
| sendTemplate | NOC handoff template |
| closing | Loading |
| offline | Error + Retry |

### Prompt Actions

| Prompt | Action |
|--------|--------|
| noc-analyze.md | Analyze + KB matching |
| noc-draft.md | Draft OLS-style response |
| noc-email.md | NOC handoff (dynamic from KB) |
| noc-feedback.md | Re-analyze with additional info |
| noc-close.md | Build mode — save case log |

### Files Created/Modified

| File | Action |
|------|--------|
| `.opencode/opencode.json` | Added noc-closer, adjusted noc-agent permissions |
| `gate-answer/agents/noc-agent.md` | Rewritten (9 categories, KB path, 3 phases) |
| `gate-answer/agents/noc-closer.md` | Created |
| `gate-answer/prompts/noc-analyze.md` | Created (renamed from noc-send.md) |
| `gate-answer/prompts/noc-draft.md` | Created |
| `gate-answer/prompts/noc-email.md` | Created |
| `gate-answer/prompts/noc-feedback.md` | Updated |
| `gate-answer/prompts/noc-close.md` | Updated |
| `apps/web1/src/app/globals.css` | --primary-color, --warning-color, @keyframes spin |
| `apps/web1/src/components/ui/Badge/*` | Created (5 variants) |
| `apps/web1/src/components/layout/AppLayout/*` | Added headerAction prop |
| `apps/web1/src/app/api/chat/noc/route.ts` | Rewritten (promptType, noc-closer) |
| `apps/web1/src/app/noc/page.tsx` | Rewritten (state machine) |
| Removed `gate-answer/prompts/noc-send.md` | Renamed to noc-analyze.md |

---

## 2026-06-27 — Phase 1 (Core opencode Integration)

### Setup

- Installed opencode binary v1.17.9 on 203.154.16.197
- Created systemd service: `opencode serve --hostname 0.0.0.0 --port 4096`
- Created `.opencode/opencode.json` + `gate-answer/`
- Created `apps/web1` (structure, components, pages, API routes, opencode-service)
- Created `docs/architecture.md`
- Removed old docs (current_status.md, old ADRs, old governance/source-of-truth.md)
