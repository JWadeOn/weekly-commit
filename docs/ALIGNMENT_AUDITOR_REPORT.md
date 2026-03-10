# Alignment Auditor — Gap Analysis & Stress Test

**Role:** Product Audit Specialist / Organizational Health Consultant  
**Objective:** Compare the existing Weekly Commit Module against the strict requirements of the **RCDO** (Rally Cry → Defining Objectives → Outcomes) framework and the **Chess Layer** prioritization model. Identify "Gaps of Drift" where the software allows users to revert to 15-Five-style passive journaling instead of active alignment.

**Reference:** Schema (`docs/SCHEMA.sql`), README, backend services, remote/host MFE implementation.

---

## Executive Summary

The implementation is **strong on structure and lifecycle**: commits cannot exist without outcomes, and the state machine enforces DRAFT → LOCKED. **Gaps** appear in: (1) Manager Dashboard not exposing a **Strategic vs. Tactical (Chess) ratio**, (2) Reconciliation not **requiring a reason for miss** on uncompleted strategic tasks, (3) No **manager intervention alert** when tasks are carried forward multiple weeks, (4) **Reconciliation view** not being a strict side-by-side "What I Promised" vs "What I Did", and (5) **Rally Cry** being sourced from the backend API rather than passed from the host (MFE contextual integrity is “live from org” but not “from host”).

---

## The 5 Pillars — Detailed Audit

### 1. The Structural "Hard Link"

**The Standard:** Does the system allow a commit to exist without a direct parent Outcome?

**Gap Check:** If a user can enter "Clean up inbox" or "Meeting with Dave" without mapping it to a Defining Objective or Outcome, the system has a structural leak.

| Finding | Evidence |
|--------|----------|
| **PASS** | `commit_items.outcome_id` is `NOT NULL` in schema; `CreateCommitItemRequest` requires `@NotNull outcomeId`; backend validates outcome exists before save. |
| **PASS** | Lock transition (`DRAFT → LOCKED`) requires every item to have outcome and chess piece; `StateMachineService.validateDraftToLocked` enforces this. |

**Verdict:** **No structural leak.** Commits cannot exist without a direct parent Outcome. Orphan commits are impossible at both schema and API level.

---

### 2. The Lifecycle "Tension"

**The Standard:** Is there a literal "Point of No Return" (Locked State)?

**Gap Check:** If a user can edit their "Monday Plan" on Thursday afternoon to match what they actually did, the Accountability Loop is broken. Does the state machine enforce DRAFT → LOCKED?

| Finding | Evidence |
|--------|----------|
| **PASS** | Add/update/delete/reorder items only allowed when `commit.status == DRAFT`. Backend throws `InvalidStateTransitionException` otherwise. |
| **PASS** | `StateMachineService` allows only defined transitions; illegal transitions return HTTP 400. |
| **PASS** | Retract (LOCKED → DRAFT) only when `viewed_at IS NULL`; once manager views, retract is disabled. |
| **PASS** | Every transition logged to `state_transitions` (immutable audit). |

**Verdict:** **State rigidity is enforced.** Users cannot edit the plan once the week is locked. The "Point of No Return" exists.

---

### 3. The "Chess Layer" Resource Distribution

**The Standard:** Does the Manager Dashboard calculate a **Strategic vs. Tactical** ratio?

**Gap Check:** If the dashboard only shows "Percentage Complete," it is a project management tool, not an alignment tool. It must show **where the weight is** (e.g., "Team is 100% busy, but 90% of moves are Pawns/Maintenance").

| Finding | Evidence |
|--------|----------|
| **PARTIAL** | Dashboard shows **Team Alignment %** (RCDO-linked weight / total weight) and **Alignment by Rally Cry** (weight % per Rally Cry). |
| **GAP** | There is **no** explicit "Strategic vs. Whirlwind" or "Pawn vs. Queen" ratio. No breakdown such as "X% of team weight is KING/QUEEN vs PAWN." |
| **GAP** | Per-member card shows item count, total weight, alignment % — not "weight in strategic pieces" vs "weight in tactical pieces." |

**Verdict:** **Gap.** The dashboard shows alignment to Rally Cries and an overall alignment score but does **not** surface the Chess Layer distribution (e.g., "90% of moves are Pawns"). Adding a "Strategic vs. Tactical" or "High-value (King/Queen) vs. Maintenance (Pawn)" ratio would meet the Advantage requirement.

---

### 4. The Reconciliation "Truth" Engine

**The Standard:** Does the RECONCILING phase force a **"Reason for Miss"** for uncompleted strategic tasks? When a task is "Carried Forward," does the system track its **"Age"**? If a task moves Week 1 → Week 2 → Week 3 without a manager intervention alert, the system is facilitating "Objective Decay."

| Finding | Evidence |
|--------|----------|
| **PARTIAL** | **Actual outcome** text is captured (`actualOutcome` / "What actually happened?") but is **optional**. No validation that NOT_COMPLETED or PARTIAL items have a reason-for-miss. |
| **GAP** | **Reason for miss** is not required. User can set NOT_COMPLETED and carry forward without explaining why. |
| **PASS** | **Carry-forward age** is tracked: `carry_forward_count` is incremented on the source item when seeding the next week; UI shows "CF×N" badge. |
| **GAP** | No **manager intervention alert** when `carry_forward_count >= 2` (or similar). Dashboard shows "Has carried forward items" but not "Repeat count" or "Objective decay" warning. |

