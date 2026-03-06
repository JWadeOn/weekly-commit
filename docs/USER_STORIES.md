# User Stories
## Weekly Commit Module — Production Grade v1.1

---

## Epic 1: Authentication & Authorization

**US-101**
As an employee, I want to log in with my email and password so that I can access my weekly commits securely.

**US-102**
As a manager, I want to log in with my email and password so that I can access my team's dashboard securely.

**US-103**
As a dual-role user, I want to see both "My Week" and "My Team" navigation after logging in so that I can switch between my IC and manager responsibilities without re-authenticating.

**US-104**
As any user, I want to be redirected to the login page when my session expires so that I am never stuck in a broken authenticated state.

**US-105**
As any user, I want my auth token to be stored securely so that my session cannot be hijacked by malicious scripts.

**US-106**
As any user, I want role-based access enforced on every page and API route so that I can never access functionality outside my permissions.

---

## Epic 2: RCDO Hierarchy

**US-201**
As an employee, I want to see the full RCDO hierarchy when linking a commit item so that I understand how my work connects to organizational strategy.

**US-202**
As an employee, I want to see the full breadcrumb (Rally Cry → Objective → Outcome) on each commit item so that I always know what strategic goal my work supports.

**US-203**
As a manager, I want to see the RCDO breadcrumb on my team's commit items so that I can quickly assess whether their work is strategically aligned.

**US-204**
As an employee, I want the RCDO outcome selector to be searchable so that I can quickly find the right outcome without scrolling through the entire hierarchy.

**US-205**
As any user, I want the RCDO hierarchy to always reflect the current organizational structure so that my commits are always linked to active goals.

---

## Epic 3: Chess Layer

**US-301**
As an employee, I want to assign a chess piece to each commit item so that I can communicate the relative priority and leverage of each piece of work.

**US-302**
As an employee, I want my commit items to automatically rank by chess weight so that my most critical work always appears at the top without manual reordering.

**US-303**
As an employee, I want to drag and drop items within the same chess piece level so that I can fine-tune priority among equally weighted items.

**US-304**
As an employee, I want to see a weekly weight summary at the top of my commit view so that I can assess whether my week is appropriately loaded with high-leverage work.

**US-305**
As an employee, I want to see a soft warning when I have no Kings or Queens assigned so that I am prompted to reconsider whether my week is focused on the right things.

**US-306**
As a manager, I want to see each team member's chess weight distribution so that I can identify who is overloaded with low-leverage work.

**US-307**
As a manager, I want to see each team member's alignment score so that I can immediately spot who has high-weight items not connected to strategic goals.

**US-308**
As a manager, I want to see a 🚨 warning on any team member whose alignment score falls below 70% so that I can intervene before the week is wasted on misaligned work.

**US-309**
As an employee, I want to see a tooltip explaining each chess piece and its weight when selecting one so that I always make an informed prioritization decision.

**US-310**
As a manager, I want the alignment score threshold to be configurable so that my organization can set a standard that reflects our operational maturity.

---

## Epic 4: Commit Entry

**US-401**
As an employee, I want a current week view to be automatically created for me every Monday so that I never have to manually start a new week.

**US-402**
As an employee, I want to see the current week date range prominently displayed so that I always know which week I am planning for.

**US-403**
As an employee, I want to create a commit item with a title, description, RCDO outcome link, and chess piece so that I can fully describe and contextualize my planned work.

**US-404**
As an employee, I want to edit a commit item inline so that I can quickly update my plans without navigating away from the current week view.

**US-405**
As an employee, I want to delete a commit item so that I can remove work that is no longer relevant.

**US-406**
As an employee, I want the system to prevent me from saving a commit item without an RCDO link and chess piece so that every item is always fully contextualized.

**US-407**
As an employee, I want to see a clear empty state with a call to action when I have no commit items so that I always know what to do next.

**US-408**
As an employee, I want to see a history of my past weeks so that I can reference previous commits when planning the current week.

**US-409**
As an employee, I want all changes to my commit items saved automatically so that I never lose work due to accidental navigation.

---

## Epic 5: Weekly Lifecycle — Submit & Lock

**US-501**
As an employee, I want to submit my week by clicking "Submit Week" so that I can signal to my manager that my commits are finalized.

**US-502**
As an employee, I want a confirmation dialog before submitting so that I don't accidentally lock my week before I'm ready.

**US-503**
As an employee, I want the system to validate that all items have an RCDO link and chess piece before allowing submission so that I never submit an incomplete week.

**US-504**
As an employee, I want to see my week status change to LOCKED immediately after submitting so that I have clear confirmation my submission was received.

**US-505**
As an employee, I want to retract my submission while my manager hasn't viewed it yet so that I can make last-minute changes if needed.

**US-506**
As an employee, I want to see the retract button disabled with a clear explanation once my manager has viewed my commit so that I understand why I can no longer make changes.

**US-507**
As an employee, I want to be prevented from editing commit items once my week is LOCKED so that my submission remains trustworthy to my manager.

**US-508**
As an employee, I want to see a clear timestamp of when I submitted my week so that I have a record of my planning cadence.

---

## Epic 6: Weekly Lifecycle — Reconciliation

**US-601**
As an employee, I want my week to automatically enter RECONCILING state on Friday at 5pm so that I am prompted to reflect on my week without having to remember to do it manually.

**US-602**
As an employee, I want to manually trigger reconciliation before Friday if my week is complete so that I don't have to wait for the scheduled trigger.

