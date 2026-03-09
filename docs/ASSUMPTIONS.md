# Assumptions Log
## Weekly Commit Module — v1.1

All assumptions marked 🔵 in the PRD, consolidated here for hiring partner review.
These represent interpretations made due to spec ambiguity or missing information.
Each is implemented as documented below and is configurable or reversible.

**Strategic context:** This module implements Lencioni’s "The Advantage" for Questions 5 & 6 (*What is most important right now?* and *Who must do what?*). See [`docs/THE_ADVANTAGE.md`](THE_ADVANTAGE.md). One known gap: **Standard Operating Objectives (SOOs)** are not in the schema; only Defining Objectives (DOs) under Rally Cry exist. Therefore we cannot yet report "X% weight on DOs vs SOOs." Manager roll-up by Rally Cry still works.

---

## RCDO

| # | Assumption | Implementation |
|---|------------|----------------|
| 1 | RCDO = Rally Cries, Defining Objectives, Outcomes — three-level hierarchy (Lencioni Playbook) | Three tables: rally_cries, defining_objectives, outcomes |
| 2 | **Manager owns strategy input:** The manager enters Rally Cries, Defining Objectives, and Outcomes, and assigns team members to each (e.g. outcome owner). | outcomes.owner_id references users; Rally Cry and DO are org-scoped. **Manager RCDO admin:** Strategy page (`/manager/strategy`) and `GET/POST/PUT/DELETE /api/manager/rcdo/**` for full CRUD; outcome owner selected from org members. Hierarchy still seeded via Flyway for POC. |
| 3 | Every commit item must link to exactly one Outcome | NOT NULL FK on commit_items.outcome_id, validated before LOCKED transition |
| 4 | Standard Operating Objectives (SOOs) are out of scope for POC | No SOO table or DO vs SOO tag; all outcomes are under Defining Objectives. See docs/THE_ADVANTAGE.md §6. |

---

## Chess Layer

| # | Assumption | Implementation |
|---|------------|----------------|
| 5 | Chess layer uses piece hierarchy (King→Pawn) as weighted priority ranking, not categorization | chess_piece enum + chess_weight integer on commit_items |
| 6 | Weights: King=100, Queen=80, Rook=60, Bishop=40, Knight=20, Pawn=10 | CHECK constraint on chess_weight, derived from chess_piece on create |
| 7 | chess_weight stored denormalized for query performance | chess_weight column alongside chess_piece — updated atomically |
| 8 | No limit on items per chess piece level | No constraint — unlimited items per piece type |

---

## State Machine

| # | Assumption | Implementation |
|---|------------|----------------|
| 9 | Carry Forward is a boolean property on commit items, not a state | carry_forward BOOLEAN on commit_items |
| 10 | LOCKED → DRAFT retract permitted until manager views | Retract blocked when viewed_at IS NOT NULL |
| 11 | "Viewed" = manager opened commit detail page, tracked via viewed_at timestamp | viewed_at set in GET /api/manager/team/:userId/commits/:commitId |
| 12 | RECONCILING triggered automatically Friday 5pm org timezone OR manually by IC | Spring @Scheduled job + manual PATCH /commits/:id/status endpoint |
| 13 | Minimum 1 item required to lock a week | Validation in CommitService before DRAFT→LOCKED transition |
| 14 | RECONCILING trigger is idempotent | Job checks current status before transitioning |

---

## Alignment Score

| # | Assumption | Implementation |
|---|------------|----------------|
| 15 | Alignment Score = Sum of weights of RCDO-linked items / Total weight of all items | Computed in CommitService, returned on all commit responses |
| 16 | Alignment score threshold is 70% — below triggers 🚨 warning | organizations.alignment_threshold column, default 70, configurable per org |

---

## Manager Dashboard

| # | Assumption | Implementation |
|---|------------|----------------|
| 17 | Manager sees direct reports only, not full org subtree | Query uses users.manager_id FK, one level only |
| 18 | Team alignment view is weight-adjusted percentage breakdown per Rally Cry | GET /api/manager/team/alignment — aggregated SQL query |
| 19 | 4-week trend is trailing 4 completed weeks, not calendar weeks | History query filters status = RECONCILED, last 4 results |

---

## Dual Role

| # | Assumption | Implementation |
|---|------------|----------------|
| 20 | Dual role detected automatically — no manual switching required | JWT contains both roles if user has manager_id AND has direct reports |
| 21 | Dual role users never serve both roles within the same team | Enforced by org structure seeding — manager_id chain never loops |

---

## Micro-Frontend

| # | Assumption | Implementation |
|---|------------|----------------|
| 22 | Remote receives authToken as prop from host in production | WeeklyCommitAppProps interface — authToken required |
| 23 | Standalone mode for development only | main.tsx renders own login; WeeklyCommitApp.tsx skips login when authToken prop present |
| 24 | Host PA app contract requires userId, orgId, authToken, onAuthExpired | WeeklyCommitAppProps interface |
| 25 | Remote entry URL is configurable via environment variable | REMOTE_URL env var in host vite.config.ts |

---

## OAuth

| # | Assumption | Implementation |
|---|------------|----------------|
| 26 | OAuth provider is unknown — implement provider-agnostic | Spring Security oauth2 client config via env vars |
| 27 | oauth_subject (provider's stable ID) used to find-or-create users | oauth_subject column on users table, UNIQUE constraint |
| 28 | Roles assigned by our system, not derived from OAuth provider claims | user_roles table owned by our DB |

---

## General

| # | Assumption | Implementation |
|---|------------|----------------|
| 29 | No real-time updates for POC — refresh on load / 30s polling | React Query refetchInterval: 30000 on manager dashboard |
| 30 | Scheduled jobs run in org's local timezone | Timezone stored on organizations table (Phase 2 — UTC for POC) |
| 31 | Auto-save uses debounced PUT calls, not websocket sync | 500ms debounce on commit item edits via React Query mutation |

---

## Questions For Hiring Partner

If any of these assumptions are incorrect, these are the changes required:

1. **Chess layer definition** — If Chess means something other than piece hierarchy weights, update the chess_piece enum and chess_weight values in V1__initial_schema.sql and the chess piece tooltip copy.

2. **RCDO levels** — If there are more or fewer levels than Rally Cry → Objective → Outcome, update the three RCDO tables and the hierarchy API response shape.

3. **OAuth provider** — Set OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET, OAUTH_ISSUER_URI, OAUTH_REDIRECT_URI in .env. Zero code changes.

4. **Alignment threshold** — Update organizations.alignment_threshold in the seed data. Configurable per org.

5. **Manager scope** — If managers should see full org subtree (not just direct reports), update the query in ManagerService.getTeamMembers() to use a recursive CTE.

6. **PA host contract** — If the existing PA host app passes different props than (userId, orgId, authToken, onAuthExpired), update WeeklyCommitAppProps interface and the mock host App.tsx.

7. **Standard Operating Objectives (SOOs)** — If the product should distinguish "Defining Objectives" (Rally Cry work) from "Standard Operating" (KTLO), add SOO support per docs/THE_ADVANTAGE.md §6 (new table or type on objectives; roll-up by DO vs SOO).

8. **RCDO ownership** — We assume the **manager** enters Rally Cries, DOs, and Outcomes and assigns team members (e.g. outcome owners). If a different role (e.g. Strategy, Admin) or process should own RCDO, the future RCDO admin UI and permissions would need to reflect that.
