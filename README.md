# Weekly Commit Module

An internal micro-frontend replacing 15-Five. It enforces **strategic alignment** between weekly commits and organizational goals, using a hierarchy and lifecycle grounded in **Patrick Lencioni’s "The Advantage"** (Rally Cry → Defining Objectives → Outcomes) and a **Chess layer** for prioritization.

**Big picture:** Every feature supports answering Lencioni’s **Six Critical Questions**; this module focuses on the last two: *What is most important, right now?* (the Rally Cry and RCDO hierarchy) and *Who must do what?* (the Manager Dashboard and reconciliation view). See [`docs/THE_ADVANTAGE.md`](docs/THE_ADVANTAGE.md) for the full mapping.

## Overview

The Weekly Commit Module is a monorepo containing:

- **backend** — Java 21 / Spring Boot 3 REST API with PostgreSQL
- **remote** — React 18 Vite MFE (the weekly commit UI, exposed via Module Federation)
- **host** — React 18 Vite shell app that consumes the remote MFE

Users (Employees and Managers) log in via OAuth 2.0. The backend issues an internal JWT stored in an httpOnly cookie. Every action is scoped to the user's organization.

---

## Architecture

```
Browser
  └── Host (localhost:3000)
        └── Remote MFE via Module Federation (localhost:3001)
              └── Backend API (localhost:8080)
                    ├── PostgreSQL (localhost:5433)
                    └── Mock OAuth2 server (localhost:8090)  ← local dev only
```

### RCDO Hierarchy

```
Rally Cry  (org-wide goal)
  └── Defining Objectives  (team-level)
        └── Outcomes  (individual-level)
              └── Commit Items  (weekly tasks)
```

Every commit item links to exactly one Outcome. **Assumption:** The **manager** is responsible for entering Rally Cries, Defining Objectives, and Outcomes and for assigning team members to each (e.g. outcome owners). Managers use the **Strategy** page (nav → Strategy) to create and edit RCDO and assign outcome owners; the hierarchy is also seeded via Flyway for the POC. See [`docs/ASSUMPTIONS.md`](docs/ASSUMPTIONS.md) §RCDO.

### Commit State Machine

```
DRAFT → LOCKED → RECONCILING → RECONCILED
```

The LOCKED state prevents "revisionist history" (Lencioni): once a week is submitted, goals cannot be edited to match what was actually done. Reconciliation is only allowed after LOCKED, so accountability is enforced.

| Transition | Trigger | Condition |
|---|---|---|
| DRAFT → LOCKED | IC submits weekly commit | All items have RCDO + chess piece, min 1 item |
| LOCKED → DRAFT | IC retracts | Manager has not yet viewed (viewed_at is null) |
| LOCKED → RECONCILING | Friday 5 pm scheduler or IC manually | — |
| RECONCILING → RECONCILED | IC completes reconciliation | All items have a completion status |

All illegal transitions return HTTP 400 with a structured error code. Every transition is logged immutably to `state_transitions`.

### Chess Piece Prioritization

| Piece | Weight | Meaning |
|---|---|---|
| KING | 100 | Critical — week fails without this |
| QUEEN | 80 | Highest leverage item |
| ROOK | 60 | Core delivery work |
| BISHOP | 40 | Important but not blocking |
| KNIGHT | 20 | Nice to have, opportunistic |
| PAWN | 10 | Small tasks, low leverage |

Items auto-rank by weight descending. Manual drag-and-drop reordering within the same piece level is supported with optimistic UI updates.

### Known gaps (The Advantage)

| Gap | Impact | Phase |
|-----|--------|-------|
| **Standard Operating Objectives (SOOs)** not in schema | Cannot report "X% weight on Defining Objectives vs Standard Operating" or flag "Rally Cry at risk" when most work is KTLO. Manager roll-up by Rally Cry still works. | Phase 2 — see [`docs/SOO_DECISION_LOG.md`](docs/SOO_DECISION_LOG.md) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend language | Java 21 (virtual threads enabled) |
| Backend framework | Spring Boot 3.2.5 |
| Database | PostgreSQL 15 + Flyway |
| Auth | OAuth 2.0 Authorization Code → internal JWT (HS256) |
| Frontend language | TypeScript (strict mode) |
| Frontend framework | React 18 + Vite |
| Micro-frontend | Module Federation (`@originjs/vite-plugin-federation`) |
| Client state | Zustand |
| Server state | React Query |
| UI components | shadcn/ui |
| Drag and drop | @dnd-kit/core |
| Backend testing | JUnit 5 + Mockito |
| Frontend testing | Vitest + React Testing Library |
| Containerization | Docker + Docker Compose |

