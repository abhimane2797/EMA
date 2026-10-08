# Enterprise Management Application — Computerization of FSL

Government IT project management portal for the Forensic Science Laboratory (Maharashtra). Built with mock data + mock API layer so it can be wired to a real REST backend later.

**Project:** Computerization of FSL (Government of Maharashtra)

---

## Tech Stack

- **React 18 + TypeScript + Vite**
- **MUI v5** with custom light/dark theme (blue primary `#1A56DB`, status colours, 8px spacing, rounded cards)
- **React Router v6** — protected routes, role-based & module-flag guards
- **TanStack React Query** for fetching/caching (ready, queries currently use mockApi directly; swap to axios when backend is ready)
- **React Hook Form + Zod** for validation
- **Axios** client with JWT interceptor + 401 redirect
- **Zustand** for auth (`authStore`) + UI (`uiStore` — theme, sidebar)
- **Recharts** for progress donut / Gantt-style timeline
- **date-fns** for dates

## Folder Structure

```
src/
  api/           — client.ts (axios + interceptors), mockApi.ts (in-memory REST mock)
  components/    — DataTable, StatusChip, PageHeader, SearchableSelect, FileUploader, CommentThread, ConfirmDialog, EmptyState
  features/
    auth/        — LoginPage, ChangePasswordPage
    tasks/       — TasksPage (tabs), ParentTaskCreate/List/Detail, ChildTaskCreate/List/Detail, Budget + Progress views
    admin/       — Projects, CostCenters, Mappings, Users, RolesAccess
  layouts/       — AppShell (TopBar + collapsible Sidebar + Breadcrumbs)
  routes/        — router + ProtectedRoute (RequireAuth / RequireRole / RequireModule)
  store/         — authStore, uiStore
  theme/         — MUI theme factory (light/dark)
  types/         — all entities (ParentTask, ChildTask, Comment, Attachment, BudgetEntry, User, Project, CostCenter, Mapping)
  mocks/         — seed data (users, tasks, budgets, projects, cost centers)
  utils/         — fmtDate, statusColor, genId, overlaps, fileValidation, isPasswordExpired
  pages/         — ComingSoon, Dashboard
```

## Roles & Access

| Role | Access |
|---|---|
| **Operations Manager** (Rishikesh Oza, Tanmay Halaye — Director) | All modules + Admin/Masters |
| **Project Manager** (Pratik Mulgir, Rajesh Sharma) | Can create parent/child tasks, manage budget, view all parent tasks, comment |
| **Technical Team Member** (Gaurav Bhangale — BA, Ananya Singh, Sneha Kulkarni…) | Sees only assigned tasks; can edit Status, End Date, Activities, Comments, Attachments; can create child tasks |

Module flags per user (`Project Management`, `Task Management`, `Asset Management`, `Incident Management`, `Reports & Dashboard` — Yes/No) control sidebar + route guards. `Task Management` is fully built; others render a clean **Coming soon** placeholder.

## Screens

### 1. Login
- Split layout: branding (gradient, FSL) + form. Show/hide password, inline Zod errors.
- Mock users: password `Password@123` for all. Demo quick-fill buttons.
- Cases:
  - Inactive user (`vikas.patil`) → “Your account is inactive”.
  - Expired password (>90d, `ananya.singh`) → redirect to **Change password** (new password: 8+ chars, uppercase + number).

### 2. App Shell
- Top bar: app name, project name, role chip, light/dark toggle, avatar menu (name/role/logout).
- Collapsible left sidebar (module links filtered by role + flags). Collapsed width 72px, expands to 260px. Mobile drawer.
- Breadcrumbs + responsive layout.

### 3. Task Management
**Tabs:** Parent Tasks | Child Tasks (plus creation forms)

