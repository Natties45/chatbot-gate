# UX/UI Spec — Version 1.10

> Scope: Login, Settings, Account Management, Case History, View modal, Markdown export.

---

## Design Principles

- Follow current `apps/web1` visual language: fixed 200px sidebar, flat panels, border-first layout, green accent.
- Use current app tokens: `--bg-color`, `--panel-bg`, `--border-color`, `--text-color`, `--text-muted`, `--accent-color`.
- Use Inter + Noto Sans Thai typography.
- Keep tables compact and avoid AI-derived columns that can be unreliable.
- Prefer modal details over wide tables.
- Avoid decorative UI. Keep admin tooling utilitarian.

---

## Navigation

Sidebar items after login:

| Item | Path | Access |
|------|------|--------|
| NOC Chat | `/noc` | `admin`, `noc` |
| Operation Chat | `/operation` | `admin`, `operation` |
| Case History | `/history` | all roles, filtered by access |
| Settings | `/settings` | `admin` only |

Role access behavior:

| Role | Visible Pages |
|------|---------------|
| `admin` | All pages |
| `noc` | NOC Chat, Case History |
| `operation` | Operation Chat, Case History |

---

## Login Page

Layout:

```text
GATE

Username [____________]
Password [____________]

[Login]
```

Behavior:

- Unauthenticated users are redirected to `/login`.
- Successful login creates a cookie session.
- Failed login shows inline error.
- Disabled users cannot log in.
- Default admin seed is `admin` / `admin`.

Post-login redirect:

| Role | Redirect |
|------|----------|
| `admin` | `/noc` |
| `noc` | `/noc` |
| `operation` | `/operation` |

Empty/error states:

| State | Message |
|-------|---------|
| Missing fields | `Username and password are required.` |
| Invalid login | `Invalid username or password.` |
| Disabled user | `This user is disabled.` |

---

## Settings Page

Structure:

```text
Settings
├── opencode
│   ├── NOC Agent
│   ├── Operation Agent
│   └── NOC Closer Agent
└── Account Management
```

### opencode Section

Agent cards are not full collapsible cards. Each agent is a flat group inside the same `opencode` panel.

NOC Agent:

```text
NOC Agent [noc-agent]
NOC Model [select]
[Advanced ▸]
```

Expanded Advanced:

```text
Temperature [slider]
Top P       [slider]
```

Operation Agent:

```text
Operation Agent [operation-agent]
Operation Model [select]
[Advanced ▸]
```

Expanded Advanced:

```text
Temperature [slider]
Top P       [slider]
```

NOC Closer Agent:

```text
NOC Closer Agent [noc-closer]
[Advanced ▸]
```

Expanded Advanced:

```text
Temperature [slider]
```

Behavior:

- Advanced sections are collapsed by default.
- Clicking `Advanced ▸` opens only that agent's advanced area.
- Clicking again collapses it.
- Save button persists settings.

---

## Account Management

Account Management appears at the bottom of Settings.

Header:

```text
Account Management                         [+ Add User]
Draft UI only. Page/role locking will be implemented later.
```

Table columns:

| User | Role | Status | Action |
|------|------|--------|--------|
| admin | admin | Active | Edit / Delete |
| noc01 | noc | Active | Edit / Delete |
| op01 | operation | Disabled | Edit / Delete |

Rules:

- `User` must be unique.
- Roles are `admin`, `operation`, `noc` only.
- UI status labels are `Active`, `Disabled`.
- DB status values are `active`, `disabled`.

### Add/Edit User Modal

Same modal for Add and Edit.

Add mode:

```text
Add User

User            [editable]
Password        [required]
Confirm Pass    [required]
Role            [admin | operation | noc]
Status          [Active | Disabled]

[Cancel] [Save]
```

Edit mode:

```text
Edit User

User            [disabled/read-only]
Password        [blank = no change]
Confirm Pass    [blank = no change]
Role            [admin | operation | noc]
Status          [Active | Disabled]

[Cancel] [Save]
```

Validation:

- Add: user required.
- Add: password required.
- Add/Edit: confirm pass must match password when password is entered.
- Add: user cannot duplicate existing username.
- Edit: username cannot be changed.

---

## Case History Page

Table columns:

```text
ID | User | Role | Page | Created | Updated | Status | Action
```

Column meaning:

| Column | Meaning |
|--------|---------|
| ID | Case ID format `DDMMYYNN`, e.g. `29066901` |
| User | Username who created the case |
| Role | User role snapshot when the case was created |
| Page | `NOC` or `Operation` |
| Created | Created time |
| Updated | Last updated time |
| Status | `In Progress` or `Closed` |
| Action | `View` |

Filters:

```text
From Date | To Date | Page | Status | Case ID Search | Export Markdown
```

Default filters:

```text
From Date = today
To Date = today
Page = All
Status = All
Case ID = blank
```

Pagination:

- Default load: 20 rows.
- `Load more` appends 20 more rows.
- Do not expose a row-count input in v1.10.
- Export ignores pagination and uses all records matching filters.

Table intentionally excludes:

- Summary
- Category
- Confidence

Reason: these make the table noisy and depend on AI classification or close-state availability.

---

## View Case Modal

Opening:

- Click `View` in Case History table.

Header:

```text
Case 29066901
[NOC] [In Progress] User: noc01 Role: noc Created: 2026-06-29 10:20 Updated: 10:32
```

For in-progress case:

```text
Chat History
[user bubble]
[assistant bubble]
[draft card if available]
```

For closed case, add summary panel above chat:

```text
Closed Summary
Summary text

Detail / Resolution
Detail text

Chat History
...
```

Close behavior:

- Close button dismisses modal.
- Clicking overlay dismisses modal.

---

## Markdown Export UX

Export button:

```text
Export Markdown
```

Behavior:

- Uses current filter values.
- Uses `createdAt` date range.
- Includes all matching cases, not just visible paginated rows.
- If no cases match, show `No cases found. No file generated.`
- File downloads in browser.

Filename:

| Filter | Filename |
|--------|----------|
| Single day | `case-history-2026-06-29.md` |
| Date range | `case-history-2026-06-29-to-2026-06-30.md` |

---

## Empty / Loading / Error States

| Area | State | UI |
|------|-------|----|
| Login | Invalid credentials | Inline error under form |
| Case History | No cases | `No cases found` row |
| Case History | Loading | Small spinner or disabled table state |
| Export | No matching cases | Alert/toast: no file generated |
| Settings | Save success | `Settings saved` text |
| Account Management | Duplicate user | Inline/modal error |
| Account Management | Password mismatch | Inline/modal error |

---

## Out Of Scope For UX

- Password reset screen
- User profile menu
- Full role permission matrix UI
- Audit log page
- CSV export
- Server-side Markdown archive browser
