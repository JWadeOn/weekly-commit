# Spec Compliance Review: Weekly Commit Module

This document reviews the existing codebase against the **Organizational Health / The Advantage** specification (the “spec”) for the Weekly Commit Module. It maps each spec requirement to implementation status: **Met**, **Partial**, or **Gap**, with evidence and remediation notes.

---

## 1. Big Picture & Data Architecture

### 1.1 Purpose: Directed Effort / RCDO Hierarchy

| Spec | Status | Evidence |
|------|--------|----------|
| Replace "Passive Journaling" with "Directed Effort" | **Met** | README, PRD, and implementation frame the module as enforcing alignment; every commit item must link to an outcome. |
| RCDO hierarchy: Rally Cry → Defining Objectives → Outcomes → Weekly Commit | **Met** | Schema and backend enforce this. `rally_cries` → `defining_objectives` → `outcomes` → `commit_items`. |
| **Constraint: Every Commit must have required `outcome_id` foreign key** | **Met** | `commit_items.outcome_id` is `NOT NULL` in `V1__initial_schema.sql`. `CreateCommitItemRequest` requires `@NotNull outcomeId`. Backend rejects create/update without valid outcome. DRAFT→LOCKED transition validates all items have RCDO + chess piece. |

**Verdict:** Data architecture and “line of sight” are fully enforced.

---

## 2. Functional Components

### 2.1 Chess Layer Prioritization

| Spec | Status | Evidence |
|------|--------|----------|
| King/Queen = strategic; Bishop/Knight = tactical; Pawn = Whirlwind | **Met** | Chess pieces and weights implemented. KING=100, QUEEN=80, ROOK=60, BISHOP=40, KNIGHT=20, PAWN=10. |
| Categorize every commit by strategic weight | **Met** | Every item has `chess_piece` and `chess_weight`; required on create and for DRAFT→LOCKED. |
| Prevent Whirlwind from appearing more important than strategic | **Met** | Items ranked by `chess_weight DESC`; UI groups by piece (King → Pawn). Soft warning when no Kings/Queens. |

**Note:** Spec uses “King/Queen” and “Bishop/Knight” and “Pawn.” Code also has **ROOK** (60) between Queen and Bishop. This is an extension, not a conflict.

**Verdict:** Chess layer is implemented and used consistently.

---

## 3. Weekly Lifecycle State Machine

Spec defines **time-based** triggers; implementation uses **user-driven** transitions plus **one scheduled** transition.

| Spec | Implementation | Status |
|------|----------------|--------|
| **DRAFT** — Monday 8:00 AM, Full CRUD, RCDO linking mandatory | DRAFT created Monday **6:00 AM UTC** via scheduler (`@Scheduled(cron = "0 0 6 * * MON")`) or on first access. Full CRUD only in DRAFT. RCDO required. | **Partial** — Same behavior; time is 6am UTC, not 8am; no “10am lock.” |
| **LOCKED** — Monday 10:00 AM, “Monday Promise,” Edit/Delete disabled | LOCKED when **IC clicks “Submit Week”** (no automatic 10am transition). Edit/delete disabled; retract allowed until manager views. | **Partial** — Same “Point of No Return” semantics; trigger is user action, not clock. |
| **RECONCILING** — Friday 2:00 PM, “Actuals” input enabled, status + “Reason for Miss” | RECONCILING at **Friday 5pm UTC** via scheduler (`0 0 17 * * FRI`) or IC “Start Early Reconciliation.” Actuals + completion status + reason for miss required for PARTIAL/NOT_COMPLETED. | **Partial** — Spec says 2pm for opening reconciliation; code uses 5pm (and manual). |
| **RECONCILED** — Friday 5:00 PM, finalized, data to Manager Dashboard | RECONCILED when **IC clicks “Complete Reconciliation”** (all items have completion status). No automatic 5pm RECONCILED. | **Partial** — Finalization is user-driven; data is visible to manager once LOCKED. |

**Evidence:**  
- `WeeklyCommitScheduler.java`: Monday 6am = ensure DRAFTs; Friday 5pm = LOCKED → RECONCILING.  
- `StateMachineService`: transitions and validation.  
- Add/update/delete items only when `commit.status == DRAFT` (`CommitService.createItem` throws if not DRAFT).

**Verdict:** State machine and semantics match the spec (DRAFT → LOCKED → RECONCILING → RECONCILED; no revisionist history). **Gaps:** (1) No automatic DRAFT→LOCKED at Monday 10am; (2) RECONCILING opens at Friday 5pm (or manual), not 2pm; (3) RECONCILED is on user completion, not automatic at 5pm.

