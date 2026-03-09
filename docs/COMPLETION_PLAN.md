# Weekly Commit Module — Full Product Completion Plan

This plan takes the codebase from **current state** to **PRD v1.1 complete**, including MVP verification, lifecycle/reconciliation, manager enhancements, schedulers, tests, and production readiness. It is aligned with [`docs/PRD.md`](PRD.md), [`docs/USER_STORIES.md`](USER_STORIES.md), [`docs/MVP.md`](MVP.md), and [`docs/THE_ADVANTAGE.md`](THE_ADVANTAGE.md).

**We operate in a TDD environment.** For every new feature or bug fix: write a **failing test first** (Red), then implement until the test **passes** (Green), then **refactor**. See [`docs/TDD.md`](TDD.md) for the full guide. Task checklists below are ordered test-first where applicable.

---

## 1. Current State Summary

### Backend (Java / Spring Boot)

| Area | Status | Notes |
|------|--------|--------|
| Auth | ✅ Done | OAuth + JWT, SecurityContextHelper, role-based |
| RCDO | ✅ Done | RcDoController, hierarchy, breadcrumbs |
| Commits CRUD | ✅ Done | getCurrent, getById, history, create/update/delete items |
| State machine | ✅ Done | PATCH status, StateMachineService (DRAFT↔LOCKED↔RECONCILING↔RECONCILED) |
| Reorder | ✅ Done | PATCH items/reorder, cross-piece validation |
| Manager team | ✅ Done | getTeam with alignmentScore, getDirectReportCommit, getDirectReportCommits |
| Manager notes | ✅ Done | addNote, getNotes (path: `/manager/team/:userId/commits/:commitId/notes`) |
| **Reconciliation API** | ❌ Missing | No `PUT /commits/:id/items/:itemId/reconcile`, no `POST /commits/:id/reconcile` |
| **Alignment in responses** | ⚠️ Partial | CommitService.toWeekResponse sets alignmentScore=null; history/direct report summaries use null; getTeam computes alignment per member |
| **Carry-forward seeding** | ❌ Missing | No service method to seed carried items into next week's DRAFT after RECONCILED |
| **Scheduled jobs** | ❌ Missing | No Monday DRAFT creation, no Friday RECONCILING trigger |
| **Team alignment endpoint** | ❌ Missing | No `GET /api/manager/team/alignment` (Rally Cry breakdown) |

### Frontend (React / Vite / Module Federation)

| Area | Status | Notes |
|------|--------|--------|
| Auth & routing | ✅ Done | Login, role router, AppNav (My Week, History, My Team) |
| Commit page | ✅ Done | Items by chess piece, WeightSummaryBar, AddItemModal, submit/retract, DnD reorder, soft K/Q warning |
| Commit detail | ✅ Done | Read-only items, reconciliation summary for RECONCILED, manager notes (add/view) |
| History | ✅ Done | Paginated list, summary badges |
| Manager dashboard | ✅ Done | Team cards, alignment score & warning, alignment trend placeholder, View Commit |
| **Reconciliation UI** | ❌ Missing | No RECONCILING view: two-column planned vs actual, completion status, carry-forward toggle, complete reconciliation |
| **Manager notes API path** | ⚠️ Bug | Client calls `POST /manager/commits/:commitId/notes`; backend expects `POST /manager/team/:userId/commits/:commitId/notes` — addNote needs userId |
| **Team alignment view** | ❌ Missing | No Rally Cry breakdown (under-supported Rally Cries, weight % per Rally Cry) |
| **Dual role** | ⚠️ Partial | Nav shows both tabs if MANAGER/DUAL_ROLE; backend may not return DUAL_ROLE (check /auth/me) |
| **Outcome selector** | ⚠️ Partial | May not be searchable; chess piece tooltip per PRD |
| **History alignment score** | ⚠️ Partial | Backend returns null; need backend to compute and return |

### Infra & quality

