# Product Requirements Document
## Weekly Commit Module — v1.1

**Version:** 1.1
**Status:** Final for Development
**Assumptions:** Marked with 🔵 throughout

---

## 1. Product Vision

Replace 15-Five with a structured weekly planning system that enforces a
direct connection between individual weekly work and organizational strategic
goals. Every commit item must trace upward to a Rally Cry. Misalignment
becomes visible before it becomes a problem.

---

## 2. Users & Roles

### 2.1 Individual Contributor (IC)
Submits weekly commits, links them to RCDO outcomes, categorizes them
using the Chess layer, and reconciles planned vs. actual at week's end.

### 2.2 Manager
Reviews direct reports' commits, sees team-level roll-ups, and identifies
misalignment between team work and strategic goals.

### 2.3 Dual Role User
A mid-level manager who is simultaneously an IC (submitting commits to
their manager) and a manager (reviewing direct reports' commits). Never
in the same team in both capacities.

🔵 Dual role detected automatically based on org structure — if a user
has both a manager above them AND direct reports below them, they see
both IC and Manager views. No manual role switching required.

---

## 3. RCDO Hierarchy

```
Rally Cry (org-wide, 1-3 per org)
  └── Defining Objectives (team-level, multiple per Rally Cry)
        └── Outcomes (individual-level, multiple per Objective)
              └── Commit Items (weekly, multiple per Outcome)
```

### Definitions
- **Rally Cry (R):** Single most important org priority for the quarter.
  Set by leadership. Example: "Achieve product-market fit in SMB segment."
- **Defining Objectives (D):** Team-level commitments that fulfill the
  Rally Cry. Set by managers. Example: "Ship 3 customer-requested features by Q3."
- **Outcomes (O):** Individual-level measurable results. Set by ICs with
  managers. Example: "Reduce API response time below 200ms."

### Rules
- RCDO hierarchy is consumed by this module, not managed in it
- Seeded via Flyway for POC
- Every commit item must link to exactly one Outcome
- Full breadcrumb always visible: Rally Cry → Objective → Outcome
- Unlinked items block DRAFT → LOCKED transition

---

## 4. Chess Layer

Weighted priority ranking system applied to every commit item.
Answers: "Of everything on your plate this week, what actually matters most?"

### Chess Piece Weights
| Piece  | Weight | Meaning                            |
|--------|--------|------------------------------------|
| King   | 100    | Critical — week fails without this |
| Queen  | 80     | Highest leverage item              |
| Rook   | 60     | Core delivery work                 |
| Bishop | 40     | Important but not blocking         |
| Knight | 20     | Nice to have, opportunistic        |
| Pawn   | 10     | Small tasks, low leverage          |

### Ranking Rules
- Every commit item must have exactly one chess piece
- Items auto-rank by weight descending
- Manual drag-and-drop ordering within same chess piece level
- priority_order reflects combined weight + manual ordering
- chess_weight stored denormalized for query performance
- Week with no Kings or Queens surfaces a soft visual warning — not a hard block

### Weekly Weight Summary (IC View)
```
This week: 1 King · 2 Queens · 3 Rooks · 1 Pawn
Total weight: 420
```

### Alignment Score (Manager View)
```
Alignment Score = Sum of weights of RCDO-linked items / Total weight of all items
```
- Score below 70% surfaces 🚨 misalignment warning
- 🔵 70% threshold configurable in database per org

---

## 5. Weekly Lifecycle State Machine

```
DRAFT → LOCKED → RECONCILING → RECONCILED
```

### State Definitions

**DRAFT**
- Auto-created every Monday for all active users
- IC can freely create, edit, delete commit items
- Not visible to manager yet
- Transitions to: LOCKED

**LOCKED**
- IC has submitted their week
- No edits permitted to commit items
- Visible to manager in dashboard
- LOCKED → DRAFT retract permitted until manager views commit
- After manager views (viewed_at set): retract permanently disabled
- Transitions to: RECONCILING

**RECONCILING**
- 🔵 Triggered automatically Friday 5pm org timezone via scheduled job
- IC fills in actual outcomes per item
- Each item marked: COMPLETED, PARTIAL, or NOT_COMPLETED
- Carry Forward toggle available on PARTIAL and NOT_COMPLETED items only
- Transitions to: RECONCILED

**RECONCILED**
- IC has submitted reconciliation
- Week is closed — no further edits
- Carry Forward items auto-seeded into following week's DRAFT
- Terminal state for that week

### Carry Forward
- 🔵 Boolean property on commit_items, NOT a state
- Seeded item retains: title, description, RCDO link, chess piece
- Seeded item resets: actual_outcome, completion_status, priority_order
- Seeded item displays visual "Carried Forward" badge in new week
- Seeding is idempotent — running twice never creates duplicates
- carry_forward_count increments each time an item is carried forward

### Legal Transitions
| From         | To           | Trigger                        | Condition                          |
|--------------|--------------|--------------------------------|------------------------------------|
| DRAFT        | LOCKED       | IC clicks "Submit Week"        | All items have RCDO + chess piece, min 1 item |
| LOCKED       | DRAFT        | IC clicks "Retract"            | Manager has not viewed (viewed_at null) |
| LOCKED       | RECONCILING  | Scheduled job OR IC manual     | —                                  |
| RECONCILING  | RECONCILED   | IC clicks "Complete Reconciliation" | All items have completion status |

### Illegal Transitions
All rejected with HTTP 400 + clear error message:
- DRAFT → RECONCILING
- DRAFT → RECONCILED
- LOCKED → RECONCILED
- RECONCILED → any state
- LOCKED → DRAFT after manager has viewed

### State Transition Audit Log
Every transition recorded immutably:
- from_state, to_state, transitioned_by, transitioned_at, notes
- No deletes or updates permitted on this table — ever

---

## 6. Feature Requirements

### 6.1 Commit Entry (IC View)

**Current Week View**
- Current week date range displayed prominently (Mon–Fri)
- Commit items ranked by chess weight descending
- Each item shows: title, chess piece + weight, RCDO breadcrumb, priority number
- Week status badge: DRAFT / LOCKED / RECONCILING / RECONCILED
- Weekly weight summary bar at top
- Empty state with clear CTA
- Soft warning when no Kings or Queens assigned

**Add / Edit Commit Item**
- Fields: title (required), description (optional), RCDO outcome (required), chess piece (required)
- RCDO selector shows full tree: Rally Cry → Objective → Outcome
- Searchable outcome selector
- Cannot save without RCDO link and chess piece
- Inline editing for title and description
- Item auto-positions on save based on chess weight
- All changes auto-saved

**Prioritization**
- Drag-and-drop reordering within same chess piece level
- Cross-piece reordering not permitted
- Priority number updates in real time on drag
- Optimistic UI updates — instant feel regardless of network

**Submit Week (DRAFT → LOCKED)**
- "Submit Week" button prominent in UI
- Pre-submission validation: all items have RCDO + chess piece, minimum 1 item
- Confirmation dialog before transition
- Status badge updates immediately

**Retract (LOCKED → DRAFT)**
- "Retract Submission" button visible in LOCKED state
- Disabled with tooltip once manager has viewed
- Confirmation dialog before retract

### 6.2 Reconciliation View (IC View)

Two-column comparison:
```
| Planned                     | Actual                          |
|-----------------------------|---------------------------------|
| Title                       | Actual outcome: [text input]    |
| Chess piece + weight        | Status: COMPLETED / PARTIAL /   |
| RCDO breadcrumb             |         NOT_COMPLETED           |
|                             | Carry Forward: [toggle]         |
```

- Carry Forward toggle only on PARTIAL and NOT_COMPLETED
- All items require status before completing reconciliation
- Auto-saves reconciliation progress
- Post-reconciliation summary: X completed, X partial, X not completed, X carried forward
- Notification reminder if not reconciled by Friday EOD

### 6.3 Manager Dashboard (Manager View)

**Team Roll-Up**
- Lists all direct reports (not full org subtree)
- Per person: name, status badge, item count, alignment score, last updated
- Status badge colors: DRAFT (grey), LOCKED (blue), RECONCILING (yellow), RECONCILED (green)
- Alignment score with 🚨 warning below 70%
- Chess weight distribution bar per person
- Sortable by: name, status, item count, alignment score, last updated
- 4-week alignment score trend per team member
- Under-supported Rally Cries highlighted

**Individual Commit Detail**
- Full read-only commit view
- All items with chess pieces, weights, RCDO breadcrumbs
- Viewing sets viewed_at timestamp — disables IC retract
- Post-reconciliation: planned vs. actual comparison
- Manager can add notes

**Team Alignment View**
- Weight-adjusted alignment breakdown mapped to Rally Cries
- Example: "14 of 20 items (72% of total weight) support Rally Cry: PMF in SMB"
- Per Rally Cry breakdown with contributing items and owners

### 6.4 Commit History
- IC can view past weeks
- Each past week shows final state + reconciliation summary
- Carried forward items traceable to source week

### 6.5 Dual Role View
- "My Week" (IC) and "My Team" (Manager) in navigation
- Both views from same session — no re-login
- IC and Manager views fully independent

---

## 7. Micro-Frontend Integration

### 7.1 Exposed Contract
```typescript
export interface WeeklyCommitAppProps {
  userId: string
  orgId: string
  authToken: string
  onAuthExpired: () => void
}
export default function WeeklyCommitApp(props: WeeklyCommitAppProps): JSX.Element
```

### 7.2 Module Federation Config
- Remote name: weeklyCommitModule
- Exposed path: ./WeeklyCommitApp
- Remote entry: /assets/remoteEntry.js
- Shared singletons: react, react-dom
- Host passes authToken — remote does not handle login when mounted

### 7.3 Mock Host App
- Minimal PA host shell on port 3000
- Loads remote from port 3001 at runtime
- Passes seeded userId, orgId, authToken as props
- Remote entry URL configurable via environment variable

### 7.4 Standalone Mode
- Runs standalone on port 3001 for development
- Renders own login page in standalone mode
- Production always mounts via host

---

## 8. Non-Functional Requirements

### 8.1 Performance
- Dashboard loads under 2 seconds
- State transitions respond under 500ms
- Drag-and-drop reordering is instant (optimistic UI)

### 8.2 Security
- JWT in httpOnly, Secure, SameSite=Strict cookie
- Bean Validation on all Java DTOs
- JPA parameterized queries only
- CORS locked to allowed origins
- State transitions only via backend service layer
- State transition audit log immutable
- PKCE flow + state parameter validation on OAuth

### 8.3 Reliability
- All state transitions atomic
- Carry Forward seeding idempotent
- Auto-save on all forms
- Graceful error handling — no silent failures

### 8.4 Observability
- Structured logging on all state transitions
- Structured API error responses: error code + human-readable message
- Spring Boot Actuator /actuator/health for deployment health checks
- Logs to stdout captured by Docker

---

## 9. Out of Scope (POC → Phase 2)
| Feature                        | Phase   |
|--------------------------------|---------|
| Admin UI for RCDO management   | Phase 2 |
| User management UI             | Phase 2 |
| Email / push notifications     | Phase 2 |
| 15-Five data migration         | Phase 2 |
| Real-time updates (WebSockets) | Phase 2 |
| Mobile responsive design       | Phase 2 |
| GDPR / SOC 2 implementation    | Phase 2 |
| Multi-org support UI           | Phase 2 |
| iOS / native mobile            | Phase 3 |