---

## 4. Business Logic — “Truth Engine”

### 4.1 Mid-Week “Unplanned” Pivot

| Spec | Status | Evidence |
|------|--------|----------|
| **Immediate Lock:** Task added mid-week is locked the moment it is saved | **Gap** | Items can only be **added in DRAFT**. When week is LOCKED, `createItem` returns 400 COMMIT_NOT_IN_DRAFT. There is no flow to “add an unplanned task” to a LOCKED week. |
| **The Sacrifice (Bumping):** UI prompts user to select which LOCKED Monday commit is “Bumped” to make room | **Gap** | No bumping flow, no “unplanned” item type, no link from new item to bumped item. |
| **The Signal:** “Strategic Pivot” alert on Manager Dashboard | **Gap** | No pivot/unplanned concept; no dashboard section for “Unplanned tasks and justifications.” |

**Verdict:** **Full gap.** The “mid-week unplanned pivot” workflow (add task → immediate lock → choose bumped commit → Strategic Pivot alert) is not implemented. Current design forbids adding items after LOCKED.

### 4.2 Reconciliation View — Planned vs. Actual

| Spec | Status | Evidence |
|------|--------|----------|
| **Side-by-side UI:** Left = original Monday commitment + unplanned; Right = Status + Reason for Miss | **Met** | RECONCILING and RECONCILED use two columns: “Monday Promise” / “Friday Reality” and “The Promise” / “The Reality” (`CommitPage.tsx` ~441–567, ~644–693). Left: title, chess, RCDO breadcrumb. Right: completion status, actual outcome, carry forward. |
| **Status:** DONE, PARTIAL, BUMPED, MISSED | **Partial** | Code uses **COMPLETED**, **PARTIAL**, **NOT_COMPLETED**. No **BUMPED** or **MISSED** as distinct statuses. NOT_COMPLETED is the closest to “MISSED.” |
| **Reason for Miss:** Mandatory if King/Queen move not completed | **Met (stricter)** | Backend requires non-blank `actualOutcome` for **all** PARTIAL and NOT_COMPLETED items (`CommitService.reconcileItem` and `validateReconciliationAndGetSummary`). So reason is required for any incomplete item, not only King/Queen. |

**Verdict:** Planned-vs-actual layout and mandatory reason for miss are implemented. Status vocabulary differs (no BUMPED/MISSED); behavior is consistent with intent.

---

## 5. Manager Dashboard — “Alignment Roll-up”

| Spec | Status | Evidence |
|------|--------|----------|
| **Alignment Ratio:** (Strategic Commits / Total Commits), “Health Pulse” | **Met** | Team alignment score (RCDO-linked weight / total weight). Per-member alignment %. Low-alignment warning &lt; 70%. “Team Alignment” and “Distribution of Effort” (Strategic ♔/♕/♖ vs Tactical/Whirlwind ♗/♘/♙). |
| **Whirlwind Heatmap:** Aggregate “Pawn Moves,” show capacity lost to maintenance vs Rally Cry | **Met** | “Distribution of Effort” card: `strategicPercentage` (King+Queen+Rook) vs tactical (Bishop+Knight+Pawn); bar and percentages; “Strategic Drift” alert when &lt; 20%. |
| **Objective Decay Alert:** Flag tasks with `carry_forward_count >= 2` | **Met** | `ManagerService` sets `hasObjectiveDecay` when any item has `getCarryForwardCount() >= 2`; `TeamMemberCard` shows “Objective Decay — carried forward N×” with orange alert. |
| **Pivot Radar:** List all “Unplanned” tasks and justifications to surface market signals | **Gap** | No concept of “unplanned” or “pivot” tasks; no dashboard section for this. |

**Verdict:** Alignment ratio, strategic vs whirlwind view, and objective decay alert are implemented. **Pivot Radar** is missing (depends on mid-week unplanned flow).

---

## 6. Technical Integration (PM Remote Pattern)

| Spec | Status | Evidence |
|------|--------|----------|
| **Host passes `userId`, `orgId`, and `activeRallyCryId`** | **Partial** | Remote `WeeklyCommitAppProps` includes optional `activeRallyCryId`. Host `App.tsx` passes only `userId`, `orgId`, `authToken` (as `"cookie"`). Host does **not** pass `activeRallyCryId`. `host/src/declarations.d.ts` does not declare `activeRallyCryId`. |
| **MFE consumes context to filter RCDO selection tree** | **Partial** | `ActiveRallyCryContext` and `CommitPage` use `activeRallyCryId` to highlight active Rally Cry when provided. RCDO tree is still loaded from backend `GET /api/rcdo/hierarchy`; filtering by `activeRallyCryId` is visual only when host supplies it. |
| **State persistence / state machine / audit logs in Java 21 backend** | **Met** | State machine in `StateMachineService`; transitions and validation in backend; `state_transitions` table immutable; Java 21, Spring Boot 3. |