| Area | Status |
|------|--------|
| Docker Compose | ✅ Present |
| Flyway V1–V3 | ✅ Present |
| Unit tests (backend) | ✅ Some (CommitService, StateMachineService, ManagerService) |
| Frontend tests | ⚠️ Minimal / not verified |
| CI/CD | ❌ Not in plan scope per MVP; add in Phase 3 |
| README / docs | ✅ Updated (The Advantage, SOO gap, API, schema) |

---

## 2. Phased Plan Overview

| Phase | Goal | Outcomes |
|-------|------|----------|
| **Phase 1** | MVP verification & fixes | MVP checklist passes; manager notes path fixed; alignment in commit/history responses |
| **Phase 2** | Lifecycle & reconciliation | Reconcile APIs + UI; carry-forward seeding; LOCKED→DRAFT retract; full manager dashboard data |
| **Phase 3** | Schedulers & polish | Monday DRAFT job; Friday RECONCILING job; team alignment endpoint + UI; dual role; searchable outcome, tooltips |
| **Phase 4** | Production readiness | Error handling pass; tests; CI/CD; deployment; security/observability |

**TDD:** In each phase, every feature task is done **test first** (add/update failing test → implement → refactor). Integration and E2E checks are in addition to unit/component tests.

---

## 3. Phase 1 — MVP Verification & Quick Fixes

**Goal:** MVP success checklist (12 items) passes; no known API/UX bugs for core flow.

### 1.1 Backend

- **Fix manager notes path**  
  - Option A: Add `POST /api/manager/commits/:commitId/notes` that resolves userId from commit and delegates to existing service (keeps frontend as-is).  
  - Option B: Change frontend to call `POST /api/manager/team/:userId/commits/:commitId/notes` and pass userId from CommitDetailPage (recommended: single source of truth).

- **Alignment score in commit responses**  
  - In `CommitService.toWeekResponse` and history/direct-report summary builders: compute alignment (aligned weight / total weight × 100) and set `alignmentScore` (use org threshold from `organizations` for optional future use).  
  - Ensure `WeekResponse` and `CommitSummaryResponse` expose `alignmentScore` (already in DTOs).

- **Team member response shape (optional for Phase 1)**  
  - If frontend needs `totalWeight`, `lockedAt`, `viewedAt`, `hasCarriedForwardItems` for each member’s current commit, extend `TeamMemberResponse` (or add nested DTO) and populate in `ManagerService.getTeam`.

### 1.2 Frontend

**TDD order:** Add failing component/API tests first; then implement.

- **Manager addNote**  
  - **Test first:** (Optional) Test that addNote is called with userId when adding a note in manager view; or test that the correct API path is used when userId is present.  
  - **Then:** If backend is not extended: change `manager.addNote(userId, commitId, note)` and call `request(\`/manager/team/${userId}/commits/${commitId}/notes\`, ...)`.

- **Manager notes display**  
  - **Test first:** Render CommitDetailPage in manager view with mocked notes response (managerName, note); assert displayed author and text.  
  - **Then:** Align `ManagerNoteResponse` with backend (e.g. `managerName` vs `authorName`) so notes render correctly.

### 1.3 Verification

- Run MVP checklist (README / MVP.md): host at 3000, remote at 3001, OAuth, add 3 items, submit week, manager sees LOCKED and items.  
- Confirm manager can open a report’s commit and add a note; refresh and see the note.

**Exit criteria:** All 12 MVP checkboxes pass; manager notes work; alignment score appears where expected (commit detail, history, team list).

---

## 4. Phase 2 — Reconciliation & Full Lifecycle

**Goal:** RECONCILING → RECONCILED flow, carry-forward, retract, and manager view of planned vs actual.

### 4.1 Backend

- **Reconciliation endpoints**  
  - `PUT /api/commits/:id/items/:itemId/reconcile`  
    - Body: `actualOutcome`, `completionStatus`, `carryForward`.  
    - Allowed only when commit status is RECONCILING.  
    - Validate `carryForward` only for PARTIAL / NOT_COMPLETED.  
  - `POST /api/commits/:id/reconcile`  
    - Transition RECONCILING → RECONCILED.  
    - Validate all items have `completionStatus` set.  
    - Trigger carry-forward seeding for items with `carryForward=true`.  
  - Add DTOs: `ReconcileItemRequest`, `ReconcileCommitResponse` (summary counts) if not present.

