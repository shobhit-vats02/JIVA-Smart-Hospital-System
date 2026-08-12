# JIVA — Jeevan Intelligence & Virtual Assistance

> **AI Powered Smart Healthcare Platform**

JIVA is a full-stack, production-oriented hospital management platform for three user roles:
**Patients**, **Doctors**, and **Hospital Administrators**. It was built in **7 milestones** and then
refined into a completed platform. It is a brand-new application inspired only by the visual
language of the provided reference — no reference HTML/CSS/JS was copied.

> No SIH / Smart India Hackathon / Gemini branding anywhere — the application is only **JIVA**.

## Refinement & Completion (latest)

A refinement pass was applied on top of the 7 milestones:

**Bug fixes**
- Fixed the **refresh-token flow**: the client no longer stores a placeholder refresh token. The
  refresh token lives in an HttpOnly cookie (server prefers the cookie over a body token), so
  persistent login no longer fails on expired access tokens / page reload.
- Verified login for every role (admin/doctor/patient) over HTTP and via the Next proxy.

**Seed data expanded**
- **1 admin, 8 doctors, 20 patients**, 6 departments + full operational data (appointments,
  queues, presence logs, emergencies, prescriptions/video records, analytics, notifications).
- Patients now get a realistic `healthProfile` (allergies, conditions, vaccinations) and
  `emergencyContact` for the Health Pass.

**New features (reused existing patterns, no rewrite)**
- **Patient**: Find Doctors (search + specialty/department filter + ratings + quick booking),
  Health Pass (digital card, pseudo-QR, medical summary, blockchain-verify prototype),
  Prescriptions (view / print / download), and a Patient **Emergency** flow (call ambulance,
  alert hospital, notify contact, AI severity, ambulance ETA, timeline).
- **Booking**: a **microphone icon** beside the booking area opens a **Voice Booking modal**
  (Web Speech API when available, quick suggestions fallback) that fills the form.
- **Doctor**: **Prescriptions** (list / print / download prescriptions issued) and **Video
  Consultation** (join call with camera/mic/chat/timer).
- **Admin**: **Digital Twin** (interactive hospital floor map — click a department to see live
  doctors, availability, waiting and emergency counts).

**Navigation** reorganized per role while keeping all working components:
- Patient: Home · Find Doctors · Book · Appointments · Queue Tracker · Health Pass ·
  Prescriptions · Video · Emergency · Notifications · Profile · Settings
- Doctor: Home · Patients · Presence · Prescriptions · Profile · Video · Notifications · Settings
- Admin: Operations · Digital Twin · Doctor Management · Patients · Appointments · Emergency
  Command · Analytics · Notifications · Settings

## Milestone 2 — Patient Module (complete)

The patient experience is now fully functional against the backend + MongoDB with realtime updates:

| Feature | Details |
|---------|---------|
| **Patient Home** | Upcoming appointment, doctor status, queue position, estimated wait, hospital live status, AI recommendation, recent notifications — all live |
| **Book Appointment** | Select department → doctor → date → time → reason/symptoms → emergency. JIVA AI previews the best slot + alternative doctor + expected wait; patient accepts the AI suggestion or keeps their pick, then books |
| **My Appointments** | Tabs (all/upcoming/completed/cancelled/emergency) with doctor, department, date/time, queue number, estimated wait, live status; cancel action |
| **Queue Status** | Realtime queue via Socket.IO: current patient, patients ahead, queue position, estimated wait, doctor availability, avg consult, progress animation |
| **Video Consultation** | Camera preview + mute/unmute, camera on/off, live timer, persisted chat, doctor label, end call. Functional prototype |
| **Notifications** | Realtime `notification:new` events with unread badge, mark read/all-read |
| **Profile** | View + edit personal & emergency contact details, appointment stats, change password |
| **Settings** | Theme toggle, notification preferences, change password, logout |

New backend collections: `Appointment`, `Notification`, `QueueEntry`, `VideoConsultation`, `WaitingPrediction`, `AIRecommendation`. New routes under `/api/patient/*`. Realtime: sockets authenticated by JWT, joined to role rooms, queue + notification events.

---

## Milestone 3 — Doctor Module (complete)

