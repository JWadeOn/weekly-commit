# MVP Definition
## Weekly Commit Module — End of Day 1

**The single test that defines MVP success:**
> An employee submits a weekly commit with RCDO-linked,
> chess-weighted items. A manager logs in and sees it.
> The whole thing runs through Module Federation.

---

## What's In MVP

### Auth
- OAuth flow working end-to-end with mock provider
- Two seeded users: EMPLOYEE and MANAGER
- JWT issued and stored in httpOnly cookie
- Role-gated routes enforced

### RCDO Hierarchy
- Seeded via Flyway — not managed in UI
- Outcome selector available when creating commit items
- Full breadcrumb visible: Rally Cry → Objective → Outcome

### Commit Items (CRUD)
- Create a commit item
- Edit a commit item
- Delete a commit item
- Fields: title, description, RCDO outcome link, chess piece

### Chess Layer (basic)
- Chess piece selector on every item (King → Pawn)
- Items auto-ranked by weight on the page
- Chess weight displayed on each item

### State Machine (DRAFT → LOCKED only)
- DRAFT → LOCKED transition working
- Backend enforces and logs the transition
- "Submit Week" button with confirmation dialog
- Validation: all items must have RCDO link + chess piece before locking

### Manager Dashboard (minimal)
- List of direct reports with commit status
- Click into a report → see their commit items read-only
- Viewing sets viewed_at (disables retract)

### Micro-Frontend
- Remote running on port 3001
- Mock host running on port 3000
- Host mounts remote via Module Federation
- Props contract working: userId, orgId, authToken, onAuthExpired

---

## MVP Success Checklist

Run this exact sequence at end of Day 1:

- [ ] Open host app on port 3000
- [ ] Remote loads seamlessly inside host
- [ ] Log in as employee via mock OAuth flow
- [ ] See current week's empty DRAFT commit
- [ ] Add 3 commit items with different chess pieces and RCDO links
- [ ] Items auto-rank by chess weight on screen
- [ ] Click "Submit Week" → confirmation dialog appears
- [ ] Confirm → status changes to LOCKED
- [ ] Log out
- [ ] Log in as manager
- [ ] See employee on dashboard with LOCKED status and item count
- [ ] Click into employee → see all 3 items with chess pieces and RCDO breadcrumbs

**12 checkboxes. All green = MVP done.**

---

## What's NOT In MVP (Days 2–3)

| Feature                          | Day |
|----------------------------------|-----|
| RECONCILING → RECONCILED         | 2   |
| Reconciliation view              | 2   |
| Carry forward logic              | 2   |
| LOCKED → DRAFT retract           | 2   |
| Drag-and-drop reordering         | 2   |
| Alignment score                  | 2   |
| Weight distribution visualization| 2   |
| Weekly weight summary            | 2   |
| Dual role view                   | 2   |
| Friday @Scheduled trigger        | 2   |
| Monday DRAFT auto-creation       | 2   |
| Commit history                   | 2   |
| Manager notes                    | 2   |
| Team alignment view              | 2   |
| Full error handling              | 3   |
| Unit + integration tests         | 3   |
| Production deployment + URL      | 3   |
| Architecture diagram             | 3   |
| README                           | 3   |
| CI/CD pipeline                   | 3   |
| Security audit                   | 3   |