- **Carry-forward seeding**  
  - Implement in `CommitService` (or dedicated service): for a RECONCILED commit, find items with `carryForward=true`; ensure next week’s DRAFT exists for that user; create commit items with same title, description, outcomeId, chess piece; set `carriedFromId`, increment `carryForwardCount` on source item; idempotent (no duplicates for same `carriedFromId` in same week).

- **State machine**  
  - Ensure LOCKED → DRAFT retract is enforced (viewed_at check) and covered by tests.

- **History / commit summary**  
  - Ensure alignment score and reconciliation counts (completed, partial, not completed, carried forward) are returned everywhere they’re needed (IC history, manager direct-report history).

### 4.2 Frontend

- **Reconciliation view (IC)**  
  - When status is RECONCILING: show two-column layout (planned vs actual).  
  - Per item: planned (title, chess, RCDO breadcrumb); actual outcome (text input); completion status (COMPLETED / PARTIAL / NOT_COMPLETED); carry-forward toggle (only for PARTIAL / NOT_COMPLETED).  
  - Auto-save per item (debounced PUT reconcile).  
  - “Complete reconciliation” button → POST reconcile; validate all items have status; then show summary and transition to RECONCILED.

- **Commit page**  
  - When status is RECONCILING, show reconciliation UI (or link to same commit on CommitDetailPage in RECONCILING mode).  
  - “Start reconciliation” or “Reconcile now” for LOCKED week (manual trigger via PATCH status to RECONCILING).

- **Carried-forward badge**  
  - On commit items that have `carriedFromId` or `carryForwardCount` set, show “Carried forward” badge (and optionally count).

- **Manager: planned vs actual**  
  - On CommitDetailPage in manager view, for RECONCILED commits show planned vs actual comparison (already have summary; ensure item-level actual outcome and status are visible).

### 4.3 Verification

- Lock a week → move to RECONCILING (manual or later via job) → fill actuals and completion status → complete reconciliation → next week’s DRAFT contains carried items with badge.  
- Manager sees reconciled commit with planned vs actual and notes.

**Exit criteria:** Full lifecycle DRAFT → LOCKED → RECONCILING → RECONCILED works; carry-forward seeds correctly; manager sees reconciliation data.

---

## 5. Phase 3 — Schedulers, Team Alignment, Polish

**Goal:** Automated Monday/Friday jobs; team alignment by Rally Cry; dual role and UX polish.

### 5.1 Backend

- **Scheduled jobs**  
  - **Monday 6am (UTC for POC):** For each org (or each user), ensure current week’s DRAFT exists (reuse getCurrentWeek logic or equivalent). Optionally trigger carry-forward seeding for users who had RECONCILED previous week (idempotent).  
  - **Friday 5pm (UTC for POC):** Transition all LOCKED commits for current week to RECONCILING (idempotent).  
  - Use `@Scheduled` with fixed cron; document timezone assumption (UTC) in ASSUMPTIONS.  
  - No need for internal HTTP endpoints unless you want to trigger jobs manually; keep jobs internal.

- **GET /api/manager/team/alignment**  
  - Return: total weight, aligned weight, alignment percentage, and per–Rally Cry breakdown (rallyCryId, title, supportingItemCount, supportingWeight, weightPercentage, contributors with userId/fullName/itemCount).  
  - Scope to manager’s direct reports’ current week commits.

- **4-week alignment trend**  
  - In `ManagerService.getTeam`, for each direct report compute last 4 RECONCILED weeks’ alignment scores and return as list (e.g. `alignmentTrend: [85, 90, 88, 92]`). Extend `TeamMemberResponse` (or nested DTO) accordingly.

