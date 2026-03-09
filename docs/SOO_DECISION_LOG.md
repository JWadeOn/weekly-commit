# Standard Operating Objectives (SOOs) — Phase 2 Decision Log

**Status:** Deferred (POC does not model SOOs)  
**Context:** Lencioni’s "The Advantage" distinguishes **Defining Objectives** (work that achieves the Rally Cry) from **Standard Operating Objectives** (KTLO — e.g. Revenue, Customer Satisfaction). The current schema has only Rally Cry → Defining Objectives → Outcomes.  
**Full gap description:** [`docs/THE_ADVANTAGE.md`](THE_ADVANTAGE.md) §6.

---

## Decision to defer (POC)

- **Decision:** Do not add SOOs in POC. All outcomes live under Defining Objectives; Manager roll-up by Rally Cry and alignment score remain valid.
- **Rationale:** Keeps scope minimal; DO vs SOO breakdown is a product/design choice that may vary by org.
- **Consequence:** We cannot surface "80% of team on SOO, 0% on DO → Rally Cry at risk." We can only show alignment to the single hierarchy.

---

## Options for Phase 2 (when SOOs are required)

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A. Separate SOO table** | New table `standard_operating_objectives` (org-scoped, no `rally_cry_id`). Outcomes reference either `defining_objective_id` or `standard_operating_objective_id` (nullable one, CHECK exactly one set). | Clear separation; SOOs have different lifecycle (no theme, no end date). | Schema change; migration; API and UI must support two objective types. |
| **B. Type on objectives** | Add `objective_type` to `defining_objectives`: `DEFINING` \| `STANDARD_OPERATING`. SOOs are rows with no (or null) `rally_cry_id`, or a dedicated "KTLO" Rally Cry. | Single table; fewer migrations. | Mixes two concepts; "Rally Cry" for KTLO is a stretch. Null `rally_cry_id` for SOOs is clean but requires NOT NULL relaxed or a sentinel Rally Cry. |
| **C. Outcome-level tag** | Add `objective_type` or `source` on `outcomes` (e.g. linked to DO vs SOO). Outcomes under DOs stay; new way to attach outcomes to "SOO" without a full SOO entity. | Minimal schema change if SOOs are just a label. | Less clear ownership; roll-up logic more complex. |

**Recommendation:** Option **A** if the product needs full SOO semantics (ownership, separate reporting, no Rally Cry). Option **B** if the org is fine with "all objectives in one table" and SOOs as a type (e.g. `rally_cry_id` NULL for SOOs + CHECK constraint).

---

## Implementation notes (if Option A chosen)

1. **Schema:** `standard_operating_objectives(id, org_id, title, description, active, created_at)`. `outcomes` gets optional `standard_operating_objective_id`; CHECK that exactly one of `defining_objective_id` vs `standard_operating_objective_id` is set (or keep `defining_objective_id` NOT NULL and add nullable `standard_operating_objective_id` for SOO-only outcomes — then an outcome belongs to DO or SOO, not both).
2. **API:** Hierarchy endpoint returns two trees or a unified tree with a type marker. Manager alignment endpoint adds DO vs SOO weight breakdown.
3. **UI:** Outcome selector and Manager Dashboard show "Defining" vs "Standard Operating"; optional warning when SOO weight dominates and Rally Cry is under-supported.
4. **Validation:** No change to "every commit item links to one Outcome"; Outcomes can now be DO-backed or SOO-backed. DRAFT→LOCKED rules unchanged.

---

## Acceptance criteria (Phase 2)

- [ ] Outcomes can be linked to either a Defining Objective or a Standard Operating Objective.
- [ ] Manager roll-up (and alignment API) can report weight (or count) by DO vs SOO.
- [ ] Dashboard or report can highlight "Rally Cry at risk" when e.g. most of the team's weight is on SOOs and Rally Cry support is below threshold.
- [ ] Existing behavior (roll-up by Rally Cry, alignment score) unchanged for DO-only outcomes.

---

## References

- [`docs/THE_ADVANTAGE.md`](THE_ADVANTAGE.md) §6 — Gap: SOOs  
- [`docs/SCHEMA.sql`](SCHEMA.sql) — Current RCDO tables  
- [`docs/ASSUMPTIONS.md`](ASSUMPTIONS.md) — RCDO assumption #4, Questions for Hiring Partner #7
