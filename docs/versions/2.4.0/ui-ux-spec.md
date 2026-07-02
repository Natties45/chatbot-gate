# GATE 2 UI/UX Spec

> Version target: 2.4.0  
> Reference screen: `docs/versions/2.4.0/mockup.html`  
> Purpose: ใช้เป็นกติกา UI/UX กลางสำหรับ update app2 โดยไม่ให้หน้าจอ, wording, state และ button hierarchy เพี้ยนจากแนวทางที่กำหนด

---

## Design Intent

GATE 2 เป็น operations console สำหรับทีม NOC และ Operation ไม่ใช่ chatbot ทั่วไป หน้าจอต้องให้ความรู้สึกเป็นเครื่องมือทำงานจริง: หนักแน่น, อ่านง่าย, state ชัดเจน, ปุ่มสำคัญหาเจอทันที และไม่ใช้ layout ที่ดูเหมือน landing page หลังจาก login แล้ว

แนวภาพรวม:
- Dark operations theme เป็นค่าเริ่มต้น
- Accent หลักคือ green สำหรับ primary action และสถานะพร้อมใช้งาน
- Blue ใช้กับ Operation/research
- Violet ใช้กับ MCP, fallback, deploy/prompt volume หรือ technical subsystem
- Yellow ใช้กับ warning, clarify, escalate pending
- Red ใช้กับ destructive action เช่น close/logout/error

ภาษาใน UI:
- เมนูหลักและชื่อ module ใช้ English ตาม app ปัจจุบัน เช่น `Dashboard`, `NOC Chat`, `Operation Chat`, `Case History`, `Admin Console`
- ข้อความ workflow, prompt, case content, warning และคำอธิบายผู้ใช้ ใช้ภาษาไทย
- Technical terms ใช้ English เมื่อชัดกว่า เช่น `Clarify`, `Research`, `Deploy`, `Health Check`, `Case`, `Knowledge Base`

---

## Shell Layout

หลัง login ทุกหน้าหลักใช้ shell เดียวกัน:

- Fixed sidebar กว้าง 220px บน desktop
- Main content อยู่ด้านขวา sidebar
- Topbar สูงประมาณ 64px แสดง page title, subtitle และ action ของหน้านั้น
- Content area ใช้ card/panel ที่มี border บางและ radius ใหญ่
- Mobile ซ่อน sidebar แล้วใช้ top select navigation แทน
- หน้าแรกหลัง login ของทุก role คือ `Dashboard`

Sidebar ต้องมี:
- Brand: `GATE 2`
- Version/status line: `Operations Console v2.4.0`
- User chip: username และ role
- Navigation ตาม role เท่านั้น ไม่แสดงเมนูที่ role ไม่มีสิทธิ์
- System Status block แสดงสถานะ module หลัก ไม่ใช่ข้อความอธิบาย version plan
- Footer ด้านล่างสุดแสดง username, role badge และ `Logout`

Topbar rules:
- Title ต้องตรงกับหน้า
- Subtitle ต้องบอก purpose/state สั้นๆ
- Topbar action ต้องไม่แน่นเกินไป บน mobile ให้ wrap ลงบรรทัดใหม่
- Primary action ของหน้าอยู่ขวาบนเสมอ เช่น `New Case`, `Generate & Push Now`, `Deploy v2.4.0`

Logout placement:
- `Logout` ต้องอยู่ sidebar footer ด้านล่างสุดเสมอ
- `Logout` ไม่ใช่ nav item และต้องไม่อยู่ปนกับเมนูหลัก
- ใช้ danger style แบบ low emphasis
- บน mobile ให้แสดงใน account/footer area ไม่ใช่ primary topbar action

---

## Role-Based Navigation

ทุก role ใช้ shell เดียวกัน แต่เมนูต้องแสดงเฉพาะสิทธิ์ของ role นั้น

Admin:
- Default page: `Dashboard`
- Menu: `Dashboard`, `NOC Chat`, `Operation Chat`, `Case History`, `Admin Console`
- เห็น automation, deploy, user management และ settings ทั้งหมด

NOC:
- Default page: `Dashboard`
- Menu: `Dashboard`, `NOC Chat`, `Case History`
- ไม่เห็น `Operation Chat` และ `Admin Console`
- Dashboard เน้นเคสลูกค้า, clarify, draft, escalated cases

