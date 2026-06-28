# Phase 1.1 — NOC Smart Chat + Prompt-Driven Workflow

> เป้าหมาย: NOC Chat ทำงานผ่าน state machine ครบ flow + ทุกปุ่มควบคุมด้วย prompt
> ขึ้นต่อจาก Phase 1 — Core opencode Integration
> Knowledge Base: `C:\Users\natti\OneDrive\Documents\natties45\openstack-support/`

---

## สถาปัตยกรรม Agent

```
noc-agent (primary)            noc-closer (subagent)
─────────────────────          ─────────────────────
- วิเคราะห์ปัญหา               - build mode save ไฟล์ case log
- ร่างคำตอบ                    - edit: allow (ไม่ถาม permission)
- template email               - ใช้แค่ตอน close
- permission: edit=deny
```

---

## Checklist

### 1. `.opencode/opencode.json` — ตั้งค่า Agent

- [ ] เพิ่ม `noc-closer` agent
- [ ] ปรับ `noc-agent` permission `read` ให้เข้าถึง `openstack-support/`
- [ ] รายละเอียดดูที่ [`.opencode/opencode.json`](#)

```json
{
  "agent": {
    "noc-agent": {
      "description": "NOC support agent — analyzes, drafts, generates templates",
      "mode": "primary",
      "temperature": 0.2,
      "prompt": "{file:./gate-answer/agents/noc-agent.md}",
      "permission": {
        "edit": "deny",
        "bash": "deny",
        "read": ["allow", "../openstack-support/knowledge/**", "../openstack-support/style-guide/**", "../openstack-support/AGENTS.md"]
      }
    },
    "noc-closer": {
      "description": "NOC case closer — saves case log file in build mode",
      "mode": "primary",
      "temperature": 0.1,
      "prompt": "{file:./gate-answer/agents/noc-closer.md}",
      "permission": {
        "edit": "allow",
        "bash": "deny",
        "read": ["allow", "./gate-answer/templates/**"]
      }
    }
  }
}
```

### 2. `.opencode/gate-answer/agents/noc-agent.md` — Agent Prompt หลัก

- [ ] ให้ agent รู้จัก 9 หมวดหมู่ OLS (VM/Instance, Network/Security, Account/Gate, Billing, Domain, SSL, File Storage, Abuse, Generic)
- [ ] ให้ agent รู้ว่าเป็น NOC intake (ไม่ใช่คนตอบลูกค้าโดยตรง)
- [ ] ให้ agent รู้ flow: วิเคราะห์ → ยืนยัน → ร่าง/ส่งเคส/ปิด
- [ ] ให้ agent อ่าน `openstack-support/knowledge/` เพื่อจับคู่หมวดหมู่
- [ ] ดูรายละเอียดที่ [`.opencode/gate-answer/agents/noc-agent.md`](../.opencode/gate-answer/agents/noc-agent.md)

### 3. `.opencode/gate-answer/agents/noc-closer.md` — Agent ปิดเคส

- [ ] Build mode — save case log ตาม template
- [ ] อ่าน template จาก `{file:./gate-answer/templates/case-log.md}`
- [ ] กรอกข้อมูล: DATE, ROLE, CATEGORY, CONFIDENCE, STATUS, SUMMARY, RESOLUTION, SESSION_ID
- [ ] Save ไปที่ `.opencode/gate-answer/cases/noc-{DATE}-{SESSION_ID}.md`
- [ ] ดูรายละเอียดที่ [`.opencode/gate-answer/agents/noc-closer.md`](../.opencode/gate-answer/agents/noc-closer.md)

### 4. `.opencode/gate-answer/templates/case-log.md` — Template Case Log

- [ ] มีอยู่แล้วใน [`.opencode/gate-answer/templates/case-log.md`](../.opencode/gate-answer/templates/case-log.md)
- [ ] ปรับถ้าจำเป็น: เพิ่ม `SESSION_ID` field
- [ ] Fields: DATE, ROLE, CATEGORY, CONFIDENCE, STATUS, SUMMARY, RESOLUTION, SESSION_ID

### 5. Prompt Files — `.opencode/gate-answer/prompts/`

#### 5a. `noc-analyze.md` — 🔍 วิเคราะห์ปัญหา

- [ ] สร้าง/rename จาก `noc-send.md`
- [ ] Prompt: อ่าน KB → วิเคราะห์ → return Category, Confidence (0-100%), Summary, Sources, Response draft
- [ ] ตอบเป็นภาษาไทย, technical term อังกฤษ
- [ ] ดูที่ [`.opencode/gate-answer/prompts/noc-analyze.md`](../.opencode/gate-answer/prompts/noc-analyze.md)

#### 5b. `noc-draft.md` — 📝 ร่างคำตอบ

- [ ] สร้างใหม่
- [ ] Prompt: ร่าง reply ภาษาไทยตาม OLS style (เปิด "เรียน ผู้ใช้บริการ", ปิด "ขอบคุณครับ")
- [ ] ใช้ category เดิม + analysis summary เป็น context
- [ ] ดูที่ [`.opencode/gate-answer/prompts/noc-draft.md`](../.opencode/gate-answer/prompts/noc-draft.md)

#### 5c. `noc-email.md` — 📧 ส่งเคส (NOC Handoff)

- [ ] สร้างใหม่
- [ ] **ห้าม hardcode template** — ให้ agent อ่านจาก `openstack-support/knowledge/noc-scripts.yaml` แบบ dynamic
- [ ] ใช้ `{file:../openstack-support/knowledge/noc-scripts.yaml}` หรือ instruction ให้ agent อ่านไฟล์เอง
- [ ] ดูที่ [`.opencode/gate-answer/prompts/noc-email.md`](../.opencode/gate-answer/prompts/noc-email.md)

#### 5d. `noc-feedback.md` — ✏️ Feedback (ส่งข้อมูลเพิ่มเติม)

- [ ] มีอยู่แล้วที่ [`.opencode/gate-answer/prompts/noc-feedback.md`](../.opencode/gate-answer/prompts/noc-feedback.md)
- [ ] ปรับให้ inject ข้อมูลเพิ่มเติม + re-analyze

#### 5e. `noc-close.md` — 📄 Close Case

- [ ] ปรับให้ใช้ `noc-closer` agent
- [ ] Build mode — save ไฟล์ตาม template
- [ ] ดูที่ [`.opencode/gate-answer/prompts/noc-close.md`](../.opencode/gate-answer/prompts/noc-close.md)

### 6. `apps/web1/src/app/globals.css` — ปรับ UI

- [ ] เพิ่ม CSS variable `--primary-color: #1a73e8` (สีฟ้าสำหรับ AI bubble accent, stepper)
- [ ] references globals.css ที่ [apps/web1/src/app/globals.css](../src/app/globals.css)

```css
:root {
  /* existing vars */
  --primary-color: #1a73e8;
}

[data-theme='dark'] {
  --primary-color: #60a5fa;
}
```

### 7. `apps/web1/src/components/ui/Card/` — Card Component

- [ ] สร้างตามแบบ `apps/web/`
- [ ] Review ข้อเก่าที่ [apps/web1/src/components/ui/Card/Card.tsx](../src/components/ui/Card/Card.tsx)

### 8. `apps/web1/src/components/ui/Badge/` — Badge Component

- [ ] สร้างตามแบบ `apps/web/`
- [ ] variants: default, success, warning, danger, info
- [ ] Review ข้อเก่าที่ [apps/web1/src/components/ui/Badge/Badge.tsx](../src/components/ui/Badge/Badge.tsx)

### 9. `apps/web1/src/components/layout/AppLayout/AppLayout.tsx` — เพิ่ม headerAction

- [ ] เพิ่ม prop `headerAction?: ReactNode`
- [ ] render ใน header ด้านขวา
- [ ] Review ที่ [apps/web1/src/components/layout/AppLayout/AppLayout.tsx](../src/components/layout/AppLayout/AppLayout.tsx)

### 10. `apps/web1/src/lib/opencode-service.ts` — เพิ่ม Method

- [ ] เพิ่ม method `sendPromptedMessage(sessionId, agent, promptType, userText, options?)`
- [ ] หรือเพิ่ม `loadPromptFile(promptType): string` ให้ route เรียกใช้
- [ ] Review ที่ [apps/web1/src/lib/opencode-service.ts](../src/lib/opencode-service.ts)

### 11. `apps/web1/src/app/api/chat/noc/route.ts` — รองรับ promptType

- [ ] รับ `promptType` ใน body (`analyze | draft | email | close | feedback`)
- [ ] โหลด prompt file จาก `../../../.opencode/gate-answer/prompts/noc-{promptType}.md`
- [ ] Inject ผ่าน `sendSystemMessage()` หรือ `sendMessage()`
- [ ] `action=close` → ใช้ `noc-closer` agent
- [ ] Error handling: promptType ไม่มี → 400, file not found → 404
- [ ] Review ที่ [apps/web1/src/app/api/chat/noc/route.ts](../src/app/api/chat/noc/route.ts)

### 12. `apps/web1/src/app/noc/page.tsx` — State Machine

#### States

| State | Description | UI |
|---|---|---|
| `idle` | ยังไม่มี session | ปุ่ม + New Case กลางจอ |
| `input` | วางข้อความลูกค้า | textarea + 🔍 วิเคราะห์ปัญหา |
| `analyzing` | กำลังวิเคราะห์ | loading skeleton |
| `analysis` | ผลวิเคราะห์ | Category, Confidence, Summary, Response + ✅ ❌ |
| `addInfo` | เพิ่มข้อมูลเพิ่มเติม | textarea + 🔍 วิเคราะห์ใหม่ + 🔙 ย้อนกลับ |
| `actionSelect` | เลือกขั้นตอนต่อไป | 📝 ร่าง, 📧 ส่งเคส, 📄 Close, 🔙 |
| `drafting` | กำลังร่าง | loading skeleton |
| `draft` | ร่างคำตอบ | ร่างภาษาไทย + ✅ ใช้ร่างนี้, 🔄 ขอร่างใหม่, ✏️ เพิ่มข้อมูล |
| `sendTemplate` | Template ส่งเคส | NOC handoff template + ✅ ส่งปิดเคส |
| `closing` | กำลังปิดเคส | loading |
| `offline` | Server offline | error message + Retry |

#### Header — ปุ่ม + New Case (มุมขวาบน)

- [ ] ทุก state ยกเว้น `idle` และ `offline` → มีปุ่ม `+ New Case` ขวาบน
- [ ] กดแล้วยืนยัน "ต้องการเริ่มเคสใหม่? เคสปัจจุบันจะถูกปิด"

#### Button Validation

| State | ปุ่ม | disabled ถ้า |
|---|---|---|
| `input` | 🔍 วิเคราะห์ปัญหา | `!input.trim()` |
| `addInfo` | 🔍 วิเคราะห์ใหม่ | `!additionalInfo.trim()` |
| `draft` | ✏️ เพิ่มข้อมูล | `!feedback.trim()` |

#### Prompt Type Mapping

| ปุ่ม | promptType | Agent |
|---|---|---|
| 🔍 วิเคราะห์ปัญหา | `analyze` | noc-agent |
| 🔍 วิเคราะห์ใหม่ | `analyze` (with context) | noc-agent |
| ✅ ข้อมูลถูกต้อง | — (state transition) | — |
| ❌ ส่งข้อมูลเพิ่มเติม | — (state transition) | — |
| 📝 ร่างคำตอบ | `draft` | noc-agent |
| 🔄 ขอร่างใหม่ | `draft` | noc-agent |
| ✅ ใช้ร่างนี้ | `close` | noc-closer |
| ✏️ เพิ่มข้อมูล | — (state transition) | — |
| 📧 ส่งเคส | `email` | noc-agent |
| 📄 Close Case | `close` | noc-closer |
| 🔙 ย้อนกลับ | — (state transition) | — |

- [ ] Review ที่ [apps/web1/src/app/noc/page.tsx](../src/app/noc/page.tsx)

### 13. Build & Verify

- [ ] `npm run build` — ต้องผ่าน ไม่มี error
- [ ] `npm run dev` — เปิด localhost:4568/noc → เห็น idle state
- [ ] กด New Case → เห็น input state
- [ ] พิมพ์ข้อความ → กดวิเคราะห์ → เห็น analysis state (หรือ error ถ้า opencode ไม่รัน)
- [ ] เช็ค disabled state ของปุ่ม (ใส่ข้อความ/ไม่ใส่)
- [ ] เช็ค dark/light mode
- [ ] เช็ค responsive

---

## หมายเหตุ

- **Location ของ opencode project:** ต้องชี้ไปที่ root ของ `chatbot-gate/`
- **opencode API:** `noc-closer` ใช้ agent ชื่อ `noc-closer` ใน opencode
- **Prompt ไม่ hardcode:** `noc-email.md` ต้องอ้างอิง `openstack-support/` แบบ dynamic
- **Template path:** `gate-answer/templates/case-log.md` สำหรับ close build mode
- **Case log saves to:** `.opencode/gate-answer/cases/noc-{DATE}-{SESSION_ID}.md`
- **`apps/web` (deprecated)** — อย่าไปแก้
- **`openstack-support/`** — knowledge repo ภายนอก (git pull มา)
- **Permission `noc-closer`** — `edit: allow` เพื่อ save ไฟล์โดยไม่ถาม

---

## Files Reference

| # | File Path | Action |
|---|---|---|
| 1 | `.opencode/opencode.json` | เพิ่ม noc-closer + ปรับ permission |
| 2 | `.opencode/gate-answer/agents/noc-agent.md` | เขียนใหม่ |
| 3 | `.opencode/gate-answer/agents/noc-closer.md` | สร้างใหม่ |
| 4 | `.opencode/gate-answer/templates/case-log.md` | ตรวจสอบ/ปรับ |
| 5 | `.opencode/gate-answer/prompts/noc-analyze.md` | สร้าง (rename จาก noc-send.md) |
| 6 | `.opencode/gate-answer/prompts/noc-draft.md` | สร้างใหม่ |
| 7 | `.opencode/gate-answer/prompts/noc-email.md` | สร้างใหม่ |
| 8 | `.opencode/gate-answer/prompts/noc-feedback.md` | ปรับ |
| 9 | `.opencode/gate-answer/prompts/noc-close.md` | ปรับ |
| 10 | `apps/web1/src/app/globals.css` | เพิ่ม --primary-color |
| 11 | `apps/web1/src/components/ui/Card/Card.tsx` | สร้างใหม่ |
| 12 | `apps/web1/src/components/ui/Card/Card.module.css` | สร้างใหม่ |
| 13 | `apps/web1/src/components/ui/Badge/Badge.tsx` | สร้างใหม่ |
| 14 | `apps/web1/src/components/ui/Badge/Badge.module.css` | สร้างใหม่ |
| 15 | `apps/web1/src/components/layout/AppLayout/AppLayout.tsx` | เพิ่ม headerAction |
| 16 | `apps/web1/src/components/layout/AppLayout/AppLayout.module.css` | ปรับ header layout |
| 17 | `apps/web1/src/lib/opencode-service.ts` | เพิ่ม loadPromptFile method |
| 18 | `apps/web1/src/app/api/chat/noc/route.ts` | รองรับ promptType |
| 19 | `apps/web1/src/app/noc/page.tsx` | เขียนใหม่ทั้งหมด |

---

## Log

| วันที่ | # | สิ่งที่ทำ | หมายเหตุ |
|---|---|---|---|
| 2026-06-28 10:00 | — | สร้าง PHASE1.1.md + config, agent, prompt, UI, API, state machine | Build ผ่าน ✓ |
| 2026-06-28 10:00 | 1 | `.opencode/opencode.json` — เพิ่ม `noc-closer` agent (`edit: allow`), ปรับ `noc-agent` permission ให้เข้าถึง `openstack-support/` | |
| 2026-06-28 10:00 | 2 | `.opencode/gate-answer/agents/noc-agent.md` — เขียนใหม่: รู้ 9 หมวด OLS, KB path, NOC workflow 3 phase | |
| 2026-06-28 10:00 | 3 | `.opencode/gate-answer/agents/noc-closer.md` — สร้างใหม่: build mode, อ่าน template + save case log | |
| 2026-06-28 10:00 | 4 | `.opencode/gate-answer/prompts/noc-analyze.md` — สร้าง (rename จาก noc-send.md): วิเคราะห์ + KB matching | |
| 2026-06-28 10:00 | 5 | `.opencode/gate-answer/prompts/noc-draft.md` — สร้างใหม่: draft OLS-style response | |
| 2026-06-28 10:00 | 6 | `.opencode/gate-answer/prompts/noc-email.md` — สร้างใหม่: dynamic NOC handoff (อ่านจาก `openstack-support/` runtime) | |
| 2026-06-28 10:00 | 7 | `.opencode/gate-answer/prompts/noc-feedback.md` — ปรับ: re-analyze พร้อม info เพิ่ม | |
| 2026-06-28 10:00 | 8 | `.opencode/gate-answer/prompts/noc-close.md` — ปรับ: build mode save log | |
| 2026-06-28 10:00 | 9 | `apps/web1/src/app/globals.css` — เพิ่ม `--primary-color`, `--warning-color`, `@keyframes spin` | |
| 2026-06-28 10:00 | 10 | `apps/web1/src/components/ui/Badge/*` — สร้างใหม่: 5 variants (default/success/warning/danger/info) | |
| 2026-06-28 10:00 | 11 | `apps/web1/src/components/layout/AppLayout/*` — เพิ่ม `headerAction` prop + CSS `.headerAction` | |
| 2026-06-28 10:00 | 12 | `apps/web1/src/app/api/chat/noc/route.ts` — เขียนใหม่: รองรับ `promptType` + `noc-closer` สำหรับ close | |
| 2026-06-28 10:00 | 13 | `apps/web1/src/app/noc/page.tsx` — เขียนใหม่: state machine 11 states + header New Case + button validation | |
| 2026-06-28 10:00 | — | ลบ `noc-send.md` (เปลี่ยนชื่อเป็น `noc-analyze.md`) | |

---

## Implementer Notes

- State machine logic: ใช้ `useState` กับ string state type
- API Route: prompt file load ใช้ `fs.readFileSync` หรือ `fetch` (แล้วแต่ environment) — **แต่ Next.js Edge/Build ไม่มี fs** → ต้องใช้ absolute path + อ่านตอน runtime
- **ข้อควรระวัง:** ใน Next.js App Router (`route.ts`), `fs` ใช้ได้เฉพาะใน Node.js runtime (ไม่ใช่ Edge) — ต้องมั่นใจว่า runtime เป็น `nodejs`
- `loadPromptFile`: ใช้ absolute path จาก `process.cwd()` เพื่อหา `.opencode/gate-answer/prompts/`

### Next.js Runtime Fix

ใน `route.ts` ใช้ dynamic import หรือ polyfill — แนะนำให้ใช้ `fs/promises` กับ `path`:

```typescript
import fs from 'fs/promises';
import path from 'path';

async function loadPromptFile(promptType: string): Promise<string> {
  const filePath = path.join(process.cwd(), '..', '..', '.opencode', 'gate-answer', 'prompts', `noc-${promptType}.md`);
  return fs.readFile(filePath, 'utf-8');
}
```

⚠️ ต้องเช็คว่า `next.config.ts` ไม่ได้ตั้ง `runtime: 'edge'` สำหรับ route นี้
