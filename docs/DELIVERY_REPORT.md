# Delivery Report: Weekly Commit Module

**Purpose:** This report treats the **Product Requirements Document (PRD)** and **Product Vision** as the requirement and assesses whether the intended solution was delivered and how it was solved.

**Reference requirement:** [`docs/PRD.md`](PRD.md), [`docs/THE_ADVANTAGE.md`](THE_ADVANTAGE.md), and the Organizational Health / The Advantage specification as reviewed in [`docs/SPEC_COMPLIANCE_REVIEW.md`](SPEC_COMPLIANCE_REVIEW.md).

---

## 1. Requirement Summary

### 1.1 Product Vision (The “Problem Statement”)

Replace 15-Five with a **structured weekly planning system** that:

- Enforces a **direct connection** between individual weekly work and organizational strategic goals.
- Ensures **every commit item traces upward to a Rally Cry** (no unlinked work).
- Makes **misalignment visible** before it becomes a problem.
- Embeds **Patrick Lencioni’s “The Advantage”**: the LOCKED state prevents revisionist history; the Reconciliation View surfaces planned vs. actual for accountability; Carry Forward forces the conversation: *“Is this still a priority for our Defining Objective, or busy work?”*

### 1.2 Core Requirements (from PRD)

| # | Requirement area | Key ask |
|---|------------------|--------|
| 1 | **RCDO hierarchy** | Rally Cry → Defining Objectives → Outcomes → Commit Items; every item must link to exactly one Outcome. |
| 2 | **Chess layer** | Weighted prioritization (King→Pawn); every item has a piece; ranking and soft warning when no Kings/Queens. |
| 3 | **State machine** | DRAFT → LOCKED → RECONCILING → RECONCILED; no revisionist editing after submit; immutable transition audit. |
| 4 | **IC flows** | Plan week, submit, retract (until manager views), reconcile (completion + carry forward), history; optional mid-week unplanned pivot. |
| 5 | **Manager dashboard** | Team roll-up, alignment score (with low-alignment warning), per-Rally-Cry breakdown, objective decay, pivot radar, commit detail (sets viewed_at), manager notes. |
| 6 | **Reconciliation** | Two-column planned vs. actual; completion status; reason for miss; carry forward; summary. |
| 7 | **Dual role** | Same user can act as IC and manager; single session, both views in nav. |
| 8 | **MFE** | Module Federation; host passes userId, orgId, authToken, onAuthExpired; remote runs in host or standalone. |
| 9 | **Security & reliability** | JWT in httpOnly cookie; validation; immutable audit; org-scoped data. |

---

## 2. Delivery Verdict

**Overall: the intended solution was delivered.** The system implements the product vision and the vast majority of PRD and spec requirements. A few items are **partial** (e.g. time-based triggers, host context, status vocabulary); none are blocking gaps.

### 2.1 Requirements Traceability

| Requirement | Status | Evidence |
|-------------|--------|----------|
| **RCDO hierarchy, required outcome link** | **Met** | Schema: `commit_items.outcome_id` NOT NULL; API validation on create/update; DRAFT→LOCKED requires all items to have RCDO + chess piece. Full breadcrumb (Rally Cry › Objective › Outcome) in UI. |
| **Chess layer** | **Met** | KING=100, QUEEN=80, ROOK=60, BISHOP=40, KNIGHT=20, PAWN=10; required on every item; items ranked by weight; drag-and-drop within same piece; soft warning when no Kings/Queens. |
| **State machine** | **Met** (triggers **partial**) | DRAFT→LOCKED→RECONCILING→RECONCILED enforced in backend. Retract only until manager views. Every transition logged to `state_transitions` (immutable). Scheduler: Monday 6am UTC (ensure DRAFTs), Friday 5pm UTC (LOCKED→RECONCILING). No automatic Monday 10am LOCKED or Friday 5pm RECONCILED — triggers are user-driven + one scheduled transition. |
| **IC: plan, submit, retract, reconcile, history** | **Met** | CommitPage: add/edit/delete items, submit week, retract, reconciliation view (completion + actual outcome + carry forward), complete reconciliation; CommitHistoryPage for past weeks. |
| **Mid-week unplanned pivot** | **Met** | POST `/api/commits/:id/items/unplanned`; UnplannedItemModal (select bumped item or “ghost capacity”); `commit_items.unplanned`, `bumped_item_id`; BUMPED completion status for displaced items; Pivot Radar on manager dashboard. |
| **Reconciliation: planned vs actual, reason, carry forward** | **Met** | Two-column UI; COMPLETED/PARTIAL/NOT_COMPLETED (and BUMPED); actual outcome required for incomplete items; carry forward toggle; post-reconciliation summary; carry-forward seeding into next week. |
| **Manager dashboard** | **Met** | Team list (direct reports), status badges, alignment score, low-alignment warning (e.g. &lt;70%), weight distribution, under-supported Rally Cries, objective decay (carry_forward_count ≥ 2), Pivot Radar, commit detail (sets viewed_at), manager notes, team alignment by Rally Cry. |
| **Strategy (RCDO admin)** | **Met** | Strategy page and Manager RCDO API: full CRUD for Rally Cries, Defining Objectives, Outcomes; outcome owners from org members. (PRD listed “Admin UI for RCDO” as Phase 2; delivered in this codebase.) |
| **Dual role** | **Met** | Role derived from org structure; nav shows My Week / History and My Team / Strategy for users with both roles. |
| **MFE contract** | **Met** (host context **partial**) | Remote exposes `WeeklyCommitApp` with userId, orgId, authToken, onAuthExpired, optional activeRallyCryId. Host passes all except activeRallyCryId; remote supports it when provided. |
| **Security & reliability** | **Met** | JWT in httpOnly cookie; Bean Validation; parameterized queries; CORS; state transitions only via backend; immutable state_transitions; org scoping from JWT. |
| **KTLO (Keep the Lights On) isolation** | **Met** | Task type STRATEGIC vs KTLO; KTLO items can have null outcomeId; alignment numerator excludes KTLO weight; KTLO weight included in total/capacity; KTLO category (e.g. Bugfix, Maintenance) in UI and API. |
| **Outcome audit trail** | **Met** | `outcome_updates` table; manager updates outcome “current value” with method/evidence; GET `/api/manager/rcdo/outcomes/:id/history` for audit. |
| **Locked weight snapshot** | **Met** | `weekly_commits.total_locked_weight` set on LOCKED; used for capacity/ghost-capacity rules when adding unplanned items. |

