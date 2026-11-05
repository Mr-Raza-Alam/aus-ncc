# AUS-NCC Portal

> **Digital Management System for the NCC Department, Assam University Silchar**

The AUS-NCC Portal digitises the manual operations of running the NCC unit — attendance registers, refreshment accounting, cadet selection, learning resources, and event management — into one organised, transparent, and tamper-evident system.

Built for **3 Assam Bn NCC (3AB)** first, with **62 Assam Bn NCC (62AB)** integrated later by flipping a config flag — no code rewrite required.

---

## Table of Contents

- [System Overview](#system-overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [Roles & Permissions](#roles--permissions)
- [Modules](#modules)
- [API Reference](#api-reference)
- [Deployment](#deployment)
- [Handover Guide](#handover-guide)
- [Build Roadmap](#build-roadmap)
- [Assumptions](#assumptions)
- [Contributing](#contributing)

---

## System Overview

### Two Separate Systems

| | **AUS-NCC Portal** (this repo) | **NCC-VAC Portal** (separate app) |
|---|---|---|
| Serves | NCC cadets + NCC admins | VAC students + VAC admins |
| Modules | Attendance, Learning, Events, Selection | Tests, continuous assessment, certificate |
| Identity | Regimental No. (Unit-issued) | VAC Roll No. (University-issued) |
| Duration | 3-year course | 6 months / 1 semester |

These are **separate applications** with separate backends and databases. A person can hold accounts in both systems — there is no SSO; each authenticates independently.

### Two NCC Units — One Codebase

| Unit Code | Full Name | Status |
|---|---|---|
| `3AB` | 3 Assam Bn NCC | Active (primary) |
| `62AB` | 62 Assam Bn NCC | Inactive (integrated later) |

Every collection carries a `unit` field. Integrating 62AB is a data operation:
1. Flip `units.active` to `true`.
2. Create the 62AB CTO admin account.
3. Import 62AB cadets.
4. Configure 62AB settings.
5. Done.

---

## Architecture

**Modular Monolith** — one application with clearly separated modules. No microservices, no separate deployables.

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │Attendance│ │ Learning │ │  Events  │ │Selection │   │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘   │
│       │             │            │             │         │
│  ┌────┴─────────────┴────────────┴─────────────┴────┐   │
│  │              Shared (Auth, API, UI)               │   │
│  └───────────────────────┬──────────────────────────┘   │
└──────────────────────────┼──────────────────────────────┘
                           │ REST (Axios)
┌──────────────────────────┼──────────────────────────────┐
│                 BACKEND (Node.js + Express)              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │Attendance│ │ Learning │ │  Events  │ │Selection │   │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘   │
│       │             │            │             │         │
│  ┌────┴─────────────┴────────────┴─────────────┴────┐   │
│  │      Shared (DB, RBAC, Audit, Storage)            │   │
│  └──────────┬──────────────────────┬────────────────┘   │
└─────────────┼──────────────────────┼────────────────────┘
              │                      │
       ┌──────┴──────┐       ┌──────┴──────┐
       │ MongoDB     │       │ Cloudflare  │
       │ Atlas       │       │ R2          │
       └─────────────┘       └─────────────┘
```

### Design Principles

- **Module isolation:** Each module owns its routes, controllers, models, and UI. No cross-module imports except through `shared/`.
- **Unit scoping:** Every query is scoped by `unit`. Admins (except lead admin) only see their own unit's data.
- **Audit trail:** Every write action involving attendance, money, or role changes is logged.
- **Serverless-safe:** No persistent in-memory state, cached DB connections, no WebSockets, no cron dependence.
- **Handover-ready:** Express app is portable — runs on Vercel serverless today, Docker container at handover.

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 18 + Vite | SPA with module-based routing |
| Routing | React Router DOM v6 | Client-side navigation |
| HTTP Client | Axios | API calls with JWT interceptor |
| Styling | Vanilla CSS | No heavy UI framework; navy/gold/sky-blue theme |
| Backend | Node.js + Express | REST API, modular route mounting |
| Serverless | Vercel Functions | Deployment target (wraps Express) |
| Database | MongoDB Atlas (Mongoose) | Document store with unit-scoped indexes |
| Authentication | JWT + bcrypt | Stateless auth with forced password change |
| File Storage | Cloudflare R2 (`@aws-sdk/client-s3`) | Geo-tagged photos, bill images |
| Exports | csv-writer, jsPDF | Server-side CSV, client-side PDF |

---

## Repository Structure

```
aus-ncc/
├── backend/
│   ├── api/
│   │   └── index.js                    # Vercel serverless entry point
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.js
│   │   │   ├── auth.controller.js
│   │   │   └── auth.service.js
│   │   ├── users/
│   │   │   ├── users.routes.js
│   │   │   ├── users.controller.js
│   │   │   ├── users.service.js
│   │   │   └── users.model.js
│   │   ├── attendance/
│   │   │   ├── attendance.routes.js
│   │   │   ├── attendance.controller.js
│   │   │   ├── attendance.service.js
│   │   │   └── models/
│   │   │       ├── session.model.js
│   │   │       ├── record.model.js
│   │   │       ├── refreshmentBill.model.js
│   │   │       ├── refreshmentPayment.model.js
│   │   │       └── settings.model.js
│   │   ├── learning/                   # Phase 2 — placeholder
│   │   ├── events/                     # Phase 2 — placeholder
│   │   └── selection/                  # Phase 2 — placeholder (port existing app)
│   ├── shared/
│   │   ├── db.js                       # Cached MongoDB connection
│   │   ├── rbac.js                     # Role & permission middleware
│   │   ├── audit.js                    # Audit log helper + model
│   │   └── storage.js                  # Cloudflare R2 helpers
│   ├── seeds/
│   │   └── seed-units.js              # Seeds 3AB + 62AB unit records
│   ├── app.js                          # Express app — mounts all modules
│   ├── vercel.json
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── public/
│   │   ├── logos/                      # University & NCC crest logos
│   │   └── glimpses/                   # 9 Training & Camp photos
│   ├── src/
│   │   ├── components/                 # Universal shared UI components
│   │   │   ├── Navbar/
│   │   │   ├── Footer/
│   │   │   ├── Layout/
│   │   │   ├── Loader/
│   │   │   ├── Modal/
│   │   │   ├── FormInput/
│   │   │   └── UnitSwitcher/
│   │   ├── pages/                      # Co-located domain pages
│   │   │   ├── LandingPage/
│   │   │   ├── LoginPage/
│   │   │   ├── ForgotPasswordPage/
│   │   │   ├── ChangePasswordPage/
│   │   │   ├── OnboardingPage/
│   │   │   └── DashboardPage/
│   │   ├── modules/
│   │   │   ├── attendance/
│   │   │   ├── learning/
│   │   │   ├── events/
│   │   │   └── selection/
│   │   ├── shared/
│   │   │   ├── api/axios.js            # Axios client with JWT interceptor
│   │   │   └── auth/
│   │   │       ├── AuthContext.jsx     # Auth state provider
│   │   │       └── RouteGuard.jsx      # Role & private route guards
│   │   ├── styles/
│   │   │   ├── variables.css           # Theme tokens (Navy, Gold, Sky-Blue)
│   │   │   ├── global.css
│   │   │   └── components.css
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── vercel.json
│   ├── index.html
│   └── package.json
├── .gitignore
├── .env.example
└── README.md                           # ← You are here
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- **MongoDB Atlas** account (or local MongoDB for development)
- **Cloudflare R2** bucket (for file uploads)
- **Vercel CLI** (optional, for deployment)

### 1. Clone and install

```bash
git clone <repo-url> aus-ncc
cd aus-ncc

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure environment

```bash
# Root level
cp .env.example .env

# Backend
cp backend/.env.example backend/.env

# Frontend (Vite uses VITE_ prefix)
cp frontend/.env.example frontend/.env
```

Edit each `.env` file with your actual values (see [Environment Variables](#environment-variables)).

### 3. Seed the database

```bash
cd backend
node seeds/seed-units.js
```

This creates the two unit records (`3AB` active, `62AB` inactive) and the lead admin account.

### 4. Run locally

```bash
# Terminal 1 — Backend (port 5000)
cd backend
npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend
npm run dev
```

Open `http://localhost:5173` in a browser.

### 5. Run as Vercel serverless (local)

```bash
# From project root
vercel dev
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Example |
|---|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/aus-ncc` |
| `JWT_SECRET` | Secret key for signing JWTs | `a-long-random-string-min-32-chars` |
| `JWT_EXPIRES_IN` | Token expiration duration | `7d` |
| `R2_ACCOUNT_ID` | Cloudflare account ID | `abc123def456` |
| `R2_ACCESS_KEY_ID` | R2 access key | `your-access-key` |
| `R2_SECRET_ACCESS_KEY` | R2 secret key | `your-secret-key` |
| `R2_BUCKET_NAME` | R2 bucket name | `aus-ncc-uploads` |
| `R2_PUBLIC_URL` | Public URL for R2 bucket | `https://pub-xxx.r2.dev` |
| `NODE_ENV` | Environment | `development` or `production` |
| `PORT` | Server port (local dev only) | `5000` |

### Frontend (`frontend/.env`)

| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` | Backend API base URL | `http://localhost:5000/api` |
| `VITE_VAC_PORTAL_URL` | Absolute URL of the VAC portal login | `https://vac-portal.example.com/login` |
| `VITE_APP_NAME` | Display name | `AUS-NCC Portal` |

> **⚠️ Never commit `.env` files.** The `.gitignore` excludes them. Use `.env.example` as the template.

---

## Database Schema

All timestamps are in **Asia/Kolkata (IST)**. All unit-scoped collections carry an indexed `unit` field.

### `units`

| Field | Type | Description |
|---|---|---|
| `code` | String (unique) | `'3AB'` or `'62AB'` |
| `name` | String | `'3 Assam Bn NCC'` |
| `active` | Boolean | Whether the unit is currently operational |
| `ctoUserId` | ObjectId | Reference to the unit's CTO account |
| `classDays` | [String] | e.g. `['Wednesday', 'Saturday']` |
| `createdAt` | Date | Auto-generated |
| `updatedAt` | Date | Auto-generated |

### `users`

| Field | Type | Description |
|---|---|---|
| `name` | String (required) | Full name |
| `email` | String | Email address |
| `phone` | String | Contact number |
| `dob` | Date | Date of birth |
| `password` | String | bcrypt hashed |
| `roles` | [String] | `'lead_admin'`, `'cto'`, `'assistant'`, `'ncc-cdt'` |
| `permissions` | [String] | Admin-only: module-level permission keys |
| `unit` | String (required, indexed) | `'3AB'` or `'62AB'` |
| `regimentalNo` | String | Unit-issued, unique within unit |
| `admissionNo` | String | Fallback login identifier |
| `department` | String | Academic department |
| `year` | Mixed | `1`, `2`, `3`, or `'alumni'` |
| `rank` | String | `'SUO'`, `'JUO'`, `'CSM'`, `'CQMS'`, `'Sergeant'`, `'Cadet'` |
| `status` | String | `'active'`, `'alumni'`, `'suspended'` |
| `mustChangePassword` | Boolean | `true` for first login |
| `createdAt` | Date | Auto-generated |
| `updatedAt` | Date | Auto-generated |

**Indexes:**
- `{ unit: 1, regimentalNo: 1 }` — compound unique (uniqueness within a unit)
- `{ unit: 1 }` — fast unit-scoped queries

### `attendance_sessions`

| Field | Type | Description |
|---|---|---|
| `unit` | String (indexed) | Unit code |
| `date` | Date | Class date |
| `startTime` | Date | Session start |
| `endTime` | Date | Session end (start + window) |
| `venue` | Object | `{ lat, lng, radiusMeters }` |
| `openedBy` | ObjectId | User who opened the session |
| `openedAt` | Date | Timestamp |
| `status` | String | `'open'` or `'closed'` |
| `photoUrl` | String | R2 URL of geo-tagged class photo |
| `photoCoords` | Object | `{ lat, lng }` |
| `photoCapturedAt` | Date | When the photo was taken |
| `declaredPresentCount` | Number | Declared by senior |
| `nerUploaded` | Boolean | Whether NER upload is done |
| `nerUploadedAt` | Date | When NER was marked uploaded |

### `attendance_records`

| Field | Type | Description |
|---|---|---|
| `sessionId` | ObjectId | Reference to the session |
| `userId` | ObjectId | Reference to the cadet |
| `unit` | String (indexed) | Unit code |
| `status` | String | `'P'` (present) or `'A'` (absent) |
| `markedVia` | String | `'geo'` or `'manual'` |
| `markedAt` | Date | Timestamp of marking |
| `gpsCoords` | Object | `{ lat, lng }` (geo-marked only) |
| `markedBy` | ObjectId | Who marked (for manual entries) |

### `refreshment_bills`

| Field | Type | Description |
|---|---|---|
| `unit` | String (indexed) | Unit code |
| `sessionId` | ObjectId (nullable) | Linked session, if any |
| `date` | Date | Bill date |
| `vendorName` | String | Vendor name |
| `amount` | Number | Bill amount (₹) |
| `billImageUrl` | String | R2 URL of bill image |
| `uploadedBy` | ObjectId | Who uploaded |
| `uploadedAt` | Date | Timestamp |

### `refreshment_payments`

| Field | Type | Description |
|---|---|---|
| `unit` | String (indexed) | Unit code |
| `direction` | String | `'in'` (from Unit) or `'out'` (to vendor) |
| `amount` | Number | Payment amount (₹) |
| `date` | Date | Payment date |
| `reference` | String | Payment reference / note |
| `recordedBy` | ObjectId | Who recorded |
| `recordedAt` | Date | Timestamp |

### `settings`

| Field | Type | Description |
|---|---|---|
| `unit` | String (unique) | Unit code |
| `minAttendancePercent` | Number | Default: `75` |
| `geofenceRadiusMeters` | Number | Default: `100` |
| `attendanceWindowMinutes` | Number | Default: `30` |
| `classDays` | [String] | e.g. `['Wednesday', 'Saturday']` |
| `nerPortalUrl` | String | URL of the NER portal |

### `audit_logs`

| Field | Type | Description |
|---|---|---|
| `action` | String | e.g. `'ATTENDANCE_MANUAL_MARK'`, `'PAYMENT_RECORDED'` |
| `module` | String | `'auth'`, `'attendance'`, `'users'` |
| `performedBy` | ObjectId | User who performed the action |
| `unit` | String (indexed) | Unit code |
| `targetId` | ObjectId | The document affected |
| `targetCollection` | String | Collection name |
| `before` | Object | Previous state (where applicable) |
| `after` | Object | New state |
| `metadata` | Object | Additional context |
| `ip` | String | Request IP |
| `timestamp` | Date | IST timestamp |

---

## Roles & Permissions

### Role Hierarchy

| Role | Scope | Description |
|---|---|---|
| `lead_admin` | All units, all modules | Developer/owner. Can grant permissions to others. Not unit-scoped. |
| `cto` | One unit | Commanding Officer. Full control within their unit. |
| `assistant` | Assigned modules only | Helpers with limited permissions. |
| `ncc-cdt` | Own data only | Cadet. Sees own dashboard, marks own attendance. |

### Permission Keys

Admins (`cto`, `assistant`) carry a `permissions` array. The admin dashboard renders only modules the user is authorised for.

| Permission Key | Description |
|---|---|
| `ROSTER_MANAGE` | Add, edit, import cadets |
| `ROSTER_VIEW` | View cadet list |
| `ATTENDANCE_SESSION` | Open/close attendance sessions |
| `ATTENDANCE_MARK_MANUAL` | Manually mark/correct attendance |
| `ATTENDANCE_REPORT` | View attendance reports |
| `REFRESHMENT_BILL` | Upload refreshment bills |
| `REFRESHMENT_LEDGER` | Record money in/out |
| `SETTINGS_MANAGE` | Change unit settings |
| `USERS_MANAGE` | Manage admin accounts |
| `PROMOTION_MANAGE` | Trigger yearly promotion |

### Rank-Based Attendance Permissions

| Action | CTO | SUO | JUO/CSM/CQMS/Sgt | Cadet |
|---|---|---|---|---|
| Open session | ✓ | ✓ | ✗ | ✗ |
| Capture class photo | ✓ | ✓ | ✗ | ✗ |
| Mark own attendance (geo) | ✓ | ✓ | ✓ | ✓ |
| Manual mark / correct | ✓ | ✓ (logged) | ✗ | ✗ |
| Upload refreshment bill | ✓ | ✓ | ✗ | ✗ |
| Record money in/out | ✓ | ✗ | ✗ | ✗ |
| View unit reports | ✓ | ✓ | ✗ | ✗ |
| View own attendance % | ✓ | ✓ | ✓ | ✓ |

---

## Modules

### Phase 0 — Foundation *(current)*

- ✅ Repository scaffold
- ✅ Cached MongoDB connection
- ✅ User & Unit models with seed script
- ✅ Auth module (login, JWT, password change)
- ✅ RBAC middleware
- ✅ Audit log helper
- ✅ Landing page (four-door hero)
- ✅ Login page
- ✅ Dashboard shell (role-adaptive)
- ✅ Unit switcher (lead admin)
- ✅ Shared UI components
- ✅ Cloudflare R2 storage helper

### Phase 1 — Service 01: Attendance Board & Central Cadet Directory *(Completed)*

- ✅ **Central Cadet Directory (Decoupled & Standalone):**
  - 3-Slot Batch Intake (1st, 2nd, 3rd year CSV upload slots with auto-generated DOB passwords).
  - 1 April Annual Promotion Workflow (1st→2nd→3rd→Alumni transitions with dry-run preview).
  - Master nominal roll directory with real-time year/rank/status filters and inline profile editing.
- ✅ **Live Training Session Controller (SUO / CTO):**
  - Haversine geofence validation anchored within Assam University Silchar campus perimeter.
  - Real-time countdown clock with +15 min grace window extensions.
  - Mandatory parade ground photo capture uploaded and archived to Cloudflare R2 with GPS coordinates.
  - Session Conclude & Reconcile modal (Roll call verification + Refreshment Day vs Casual Day selector).
- ✅ **Cadet Live Geo-Check-In Experience:**
  - One-click smartphone GPS check-in against active session geofence radius.
  - Personal drill attendance percentage tracking and historical session log.
- ✅ **Parade Refreshment & Inspection Dossier (NER Sync):**
  - Clean separation between routine mid-week casual drills and Saturday refreshment parades.
  - Official Directorate NER link (`ner.nccindia.nic.in`) and acknowledgment ref number recording.
  - Permanent inspection dossier with tamper-evident ground photo, coordinates, and timestamp for visiting officers.
- ✅ **Refreshment Distribution Ledger:**
  - 5 real-time running financial balance cards (Total Billed, Total Received, Total Paid, Outstanding, Balance in Hand).
  - Vendor bills archive with receipt preview modal.
  - Inspection Dossiers archive with one-click ground evidence inspection.
- ✅ **Attendance Vigilance & Audit Ledger:**
  - Anti-favoritism watchdog tracking session activations (2 classes/week schedule compliance), manual proxy overrides, window extensions, and roll call mismatches.
  - One-click official CSV export for Unit inspection files.
- ✅ **Reports & HQ Export:**
  - 75% statutory attendance threshold tracking for NCC 'B' & 'C' certificate examination qualification and camp eligibility.
  - Unit-wide nominal roll with one-click Battalion HQ CSV export.
- ✅ **Unit Settings & Policy Configuration:**
  - Configurable geofence radius, check-in window duration, scheduled parade days, and Directorate portal URL.

### Phase 2 — Service 03: Events & Camp Management *(Next Up)*

- ⬜ Camp notifications & eligibility matching (CATC, RDC, TSC, EBSB, Army Attachment Camp).
- ⬜ Cadet camp applications, selection rosters, and attendance/duty allocation.
- ⬜ Camp certificate archive and special university event duties.

### Phase 3 — Service 02: Learning & Academics Module *(Planned)*

- ⬜ Year-wise official DG NCC syllabus & study materials.
- ⬜ NCC 'B' and 'C' Certificate exam preparation, question banks, and drill notes.
- ⬜ Study resources and downloadable academic PDFs.

### Phase 4 — Service 04: Cadet Selection & Intake *(Planned)*

- ⬜ 1st-year induction registration portal.
- ⬜ Physical fitness scoring trials and merit list generation.
- ⬜ Direct onboarding into Central Cadet Directory.

---

## API Reference

Base URL: `/api`

### Auth

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/auth/login` | Login with regimental no. / email + password | Public |
| `POST` | `/api/auth/change-password` | Change password (forced or voluntary) | Authenticated |
| `GET` | `/api/auth/me` | Get current user profile | Authenticated |

### Users

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/users` | List users (unit-scoped) | Admin |
| `POST` | `/api/users` | Create a user | Admin |
| `GET` | `/api/users/:id` | Get user by ID | Admin / Own |
| `PUT` | `/api/users/:id` | Update user | Admin |
| `DELETE` | `/api/users/:id` | Deactivate user | CTO / Lead Admin |
| `POST` | `/api/users/import-csv` | Bulk import cadets from CSV | Admin |
| `POST` | `/api/users/promote-all` | Yearly promotion (1→2→3→alumni) | CTO / Lead Admin |

### Attendance *(Phase 1)*

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/attendance/sessions` | Open a new session | CTO / SUO |
| `GET` | `/api/attendance/sessions` | List sessions (unit-scoped) | Admin |
| `GET` | `/api/attendance/sessions/:id` | Get session details | Admin |
| `PATCH` | `/api/attendance/sessions/:id/close` | Close a session | CTO / SUO |
| `POST` | `/api/attendance/sessions/:id/photo` | Upload class photo | CTO / SUO |
| `POST` | `/api/attendance/sessions/:id/mark` | Mark own attendance (geo) | Authenticated |
| `POST` | `/api/attendance/sessions/:id/mark-manual` | Manual mark (audited) | CTO / SUO |
| `PATCH` | `/api/attendance/sessions/:id/ner` | Mark NER as uploaded | CTO / SUO |
| `GET` | `/api/attendance/reports/session/:id` | Session report | Admin |
| `GET` | `/api/attendance/reports/cadet/:id` | Cadet attendance report | Admin / Own |
| `GET` | `/api/attendance/reports/unit` | Unit-wide report | Admin |
| `GET` | `/api/attendance/reports/export` | Export CSV/PDF | Admin |

### Refreshment *(Phase 1)*

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/refreshment/bills` | Upload a bill | CTO / SUO |
| `GET` | `/api/refreshment/bills` | List bills (unit-scoped) | Admin |
| `POST` | `/api/refreshment/payments` | Record money in/out | CTO only |
| `GET` | `/api/refreshment/payments` | List payments | Admin |
| `GET` | `/api/refreshment/summary` | Ledger summary | Admin |

### Settings

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/settings` | Get unit settings | Admin |
| `PUT` | `/api/settings` | Update unit settings | CTO / Lead Admin |

### Units

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/units` | List all units | Lead Admin |
| `GET` | `/api/units/active` | Get active unit for current context | Admin |

---

## Deployment

### Vercel (Current)

The app is deployed as two Vercel projects:

**Backend:**
```bash
cd backend
vercel --prod
```

**Frontend:**
```bash
cd frontend
vercel --prod
```

The backend runs as a Vercel serverless function via `api/index.js`, which wraps the Express app.

### Docker (Handover)

For handover to the university, the Express app runs as a standard Node.js server:

```bash
# backend/Dockerfile (to be created at handover)
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 5000
CMD ["node", "app.js"]
```

The `app.js` is already portable — no Vercel-specific code in business logic.

---

## Handover Guide

When handing this system to the university:

1. **Infrastructure:** Migrate from Vercel to the university's hosting (Docker / VM / university cloud).
2. **Database:** Transfer MongoDB Atlas cluster ownership or export/import to university-managed MongoDB.
3. **File Storage:** Transfer Cloudflare R2 bucket or migrate to university's object storage.
4. **DNS:** Point `ncc.aus.ac.in` (or equivalent) to the new deployment.
5. **Admin Accounts:** Create university-managed admin accounts; revoke developer access.
6. **Documentation:** This README + inline code comments + API reference cover the full system.
7. **Environment:** Hand over `.env.example` with instructions; never share actual secrets — regenerate them.

### Integration with University Portal

The AUS-NCC Portal is designed to live under the university's existing web presence:
- Link from the university portal's NCC section to the AUS-NCC Portal landing page.
- No SSO dependency — the NCC portal authenticates independently.
- Consistent theming (navy/gold/sky-blue) ensures visual alignment with the university's brand.

---

## Build Roadmap

| Phase | Scope | Status |
|---|---|---|
| **Phase 0** | Foundation — auth, RBAC, shell, shared UI | ✅ Completed |
| **Phase 1 (Service 01)** | Attendance Board & Central Cadet Directory — roster, sessions, geo-marking, refreshment, reports, vigilance | ✅ Completed (~92% verified) |
| **Phase 2 (Service 03)** | Events & Camp Management — camp eligibility, nomination, duty rosters, certificates | 🚀 Up Next |
| **Phase 3 (Service 02)** | Learning & Academics — year-wise DG NCC content, B & C exam prep | ⏳ Planned |
| **Phase 4 (Service 04)** | Cadet Selection & Intake — trials scoring, merit list, induction | ⏳ Planned |
| **Handover** | Docker packaging, university deployment, admin transfer | ⏳ Planned |

---

## Assumptions

These are implemented as stated until confirmed or corrected by the project owner:

1. **Cadet login:** Regimental No. as username, DOB (`DDMMYYYY`) as initial password, forced change on first login.
2. **Promotion:** Manual "Promote All" button each April — not an automatic job.
3. **Attendance %:** Both tenure-wide and per-year breakdown.
4. **Refreshment ledger:** Bills by SUO/CTO; money in/out by CTO only.
5. **Geofence radius:** 100 m default, configurable per unit.
6. **Attendance window:** 30 minutes default, configurable.
7. **Late status:** Not implemented — Present (`P`) / Absent (`A`) only.

---

## Contributing

This is a private project for Assam University Silchar. If you are maintaining this system:

1. Follow the modular structure — add new features as modules, not scattered files.
2. Every new collection must carry `unit` and be indexed by it.
3. Every write action on sensitive data (attendance, money, roles) must be audited.
4. Keep the Express app portable — no Vercel-specific code in business logic.
5. Test with both 3AB and 62AB data to ensure unit scoping works.
6. Update this README when adding new API endpoints or schema changes.

---

## Timezone

All timestamps and date calculations use **Asia/Kolkata (IST)** — `UTC+05:30`.

---

## License

Private — Assam University Silchar, NCC Department. All rights reserved.