- **Under-supported Rally Cries**  
  - In team alignment or getTeam: identify Rally Cries with low share of team’s total weight (e.g. below org threshold or below average); return in team response or alignment endpoint.

### 5.2 Frontend

- **Team alignment view**  
  - New section or page: “Team alignment” with Rally Cry breakdown (from GET /manager/team/alignment), under-supported Rally Cries highlighted.  
  - Link from manager dashboard.

- **Dual role**  
  - Confirm /auth/me returns both EMPLOYEE and MANAGER (or DUAL_ROLE) when user has manager_id and direct reports; ensure nav shows My Week and My Team without re-login.

- **Outcome selector**  
  - Add search/filter in AddItemModal (and wherever outcome is selected) over the flat list of outcomes (Rally Cry → Objective → Outcome).

- **Chess piece tooltip**  
  - In chess piece select, show short description per piece (e.g. “Critical — week fails without this” for King).

- **Sorting (manager dashboard)**  
  - Sort team list by name, status, item count, alignment score, last updated (toggle or dropdown).

### 5.3 Verification

- Run Monday job (or advance time / manual trigger): new week has DRAFT for all users.  
- Run Friday job: LOCKED commits move to RECONCILING.  
- Team alignment page shows Rally Cries and under-supported; 4-week trend appears on cards.  
- Dual-role user sees both tabs; outcome search and chess tooltip work.

**Exit criteria:** Schedulers run as specified; team alignment endpoint and UI done; dual role and UX polish done.

---

## 6. Phase 4 — Production Readiness

**Goal:** Robust error handling, test coverage, CI/CD, deployment, and observability.

**TDD:** Error-handling and validation behavior are defined by tests first; then implementation. Broader test coverage is part of this phase.

### 6.1 Error handling

- **Backend:** **Test first:** Controller or integration tests for invalid transitions, validation failures, 403/404 return correct error code and message. **Then:** Ensure all controller exceptions map to structured error response; Bean Validation on DTOs; clear codes (VALIDATION_FAILED, MINIMUM_ITEMS_REQUIRED, RETRACT_NOT_PERMITTED, etc.).  
- **Frontend:** **Test first:** Test that API errors (e.g. 400, 401) show user-facing message or toast. **Then:** Global error boundary; toast or inline messages for API errors; retry/refresh where appropriate.

### 6.2 Tests

- **Backend:**  
  - CommitService: reconciliation methods, carry-forward seeding (test first if not already covered in Phase 2).  
  - StateMachineService: all transitions and illegal cases (test first for any missing).  
  - ManagerService: getTeam, alignment trend, getDirectReportCommit (viewed_at), addNote (test first for gaps).  
  - CommitController / ManagerController: key endpoints (status transition, reconcile, manager team) — add controller tests where missing.

- **Frontend:**  
  - **Test first** for any critical path not yet covered: CommitPage (add item, submit week), CommitDetailPage (reconciliation form), ManagerDashboard (team list, navigate to commit).  
  - Use Vitest + React Testing Library; mock API client.

### 6.3 CI/CD & deployment

- **CI:** Build backend (Maven), frontend (remote + host); run backend and frontend tests; optional Docker build.  
- **Deployment:** Docker Compose for prod-like run; document env vars and production OAuth/JWT settings.  
- **Observability:** Actuator health; structured logging on state transitions; document log format.

### 6.4 Documentation & security

- **README:** Quick start, env reference, link to THE_ADVANTAGE and SOO_DECISION_LOG.  
- **Security:** Confirm CORS, cookie flags (httpOnly, Secure, SameSite), PKCE/state for OAuth; no secrets in client.

**Exit criteria:** Test suite green; CI runs on push; app runs via Docker; docs and security assumptions documented.

---

## 7. Task Checklist (Summary)

Use this as a sprint backlog. **TDD:** For each item marked "Test first," add or update the test(s) and run until they fail (Red); then implement until they pass (Green); then refactor. Order within each phase by dependency.