**Verdict:** **Gaps.** (1) Require "reason for miss" (or mandatory actual outcome) for PARTIAL/NOT_COMPLETED before completing reconciliation. (2) Add manager-facing alert when items have been carried forward multiple times (e.g., repeat counter or flag for follow-up).

---

### 5. MFE Contextual Integrity

**The Standard:** Does the module pull the **Current Rally Cry** from the host?

**Gap Check:** If the RCDO tree is static or manually entered by the user, it isn't "Integrated." It must be a **live reflection** of the organization's current quarterly focus.

| Finding | Evidence |
|--------|----------|
| **PARTIAL** | RCDO hierarchy is **live**: remote fetches from backend (`GET /api/rcdo/hierarchy`) per org; Strategy page CRUD updates Rally Cries / DOs / Outcomes. Not static or user-entered only. |
| **GAP** | Rally Cry is **not** passed from the host. Host passes only `userId`, `orgId`, `authToken`. The remote gets hierarchy from the **backend API**, not from the host shell. So integration is "live from org (backend)" but not "host provides current Rally Cry." |

**Verdict:** **Partial pass.** The module uses a live, org-scoped RCDO tree from the backend. For strict "MFE contextual integrity" as stated (pull from host), the host would need to supply current Rally Cry (or the backend remains source of truth and the requirement is interpreted as "live reflection of org focus," which is satisfied).

---

## Advantage Integrity Checklist

| Feature | Pass/Fail | The "Advantage" Requirement | Notes |
|--------|-----------|-----------------------------|--------|
| **RCDO Hierarchy** | ✅ Pass | Commits must be children of Outcomes. No orphans. | `outcome_id` NOT NULL; lock validation; create item requires outcome. |
| **Chess Layering** | ⚠️ Partial | Every task has a "Weight" (Pawn vs. Queen). | Every item has chess piece + weight. Dashboard does **not** show Strategic vs. Whirlwind ratio. |
| **State Rigidity** | ✅ Pass | Users cannot edit the "Plan" once the week is "Locked." | Edit/delete/reorder only in DRAFT; retract only if not viewed. |
| **Manager Roll-up** | ⚠️ Partial | Dashboard shows "Alignment %" (Strategic vs. Whirlwind). | Shows Team Alignment % and Rally Cry breakdown; **missing** explicit Strategic vs. Tactical (Chess) ratio. |
| **Carry Forward** | ⚠️ Partial | Unfinished tasks are flagged with a "Repeat" counter. | `carry_forward_count` stored and shown (e.g. CF×2). **Missing** manager alert when count ≥ 2 or "objective decay" flag. |
| **Reconciliation** | ⚠️ Partial | Side-by-side view of "What I Promised" vs. "What I Did." | Per-item planned (title, chess, RCDO) and actual outcome exist; RECONCILING is single-column flow; RECONCILED summary and item list show actuals but not a dedicated two-column layout. **Reason for miss** not required for NOT_COMPLETED. |

---

## Recommended Remediations (Priority Order)

1. **Manager Dashboard — Chess ratio**  
   Add a team-level (and optionally per-member) metric: e.g. "Strategic weight %" (KING+QUEEN+ROOK weight / total weight) or "Pawn %." Surface it prominently so managers see "where the weight is."

2. **Reconciliation — Reason for miss**  
   For items with completion status PARTIAL or NOT_COMPLETED, require non-empty "Actual outcome" (or a dedicated "Reason for miss" field) before allowing "Complete reconciliation."

3. **Carry-forward — Manager alert**  
   On Manager Dashboard (or commit review), flag items (or commits) where any item has `carry_forward_count >= 2` (or similar threshold) so managers are prompted to intervene and prevent objective decay.

4. **Reconciliation — Side-by-side view**  
   For RECONCILED commits, add an explicit "Planned vs. Actual" view: e.g. two columns — "What I Promised" (title, outcome, chess) and "What I Did" (actual outcome, status, carry forward). Optional: use this layout in RECONCILING as well.

5. **MFE — Rally Cry from host (optional)**  
   If product requirement is "module pulls Current Rally Cry from host," extend the host to pass current Rally Cry (or hierarchy summary) as a prop and have the remote consume it when present; otherwise keep backend as source of truth and document that "live reflection of org focus" is satisfied via API.

---

## Summary Table

| Pillar | Status | Main gap |
|--------|--------|----------|
| 1. Structural Hard Link | ✅ Pass | None. |
| 2. Lifecycle Tension | ✅ Pass | None. |
| 3. Chess Layer Resource Distribution | ⚠️ Gap | No Strategic vs. Tactical ratio on dashboard. |
| 4. Reconciliation Truth Engine | ⚠️ Gap | Reason for miss not required; no manager alert for repeat carry-forwards. |
| 5. MFE Contextual Integrity | ⚠️ Partial | Rally Cry from backend, not from host. |

Overall, the implementation is **alignment-oriented** and enforces RCDO and lock semantics well. Closing the gaps above would bring it fully in line with an "Advantage-style" alignment engine and reduce drift toward passive journaling.