---

## Prerequisites

- Docker and Docker Compose
- Java 21 (for running the backend outside Docker)
- Node.js 18+ and npm (for running frontends outside Docker)

**Running the app:** Use **Quick Start (Docker)** below for the simplest path (one command), or **Running Without Docker** to run backend and frontends locally with your own PostgreSQL and OAuth setup.

---

## Quick Start (Docker)

All commands in this section are run from the **Weekly Commit Module root** (the `ci_pm/` directory).

### 1. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set the following values:

```env
# Database
DB_USERNAME=weeklycommit
DB_PASSWORD=weeklycommit_secret

# OAuth2 — these must match the mock server config in docker-compose.yml
OAUTH_CLIENT_ID=weekly-commit-client
OAUTH_CLIENT_SECRET=client-secret
OAUTH_REDIRECT_URI=http://localhost:8080/login/oauth2/code/oidc

# JWT — use a long random string in production
JWT_SECRET=change-me-to-a-long-random-secret
JWT_EXPIRY_HOURS=24

# Module Federation
REMOTE_URL=http://localhost:3001
```

### 2. Start all services

```bash
docker compose up --build
```

This starts:
- PostgreSQL on port **5433** (host) so it doesn’t conflict with a local Postgres on 5432
- Mock OAuth2 server on port **8090**
- Backend API on port **8080**
- Remote MFE on port **3001**
- Host shell on port **3000**

Flyway migrations run automatically on backend startup and seed the database with test data.

### 3. Open the app

