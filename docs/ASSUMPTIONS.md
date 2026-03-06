# Assumptions Log
## Weekly Commit Module — v1.1

All assumptions marked 🔵 in the PRD, consolidated here for hiring partner review.
These represent interpretations made due to spec ambiguity or missing information.
Each is implemented as documented below and is configurable or reversible.

---

## RCDO

| # | Assumption | Implementation |
|---|------------|----------------|
| 1 | RCDO = Rally Cries, Defining Objectives, Outcomes — three-level hierarchy | Three tables: rally_cries, defining_objectives, outcomes |
| 2 | RCDO hierarchy is consumed by this module, not managed in it | No RCDO admin UI — seeded via Flyway for POC |
| 3 | Every commit item must link to exactly one Outcome | NOT NULL FK on commit_items.outcome_id, validated before LOCKED transition |

---

## Chess Layer

| # | Assumption | Implementation |
|---|------------|----------------|
| 4 | Chess layer uses piece hierarchy (King→Pawn) as weighted priority ranking, not categorization | chess_piece enum + chess_weight integer on commit_items |
| 5 | Weights: King=100, Queen=80, Rook=60, Bishop=40, Knight=20, Pawn=10 | CHECK constraint on chess_weight, derived from chess_piece on create |
| 6 | chess_weight stored denormalized for query performance | chess_weight column alongside chess_piece — updated atomically |
| 7 | No limit on items per chess piece level | No constraint — unlimited items per piece type |

---

## State Machine

| # | Assumption | Implementation |
|---|------------|----------------|
| 8 | Carry Forward is a boolean property on commit items, not a state | carry_forward BOOLEAN on commit_items |
| 9 | LOCKED → DRAFT retract permitted until manager views | Retract blocked when viewed_at IS NOT NULL |
| 10 | "Viewed" = manager opened commit detail page, tracked via viewed_at timestamp | viewed_at set in GET /api/manager/team/:userId/commits/:commitId |
| 11 | RECONCILING triggered automatically Friday 5pm org timezone OR manually by IC | Spring @Scheduled job + manual PATCH /commits/:id/status endpoint |
| 12 | Minimum 1 item required to lock a week | Validation in CommitService before DRAFT→LOCKED transition |
| 13 | RECONCILING trigger is idempotent | Job checks current status before transitioning |

---

## Alignment Score

| # | Assumption | Implementation |
|---|------------|----------------|
| 14 | Alignment Score = Sum of weights of RCDO-linked items / Total weight of all items | Computed in CommitService, returned on all commit responses |
| 15 | Alignment score threshold is 70% — below triggers 🚨 warning | organizations.alignment_threshold column, default 70, configurable per org |

---

## Manager Dashboard

| # | Assumption | Implementation |
|---|------------|----------------|
| 16 | Manager sees direct reports only, not full org subtree | Query uses users.manager_id FK, one level only |
| 17 | Team alignment view is weight-adjusted percentage breakdown per Rally Cry | GET /api/manager/team/alignment — aggregated SQL query |
| 18 | 4-week trend is trailing 4 completed weeks, not calendar weeks | History query filters status = RECONCILED, last 4 results |

---

## Dual Role

| # | Assumption | Implementation |
|---|------------|----------------|
| 19 | Dual role detected automatically — no manual switching required | JWT contains both roles if user has manager_id AND has direct reports |
| 20 | Dual role users never serve both roles within the same team | Enforced by org structure seeding — manager_id chain never loops |

---

## Micro-Frontend

| # | Assumption | Implementation |
|---|------------|----------------|
| 21 | Remote receives authToken as prop from host in production | WeeklyCommitAppProps interface — authToken required |
| 22 | Standalone mode for development only | main.tsx renders own login; WeeklyCommitApp.tsx skips login when authToken prop present |
| 23 | Host PA app contract requires userId, orgId, authToken, onAuthExpired | WeeklyCommitAppProps interface |
| 24 | Remote entry URL is configurable via environment variable | REMOTE_URL env var in host vite.config.ts |

---

## OAuth

| # | Assumption | Implementation |
|---|------------|----------------|
| 25 | OAuth provider is unknown — implement provider-agnostic | Spring Security oauth2 client config via env vars |
| 26 | oauth_subject (provider's stable ID) used to find-or-create users | oauth_subject column on users table, UNIQUE constraint |
| 27 | Roles assigned by our system, not derived from OAuth provider claims | user_roles table owned by our DB |

---

## General

| # | Assumption | Implementation |
|---|------------|----------------|
| 28 | No real-time updates for POC — refresh on load / 30s polling | React Query refetchInterval: 30000 on manager dashboard |
| 29 | Scheduled jobs run in org's local timezone | Timezone stored on organizations table (Phase 2 — UTC for POC) |
| 30 | Auto-save uses debounced PUT calls, not websocket sync | 500ms debounce on commit item edits via React Query mutation |

---

## Questions For Hiring Partner

If any of these assumptions are incorrect, these are the changes required:

1. **Chess layer definition** — If Chess means something other than piece hierarchy weights, update the chess_piece enum and chess_weight values in V1__initial_schema.sql and the chess piece tooltip copy.

2. **RCDO levels** — If there are more or fewer levels than Rally Cry → Objective → Outcome, update the three RCDO tables and the hierarchy API response shape.

3. **OAuth provider** — Set OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET, OAUTH_ISSUER_URI, OAUTH_REDIRECT_URI in .env. Zero code changes.

4. **Alignment threshold** — Update organizations.alignment_threshold in the seed data. Configurable per org.

5. **Manager scope** — If managers should see full org subtree (not just direct reports), update the query in ManagerService.getTeamMembers() to use a recursive CTE.

6. **PA host contract** — If the existing PA host app passes different props than (userId, orgId, authToken, onAuthExpired), update WeeklyCommitAppProps interface and the mock host App.tsx.