Operation:
- Default page: `Dashboard`
- Menu: `Dashboard`, `Operation Chat`, `Case History`
- ไม่เห็น `NOC Chat` และ `Admin Console`
- Dashboard เน้น escalated cases, research running, diagnosis pending และ system warnings

Access guardrails:
- Role ธรรมดาห้ามเห็น admin controls เช่น deploy, KB auto generate, git sync, user management
- ถ้า user ไม่มีสิทธิ์เข้าหน้าใด หน้านั้นต้องไม่แสดงใน navigation
- ถ้า URL เปิดหน้าที่ไม่มีสิทธิ์โดยตรง app ควร redirect ไป `Dashboard` หรือแสดง forbidden state ที่ชัดเจน

---

## Role Dashboard

Dashboard เป็นหน้าแรกหลัง login ของทุก role ใช้ตอบคำถามว่า "วันนี้ต้องทำอะไรต่อ" ไม่ใช่หน้ารวมกราฟรกๆ

Dashboard layout:
- Hero card ด้านบน: greeting, role-specific intro, `Customize Dashboard`
- Row 1: Today Summary metrics 3-4 cards
- Row 2: Work Queue และ Quick Actions
- Optional customize panel: show/hide card groups

Admin dashboard:
- Metrics: open cases, escalated cases, provider status, deploy status
- Work queue: active cases across NOC/Operation, KB auto status, deploy update
- Quick actions: `Open Admin Console`, `Check Deploy`, `Generate KB`, `View History`

NOC dashboard:
- Metrics: my open cases, waiting clarify, drafts ready, escalated today
- Work queue: active NOC cases with state and next action
- Quick actions: `New NOC Case`, `Resume Last Case`, `View Escalated`, `Export Today`

Operation dashboard:
- Metrics: assigned cases, research running, diagnosis pending, system warnings
- Work queue: escalated cases, research cases, diagnosis review
- Quick actions: `New Operation Case`, `Open Escalations`, `Attach Logs`, `View History`

Customize rules:
- `Customize Dashboard` ต้องเป็น secondary action ไม่ใช่ primary
- Customization เริ่มจาก show/hide card groups ก่อน อย่าเพิ่มระบบลากวางซับซ้อนถ้ายังไม่จำเป็น
- บันทึก preference ต่อ user ได้ในอนาคต เช่น `dashboard.layout.{userId}`
- จำกัด card ต่อ row 3-4 ใบบน desktop และเรียง single column บน mobile

Dashboard guardrails:
- ห้ามใส่ metric ที่ไม่มี action หรือไม่มีผลต่อการตัดสินใจ
- ห้ามทำ Dashboard เป็นหน้า report ยาว
- ห้ามแสดง admin/system automation card ให้ NOC หรือ Operation เห็น
- Work Queue ต้องมีปุ่ม next action เช่น `ทำต่อ`, `Open`, `Review`, `Copy`

---

## Login Screen

Login เป็นหน้า product จริง ไม่ใช่หน้าพรีเซนต์

องค์ประกอบ:
- Brand block: `GATE 2`, `AI-powered NOC and Operation Support`
- Hero headline: สื่อว่าเป็นศูนย์กลางรับเคส วิเคราะห์ ส่งต่อ และดูแลระบบ
- Metric cards: แสดง capability สำคัญ เช่น NOC states, research sources, upload cleanup, deploy flow
- Login card: username, password, provider status strip, primary login button
- Status strip: `Groq primary`, `Ollama fallback`, `MCP ready`

ปุ่ม:
- `เข้าสู่ระบบ`: primary green, full width

UX behavior:
- เมื่อ login สำเร็จ เปิด `Dashboard` ทุก role
- Dashboard และ navigation ต้องเปลี่ยนตาม role
- admin เห็น admin controls, NOC และ Operation เห็นเฉพาะงานของตัวเอง

ห้าม:
- ห้ามใช้คำว่า mock, preview, direction บนหน้าจอ
- ห้ามใส่คำอธิบายเชิงเอกสาร version plan ในหน้า login

---

## NOC Chat

NOC Chat ต้องออกแบบเหมือน workspace ทำเคส ไม่ใช่ chat box เดี่ยว