### 2.2 Partial / Optional Items

- **Time-based triggers:** Spec mentioned Monday 8am/10am and Friday 2pm/5pm. Implementation uses Monday 6am UTC (DRAFT creation) and Friday 5pm UTC (LOCKED→RECONCILING); LOCKED and RECONCILED are user-driven. Semantics (no revisionist history, reconciliation after lock) are preserved.
- **Host passing activeRallyCryId:** Remote supports it for RCDO context; host does not currently pass it. Easy to add when host has a “current Rally Cry” concept.
- **Status vocabulary:** Spec used DONE/PARTIAL/BUMPED/MISSED; implementation uses COMPLETED/PARTIAL/NOT_COMPLETED/BUMPED. Behavior aligns with intent.

### 2.3 Out of Scope (per PRD) — Not Required for “Delivered”

- Admin UI for RCDO: **delivered anyway** (Strategy page).
- User management UI, notifications, 15-Five migration, WebSockets, mobile-responsive, GDPR/SOC2, multi-org UI, native mobile: not in scope for this delivery.

---

## 3. How We Solved It

### 3.1 Architecture

- **Monorepo:** `backend` (Java 21, Spring Boot 3), `remote` (React 18, Vite, Module Federation), `host` (React shell).
- **Runtime:** Browser → Host (auth gate, Module Federation) → Remote (weekly commit UI) → Backend API (port 8080) → PostgreSQL; mock OAuth2 in dev.
- **Auth:** OAuth 2.0 Authorization Code → backend issues internal JWT (userId, orgId, roles) in httpOnly cookie; all `/api/*` (except health/logout) require JWT; `/api/manager/**` requires MANAGER or DUAL_ROLE.

### 3.2 Key Design Decisions

1. **RCDO as single hierarchy**  
   One chain: Rally Cry → Defining Objectives → Outcomes → Commit Items. Every item has `outcome_id` (nullable only for KTLO). Enables alignment roll-up by Rally Cry and prevents “floating” work.

2. **Chess weights (not Fibonacci)**  
   PRD and spec use a chess metaphor; implementation uses fixed weights (100 down to 10). This keeps ranking and alignment math simple and avoids “pawn padding” by making high-value pieces dominate the score.

3. **State machine in backend only**  
   All transitions go through `StateMachineService`; frontend calls PATCH `/api/commits/:id/status`. Prevents invalid states and guarantees every transition is logged in `state_transitions`.

4. **Unplanned items and bumping**  
   When the week is LOCKED or RECONCILING, IC can add an “unplanned” item. They must either choose a “bumped” item (displacement) or use “ghost capacity” (active weight &lt; total_locked_weight). New item is locked immediately; bumped item gets completion_status BUMPED. Manager sees these in Pivot Radar.

5. **KTLO isolation**  
   Task type STRATEGIC vs KTLO. KTLO items can have null outcomeId and don’t count in the alignment numerator; they do count in total weight and capacity. Ensures “firefighting” is visible but doesn’t distort strategic alignment metrics.

6. **Locked weight snapshot**  
   On DRAFT→LOCKED, `total_locked_weight` is stored. Unplanned-item and capacity logic use this snapshot so mid-week adds don’t exceed the committed capacity and displacement is explicit.

7. **Outcome updates as audit**  
   When a manager updates an outcome’s current value (e.g. metric), an `outcome_updates` row is written with method/evidence. Supports “evidence-based leadership” and traceability.

8. **Module Federation**  
   Remote exposes one component; host loads it by URL and passes auth props. MemoryRouter in the remote keeps navigation inside the MFE and doesn’t change the host URL.

### 3.3 Implementation Highlights

- **Backend:** Controller → Service → Repository; DTOs only on API boundary; Flyway for schema and seed data; scheduler for Monday/Friday transitions.
- **Remote:** Zustand (auth), React Query (server state), shadcn/ui, @dnd-kit for reorder; centralized API client with 401 → onAuthExpired.
- **Host:** Minimal shell: auth check, then render remote with props; logout clears cookie and redirects.
- **Database:** UUID PKs; indexes on (user_id, week_start_date), (org_id, status), commit_items by commit/outcome/weight; no updates/deletes on `state_transitions`.

---

## 4. Conclusion

The **intended solution has been delivered**: a weekly commit module that ties individual work to strategy (RCDO + Chess), enforces accountability (state machine, reconciliation, carry forward), supports both IC and manager workflows including mid-week pivots and KTLO, and runs as a federated micro-frontend with a secure, auditable backend. Partial items (time triggers, host `activeRallyCryId`, status naming) are minor and do not affect the core product vision or success criteria. The implementation aligns with the PRD and The Advantage framing documented in THE_ADVANTAGE.md and SPEC_COMPLIANCE_REVIEW.md.
