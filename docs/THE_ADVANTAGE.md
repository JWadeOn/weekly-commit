# The Advantage Framework — How This Module Uses It

This document aligns the Weekly Commit Module with **Patrick Lencioni’s "The Advantage"**. The framework argues that **Organizational Health**—the ability to align around a single goal—is the ultimate competitive advantage. Every feature in this module should support answering Lencioni’s **Six Critical Questions**; this module focuses on the last two.

---

## 1. The Six Critical Questions

| # | Question | Answer in the Framework | Module Relevance |
|---|----------|--------------------------|-------------------|
| 1 | Why do we exist? | Core Purpose (North Star) | Out of scope; typically shown at top of host UI as "Big Why." |
| 2 | How do we behave? | Core Values (3–4 non‑negotiable behaviors) | Out of scope; advanced commits could tag tasks with a Core Value. |
| 3 | What do we do? | Business Definition (one sentence) | Out of scope. |
| 4 | How will we succeed? | Strategy / Strategic Anchors (filters for every decision) | Informs Chess Layer: is a task a strategic move or a "pawn move"? |
| **5** | **What is most important, right now?** | **Thematic Goal (Rally Cry)** | **RCDO top level. Every Defining Objective must support this one Rally Cry.** |
| **6** | **Who must do what?** | **Roles and responsibilities** | **Manager Dashboard: maps Who (user) to What (weekly commits) so the right people move the right levers.** |

This module’s **technical deliverable** is built to enforce and expose answers to **Questions 5 and 6**. Validation and UI are designed so that if the organization can’t answer them with alignment, the system surfaces the gap instead of hiding it.

---

## 2. Core Hierarchy: The "Playbook"

Clarity in The Advantage is built through a pyramid. The SQL schema and APIs follow this hierarchy so that **Manager Roll-up** and alignment views are possible.

| Level | Lencioni Term | In This Module | Notes |
|-------|----------------|----------------|--------|
| **Top** | **Rally Cry (Thematic Goal)** | `rally_cries` | Single qualitative org goal; typically 3–12 months. |
| **Under Rally Cry** | **Defining Objectives (DOs)** | `defining_objectives` | 4–6 categories of work that achieve the Rally Cry; qualitative (e.g. "Reduce Latency," "Train Support Staff"). |
| **Keep the lights on** | **Standard Operating Objectives (SOOs)** | *Not yet modeled* | KTLO categories that don’t change (e.g. "Revenue," "Customer Satisfaction"). See [Gap: SOOs](#gap-standard-operating-objectives-soos) below. |
| **Measurable** | **Outcomes** | `outcomes` | Specific, measurable results tied to **Defining Objectives** (and in a full model, could also be tied to SOOs). |
| **Weekly** | **Commit Items** | `commit_items` | Weekly tasks; each links to exactly one Outcome (and thus to one DO, and one Rally Cry). |

Current schema: **Rally Cry → Defining Objectives → Outcomes → Commit Items**. Every commit item traces up to one Rally Cry. Manager roll-up by Rally Cry (and by Defining Objective) is therefore supported.

---

## 3. Weekly Commit as the "Chess Layer"

Lencioni stresses **over-communication and reinforcement**. The Weekly Commit is where strategy (Rally Cry / DOs) meets daily work.

- **Problem:** Many teams have a Rally Cry on a slide, but their updates are a list of unconnected tasks.
- **Chess metaphor:** The module forces the user to choose a "piece" (priority) and to **link every item to the hierarchy** (RCDO).
  - If a commit item does **not** link to a Defining Objective (via an Outcome), it is effectively **off-strategy**; current validation prevents that by requiring an Outcome (and thus a DO) on every item.
  - If the "Chess Layer" showed that most weight were on **Standard Operating** work and little on **Defining Objectives**, the Rally Cry would be at risk. Today we do not distinguish DO vs SOO in the schema; see [Gap: SOOs](#gap-standard-operating-objectives-soos).

---

## 4. Team Effectiveness: Reconciliation and Accountability

The framework relies on **accountability**. The **Reconciliation View** (Planned vs Actual) is there to surface "the truth."

- **LOCKED state:** Once a week is locked, commit items cannot be edited. That prevents **revisionist history**—changing goals on Thursday to match what was actually done. You cannot reconcile a week that wasn’t locked; the state machine enforces that.
- **Manager review:** The Manager Dashboard is not only for grading; it is to **identify misalignment**. If the Rally Cry is "Mobile First" but the team is committing to "Desktop Refactor," the dashboard should highlight that gap (e.g. under-supported Rally Cries, low alignment score).
- **Carry Forward:** When a task isn’t done, carry-forward forces a conversation: *Is this still a priority for our Defining Objective, or was it just busy work?* That supports both accountability and alignment.

---

## 5. Technical Implications Already Enforced

| Requirement | Implementation |
|-------------|----------------|
| Commit must link to strategy | Every commit item requires an `outcome_id` (Outcome → Defining Objective → Rally Cry). DRAFT→LOCKED blocked otherwise. |
| No reconciliation without commitment | Only LOCKED commits can transition to RECONCILING; RECONCILING→RECONCILED only after completion status on all items. |
| No revisionist history | LOCKED and RECONCILED commits are not editable; state transitions are immutable in `state_transitions`. |
| Carry forward forces conversation | Carry forward is explicit; carried items reappear in next week with badge and count, so managers can see chronic incompletion. |

---

## 6. Gap: Standard Operating Objectives (SOOs)

**Lencioni:** Organizations have both **Defining Objectives** (work that advances the Rally Cry) and **Standard Operating Objectives** (KTLO—e.g. Revenue, Customer Satisfaction) that don’t change with the theme.

**Current state:** The schema has only **Rally Cry → Defining Objectives → Outcomes**. There is no entity or flag for **SOOs**. So we cannot:

- Classify an Outcome (or objective) as "DO" vs "SOO."
- Report "X% of team weight on Defining Objectives vs Y% on Standard Operating."
- Surface "Rally Cry at risk because 80% of work is SOO and 0% DO."

**Options for a future iteration:**

1. **Add an SOO layer:** e.g. `standard_operating_objectives` table; Outcomes could belong to either a Defining Objective or an SOO. Roll-up and Chess Layer would then show DO vs SOO mix.
2. **Tag on objectives:** Add `type` (e.g. `DEFINING` | `STANDARD_OPERATING`) to `defining_objectives` and introduce a separate table or naming for SOOs if they have different lifecycle (e.g. no end date).
3. **Leave as-is for POC:** Keep single hierarchy; document that "all current outcomes are treated as Defining (Rally Cry–driven)." Manager roll-up by Rally Cry still works; DO vs SOO breakdown would be a Phase 2 enhancement.

Until SOOs are modeled, the Chess Layer and manager views answer "Is work aligned to our Rally Cry?" but not "What share of work is strategic (DO) vs keep-the-lights-on (SOO)?"

---

## 7. Doc Cross-References

- **Hierarchy and state machine:** [`docs/SCHEMA.sql`](SCHEMA.sql), [`docs/PRD.md`](PRD.md) §3–5, [`README.md`](../README.md) (RCDO, Commit State Machine).
- **Manager roll-up and alignment:** [`docs/API.md`](API.md) (e.g. `GET /api/manager/team`, `GET /api/manager/team/alignment`), [`docs/PRD.md`](PRD.md) §6.3.
- **Assumptions and validation:** [`docs/ASSUMPTIONS.md`](ASSUMPTIONS.md).
- **SOO gap and Phase 2 options:** [`docs/SOO_DECISION_LOG.md`](SOO_DECISION_LOG.md).