Layout:
- Left rail: active queue และ state flow
- Main chat panel: case header, chat body, quick actions, composer
- Header แสดง case id และ state ปัจจุบัน

State flow:
- `IDLE`: ยังไม่มี active case หรือรอเลือก case
- `CLARIFY`: AI ถามข้อมูลเพิ่มก่อนวิเคราะห์
- `ANALYZE`: วิเคราะห์ category, confidence, summary, recommendation
- `CHAT`: ถามตอบต่อกับ NOC
- `DRAFT`: ร่างคำตอบลูกค้า
- `ESCALATE`: สรุปส่ง Operation

State flow ใน rail ต้องเรียงลำดับเดิมเสมอ:
`IDLE -> CLARIFY -> ANALYZE -> CHAT -> DRAFT -> ESCALATE`

ปุ่มหลักใน NOC:
- `New Case`: topbar primary, สร้างเคสใหม่
- `ปิดเคส`: topbar danger, แสดงเมื่อมี active case
- `ร่างคำตอบ`: quick action, ใช้หลัง analyze/chat
- `Feedback`: quick action, ส่ง feedback ให้ AI ปรับคำตอบ
- `Copy`: quick action ใน draft/escalate state
- `ใช้ร่างนี้`: primary, ปิดเคสด้วยร่างคำตอบล่าสุด
- `Escalate`: warning, สร้าง internal summary ให้ Operation
- `Handoff`: blue, สร้าง email/handoff template
- `แนบไฟล์`: secondary, แนบ txt/image เท่านั้น
- `ส่ง`: composer primary, ส่งข้อความใน chat

Clarify UX:
- คำถาม clarify ต้องสั้นและระบุว่าต้องการข้อมูลอะไร
- Option buttons ต้องอยู่ใต้ข้อความ AI และคลิกได้
- ต้องมีตัวเลือก free text เช่น `อื่นๆ - พิมพ์เพิ่มเติม`
- Max clarify 2 rounds จากนั้นไป analyze

Draft UX:
- Draft card ต้องใช้ left border สี green
- Customer-facing draft ต้องขึ้นต้น `เรียน ผู้ใช้บริการ` และปิดท้าย `ขอบคุณครับ`
- Draft ต้องไม่พูดถึง internal providers, tools, system internals หรือ implementation details

Escalate UX:
- Escalate card ใช้ left border สี orange/yellow
- Content เป็น internal summary ไม่ใช่ข้อความถึงลูกค้า
- ต้องมี issue, reason, requested data หรือ next action