Open [http://localhost:3000](http://localhost:3000) in your browser. Log in with a [test user](#test-users) (e.g. `manager@acme.com` / `password`).

---

## Test Users

Both users belong to the `acme` organization and are pre-seeded by Flyway.

| User | Email | Password | Role |
|---|---|---|---|
| Alex Manager | manager@acme.com | password | MANAGER + EMPLOYEE (dual role) |
| Sarah Employee | employee@acme.com | password | EMPLOYEE |

Alex sees both **My Week** (IC view) and **My Team** (manager view) in the navigation. Sarah sees only her IC view.

---

## User flows to try

After logging in at [http://localhost:3000](http://localhost:3000), use these flows to explore the app. Nav: **My Week** → current commit; **History** → past weeks; **My Team** → manager dashboard; **Strategy** → RCDO admin (manager only).

### As employee (Sarah — `employee@acme.com` / `password`)

1. **Plan and submit a week**  
   Go to **My Week**. Add commit items (title, description, **chess piece**, **RCDO outcome**). Drag to reorder within the same piece. Use **Submit Week** → confirm. Status becomes **LOCKED**; items can no longer be edited.

2. **Retract before manager views**  
   With a LOCKED week, click **Retract**. Status returns to **DRAFT**; you can edit and submit again. After a manager views your commit (see manager flow below), Retract is disabled.

3. **Reconcile**  
   With a LOCKED week, use **Start reconciliation** (or wait for the Friday 5pm trigger). For each item set **completion status** (COMPLETED / PARTIAL / NOT_COMPLETED), optional **actual outcome**, and **Carry forward** for incomplete items. Click **Complete reconciliation**. Review the summary (counts and carried-forward items).

4. **History**  
   Go to **History** to see past weeks. Click a week to open its detail (read-only after reconciliation).

5. **Add unplanned item (mid-week pivot)**  
   When the week is **LOCKED** or **RECONCILING**, use **Add unplanned item**. Enter title, description, outcome, chess piece, and choose **which existing item is bumped**. The new item is locked immediately; the bumped item gets a BUMPED status in reconciliation. Managers see it in **Pivot Radar** on My Team.

### As manager (Alex — `manager@acme.com` / `password`)

6. **Team dashboard**  
   Go to **My Team**. See direct reports with status badges, item count, weight, alignment. Click a member to open their current commit (this sets **viewed_at** and disables their Retract).

7. **Strategy (RCDO)**  
   Go to **Strategy**. Create or edit **Rally Cries**, **Defining Objectives**, and **Outcomes**; assign **outcome owners** from org members. The tree drives the outcome list when ICs add commit items.

8. **Pivot Radar**  
   On **My Team**, check the **Pivot Radar** section for unplanned items added by direct reports in the last 2 weeks (mid-week pivots / bumped items).

9. **Manager notes**  
   From a team member’s commit view, add a **manager note**. Notes are visible on that commit for future reference.

### Dual role (Alex)

10. **Switch contexts**  
   Use **My Week** / **History** for your own commits and **My Team** / **Strategy** for your manager role. Same login; nav shows both sets of links.

---

## Running Without Docker (Local Dev)

**Fast development:** Run backend and frontends locally for instant feedback—Vite HMR on remote and host, Spring Boot devtools on the backend, and no Docker image rebuilds. Use Docker only for infrastructure (PostgreSQL + mock OAuth2), or start the full stack with `docker compose up` and run backend/remote/host locally against it.

Run these from the **Weekly Commit Module root** (`ci_pm/`). You need PostgreSQL and the mock OAuth2 server running (e.g. start only those with Docker, or use `docker compose up` for the full stack and run backend/remote/host locally against it).

**Start order:** database + OAuth → backend → remote → host. Then open [http://localhost:3000](http://localhost:3000).

### 1. Backend

Requires PostgreSQL and the mock OAuth2 server (or a real OAuth provider). The backend reads `JWT_SECRET`, `DB_*`, and `OAUTH_*` from the environment; load `.env` (e.g. `set -a && source .env && set +a` or use your shell’s equivalent).

```bash
cp .env.example .env   # first time only; edit if needed
set -a && source .env && set +a
cd backend && ./mvnw spring-boot:run
```

Backend runs on **8080**. See `.env.example` in the module root for all supported variables. If you see `Could not resolve placeholder 'JWT_SECRET'`, you're not in a shell that has sourced `.env`—run the three lines above from `ci_pm/`. Local dev uses the default **postgres** user (password `postgres`); if you see password errors, run `docker compose down -v` then `docker compose up postgres -d` to reinitialize the database.

### 2. Remote MFE

In a new terminal:

```bash
cd remote
npm install
```

- **Standalone (no host):** run `npm run dev`. The app runs on [http://localhost:3001](http://localhost:3001) with its own login page.
- **With host (Module Federation):** run `npm run dev:federated` instead of `npm run dev`. The plugin only exposes `remoteEntry.js` when the remote is built, not in Vite dev mode, so the host (localhost:3000) needs the remote to be served via build + preview. `dev:federated` builds once, then runs `vite build --watch` and `vite preview --port 3001` so [http://localhost:3001/assets/remoteEntry.js](http://localhost:3001/assets/remoteEntry.js) is available.

### 3. Host (optional — for full Module Federation)

In another terminal:

```bash
cd host
npm install
npm run dev
```

Runs on [http://localhost:3000](http://localhost:3000) and loads the remote from `http://localhost:3001/assets/remoteEntry.js`. Open this URL to use the app with the host shell.

---

## Running tests

All commands are from the **Weekly Commit Module root** (`ci_pm/`).

### Frontend (remote)

From the module root:

```bash
cd remote
npm install
npm run test -- --run
```

Uses Vitest; `--run` runs once and exits (no watch). Tests live in `remote/src/**/*.test.ts(x)`.

### Backend

From the module root:

```bash
cd backend
./mvnw test
```

Requires **Java 21**. The project uses Lombok for models and DTOs. If `mvn test` fails at compile with "cannot find symbol" (e.g. `getId()`, `getTitle()`, `builder()`), Lombok annotation processing is not running in that environment. In that case:

- Run tests from your **IDE** (IntelliJ, Eclipse, etc.) with annotation processing enabled for the `backend` module, or  
- Run `mvn test` from **CI** or another environment where Java 21 and Lombok are known to work.

No database or OAuth server is required for the current unit tests (they use mocks).

---

## Frontend Features

### IC View (`/commits`)

- Current week date range displayed prominently
- Commit items grouped and ranked by chess piece weight (King → Pawn)
- Weekly weight summary bar: `1 ♔ · 2 ♕ · 3 ♖ · Total weight: 420`
- Soft warning when no Kings or Queens are assigned
- Add / edit / delete items via modal (title, description, chess piece, RCDO outcome)
- Full RCDO breadcrumb on every item (Rally Cry › Objective › Outcome)
- Drag-and-drop reordering within the same chess piece level (optimistic UI)
- Submit Week → LOCKED (confirmation dialog, validation enforced)
- Retract submission while manager hasn't viewed
- Early manual reconciliation trigger
- Reconciliation view: completion status per item (COMPLETED / PARTIAL / NOT_COMPLETED), actual outcome text, carry-forward toggle
- Reconciliation summary on completed weeks

### Commit History (`/history`)

- Paginated list of past weekly commits
- Per-week summary: status badge, total weight, alignment score, reconciliation counts
- Click any week to view full commit detail

### Manager View (`/manager`)

- **Strategy (`/manager/strategy`)** — Manager-only. Full RCDO admin: create/edit/deactivate Rally Cries, Defining Objectives, and Outcomes; assign outcome owners from org members (dropdown). Tree view with expand/collapse. Changes invalidate hierarchy so Add Item outcome list stays in sync.
- Team dashboard with 30-second auto-refresh
- Per-member: status badge, item count, total weight, alignment score, 4-week trend
- 🚨 Low-alignment warning on members below 70% threshold
- Under-supported Rally Cries highlighted
- Team-level alignment score with count of members below threshold
- Click through to full read-only commit review (sets viewed_at, disabling IC retract)
- Manager notes on any commit (add and view)
- Post-reconciliation planned vs. actual comparison

### Dual Role Navigation

Dual-role users (both IC and manager) see a **My Week / History / My Team** navigation bar. Single-role users are redirected directly to their view.

### Module Federation Contract

```typescript
export interface WeeklyCommitAppProps {
  userId: string
  orgId: string
  authToken: string   // internal JWT — not the OAuth provider token
  onAuthExpired: () => void
  activeRallyCryId?: string  // optional — host passes current Rally Cry to scope/highlight in RCDO tree
}
export default function WeeklyCommitApp(props: WeeklyCommitAppProps): JSX.Element
```

Remote name: `weeklyCommitModule` · Exposed path: `./WeeklyCommitApp` · Entry: `/assets/remoteEntry.js`

---

## Environment Variables Reference

| Variable | Description | Default |
|---|---|---|
| `DB_URL` | JDBC connection string | `jdbc:postgresql://localhost:5433/weeklycommit` |
| `DB_USERNAME` | PostgreSQL username (local dev: `postgres`) | — |
| `DB_PASSWORD` | PostgreSQL password (local dev: `postgres`) | — |
| `OAUTH_CLIENT_ID` | OAuth2 client ID | `weekly-commit-client` |
| `OAUTH_CLIENT_SECRET` | OAuth2 client secret | `client-secret` |
| `OAUTH_ISSUER_URI` | OIDC issuer URI (used for discovery + token validation) | `http://mock-oauth2` |
| `OAUTH_AUTHORIZATION_URI` | Browser-facing authorization endpoint | `http://localhost:8090/connect/authorize` |
| `OAUTH_JWK_SET_URI` | JWK set URI for token verification | `http://mock-oauth2/.well-known/openid-configuration/jwks` |
| `OAUTH_REDIRECT_URI` | OAuth2 redirect URI registered with the provider | `http://localhost:8080/login/oauth2/code/oidc` |
| `JWT_SECRET` | HMAC-SHA256 secret for internal JWT signing | — |
| `JWT_EXPIRY_HOURS` | JWT lifetime in hours | `24` |
| `REMOTE_URL` | Browser-facing URL of the remote MFE (used by host at build time) | `http://localhost:3001` |

> **Note on Docker networking:** `OAUTH_ISSUER_URI` uses the Docker-internal hostname (`http://mock-oauth2`) so the backend can fetch OIDC discovery and validate token `iss` claims over the internal network. `OAUTH_AUTHORIZATION_URI` is overridden to `http://localhost:8090/...` so the browser redirects to a host-accessible address.

---

## API

Base URL: `/api`
Auth: JWT in httpOnly cookie `jwt` required on all routes except `/api/auth/**`.

| Endpoint | Description |
|---|---|
| `GET /oauth2/authorization/oidc` | Initiate OAuth2 login |
| `POST /api/auth/logout` | Clear JWT cookie |
| `GET /api/auth/me` | Current user info |
| `GET /api/rcdo/hierarchy` | Full RCDO tree for the authenticated user's org |
| `GET /api/commits/current` | Current week's commit (creates DRAFT if none exists) |
| `GET /api/commits/history` | Paginated past commits |
| `GET /api/commits/:id` | Single commit with all items |
| `PATCH /api/commits/:id/status` | State machine transition |
| `POST /api/commits/:id/items` | Create commit item |
| `PUT /api/commits/:id/items/:itemId` | Update commit item |
| `DELETE /api/commits/:id/items/:itemId` | Delete commit item |
| `PATCH /api/commits/:id/items/reorder` | Reorder items within a chess piece level |
| `PUT /api/commits/:id/items/:itemId/reconcile` | Save reconciliation data for one item |
| `POST /api/commits/:id/reconcile` | Complete reconciliation, seed carry-forwards |
| `GET /api/manager/team` | Team dashboard with current commit status |
| `GET /api/manager/team/:userId/commits` | Commit history for a team member |
| `GET /api/manager/team/:userId/commits/:commitId` | Full commit detail (sets viewed_at) |
| `POST /api/manager/commits/:commitId/notes` | Add manager note |
| `GET /api/manager/team/alignment` | Team-level alignment breakdown by Rally Cry |
| **Manager RCDO (Strategy)** | *Manager-only.* |
| `GET /api/manager/rcdo` | Full RCDO tree for admin (includes inactive, owner names) |
| `GET /api/manager/rcdo/org-members` | Org members for outcome owner dropdown |
| `POST /api/manager/rcdo/rally-cries` | Create Rally Cry |
| `PUT /api/manager/rcdo/rally-cries/:id` | Update Rally Cry |
| `DELETE /api/manager/rcdo/rally-cries/:id` | Deactivate Rally Cry |
| `POST /api/manager/rcdo/defining-objectives` | Create Defining Objective |
| `PUT /api/manager/rcdo/defining-objectives/:id` | Update Defining Objective |
| `DELETE /api/manager/rcdo/defining-objectives/:id` | Deactivate Defining Objective |
| `POST /api/manager/rcdo/outcomes` | Create Outcome (with ownerId) |
| `PUT /api/manager/rcdo/outcomes/:id` | Update Outcome (title, description, ownerId, active) |
| `DELETE /api/manager/rcdo/outcomes/:id` | Deactivate Outcome |

Full API reference: [`docs/API.md`](docs/API.md)

---

## Database Migrations

Flyway migrations live in `backend/src/main/resources/db/migration/`:

| File | Contents |
|---|---|
| `V1__initial_schema.sql` | All tables and constraints |
| `V2__indexes.sql` | Performance indexes |
| `V3__seed_data.sql` | Org, users, RCDO hierarchy, sample data |

**Never edit a migration that has already run.** Add a new versioned file instead.

---

## Project Docs

| File | Description |
|---|---|
| [`docs/THE_ADVANTAGE.md`](docs/THE_ADVANTAGE.md) | How the module maps to Lencioni’s "The Advantage" (Six Questions, hierarchy, Chess layer, accountability) |
| [`docs/SOO_DECISION_LOG.md`](docs/SOO_DECISION_LOG.md) | Phase 2 decision log for Standard Operating Objectives (SOOs) |
| [`docs/COMPLETION_PLAN.md`](docs/COMPLETION_PLAN.md) | Full product completion plan (Phases 1–4) and task checklist |
| [`docs/TDD.md`](docs/TDD.md) | Test Driven Development guide (Red–Green–Refactor) |
| [`docs/CLAUDE.md`](docs/CLAUDE.md) | Architecture rules and agent instructions |
| [`docs/PRD.md`](docs/PRD.md) | Product requirements document |
| [`docs/SPEC_COMPLIANCE_REVIEW.md`](docs/SPEC_COMPLIANCE_REVIEW.md) | Spec compliance review vs. Organizational Health / The Advantage spec |
| [`docs/API.md`](docs/API.md) | Full REST API reference |
| [`docs/SCHEMA.sql`](docs/SCHEMA.sql) | Annotated database schema |
| [`docs/USER_STORIES.md`](docs/USER_STORIES.md) | Full user story list |
| [`docs/ASSUMPTIONS.md`](docs/ASSUMPTIONS.md) | Implementation assumptions and decisions |
| [`docs/MVP.md`](docs/MVP.md) | MVP definition and success checklist |



# The Advantage: The issue most orgs have is not an intelligence problem, it's a health problem. The health problem is people not knowing what actually matters.