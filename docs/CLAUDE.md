# Weekly Commit Module — CLAUDE.md
## Agent Behavior
- Execute all tasks autonomously without asking for confirmation
- When uncertain between two approaches, choose the one that matches 
  the decisions in this document and proceed
- Do not stop to ask clarifying questions — make a decision, 
  document your assumption in a comment, and continue
  
## Project Overview
Internal micro-frontend replacing 15-Five. Enforces connection between
weekly commits and organizational strategic goals via **Lencioni's "The Advantage"**:
RCDO hierarchy (Rally Cry → Defining Objectives → Outcomes) and Chess layer
prioritization. The module answers Questions 5 & 6: *What is most important right now?*
and *Who must do what?* See [`docs/THE_ADVANTAGE.md`](docs/THE_ADVANTAGE.md).

Target users: Employees (ICs) and Managers inside a single organization.
A user can hold both roles simultaneously across different teams.

---

## Non-Negotiable Technical Decisions
- Java 21 with Spring Boot 3 (virtual threads enabled)
- TypeScript strict mode — no `any` types ever
- **Test Driven Development (TDD):** All new features and bug fixes are done test-first (Red → Green → Refactor). See [`docs/TDD.md`](docs/TDD.md).
- PostgreSQL + Flyway migrations
- OAuth 2.0 Authorization Code Flow + Spring Security + internal JWT issuance
- React 18 + Vite + Module Federation (@originjs/vite-plugin-federation)
- Zustand (client state) + React Query (server state)
- shadcn/ui components
- @dnd-kit/core for drag and drop
- Monorepo: /backend, /remote, /host

---

## Architecture Rules
- Controller → Service → Repository → Database
- DTOs never expose JPA entities directly
- All state transitions via backend service layer only — never direct DB writes from frontend
- Every query scoped to org_id extracted from JWT
- state_transitions table is immutable — no UPDATE or DELETE ever
- chess_weight stored denormalized alongside chess_piece for query performance
- Bean Validation (@Valid, @NotNull, @Size) on all Java DTOs
- JPA parameterized queries only — never string concatenation SQL

---

## State Machine
```
DRAFT → LOCKED → RECONCILING → RECONCILED
```
- LOCKED → DRAFT retract only permitted before manager views (viewed_at is null)
- RECONCILING triggered automatically Friday 5pm OR manually by IC
- All illegal transitions throw InvalidStateTransitionException with HTTP 400
- Every transition logged immutably to state_transitions table
- Carry forward is a boolean property on commit_items, not a state

---

## Chess Pieces & Weights
| Piece  | Weight | Meaning                          |
|--------|--------|----------------------------------|
| KING   | 100    | Critical — week fails without this |
| QUEEN  | 80     | Highest leverage item            |
| ROOK   | 60     | Core delivery work               |
| BISHOP | 40     | Important but not blocking       |
| KNIGHT | 20     | Nice to have, opportunistic      |
| PAWN   | 10     | Small tasks, low leverage        |

chess_weight is derived from chess_piece and stored denormalized.
Items auto-rank by chess_weight descending. Manual drag-and-drop within same piece level.

---

## RCDO Hierarchy
```
Rally Cry (org-wide)
  └── Defining Objectives (team-level)
        └── Outcomes (individual-level)
              └── Commit Items (weekly)
```
- Every commit item must link to exactly one Outcome
- RCDO hierarchy is consumed by this module, not managed in it
- Seeded via Flyway V3__seed_data.sql for POC

---