| Feature | Details |
|---------|---------|
| **Doctor Home** | Today's appointments, current patient, patients waiting, next patient, emergency alerts, availability status, AI suggestion, realtime updates |
| **Today's Schedule** | Start/complete/delay appointments, view patient, per-date view |
| **Current Consultation** | Patient details, symptoms, consultation timer, previous visits, notes, prescription panel, complete + generate prescription, mark emergency |
| **Presence Verification** | The flagship workflow — doctors **cannot** go on duty immediately after login. Face recognition (webcam + scanning animation), RFID card, Bluetooth device, hospital WiFi, GPS geofence, then the **AI Presence Confidence Engine** weights all methods (>90% activates) |
| **Notifications** | Realtime `notification:new` for doctors |
| **Profile** | Name, staff ID, specialty, department, experience, on-duty status |
| **Settings** | Theme, notification prefs, change password |

Presence engine weights: face 30%, RFID 25%, Bluetooth 15%, WiFi 15%, GPS 15%. On activation the doctor is marked available, today's queue starts, pending appointments are routed, and patients + doctor are notified. Every attempt is stored in `PresenceLog`.

New backend collection: `PresenceLog`. New routes under `/api/doctor/*` and role-agnostic `/api/notifications/*`. New realtime events: `presence:method`, `presence:activated`, `presence:status`, `presence:global`.

---

## Milestone 4 — Admin Module (complete)

| Feature | Details |
|---------|---------|
| **Admin Home** | Realtime metrics: doctors online/busy/offline, patients waiting, appointments today, current consultations, hospital efficiency, emergencies — with recent emergencies & appointments |
| **Doctors** | Create / edit / delete / activate-deactivate, assign department, search + filter, view presence logs & schedule, manage avg consultation time |
| **Patients** | Search / filter, create / edit / delete patients, manage history & status |
| **Appointments** | Approve / reschedule / cancel / complete, assign doctor, status tabs, date filter |
| **Analytics** | Animated charts: 7-day appointments, department distribution, hourly load, daily summary table |
| **Emergency Response Center** | A command-center style page: active emergency cases with priority queue, doctor availability, ambulance fleet. Actions: 🚑 Call Ambulance (dispatch + ETA + driver), 🏥 Alert Hospital (notifies all online doctors + admins), 📞 Notify Emergency Contact, 📍 Share Patient Location, 🚨 Activate Emergency Mode. Each case has a live event timeline + realtime updates |
| **Notifications / Settings** | Realtime admin notifications, theme, change password |

New backend collections: `EmergencyCase`, `HospitalAnalytics`. New routes under `/api/admin/*`. New realtime events: `emergency:new`, `emergency:update`, `emergency:alert`, `emergency:mode`. Emergency alerting broadcasts to online doctors and all admins; ambulance dispatch assigns a fleet vehicle with ETA.

---

## Milestone 5 — AI Engine (complete)

The AI engine works **silently** (no dedicated page). A background loop runs every 60s (and on boot) and automatically:

| Capability | What it does |
|------------|--------------|
| **Waiting prediction** | Computes live wait for every available doctor from their active queue + avg consult time + hospital load; broadcasts `wait:update` and persists `WaitingPrediction` records |
| **Queue optimization** | Keeps queue positions normalized; emergency patients auto-promoted to the front |
| **Doctor delay prediction** | Flags doctors with appointments but not available, or queues beyond capacity; predicts minutes late |
| **Patient reallocation** | When a doctor is overloaded, recommends moving a patient to the least-loaded alternative in the same department; persists `AIRecommendation` and emits `ai:suggestion` |
| **Emergency prioritization** | Bumps emergency cases to the top of priority + queue; on new emergency, queues are prioritized and analytics refreshed |
| **Hospital analytics** | Writes hourly/daily `HospitalAnalytics` snapshots used by the admin analytics view |
| **Notification engine** | Auto-notifies patients on doctor delay, doctor arrival (via presence hook), queue/emergency changes over Socket.IO |