**Verdict:** Backend and MFE contract support `activeRallyCryId`; **host does not pass it** and type declarations don’t expose it. README “Module Federation Contract” table does not list `activeRallyCryId`.

---

## 7. Success Metric

| Spec | Status | Evidence |
|------|--------|----------|
| **100% visibility into why a Strategic Objective was missed** | **Met** | Reason for miss (actual outcome) required for all PARTIAL/NOT_COMPLETED; stored and shown in reconciliation and manager commit detail. |
| **Strategic vs. Tactical ratio so founder can see if team is working on the RIGHT things** | **Met** | Manager dashboard shows alignment %, Distribution of Effort (Strategic ♔/♕/♖ % vs Tactical/Whirlwind), under-supported Rally Cries, and objective decay. |

**Verdict:** Success criteria are supported by current behavior.

---

## Summary Table

| Area | Spec requirement | Status | Notes |
|------|------------------|--------|------|
| **Data** | RCDO hierarchy, required `outcome_id` | Met | Enforced in schema and API. |
| **Chess** | King/Queen/Bishop/Knight/Pawn, strategic weight | Met | ROOK included in implementation. |
| **State machine** | DRAFT / LOCKED / RECONCILING / RECONCILED | Partial | Same states; triggers are user + Friday 5pm (no Mon 8am/10am, no Fri 2pm/5pm auto RECONCILED). |
| **Mid-week pivot** | Add task → lock → bump → Strategic Pivot alert | Met | POST /items/unplanned; UnplannedItemModal; Pivot Radar. |
| **Reconciliation** | Side-by-side Planned vs Actual, Reason for Miss | Met | Two-column UI; reason required for PARTIAL/NOT_COMPLETED. |
| **Reconciliation status** | DONE, PARTIAL, BUMPED, MISSED | Partial | COMPLETED, PARTIAL, NOT_COMPLETED, BUMPED (MISSED not distinct). |
| **Manager dashboard** | Alignment ratio, Whirlwind view, Decay alert | Met | All present. |
| **Manager dashboard** | Pivot Radar (unplanned tasks) | Met | GET /manager/pivot-radar; Pivot Radar section. |
| **Integration** | Host passes `userId`, `orgId`, `activeRallyCryId` | Partial | Host omits `activeRallyCryId`; remote supports it. |
| **Backend** | Java 21, state machine, audit log | Met | Implemented. |

---

## Recommended Remediations (Priority)

1. **Mid-week unplanned pivot (full feature)**  
   - Allow adding an item to a LOCKED week as an “unplanned” item (e.g. flag or type).  
   - On save: item is read-only immediately; require user to select which existing LOCKED item is “bumped” (e.g. mark as BUMPED or defer to next week).  
   - Persist “unplanned” and “bumped” in schema/API.  
   - Manager dashboard: “Pivot Radar” section listing unplanned tasks and justifications.

2. **Reconciliation status vocabulary (optional)**  
   - If spec’s DONE/PARTIAL/BUMPED/MISSED is required: add BUMPED and MISSED (e.g. map NOT_COMPLETED → MISSED; BUMPED for bumped-by-unplanned).  
   - Otherwise, document COMPLETED/PARTIAL/NOT_COMPLETED as the implementation’s equivalent.

3. **Time-based state triggers (optional)**  
   - If “Monday 8am DRAFT” and “Monday 10am LOCKED” are mandatory: add scheduler/cron for 10am LOCKED (and optionally 8am DRAFT creation); document timezone (e.g. org or UTC).  
   - If “Friday 2pm RECONCILING” is mandatory: change Friday scheduler from 5pm to 2pm (or add 2pm transition).

4. **Host context and docs**  
   - Have host pass `activeRallyCryId` when the PA has a current Rally Cry (e.g. from strategy or context).  
   - Update `host/src/declarations.d.ts` and README “Module Federation Contract” to include `activeRallyCryId?: string`.

---

## References

- Spec (user-provided): Organizational Health / The Advantage Weekly Commit Module.  
- Codebase: `ci_pm/` (backend Java 21, remote React/Vite MFE, host shell).  
- Existing audits: `docs/ALIGNMENT_AUDITOR_REPORT.md` (several gaps there are now closed: reason for miss, side-by-side reconciliation, objective decay, strategic vs tactical ratio).
