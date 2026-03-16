# Demo Workflow — The Advantage Weekly Commit

**~5 min | End-to-end flow so hiring partner sees strategy → commits → reconciliation → impact**

Demo data starts **empty** (no tasks, outcome gauges at 0%) so you can show how employee weekly commits drive the numbers.

---

## Before you start

- [ ] App + backend + DB running (e.g. `docker compose up` or local)
- [ ] Mock OAuth / demo users available (see `docs/demo-users-import.json`)
- [ ] One browser tab (or incognito) for easy sign-out/sign-in when switching users

---

## Demo clock (Monday vs Friday)

**The app does not have a configurable “demo clock.”** It uses the **real system date**:

- **Current week** = the real Monday–Sunday week (backend uses “this Monday” for the active commit).
- **Scheduler** (if running): Monday 6am UTC creates DRAFTs; Friday 5pm UTC moves LOCKED → RECONCILING. For a live demo you don’t rely on the scheduler.

**You can run the full flow on any day:**

| Step | What you do | No clock needed |
|------|--------------|------------------|
| Monday-style (planning) | Add items, Submit → status becomes **LOCKED** | Works any day; “current week” is just this week. |
| Friday-style (reconciliation) | After LOCKED, click **Start Early Reconciliation** | Moves to RECONCILING immediately; no need to wait for real Friday. |
| Complete | Set completion status, carry forward, **Complete reconciliation** | Same flow any day. |

So: **use “Start Early Reconciliation”** on the commit page when the week is LOCKED to show the reconciliation step without waiting for Friday. The only day-dependent behavior is cosmetic: on the manager **My Team** page, the Outcome Pulse header shows “📅 Friday —” in amber only on real Fridays (otherwise it just says “Outcome Pulse”).

**Demo on Saturday or Sunday:** On weekends, "current week" is the week that just ended (so you can still reconcile it). To run the full flow from scratch (add items, lock, add unplanned/bump, reconcile), click **Plan next week (full demo flow)** at the top of the Weekly Commits page to open the upcoming week's empty DRAFT.

---

**Opening line:**  
*"We're replacing 15-Five with a system that ties every weekly commit to organizational strategy and gives managers real-time visibility. I'll show the flow as a manager, then as an employee making commits, then reconciliation, and how that shows up on the manager dashboard — including outcome progress."*

---

## Step 1 — Strategy is the source of truth (Manager)

**Login:** `team1-manager@example.com` (Team 1 Manager)

| Do | Say |
|----|-----|
| Go to **Strategy** (left nav). | *"Strategy is the source of truth. Everything rolls up from here."* |
| Show **Rally Cry** → **Defining Objectives** → **Outcomes**. | *"Every commit item an employee adds must link to one of these outcomes. No floating tasks."* |
| Optionally open **Outcome Pulse** (from My Team) or note it’s on My Team. | *"We track progress on each outcome; I’ll show how that moves when we add and reconcile commits."* |

**Takeaway:** RCDO = single source of truth; all work must link to it.

---

## Step 2 — Employee plans the week (RCDO + chess, then lock)

**Switch user:** Sign out → **Login:** `team1-e1@example.com` (Team 1 Employee 1)

| Do | Say |
|----|-----|
| Go to **My Week** (The Board → My Week, or nav to commit view). | *"As an employee I plan my week here."* |
| **Add 2–3 commit items.** For each: pick an **Outcome** (from the RCDO list) and a **Chess piece** (e.g. King, Queen, Rook). | *"Each item is tied to an outcome and has a priority — the chess layer. So we’re always aligned to strategy."* |
| **Submit the week.** | *"Submitting locks the week. We’re not revising history after the fact."* |
| Confirm status shows **LOCKED**. | *"Once locked, the plan is fixed — we close the loop by reconciling what actually happened."* |

**Takeaway:** Commits = RCDO + chess; submit = lock.

---

## Step 3 — Reconciliation: planned vs actual + carry forward

**Stay as:** `team1-e1@example.com`

| Do | Say |
|----|-----|
| With the week **LOCKED**, click **Start Early Reconciliation** on the commit page (no need to wait for real Friday). | *"Now we close the loop: planned vs actual."* |
| For each item set **Completion status** (e.g. Completed, Partial, Not completed). Optionally set **Actual outcome** text. | *"We record what actually happened, not what we wished happened."* |
| For **one incomplete item** turn **Carry forward** on. | *"Incomplete work can carry to next week so it’s visible and we don’t lose it."* |
| Click **Complete reconciliation**. | *"That’s the full lifecycle: plan → lock → reconcile."* |

**Takeaway:** Reconciliation = accountability; carry forward keeps incomplete work visible.

---

## Step 4 — Manager sees team alignment and outcome impact

**Switch user:** Sign out → **Login:** `team1-manager@example.com` (Team 1 Manager)

| Do | Say |
|----|-----|
| Go to **My Team**. | *"As a manager I see how the team’s work ties to strategy."* |
| Point out **direct reports**, **status**, **weight**, and **alignment %**. | *"I see who’s committed, who’s locked, who’s reconciled."* |
| Click **one direct report** (e.g. Team 1 Employee 1) and open their commit: items, outcomes, chess. | *"I see exactly how their week maps to our outcomes and priorities."* |
| Optionally add a **manager note** on one item. | *"I can add notes for feedback or context."* |
| Scroll to **Outcome Pulse**. Show the three outcomes and gauges. | *"Outcome progress starts at zero in the demo. As we add commits and reconcile, we’d update these so the gauges reflect reality. This is how we connect weekly work to strategic outcomes."* |
| Point out **Team Integrity Score** and **X of Y units have reconciled**. | *"Monday promise → Friday reality. We see how many people have reconciled and the overall integrity score."* |

**Takeaway:** Manager sees RCDO alignment, who did what, and how outcome progress and integrity tie to commits.

---

## Step 5 (optional) — Admin: users and teams

**Switch user:** Sign out → **Login:** `admin@example.com` (Admin)

| Do | Say |
|----|-----|
| Go to **Admin** (or User/Admin area). | *"Admins manage who’s in the system and how they’re wired."* |
| Show **user list** (roles, manager assignments). | *"We add users and assign roles and managers so the right people have manager vs employee access."* |

**Takeaway:** Admins own users, roles, and manager assignments.

---

## Quick reference

| Step | User | Focus |
|------|------|--------|
| 1 | team1-manager@example.com | Strategy = RCDO source of truth |
| 2 | team1-e1@example.com | My Week: add items (RCDO + chess), submit → lock |
| 3 | team1-e1@example.com | Reconcile: completion status, carry forward, complete |
| 4 | team1-manager@example.com | My Team: alignment, drill into commit, Outcome Pulse, integrity |
| 5 | admin@example.com | Admin: users, roles, managers |

---

## Closing line

*"So we have: RCDO-linked commits, chess prioritization, full lifecycle with reconciliation and carry-forward, manager dashboard with alignment and outcome visibility, and a micro-frontend that plugs into the host — TypeScript strict and Java 21 as specified."*

---

## Demo logins (quick copy)

| Role | Email | Use |
|------|--------|-----|
| Team 1 Manager | team1-manager@example.com | Strategy, My Team |
| Team 1 Employee 1 | team1-e1@example.com | My Week, reconciliation |
| Admin | admin@example.com | Optional admin step |

Password / OAuth: use your mock OAuth or local auth flow (see README / `.env`).