File attach UX:
- แสดงเป็น file chip เหนือ composer หรือใน chat timeline
- รองรับ `.txt`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`
- แสดง max size guideline เฉพาะตอน upload/error ไม่ต้องแสดงตลอดถ้ารบกวนงาน

---

## Operation Chat

Operation Chat ต้องเน้น technical diagnosis และ research progress

Layout:
- Left rail: operation case queue และ state flow
- Main chat panel: issue context, clarify options, research progress, diagnosis output

State flow:
- `IDLE`: รอสร้างหรือ resume case
- `CLARIFY`: ถามข้อมูลระบบ/log/environment
- `RESEARCH`: ทำ sequential research พร้อม progress
- `DIAGNOSE`: สรุป issue, cause, actions, references

Research order ต้องแสดงใน UI เป็น:
`KB Search -> OpenCode -> Docker`

ปุ่มหลักใน Operation:
- `New Case`: topbar primary
- `ปิดเคส`: topbar danger
- `ถามต่อ`: quick action หลัง diagnose
- `ร่างคำตอบ`: สร้างสรุปภาษาไทยสำหรับส่งต่อหรือรายงาน
- `แนบไฟล์เพิ่ม`: แนบ log/text เพิ่ม
- `Export`: export case/report
- `Close Case`: danger, ปิดเคส
- `แนบ log`: composer secondary
- `ส่ง`: composer primary

Progress UX:
- Progress bar ต้องมี percent หรือ step label
- Research steps แสดง 3 card: KB, OpenCode, Docker
- Step status ใช้ visual state: done, active, pending
- ถ้า OpenCode ใช้งานไม่ได้ ต้องแสดงเป็น warning แต่ flow ยังไปต่อด้วย source ที่เหลือ

Diagnosis output:
- ใช้ structured card 4 ส่วนเสมอ
- `Issue`: อาการหนึ่งบรรทัด
- `Likely Cause`: root cause พร้อม evidence
- `Actions`: step-by-step action
- `References`: KB, external docs summary, Docker evidence, similar cases

ห้าม:
- ห้ามทำ diagnosis เป็น paragraph ยาวก้อนเดียว
- ห้ามซ่อน progress ระหว่าง research นานๆ โดยไม่มี feedback
- ห้ามวาง destructive action เป็น primary

---

## Case History

Case History เป็นหน้าตรวจย้อนหลัง, filter, resume และ export

Layout:
- Filter card ด้านบน
- Table card ด้านล่างเต็มพื้นที่
- Table ต้อง scroll ได้ถ้าข้อมูลกว้าง

Filters:
- `From`
- `To`
- `Module`: All, NOC, Operation
- `Status`: All, In Progress, Closed, Escalated
- `Case ID`
- `Search`

Table columns:
- Case ID
- Module
- User
- Status
- State
- Summary
- Updated
- Action

ปุ่ม:
- `Search`: primary, apply filters
- `View`: เปิดรายละเอียดเคสที่ปิดแล้ว
- `Resume`: กลับไปทำเคสที่ยังไม่ปิดต่อ
- `Export Markdown`: topbar secondary, export ตาม filter ปัจจุบัน
- `Refresh`: reload table

Status badge rules:
- NOC: green
- Operation: violet
- In Progress: blue
- Closed: green/blue ตามบริบท
- Escalated: yellow
- Error/failed: red

---

## Admin Console

Admin Console เป็นหน้าสำหรับ admin เท่านั้น ใช้ tab layout ด้านซ้ายและ content card ด้านขวา

Tabs:
- `Agent Configuration`
- `Git Sync`
- `KB Auto-Generate`
- `Deploy`
- `User Management`

Tab UX:
- Active tab ใช้ green background
- บน mobile tabs เปลี่ยนเป็น horizontal scroll
- ปุ่ม primary ของแต่ละ tab อยู่มุมขวาบนของ section title
- NOC และ Operation ห้ามเห็นหน้านี้ใน navigation

### Agent Configuration

ใช้สำหรับตั้งค่า NOC/Operation agent และ runtime providers

ปุ่ม:
- `Save Settings`: primary, บันทึก settings

Content rules:
- แยก card สำหรับ NOC Agent และ Operation Agent
- แสดง model, clarify rounds, research order, timeout
- Runtime provider status แสดง `Groq Primary` และ `Ollama Fallback`

### Git Sync

ใช้ตรวจสถานะ repository และ sync knowledge source

ปุ่ม:
- `Refresh Status`: secondary

Content rules:
- แสดง repository path, branch, last sync, status
- Action ที่เสี่ยง เช่น change repo ต้องมี confirm step ใน app จริง

### KB Auto-Generate

ใช้สำหรับ v2.3.0 daily KB generation

ปุ่ม:
- `Generate & Push Now`: primary, manual run

Fields/status:
- Enable daily generation toggle
- Run time
- Date range สำหรับ manual run
- Current status: Idle, Running, Done, Error
- Last run
- Last push
- Last run log

UX rules:
- Toggle ต้องแสดงสถานะชัดเจน
- Running state ต้อง disable manual trigger หรือแสดง loading
- Error ต้องแสดงใน card และ log box
- ต้องสื่อชัดว่า push เฉพาะ auto-generated files เท่านั้น

### Deploy

ใช้สำหรับ v2.4.0 deploy app2 ผ่าน deploy-agent

ปุ่ม:
- `Check for Updates`: secondary
- `Deploy vX.Y.Z`: primary เฉพาะ admin

Fields/status:
- Current Version
- Latest Available
- Deploy Target
- Health Endpoint status
- Prompt Volume status
- Rollback readiness
- Deploy History
- Deploy Log

UX rules:
- Deploy button ต้องอยู่ใน card `Version`
- ต้องแสดง deploy target ชัดเจนก่อนกด
- ขณะ deploy ต้องเปลี่ยน status เป็น Building/Deploying/Health Check
- ถ้าล้มเหลวให้ใช้ red badge และแสดง rollback result
- Deploy log ใช้ monospace log box

### User Management

ใช้จัดการผู้ใช้และ role

ปุ่ม:
- `Add User`: primary
- `Edit`: secondary ต่อ row

Columns:
- User
- Role
- Status
- Default Page
- Action

Role rules:
- admin เห็นทุกเมนู
- noc เห็น NOC Chat และ Case History
- operation เห็น Operation Chat และ Case History

---

## Component Rules

### Buttons

Button hierarchy:
- Primary green: action หลักที่ปลอดภัยและคาดหวังให้กด
- Secondary dark: action รอง, attach, copy, refresh, view
- Danger red: close, logout, destructive action
- Warning yellow: escalate, warning action
- Blue: Operation/helpful generated artifact เช่น handoff/export/research
- Violet: technical subsystem/deploy/prompt volume context

Button text rules:
- ใช้คำสั้น ชัด เช่น `New Case`, `ปิดเคส`, `ส่ง`, `Copy`, `Deploy v2.4.0`
- ห้ามใช้คำทั่วไปเกินไป เช่น `OK`, `Submit` ถ้าระบุ action ได้ดีกว่า

### Badges

Badges ใช้บอกสถานะ ไม่ใช่ใช้ตกแต่งเกินจำเป็น

Badge color mapping:
- Green: ready, success, NOC, primary provider
- Blue: in progress, research, operation action
- Violet: Operation module, fallback, technical subsystem
- Yellow: clarify, warning, escalated
- Red: error, failed, danger

### Chat Bubbles

User bubble:
- Align right
- Green background
- Text dark

Assistant bubble:
- Align left
- Dark translucent background
- Border บาง

System/progress bubble:
- Full width หรือเกือบ full width
- Blue-tinted background

Draft card:
- Left border green

Escalate card:
- Left border orange/yellow

### Tables

Tables ต้องอ่านง่ายในจอกว้างและ scroll ได้บนจอเล็ก

- Header sticky เมื่อ table scroll
- Row height ไม่ต่ำเกินไป
- Action column อยู่ขวาสุด
- Badge ใช้ใน Module/Status เท่านั้น ไม่ใส่ทุก cell จนรก

### Logs

Log box ใช้ monospace

- Background มืดกว่า panel
- Text สีเขียวอ่อน
- จำกัดความสูงและ scroll ได้
- ใช้สำหรับ KB Auto และ Deploy logs

---

## Responsive Rules

Desktop:
- Sidebar fixed 220px
- Main content ใช้ 2-column layout ใน NOC/Operation
- Admin Console ใช้ side tabs + content card

Tablet/mobile:
- ซ่อน sidebar
- ใช้ mobile select navigation ด้านบน
- NOC/Operation เปลี่ยนเป็น single column: queue อยู่บน chat
- Admin Console tabs เป็น horizontal scroll
- Composer stack เป็นแนวตั้งถ้าพื้นที่แคบ
- Table ต้อง scroll แนวนอนได้ ไม่บีบ columns จนอ่านไม่ได้

---

## AI Update Guardrails

เมื่อ AI หรือ developer update app2 ห้ามทำสิ่งต่อไปนี้โดยไม่มีเหตุผลชัดเจน:

- ห้ามเปลี่ยน state order ของ NOC และ Operation
- ห้ามเปลี่ยนสี primary จาก green ไปสีอื่น
- ห้ามทำ destructive action เป็น primary button
- ห้ามลบ left rail ของ NOC/Operation บน desktop
- ห้ามเปลี่ยน Admin Console จาก tabbed admin console เป็น page ยาวหน้าเดียว
- ห้ามใส่ข้อความแนว presentation เช่น mock, preview, direction ลงในหน้าจอ product
- ห้ามทำ customer-facing draft พูดถึง internal providers, tools, system internals หรือ implementation details
- ห้ามซ่อน progress ใน Operation research
- ห้ามทำ mobile layout โดยให้ sidebar fixed ทับ content

ถ้าต้องเพิ่ม feature ใหม่ ให้เพิ่มเป็น card/tab/state ที่เข้ากับ rules นี้ก่อน อย่าแทรกปุ่มหรือข้อความลงใน chat แบบไม่มี hierarchy
