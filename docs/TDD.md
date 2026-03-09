# Test Driven Development (TDD) — Weekly Commit Module

This project follows **Test Driven Development**: write a failing test first, implement the minimum code to pass, then refactor. All new features and bug fixes in the completion plan are done in this order.

---

## 1. The TDD Cycle

| Step | Action | Outcome |
|------|--------|---------|
| **Red** | Write a test that defines the desired behavior. Run it — it must fail (or the test is redundant). | Failing test |
| **Green** | Implement the smallest change that makes the test pass. No extra behavior. | Passing test |
| **Refactor** | Improve implementation and test code (naming, structure, duplication). Tests stay green. | Clean code |

Repeat for each discrete behavior. One or a few tests per cycle; keep cycles short.

---

## 2. When to Write Tests

- **New feature:** Write tests first (acceptance/unit level). Then implement until green, then refactor.
- **Bug fix:** Write a test that reproduces the bug (fails). Fix the code until the test passes. Then refactor if needed.
- **Refactor:** Existing tests protect behavior. Add tests for any edge cases you’re about to change, then refactor.

**No production code for a new capability without a failing test.** If you find yourself writing implementation before a test, stop and add the test first.

---

## 3. Backend (Java / Spring Boot)

**Stack:** JUnit 5, Mockito, Spring Boot Test (e.g. `@WebMvcTest`, `@DataJpaTest` when needed).

### 3.1 Unit tests (service layer)

- **Location:** `backend/src/test/java/com/weeklycommit/service/` — e.g. `CommitServiceTest`, `StateMachineServiceTest`, `ManagerServiceTest`.
- **Style:** Test one class; mock its dependencies (repositories, other services). No database unless testing repository logic.
- **Naming:** `methodName_scenario_expectedResult` or `should_expectedResult_when_scenario` (pick one and stick to it).
- **Arrange–Act–Assert:** Set up mocks and data, call the method under test, assert outcomes and interactions.

**Example (TDD for a new method):**

1. **Red:** In `CommitServiceTest`, add `reconcileItem_whenCommitNotReconciling_throwsInvalidStateTransitionException()`, call `commitService.reconcileItem(...)` with a DRAFT commit — expect exception. Run → fails (method doesn’t exist or doesn’t throw).
2. **Green:** Implement `reconcileItem` in `CommitService` to check status and throw when not RECONCILING. Run → passes.
3. **Refactor:** Extract status check if useful; rename for clarity.

### 3.2 Controller / API tests

- **Use** `@WebMvcTest(CommitController.class)` (or relevant controller), mock the service, test HTTP status, body, and error codes.
- **TDD for new endpoints:** Write test that calls the new endpoint with valid/invalid payload and asserts response; then add the endpoint and service method.

### 3.3 What to test

- **State machine:** Every allowed transition and every disallowed transition (wrong state, missing items, viewed_at set, etc.).
- **Reconciliation:** Reconcile item only in RECONCILING; carryForward only for PARTIAL/NOT_COMPLETED; complete reconciliation requires all items have status; carry-forward seeding creates items and is idempotent.
- **Alignment:** Computation (aligned weight / total weight × 100) and where it’s returned (toWeekResponse, history, manager team).
- **Authorization:** Access to another user’s commit returns 403; manager can only see direct reports.

---

## 4. Frontend (React / TypeScript)

**Stack:** Vitest, React Testing Library (RTL), MSW (optional, for API mocking).

### 4.1 Component / integration tests

- **Location:** `remote/src/**/*.test.tsx` next to the component or in a `__tests__` folder.
- **Style:** Test behavior the user cares about (clicks, form submit, displayed content), not implementation details. Use `screen.getByRole`, `getByLabelText`, `getByText`; avoid relying on class names or internal state.
- **Mock API:** Mock the API client (e.g. `vi.mock('@/api/client')`) or use MSW handlers so components receive predictable data.

**Example (TDD for reconciliation UI):**

1. **Red:** In `CommitDetailPage.test.tsx`, render with a RECONCILING commit and mock items; assert "Complete reconciliation" button is present and that each item has a completion status control. Run → fails (component doesn’t show reconciliation UI yet).
2. **Green:** Add RECONCILING branch in `CommitDetailPage`, two-column layout, status select per item, "Complete reconciliation" button. Run → passes.
3. **Refactor:** Extract subcomponents or hooks; keep tests green.

### 4.2 What to test

- **Commit page:** Add item opens modal and creates item; submit week with invalid data shows validation; submit with valid data transitions to LOCKED; retract disabled when viewed.
- **Reconciliation:** RECONCILING shows planned vs actual; carry-forward toggle only for PARTIAL/NOT_COMPLETED; complete reconciliation disabled until all items have status.
- **Manager dashboard:** Team list shows members and status; low alignment warning when score &lt; 70%; "View Commit" navigates and loads commit.

---

## 5. Integration with the Completion Plan

The [COMPLETION_PLAN](COMPLETION_PLAN.md) is written so that **for each feature or fix, the first task is to add or update tests**. Phases 1–4 use this pattern:

- **Phase 1:** Tests for alignment score behavior and (if changing path) manager notes API contract; then implementation.
- **Phase 2:** Tests for reconcile endpoints (status checks, validation, carry-forward seeding); then controller + service; then frontend tests for reconciliation UI, then UI implementation.
- **Phase 3:** Tests for scheduler behavior (e.g. with fixed clock or test job invocation); tests for team alignment response shape; then implementation.
- **Phase 4:** Broader test coverage and CI running all tests; error-handling behavior covered by tests.

When in doubt: **Red first, then Green, then Refactor.**

---

## 6. Running Tests

- **Backend:** `cd backend && ./mvnw test`
- **Frontend:** `cd remote && npm test` (or `npm run test:run` for CI)
- **Both:** Run before every commit; CI should run both on push.

---

## 7. References

- [COMPLETION_PLAN](COMPLETION_PLAN.md) — Task checklists with test-first steps  
- [PRD](PRD.md) — Behavior to encode in tests  
- [CLAUDE](CLAUDE.md) — Project rules (TDD is non-negotiable for new work)
