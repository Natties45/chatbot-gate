# Phase 1 — Core opencode Integration

> เป้าหมาย: NOC + Operation Chat ทำงานผ่าน opencode จริง ครบ loop
> Server: `203.154.16.197` | opencode port: `4096`

---

## Checklist

### 1. Server — ติดตั้ง opencode

- [ ] ติดตั้ง opencode binary v1.17.9 บน 203.154.16.197
      (ตาม `openstack-image/build/apps/opencode/opencode.md`)
- [ ] สร้าง systemd service: `opencode serve --hostname 0.0.0.0 --port 4096`
- [ ] เปิด CORS: `--cors http://203.154.16.197` (หรือ `http://localhost:4568` ตอน dev)
- [ ] Verify: `curl http://203.154.16.197:4096/global/health` → `{ "healthy": true }`
- [ ] ตั้ง `.opencode/opencode.json` + `gate-answer/` ในโฟลเดอร์ที่ opencode ใช้เป็น project

### 2. Model — Provider API Key

- [ ] สมัคร DeepSeek `platform.deepseek.com` → สร้าง API key (free tier)
- [ ] ใส่ key ใน opencode: `/connect` → DeepSeek → paste key
- [ ] Verify: `GET /config/providers` → เห็น deepseek models

### 3. Agent — ตรวจสอบ agent config

- [ ] Verify: `GET /agent` → ต้องเจอ `noc-agent`, `operation-agent`
- [ ] ทดสอบส่งข้อความตรงผ่าน opencode API:
      `POST /session` → `POST /session/:id/message` ด้วย agent=noc-agent
- [ ] ปรับ fine-tune prompt ใน `gate-answer/agents/*.md` เท่าที่จำเป็น

### 4. Backend API — ทดสอบ endpoint apps/web1

- [ ] `POST /api/chat/noc` action=init → `{ sessionId }`
- [ ] `POST /api/chat/noc` action=message + sessionId → `{ response }` (AI ตอบจริง)
- [ ] `POST /api/chat/noc` action=close + sessionId → `{ summary }`
- [ ] `POST /api/chat/operation` action=init → `{ sessionId }`
- [ ] `POST /api/chat/operation` action=message + sessionId → `{ response }`
- [ ] `POST /api/chat/operation` action=close + sessionId → `{ summary }`
- [ ] เช็ค error handling: ไม่มี sessionId → 400, opencode offline → 503

### 5. UI — ทดสอบหน้าเว็บ

- [ ] `/noc` idle → ปุ่ม "New Case" โชว์
- [ ] `/noc` กด New Case → สร้าง session → chat interface
- [ ] `/noc` พิมพ์ + Enter → AI ตอบกลับ (raw text)
- [ ] `/noc` Close Case → กลับ idle
- [ ] `/operation` idle → New Case → Chat → Close (เหมือน NOC)
- [ ] Dark/Light mode toggle → sidebar footer
- [ ] ข้อความ error กรณี server offline → ข้อความ "Connection Error"

### 6. Deployment — ขึ้น production

- [ ] Deploy `apps/web1` build ไปยัง 203.154.16.197
- [ ] ตั้ง nginx route `/` → web1 container
- [ ] Verify: เปิด browser → ถึงหน้า NOC Chat
- [ ] Test จริง: ส่งข้อความ → opencode ตอบ → close case

---

## หมายเหตุ

- **Location ของ opencode project:** ต้องชี้ไปที่ root ของ `chatbot-gate/` เพื่อให้ `.opencode/` ถูก detect
- **opencode ไม่ได้ติดตั้งใน Docker** — รันแยกเป็น systemd service บน host
- **`apps/web1` ต่อกับ opencode ผ่าน HTTP** (`OPENCODE_SERVER_URL`)
- **`apps/web` ยังอยู่ (deprecated)** — อย่าไปแก้
- **gate-answer/ repo** — ยังไม่แยก repo จนกว่า agent prompts stable

---

## Log

| วันที่ | # | สิ่งที่ทำ | หมายเหตุ |
|-------|---|---------|---------|
| 2026-06-27 22:00 | — | สร้าง PHASE1.md + สร้าง apps/web1 (structure, components, pages, API routes, opencode-service) | ทุกอย่าง build ผ่าน ✓ |
| 2026-06-27 22:00 | — | สร้าง docs/architecture.md — core document ใหม่ | |
| 2026-06-27 22:00 | — | สร้าง .opencode/gate-answer/ (agents, prompts, templates) | |
| 2026-06-27 22:00 | — | ลบ docs เก่า (current_status.md, ADR เก่า, governance/source-of-truth.md) | อัปเดท README |