### Phase 1
- [ ] **Test first:** Backend tests for manager notes API path (controller or service) and for alignmentScore in toWeekResponse / history / summary.
- [ ] Backend: Fix manager notes API path (or add overload) so frontend can add notes with userId.
- [ ] Backend: Compute and return alignmentScore in CommitService.toWeekResponse and history/summary responses.
- [ ] Backend: Optionally extend TeamMemberResponse with totalWeight, viewedAt, hasCarriedForwardItems for current commit.
- [ ] **Test first:** Frontend test for manager notes display (managerName) and addNote path if changed.
- [ ] Frontend: Call manager notes API with userId (or switch to backend path that accepts only commitId).
- [ ] Frontend: Align ManagerNoteResponse with backend (managerName/authorName, etc.).
- [ ] Run full MVP checklist and fix any remaining issues.

### Phase 2
- [ ] **Test first:** CommitServiceTest (or controller): PUT reconcile item (RECONCILING only; carryForward validation); POST complete reconcile (all items have status; transition; trigger seeding).
- [ ] **Test first:** CommitServiceTest: carry-forward seeding creates items in next week DRAFT; idempotent; carryForwardCount incremented.
- [ ] **Test first:** StateMachineServiceTest: LOCKED → DRAFT retract when viewed_at null vs set.
- [ ] Backend: Implement PUT /commits/:id/items/:itemId/reconcile and POST /commits/:id/reconcile; carry-forward seeding.
- [ ] **Test first:** CommitDetailPage (or ReconciliationView) tests: RECONCILING two-column UI; completion status; carry-forward toggle; Complete reconciliation button.
- [ ] Frontend: Reconciliation UI (two-column, actual outcome, completion status, carry-forward toggle, complete button).
- [ ] Frontend: Manual trigger to move LOCKED → RECONCILING from commit page/detail.
- [ ] Frontend: Carried-forward badge on items.
- [ ] Frontend: Manager view shows planned vs actual at item level for RECONCILED commits.

### Phase 3
- [ ] **Test first:** Scheduler job tests (Monday DRAFT creation; Friday LOCKED → RECONCILING; idempotent).
- [ ] Backend: @Scheduled Monday job and Friday job.
- [ ] **Test first:** ManagerServiceTest or controller: GET /manager/team/alignment response shape; 4-week trend in getTeam; under-supported Rally Cries.
- [ ] Backend: GET /api/manager/team/alignment; 4-week alignment trend; under-supported Rally Cries.
- [ ] **Test first:** Frontend: team alignment view renders breakdown; dual role nav; outcome search; chess tooltip; manager sort.
- [ ] Frontend: Team alignment view; dual role; searchable outcome selector; chess tooltip; manager dashboard sort.

### Phase 4
- [ ] **Test first:** Backend error response tests (invalid transition, validation, 403/404); frontend error display tests.
- [ ] Backend: Structured error codes and messages for all failure paths; validation on DTOs.
- [ ] Frontend: Error boundary and user-facing error messages.
- [ ] Backend: Unit tests for any remaining CommitService, StateMachineService, ManagerService, controller cases.
- [ ] Frontend: Vitest tests for CommitPage, CommitDetailPage (reconciliation), ManagerDashboard.
- [ ] CI: GitHub Actions (or other) — build backend, remote, host; run tests.
- [ ] Docker: Production env example; document OAuth/JWT for prod.
- [ ] README and ASSUMPTIONS: Final pass; link THE_ADVANTAGE, TDD, SOO_DECISION_LOG.

---

## 8. References

- [TDD](TDD.md) — Test driven development guide (Red–Green–Refactor)
- [PRD](PRD.md) — Feature requirements and state machine  
- [USER_STORIES](USER_STORIES.md) — Epics US-101–US-1008  
- [MVP](MVP.md) — 12-point success checklist  
- [THE_ADVANTAGE](THE_ADVANTAGE.md) — Strategic framing and SOO gap  
- [API](API.md) — REST contract  
- [SCHEMA](SCHEMA.sql) — Database model  
- [ASSUMPTIONS](ASSUMPTIONS.md) — Decisions and open questions