Event hooks: `onDoctorAvailable` (presence activation → broadcasts waits + notifies that doctor's waiting patients) and `onEmergency` (prioritize + refresh analytics). Admin sees engine status (live predictions + recommendations) inside the Analytics view with a manual "Run cycle" button.

New routes under `/api/ai/*` (admin-only status/trigger). New realtime events: `wait:update`, `delay:update`, `ai:suggestion`, `ai:cycle`, `analytics:update`.

---

## Milestone 6 — Database Seeder (complete)

`npm run seed` now populates a **fully operating hospital** in one command. On top of the base demo accounts (1 admin, 8 doctors, 20 patients, 6 departments) it seeds realistic operational data:

| Collection | Seeded content |
|------------|----------------|
| `Appointment` | ~150 historical appointments across the last 7 days (completed/cancelled/emergency) + ~9 live appointments today |
| `QueueEntry` | Live queue entries for the 3 on-duty doctors (waiting + current) |
| `PresenceLog` | Presence-verification logs (face/RFID/BT/WiFi/GPS, 99% confidence, activated) for on-duty doctors |
| `EmergencyCase` | 1 active dispatched emergency (with ambulance/timeline) + 3 resolved historical cases |
| `Notification` | Seeded notifications for patients, doctors, and the admin |
| `HospitalAnalytics` | Daily snapshots for the last 7 days (appointments, load, efficiency) |
| `VideoConsultation` | Ended video sessions with chat + prescriptions for completed visits |
| `AIRecommendation` | Best-slot + waiting recommendations |
| `WaitingPrediction` | Realtime waiting predictions for on-duty doctors |

**Usage:**
```bash
cd server
npm run seed            # full seed (accounts + rich operational data)
npm run seed:reset      # re-run and force upsert
npm run seed -- --no-rich   # accounts + departments only (no operational data)
```

On boot the dev backend seeds automatically and starts the AI engine, so the app looks like it has been running for months: admin sees today's appointments/analytics/emergencies, patients have appointment histories, and doctors are on duty with live queues.

---

## Milestone 7 — Final Polish (complete)

| Area | Improvements |
|------|--------------|
| **Responsive** | Dashboard shell now fully responsive: slide-out drawer + hamburger toggle on mobile, fixed sidebar on desktop, responsive paddings |
| **Loading states** | New `Skeleton` / `DashboardSkeleton` / `ListSkeleton` shimmer components; animated branded `PageLoader` |
| **Error handling** | Global client `ErrorBoundary` wrapping every role dashboard with a graceful retry fallback |
| **Empty states** | Every module shows a meaningful empty state (no appointments, no queue, no emergencies, etc.) |
| **404 page** | Custom branded not-found page matching the design system |
| **Accessibility** | Skip-to-content link, ARIA `current="page"` nav, focus-visible rings, aria-labels on icon buttons, contrast-aware theme variables |
| **Animations** | Buttery page transitions, animated counters, chart draw-ins, toast slide-ins, mesh background drift |
| **Toast system** | Global toast provider (success/error/info/warning) used across all workflows |
| **Performance** | Next.js `output: 'standalone'`, code-split routes, `noEmit` TS, cached builds |

### Deployment (production)

**Option A — Docker Compose (self-contained):**
```bash
# at project root (edit JWT secrets first)
export JWT_ACCESS_SECRET=your-secret JWT_REFRESH_SECRET=your-secret
docker compose up --build
# -> client http://localhost:3000  server http://localhost:4000
```

**Option B — Manual:**
```bash
# backend
cd server && npm install && npm run seed && npm run start   # MONGO_URI + JWT secrets via .env

# frontend
cd client && npm install && npm run build && npm run start
```

**Option C — Separate containers** (`server/Dockerfile`, `client/Dockerfile` provided). For MongoDB Atlas, set `MONGO_URI` to your Atlas string. For production, set `NODE_ENV=production`, strong JWT secrets, and `CLIENT_URL` to the deployed frontend origin.

### Root convenience scripts
```bash
npm install        # installs all workspaces
npm run seed       # seed demo accounts + rich data
npm run dev        # runs server + client together (concurrently)
npm test           # runs all 5 backend smoke test suites (76 checks)
npm run build      # production build of the client
```

---

## Milestone 1 — What is included

| Area | Deliverable |
|------|-------------|
| **Backend** | Express + MongoDB (Mongoose) REST API, JWT auth (access + refresh, secure cookies), role-based auth middleware, Zod validation, MVC structure (routes → controllers → services → models), centralized error handling |
| **Models** | `Patient`, `Doctor`, `Admin`, `Department` (normalized, timestamps, indexes) |
| **Auth** | Patient self-registration; doctor/admin login via staff-id/email; refresh-token rotation; logout invalidation |
| **Realtime** | Socket.IO server wired (`/` + `/video` namespaces) with JWT auth hook |
| **Seeding** | `npm run seed` — creates 1 admin, 8 doctors, 20 patients, 6 departments automatically |
| **Frontend** | Next.js 14 (App Router) + TypeScript + Tailwind + Framer Motion + React Hook Form + Zod + TanStack Query + Socket.IO client |
| **Design system** | Glassmorphism, animated mesh background, light/dark theme (persistent), gradient buttons, premium inputs, badges, toasts, animated counters |
| **Landing page** | Navbar, Hero, Stats, Features, AI section, Video consultations, Emergency section, Hospital network, Contact, Footer |
| **Auth UI** | Landing → role selection → role-specific login (with demo-credential autofill, Google-login prototype), patient registration |
| **Role dashboards** | Protected shells for Patient / Doctor / Admin with role-aware navigation, real user session, logout |

---

## Tech stack

**Frontend:** Next.js (App Router) · TypeScript · Tailwind CSS · Framer Motion · React Hook Form · Zod · Lucide Icons · TanStack Query · Socket.IO Client

**Backend:** Node.js · Express · MongoDB (Mongoose) · Socket.IO · JWT · bcrypt · Cloudinary (later) · REST

---

## Project structure

```
jiva/
├── server/                      # Express + MongoDB backend
│   ├── .env.example
│   ├── scripts/
│   │   ├── smoke-test.mjs       # end-to-end auth + seed verification
│   │   └── dev-with-memory.mjs  # run backend with in-memory Mongo (no local install)
│   └── src/
│       ├── server.js            # bootstrap: connect DB, start HTTP + Socket.IO
│       ├── app.js               # express app config
│       ├── config/              # env, db, socket
│       ├── models/              # Patient, Doctor, Admin, Department
│       ├── controllers/         # auth.controller.js
│       ├── services/            # auth.service.js (business logic)
│       ├── routes/              # index.js, auth.routes.js
│       ├── middleware/          # auth, role, error, validate
│       ├── validators/          # zod schemas
│       ├── utils/               # jwt, response, appError, async
│       └── seed/                # seed.js + seedData.js
└── client/                      # Next.js frontend
    └── src/
        ├── app/
        │   ├── page.tsx                 # landing page
        │   ├── layout.tsx               # fonts + metadata
        │   ├── providers.tsx            # Theme/Query/Auth/Toast providers
        │   ├── (auth)/login             # role-selection login
        │   ├── (auth)/register          # patient registration
        │   └── (protected)/             # patient, doctor, admin dashboards
        ├── components/  ui/, landing/, dashboard/
        ├── context/     AuthContext.tsx
        ├── hooks/       useTheme, useSocket, useAuth
        ├── lib/         api.ts, utils.ts, constants.ts
        └── types/
```

---

## Installation

### 1. Configure environment

```bash
cd server
cp .env.example .env
# edit MONGO_URI, JWT secrets as needed
```

Set `MONGO_URI` to a local MongoDB (e.g. `mongodb://127.0.0.1:27017/jiva`) or your MongoDB Atlas string.

```bash
cd ../client
cp .env.local.example .env.local
```

### 2. Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 3. Seed the database (creates demo accounts automatically)

```bash
cd server && npm run seed
```

### 4. Run the stack

```bash
# terminal 1 — backend (http://localhost:4000)
cd server && npm run dev

# terminal 2 — frontend (http://localhost:3000)
cd client && npm run dev
```

> **No local MongoDB?** Use the in-memory bootstrap instead of steps 1 & 4 for the backend:
> ```bash
> cd server && node scripts/dev-with-memory.mjs   # seeds + serves on :4000 automatically
> ```

---

## Demo credentials

**Admin** (login via email)

| Email | Password |
|-------|----------|
| `admin@jiva.ai` | `admin123` |

**Doctors** (login via staff ID)

| Staff ID | Password | Doctor |
|----------|----------|--------|
| `DOC1001` | `doctor123` | Dr. Priya Sharma |
| `DOC1002` | `doctor123` | Dr. Rajesh Kumar |
| `DOC1003` | `doctor123` | Dr. Anita Desai |
| `DOC1004` | `doctor123` | Dr. Vikram Singh |
| `DOC1005` | `doctor123` | Dr. Meera Patel |
| `DOC1006` | `doctor123` | Dr. Arjun Nair |
| `DOC1007` | `doctor123` | Dr. Kavya Menon |
| `DOC1008` | `doctor123` | Dr. Rahul Kapoor |

**Patients** (login via email)

| Email | Password |
|-------|----------|
| `rahul@jiva.ai` | `patient123` |
| `sneha@jiva.ai` | `patient123` |
| `amit@jiva.ai` | `patient123` |
| `fatima@jiva.ai` | `patient123` |
| `deepak@jiva.ai` | `patient123` |
| `kavita@jiva.ai` | `patient123` |
| `rohan@jiva.ai` | `patient123` |
| `pooja@jiva.ai` | `patient123` |
| `vikram@jiva.ai` | `patient123` |
| `ananya@jiva.ai` | `patient123` |
| `karan@jiva.ai` | `patient123` |
| `ishita@jiva.ai` | `patient123` |
| `mohammed@jiva.ai` | `patient123` |
| `divya@jiva.ai` | `patient123` |
| `rajat@jiva.ai` | `patient123` |
| `neha@jiva.ai` | `patient123` |
| `suresh@jiva.ai` | `patient123` |
| `aisha@jiva.ai` | `patient123` |
| `gaurav@jiva.ai` | `patient123` |
| `meghna@jiva.ai` | `patient123` |

The login screen autofills demo credentials for each role.

---

## Testing

### Backend smoke tests (use in-memory MongoDB)

```bash
cd server
npm install -D mongodb-memory-server   # if not already installed
node scripts/smoke-test.mjs            # Milestone 1: seeding + auth flows
node scripts/smoke-test-m2.mjs         # Milestone 2: patient module end-to-end
node scripts/smoke-test-m3.mjs         # Milestone 3: doctor presence + consultation flow
node scripts/smoke-test-m4.mjs         # Milestone 4: admin + emergency response center
node scripts/smoke-test-m5.mjs         # Milestone 5: AI engine (cycle, predictions, delays, reallocation, emergency prioritization)
```

`smoke-test.mjs` verifies: seeding counts, admin/doctor/patient login, wrong-password rejection,
patient registration, duplicate-email rejection, refresh-token rotation, logout invalidation.

`smoke-test-m2.mjs` verifies: departments/doctors listing, JWT payload role (protect guard),
AI booking preview, appointment booking with recommendation, appointment list, queue snapshot +
patient queue info, notifications on booking, profile get/update, appointment cancel, and the full
video session lifecycle (create → start → message → end).

`smoke-test-m3.mjs` verifies: doctor login (staff ID), seeded RFID tag, initial not-present state,
partial verification stays inactive, wrong RFID stays inactive, all five methods activate at >90%
confidence, doctor persisted as available, dashboard reflects availability, schedule listing,
appointment detail, start consultation, save prescription, complete consultation, presence logs.

`smoke-test-m4.mjs` verifies: admin login, dashboard metrics, doctor create/update/search/detail,
patient create/update, appointment list + reschedule, analytics (7-day + department distribution),
emergency create → ambulance dispatch → hospital alert → notify contact → share location → command
center → mark treated → emergency mode.

`smoke-test-m5.mjs` verifies: full AI engine cycle, analytics snapshot written, waiting prediction
recorded, delay prediction, reallocation suggestion to an alternative doctor, emergency
prioritization, `onDoctorAvailable` notifies waiting patients, reallocation recommendation persisted.

**Note:** the M3/M5 tests use `--no-rich` (or reset doctor presence) to isolate their scenarios
from the seeded operational data.

### Manual flow

1. Open `http://localhost:3000` → landing page.
2. Click **Login** → pick a role → login with demo credentials.
3. You are routed to the role dashboard; logout clears the session.
4. Toggle theme (persists across reloads).

---

## Verification checklist

**Milestone 1**
- [x] `npm run seed` creates 1 admin / 5 doctors / 10 patients / 6 departments
- [x] Backend starts and connects to MongoDB on port 4000
- [x] `GET /api/health` returns `{ success: true }`
- [x] Patient login (email) · Doctor login (staff ID) · Admin login (email) all work
- [x] Wrong password returns 401
- [x] Patient registration works; duplicate email rejected (409)
- [x] Refresh-token rotation works; logout invalidates the refresh token
- [x] Protected routes redirect unauthenticated users to `/login`
- [x] Frontend `next build` compiles (TypeScript passes)
- [x] Light/dark theme persists
- [x] Socket.IO handshake returns `jiva:connected`

**Milestone 2**
- [x] Departments & doctors listed by patient API
- [x] JWT payload includes `role` so `protect` works over HTTP (bug fixed)
- [x] AI booking preview returns best slot, alternative doctor, expected wait
- [x] Booking creates an appointment with AI recommendation + notification
- [x] Patient appointment list with status filters
- [x] Live queue snapshot + patient queue position (realtime via Socket.IO)
- [x] Notification create/mark-read/unread badge
- [x] Profile get/update + password change
- [x] Video session create → start → chat → end lifecycle
- [x] `next build` compiles; `/patient` dashboard renders all views

**Milestone 3**
- [x] Doctor login via staff ID
- [x] Doctor is NOT available immediately after login (presence gate)
- [x] Face / RFID / Bluetooth / WiFi / GPS verification methods each recorded in `PresenceLog`
- [x] AI Presence Confidence Engine: face-only ~29%, all methods ~99% (weighted)
- [x] Doctor activates only when confidence > 90% → queue starts + notifications
- [x] Today's schedule listing with start/complete actions
- [x] Consultation flow: start → patient detail → prescription → complete
- [x] Patient history endpoint for consultation context
- [x] Doctor change-password + role-agnostic notifications
- [x] `next build` compiles; `/doctor` dashboard renders all views

**Milestone 4**
- [x] Admin login + role guard
- [x] Dashboard metrics (doctors online/busy/offline, patients waiting, efficiency, emergencies)
- [x] Doctor create/edit/delete/search/filter + presence logs + schedule view
- [x] Patient create/edit/delete/search
- [x] Appointment approve/reschedule/cancel/complete with patient notification
- [x] Analytics: 7-day series, department distribution, hourly load, daily table
- [x] Emergency Response Center: create case, dispatch ambulance (ETA/driver), alert hospital (notifies doctors+admins), notify contact, share location, emergency mode
- [x] Emergency timeline + realtime updates
- [x] `next build` compiles; `/admin` dashboard renders all views

**Milestone 5**
- [x] AI engine auto-starts on boot + runs on a 60s silent cycle
- [x] Waiting prediction per doctor (queue + avg consult + load) persisted + broadcast
- [x] Doctor delay prediction (unavailable-with-appointments, over-capacity queues)
- [x] Patient reallocation suggestion to least-loaded alternative doctor
- [x] Emergency prioritization (bump to front, refresh analytics)
- [x] Hospital analytics snapshots written (feeds admin charts)
- [x] Notification engine: delay warnings + doctor-arrival notifications via Socket.IO
- [x] Event hooks: `onDoctorAvailable`, `onEmergency`
- [x] Admin AI status panel (live predictions + recommendations + run-cycle) inside Analytics
- [x] All M1–M5 backend smoke tests pass; `next build` compiles

**Milestone 6**
- [x] `npm run seed` creates demo accounts + rich operational data
- [x] Departments, appointments (historical + live), queues, presence logs, emergencies, notifications, analytics, video records, AI recommendations, waiting predictions all auto-populate
- [x] App looks like an operating hospital on first boot (no manual DB edits)
- [x] `--no-rich` flag to seed accounts-only
- [x] All M1–M5 smoke tests still pass with the enhanced seeder

**Milestone 7**
- [x] Responsive dashboard shell (mobile drawer + desktop sidebar)
- [x] Skeleton loaders, branded page loader, error boundary, custom 404
- [x] Accessibility: skip-link, aria-current, focus rings, aria-labels
- [x] All role modules show meaningful empty/loading/error states
- [x] `next build` compiles with standalone output
- [x] Dockerfiles (client + server) + docker-compose for production
- [x] Root package.json with dev/seed/test/build convenience scripts
- [x] Full test suite green (M1–M5: 76 checks)

---

## Roadmap (remaining milestones)

- **M2** ✅ Patient module (book appointments, AI recommendations, queue, notifications, profile, video consult)
- **M3** ✅ Doctor module (schedule, consultation, presence verification, RFID/face/Bluetooth/WiFi/GPS, confidence engine)
- **M4** ✅ Admin module (doctors/patients/appointments/analytics, emergency response center)
- **M5** ✅ AI engine (waiting prediction, queue optimization, delay prediction, reallocation, notifications)
- **M6** ✅ Database seeder (appointments, queues, presence logs, emergencies, analytics, video records, AI recommendations)
- **M7** ✅ Final polish, accessibility, performance, production readiness