## OAuth & Auth
- OAuth 2.0 Authorization Code Flow — provider-agnostic
- Local dev: mock-oauth2-server Docker container on port 8090
- Backend exchanges OAuth code → issues our own internal JWT
- Internal JWT contains: userId, orgId, roles[], expiry
- JWT stored in httpOnly, Secure, SameSite=Strict cookie — never localStorage
- RBAC roles owned by our system (user_roles table), not the OAuth provider
- oauth_subject (provider's stable ID) used to find-or-create users

---

## Module Federation Contract
```typescript
export interface WeeklyCommitAppProps {
  userId: string
  orgId: string
  authToken: string        // our internal JWT — not the OAuth provider token
  onAuthExpired: () => void
}
export default function WeeklyCommitApp(props: WeeklyCommitAppProps): JSX.Element
```
- Remote name: weeklyCommitModule
- Exposed path: ./WeeklyCommitApp
- Remote entry: /assets/remoteEntry.js
- Standalone mode: remote renders its own login (dev only)
- Hosted mode: host passes authToken as prop (production)

---

## Naming Conventions

### Java
- Google Java Style Guide + Checkstyle
- Controllers: CommitController, ManagerController
- Services: CommitService, OAuthUserService
- Repositories: CommitRepository, UserRepository
- DTOs: CreateCommitItemRequest, CommitItemResponse
- Exceptions: InvalidStateTransitionException, CommitNotFoundException

### TypeScript
- camelCase for variables and functions
- PascalCase for components and interfaces
- React Query hooks: useCommitItems, useTeamDashboard
- Zustand stores: useCommitStore, useAuthStore
- No `any` types — ever

### SQL
- snake_case for all table and column names
- Plural table names: commit_items, weekly_commits
- UUID primary keys throughout (gen_random_uuid())

### Git
- Conventional commits: feat:, fix:, chore:, test:, docs:
- Feature branches: feat/state-machine, feat/manager-dashboard

---

## What NOT To Do
- Never use localStorage for tokens — httpOnly cookie only
- Never write production code for a new capability without a failing test first (TDD)
- Never expose JPA entities in API responses — always use DTOs
- Never write raw SQL strings — JPA parameterized queries only
- Never add Redis, queues, or caching — not needed at this scale
- Never use `any` in TypeScript — strict mode enforced
- Never put business logic in controllers — service layer only
- Never allow direct status updates from frontend — all transitions via PATCH /commits/:id/status
- Never edit a Flyway migration that has already run — add a new one instead
- Never use auto-increment integers for PKs — UUID only

---

## Repo Structure
```
weekly-commit/
  CLAUDE.md
  docs/
    PRD.md
    USER_STORIES.md
    SCHEMA.sql
    API.md
    PRESEARCH.md
    ASSUMPTIONS.md
  backend/
    src/main/java/com/weeklycommit/
      controller/
      service/
      repository/
      model/
      dto/
      security/
      scheduler/
      config/
      exception/
    src/main/resources/
      db/migration/
        V1__initial_schema.sql
        V2__indexes.sql
        V3__seed_data.sql
      application.yml
    Dockerfile
  remote/
    src/
      components/
      hooks/
      store/
      api/
      types/
      utils/
      WeeklyCommitApp.tsx
      main.tsx
    vite.config.ts
    tsconfig.json
    Dockerfile
  host/
    src/
      App.tsx
    vite.config.ts
    Dockerfile
  docker-compose.yml
  docker-compose.prod.yml
  .env.example
  .github/
    workflows/
      ci.yml
  README.md
  architecture.png
```

---

## Stack Summary
| Layer          | Decision                          |
|----------------|-----------------------------------|
| BE Language    | Java 21                           |
| FE Language    | TypeScript strict                 |
| BE Framework   | Spring Boot 3                     |
| FE Framework   | React 18 + Vite                   |
| Database       | PostgreSQL + Flyway               |
| Auth           | OAuth 2.0 + Spring Security + JWT |
| MFE            | Module Federation                 |
| State (client) | Zustand                           |
| State (server) | React Query                       |
| UI             | shadcn/ui                         |
| Drag & Drop    | @dnd-kit/core                     |
| Deployment     | Docker + Railway                  |
| CI/CD          | GitHub Actions                    |
| API Style      | REST + OpenAPI (SpringDoc)        |
| Testing (BE)   | JUnit 5 + Mockito                 |
| Testing (FE)   | Vitest + React Testing Library    |