**US-603**
As an employee, I want to see a two-column planned vs. actual view during reconciliation so that I can clearly compare what I intended to do versus what I actually did.

**US-604**
As an employee, I want to write my actual outcome for each commit item during reconciliation so that I can capture what really happened.

**US-605**
As an employee, I want to mark each item as COMPLETED, PARTIAL, or NOT_COMPLETED during reconciliation so that my manager has a clear picture of my week's output.

**US-606**
As an employee, I want to toggle Carry Forward on PARTIAL and NOT_COMPLETED items so that unfinished work automatically appears in next week's plan.

**US-607**
As an employee, I want the system to prevent me from completing reconciliation until all items have a completion status so that my reconciliation is always complete.

**US-608**
As an employee, I want to see a post-reconciliation summary showing completed, partial, not completed, and carried forward counts so that I can reflect on my week at a glance.

**US-609**
As an employee, I want my reconciliation progress saved automatically so that I never lose partial reconciliation work if I navigate away.

**US-610**
As an employee, I want to see a notification reminding me to reconcile if I haven't done so by Friday EOD so that I never miss closing out a week.

---

## Epic 7: Carry Forward

**US-701**
As an employee, I want carried-forward items to automatically appear in my next week's DRAFT so that I never lose track of unfinished work.

**US-702**
As an employee, I want carried-forward items to display a visual "Carried Forward" badge so that I can distinguish them from newly created items.

**US-703**
As an employee, I want carried-forward items to retain their title, description, RCDO link, and chess piece so that I don't have to re-enter context I already provided.

**US-704**
As an employee, I want carried-forward items to have their actual outcome, completion status, and priority order reset so that I'm starting fresh on each item for the new week.

**US-705**
As an employee, I want to see how many times an item has been carried forward so that I can recognize chronically incomplete work and address it.

**US-706**
As a manager, I want to see carried-forward items flagged on my team's commits so that I can identify persistent blockers or scope issues across my team.

---

## Epic 8: Manager Dashboard

**US-801**
As a manager, I want to see all my direct reports listed on my dashboard so that I have a single view of my entire team's weekly planning status.

**US-802**
As a manager, I want to see each team member's commit status as a color-coded badge so that I can assess team readiness at a glance.

**US-803**
As a manager, I want to sort my team list by name, status, item count, alignment score, and last updated so that I can quickly find who needs attention.

**US-804**
As a manager, I want to click into a team member's commit and see all their items with chess pieces and RCDO breadcrumbs so that I can do a meaningful review.

**US-805**
As a manager, I want viewing a team member's commit to automatically disable their retract ability so that reviewed commits remain stable.

**US-806**
As a manager, I want to see a team alignment view showing how my team's collective commits map to Rally Cries so that I can assess strategic alignment at the team level.

**US-807**
As a manager, I want to see the weight-adjusted alignment percentage for my team so that I know whether high-leverage work is pointed at the right goals.

**US-808**
As a manager, I want to see the planned vs. actual comparison for each team member after reconciliation so that I can conduct meaningful 1:1 conversations grounded in data.

**US-809**
As a manager, I want to see a trend of each team member's alignment score over the past 4 weeks so that I can identify improving or declining patterns before they become problems.

**US-810**
As a manager, I want to see which Rally Cries are under-supported by my team this week so that I can redirect focus before the week is underway.

**US-811**
As a manager, I want to be notified when a team member has not submitted their week by a configurable deadline so that I can follow up proactively.

**US-812**
As a manager, I want to add a note to a team member's commit review so that I can provide async feedback without requiring a meeting.

---

## Epic 9: Micro-Frontend Integration

**US-901**
As the PA host app, I want to load the Weekly Commit Module remotely at runtime via Module Federation so that the module can be deployed and updated independently without redeploying the host.

**US-902**
As the PA host app, I want to pass userId, orgId, authToken, and onAuthExpired as props to the Weekly Commit Module so that the module operates within the host's auth context.

**US-903**
As a developer, I want the Weekly Commit Module to run in standalone mode with its own login page so that I can develop and test it independently of the host app.

**US-904**
As a developer, I want a mock PA host app that loads the remote at runtime so that I can demonstrate and validate the full Module Federation integration pattern.

**US-905**
As the PA host app, I want the Weekly Commit Module to handle its own internal routing so that navigation within the module does not conflict with the host app's router.

**US-906**
As a developer, I want the remote entry URL to be configurable via environment variable so that the same host build can point to dev, staging, or production remotes.

---

## Epic 10: Observability & Reliability

**US-1001**
As a developer, I want every state transition logged immutably with from_state, to_state, actor, and timestamp so that I have a complete audit trail for debugging and compliance.

**US-1002**
As a developer, I want all API errors to return a structured error code and human-readable message so that frontend error handling is consistent and debuggable.

**US-1003**
As a developer, I want all state transitions to be atomic so that a partial failure never leaves a commit in an inconsistent state.

**US-1004**
As a developer, I want carry forward seeding to be idempotent so that running the job twice never creates duplicate items.

**US-1005**
As a developer, I want structured logs on all state transitions captured by Docker so that production issues are diagnosable without additional tooling.

**US-1006**
As a developer, I want all drag-and-drop priority reordering to use optimistic UI updates so that the interface feels instant regardless of network latency.

**US-1007**
As a developer, I want the scheduled Friday reconciliation trigger to be idempotent so that running it multiple times in a day never creates duplicate state transitions.

**US-1008**
As a developer, I want all forms to auto-save in the background so that no user ever loses work due to accidental navigation or session expiry.