- **Parent Task Creation (PM only)** — Title*, Description*, cascading Asset Category→Class→SubType, Location, Start/End/Due (validate `start ≤ end ≤ due`), Severity, Priority P1-P4, Purpose, Status=New. Toast `TSK-000x`.
- **Parent Task List** — Search (id/title/category), filters (status/priority/severity/location), sort by due date, pagination, colour-coded StatusChip + Priority/Severity chips, Progress %, Owner. Tech member sees only assigned/owned. Row → detail.
- **Parent Task Detail** — Header (ID, title, chips, Edit). Overview card. Tabs: Details (read/edit + date validation — tech can only edit Status/End Date), Child Tasks table (+ Add), Budget/Cost (summary card + entries + PM form with Title/Description/Amount/Comment), Progress (progress bar, donut by status, Gantt-style bars, counts).
- **Child Task Creation (PM + Tech)** — Title*, TaskType, Parent Task searchable*, Linked Child optional, Assign To, Status=New, Attachments drag&drop (allowed pdf/xlsx/docx/png/jpg, 5 MB, list + remove). Toast `CTSK-xxxx`.
- **Child Task Detail/Edit** — Tech can update Owner, Activities (multiple timestamped entries), Status, End Date, Comments, Attachments. PM can comment. Comments: thread with avatar/role/timestamp, immutable, Add box. Attachments: upload/view/download (gated).

### 4. Admin / Masters (Operations Manager)
- **Projects** — list + form (code, name, active)
- **Cost Centers** — list + form (code, name, active)
- **Project–Cost Center Mapping** — project, cost center, allocation % (0–100, warning if total per cost center ≠100), effective start/end (end after start), overlap warning (same project+CC overlapping dates).
- **Users** — list + form (loginId, employee name, designation, project, role, status, createdAt, effective end date). Passwords never shown; **Reset password** action (mock).
- **Roles & Access** — matrix users × modules with Yes/No switches (immediate save).

## UX Quality

- Neutral enterprise palette, 8px spacing, rounded cards, spacious tables.
- Status colours: New grey, In Progress blue, On Hold amber, Blocked red, Completed green.
- Responsive: desktop-first, tablet/mobile usable (stacked grids, mobile drawer).
- Loading skeletons, empty states with helpful text, error + retry, confirm dialogs.
- Form inline errors, disabled submit while saving, `beforeunload` unsaved-changes warning.
- Accessibility: labels, keyboard nav, ARIA, contrast.
- Reusable components as listed.

---

## Getting Started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production
npm run preview
```

### Env — switching Mock ↔ Real API

Every screen talks to one object: `api` from `src/api/index.ts`.

```ts
// src/api/index.ts
export const api = isMockMode ? mockApi : backendApi;
```

- **Mock mode (default):** leave `VITE_API_BASE_URL` empty → in-memory `src/api/mockApi.ts`.
- **Real backend:** set the base URL (no trailing slash).

```bash
# .env (development, through the Vite proxy)
VITE_API_BASE_URL=/api/v1

# .env (production build, direct to the API)
VITE_API_BASE_URL=https://api.your-domain.com/api/v1
```

`vite.config.ts` proxies `/api/v1` → `http://localhost:3000` in dev, so the same relative URL works
without CORS setup. `src/api/client.ts` exports `apiClient` (axios) + `isMockMode`: it attaches
`Authorization: Bearer <JWT>`, refreshes the access token once on `401` via `POST /auth/refresh`
(single-flight, rotating refresh token kept in `localStorage.ema_refresh`), and only redirects to
`/login` when refresh also fails.

### Running against the NestJS backend

```bash
# terminal 1 — backend (master_backend)
npm run build
npm run seed            # idempotent: users, projects, cost centers, mappings
PORT=3000 node dist/main.js

# terminal 2 — frontend
npm run dev             # http://localhost:5173, /api/v1 proxied to :3000
```

Seeded logins use `Pass@123` (the mock demo password `Password@123` is only for mock mode; the login
screen shows the credential set that matches the active mode).

### `src/api/backendApi.ts` — the adapter

The backend speaks Mongo ids and human task numbers; the UI is written against `mockApi`'s contract,
so `backendApi` translates both directions and keeps the screens unchanged:

- **IDs** — screens use `PT-000001` / `CT-000001` / `BDG-000001`; the adapter resolves them to `_id`s
  through the list endpoints and caches the mapping.
- **Vocabulary** — task type / status / severity / priority / purpose lists come from `GET /tasks/meta`,
  so dropdowns always match the server enums (`Blocked` was added to the backend status enum).
- **Lists** — the backend paginates, filters and sorts differently, so the adapter does paging,
  sorting and `q`/status/priority/severity/location filtering client-side over one page of 100 rows.
- **Progress** — the parent list response has no progress, so it is derived from child tasks: one
  batched child sweep for managers, memoised per-parent lookups for technical members (whose child
  list is scoped to their own tasks).
- **Strict writes** — the backend runs `forbidNonWhitelisted` validation, so only present fields are
  sent (empty strings for enum fields are rejected with `400`). Nest validation messages are surfaced
  in the UI as `ApiRequestError.message` (the raw Nest body stays on `.response`).

Known gaps in real mode (deliberate, documented rather than faked):

| Area | Behaviour |
|---|---|
| Password expiry | The API exposes no `passwordChangedAt`, so the expiry screen can only be triggered in mock mode. |
| `GET /users` | Manager-only (`403` for technical members) → comment role chips and the Assign-To directory are populated only for managers; the call fails silently otherwise. |
| Parent-task comments | The backend stores comments on child tasks and budget entries only. The parent tab aggregates child comments and reports a clear message if you try to post one there. |
| Tickets | Ticket Management is a frontend-only module (still served by MSW); it is hidden from the role matrix in real mode because the backend has no such module flag. |
| Attachments | Uploads are multipart (`files`, ≤ 5 files, ≤ 10 MB, blocked extensions) and downloads require the bearer token, so the adapter fetches a blob and hands the UI an object URL. |
| Roles | The backend has no role column; `RoleType` is derived from `permissions.projectManagement` plus designation. |

### Demo Accounts

| Login ID | Name | Role | Note |
|---|---|---|---|
| `rishikesh.oza` | Rishikesh Oza | Operations Manager (Director) | Full access incl. Admin |
| `tanmay.halaye` | Tanmay Halaye | Operations Manager (Director) | Full access |
| `pratik.mulgir` | Pratik Mulgir | Project Manager | Create parent tasks, budgets |
| `gaurav.bhangale` | Gaurav Bhangale | Technical Team Member (BA) | Assigned tasks only |
| `ananya.singh` | Ananya Singh | Technical Team Member | **Password expired** flow |
| `vikas.patil` | Vikas Patil | — | **Inactive** account |

Password for all (mock): `Password@123` (any value ≥3 chars is accepted; short values trigger “Invalid login” for demo).

---

## Mock API Notes

`src/api/mockApi.ts` is a single in-memory store (seed from `src/mocks/data.ts`) with 300 ms delays, auto-increment IDs (`TSK-0001`, `CTSK-0001`, `BDG-0001`), and progress derived from child status (`Completed / total`). Filters, sorting, pagination, overlap/allocation validation, and `resetPassword` are implemented. Replace with `apiClient` calls per endpoint when backend is ready — error shapes are `{ message, fieldErrors }`.

## Assumptions

1. **Auth** — mock mode verifies nothing (90-day expiry check on a local `passwordChangedAt`); real mode uses the backend's JWT access/refresh pair with transparent refresh on 401.
2. **Authorization is frontend-enforced** for routing and UI hiding — the backend re-enforces every call via `JwtAuthGuard` + `PermissionsGuard` (`projectManagement` for masters/users, `taskManagement` for tasks).
3. **Task ID generation is server-side** — the mock generates `PT-/CT-/BDG-` numbers client-side; in real mode the backend assigns them and the adapter maps them to ids.
4. **File upload** — mock mode returns in-memory `blob:` URLs; real mode posts multipart to `/tasks/{parent|child|budget}/:id/attachments` and downloads with the bearer token.
5. **Parent↔Child relation is via `parentTaskId`**; `linkedChildTaskId` is optional self-reference for dependency.
6. **Progress** is `Completed child tasks / total` — if no children, 0%.
7. **Allocation totals** warn when ≠100% per cost center; not blocked but highlighted — adjust per finance rules.
8. **Project for new users defaults** to “Computerization of FSL” (`proj-1`) — change in form if needed.
9. **Rich textarea** for parent description is plain multiline `TextField` (no WYSIWYG) — swap to a rich editor later without changing types.
10. **MSW** serves the Ticket Management module only (`src/mocks/handlers/tickets.ts`); the core app uses the in-memory `mockApi` or the real backend, never MSW.

---

## Build Order (as implemented)

Theme & layout → Auth (login, expiry, guards) → Task Management (parent → child → comments/attachments → budget → progress) → Admin masters → Routes/providers/README.
