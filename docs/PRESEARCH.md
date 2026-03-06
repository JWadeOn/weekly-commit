# Pre-Search Checklist
## Weekly Commit Module — v1.2

---

## Phase 1: Define Your Constraints

### 1. Scale & Load Profile
- **Launch:** 10–100 users (internal org tool)
- **6 months:** Up to 500 users
- **Traffic:** Spiky — Monday morning (commit creation), Friday afternoon (reconciliation), light midweek reads
- **Real-time:** Soft — polling every 30 seconds on manager dashboard. WebSockets overkill.
- **Cold start:** Tolerated. Internal enterprise tool.
- **Decision:** Standard HikariCP connection pooling. Spring @Scheduled for Monday/Friday jobs. No queue needed.

### 2. Budget & Cost Ceiling
- Gauntlet compute covered by hiring partners
- Managed Postgres on Railway — free/starter tier
- Total estimated monthly cost: Under $20
- **Decision:** Optimize for developer velocity and production credibility, not cost

### 3. Time to Ship
- Day 1 EOD: MVP (critical path end-to-end)
- Day 3 EOD: Production-grade full feature set deployed
- **Decision:** Boring, reliable, well-documented technology. Agent produces better output on conventional patterns.

### 4. Compliance & Regulatory Needs
- **HIPAA:** No
- **GDPR:** Phase 2 — document as future requirement
- **SOC 2:** Immutable state transition audit log directly supports future SOC 2 Type II. Call out in architecture diagram.
- **Data residency:** Not applicable for POC

### 5. Team & Skill Constraints
- Solo builder, AI-first engineering
- Strong: TypeScript, React, Docker, Auth patterns
- Non-negotiable: TypeScript strict, Java 21, SQL
- Learning via agent: Spring Boot 3, Module Federation
- **Decision:** Most conventional patterns in every layer for maximum agent output quality

---

## Phase 2: Architecture Discovery

### 6. Hosting & Deployment
**Decision: Docker + Railway**

Local docker-compose services:
- backend (Spring Boot 3, port 8080)
- remote (Vite React MFE, port 3001)
- host (Mock PA host, port 3000)
- postgres (port 5432)
- mock-oauth2 (port 8090)

Production: Three Railway services (backend, remote, host) + managed Postgres.
CI/CD: GitHub Actions — build → test → deploy on push to main.

Scaling (for architecture diagram):
- Spring Boot scales horizontally behind load balancer
- Vite static builds served via CDN
- Postgres scales vertically then read replicas

### 7. Authentication & Authorization
**Decision: OAuth 2.0 Authorization Code Flow + Spring Security + Internal JWT**

Why OAuth: Provider owns identity — eliminates login UI, password hashing, password reset, brute force protection. Saves 4–6 hours redirected to product features. Matches hiring partner's infrastructure.

Auth flow:
1. User clicks Sign In
2. Frontend redirects to OAuth provider (config-driven)
3. User authenticates with provider
4. Provider redirects back with authorization code
5. Backend /api/auth/callback exchanges code, finds/creates user, issues internal JWT
6. JWT stored in httpOnly, Secure, SameSite=Strict cookie

Why internal JWT after OAuth:
- RBAC roles live in our DB, not provider
- Props contract stays clean — host passes our JWT
- Swapping providers = config change only

Local dev: mock-oauth2-server (Docker, ghcr.io/navikt/mock-oauth2-server:2.1.0)
Real OAuth flow locally — real redirects, real token exchange.

Provider-agnostic config via environment variables:
- OAUTH_CLIENT_ID
- OAUTH_CLIENT_SECRET
- OAUTH_ISSUER_URI
- OAUTH_REDIRECT_URI

Provider swap reference:
- Google: OAUTH_ISSUER_URI=https://accounts.google.com
- Azure AD: OAUTH_ISSUER_URI=https://login.microsoftonline.com/{tenant}/v2.0
- Okta: OAUTH_ISSUER_URI=https://{domain}.okta.com

RBAC: Two roles (EMPLOYEE, MANAGER) in user_roles table owned by our system.
Dual role: Both roles in JWT claims, both views available in same session.
oauth_subject (stable provider ID) used to find-or-create users.

Security:
- httpOnly, Secure, SameSite=Strict cookie (never localStorage)
- Spring Security @PreAuthorize on every endpoint
- org_id scoping on every query
- state_transitions immutable
- PKCE + state parameter validation

### 8. Database & Data Layer
**Decision: PostgreSQL + Flyway + JPA/Hibernate**

Flyway: Versioned SQL migration files. Every environment gets identical schema on startup automatically. Never edit a migration that has already run — add a new one.

Key schema decisions:
- UUID PKs throughout (gen_random_uuid())
- org_id on every table for multi-tenancy support
- chess_weight stored denormalized alongside chess_piece for query performance
- state_transitions immutable — no UPDATE/DELETE permissions for app DB user
- carry_forward_count tracks how many times an item has been carried
- carried_from_id traces lineage of carried items
- viewed_at on weekly_commits tracks when manager first viewed (disables retract)
- UNIQUE constraint on (user_id, week_start_date) prevents duplicate weeks

Read/write ratio: Mostly reads on manager dashboard, writes Monday/Friday. HikariCP default handles trivially.
Caching: Not needed. No Redis.

### 9. Backend/API Architecture
**Decision: Spring Boot 3 monolith, REST, OpenAPI**

Java 21 virtual threads (one-line config):
```yaml
spring.threads.virtual.enabled: true
```

Layers: Controller → Service → Repository → Database
DTOs never expose JPA entities.
OpenAPI via SpringDoc at /swagger-ui.html.

Background jobs via Spring @Scheduled:
- Monday 6am: create DRAFT commits for all active users
- Friday 5pm: transition LOCKED → RECONCILING
- Post-RECONCILED: seed carry-forward items (idempotent)

### 10. Frontend Framework & Rendering
**Decision: React 18 + TypeScript strict + Vite + Module Federation**

Why Vite: Faster than Webpack. @originjs/vite-plugin-federation handles MFE cleanly.
Why React SPA: No SSR needed. Internal tool, no SEO. Simpler MFE config than Next.js.

Module Federation:
- Remote exposes: ./WeeklyCommitApp via remoteEntry.js
- Host loads remote at runtime — independently deployable
- Remote entry URL configurable via env var

State: Zustand (client) + React Query (server)
UI: shadcn/ui
Drag & Drop: @dnd-kit/core
Icons: Lucide React
Dates: date-fns

TypeScript strict tsconfig:
- strict: true
- noImplicitAny: true
- strictNullChecks: true
- noUncheckedIndexedAccess: true

### 11. Third-Party Integrations
| Service        | Decision               | Reason                          |
|----------------|------------------------|---------------------------------|
| Auth           | OAuth 2.0 + Spring Security | Provider-agnostic, HP requirement |
| OAuth (local)  | mock-oauth2-server     | Real flow, swap via config      |
| UI Components  | shadcn/ui              | Production quality              |
| Drag & Drop    | @dnd-kit/core          | Modern, accessible, maintained  |
| API Client     | Axios + React Query    | Type-safe, caching              |
| Icons          | Lucide React           | Chess pieces + UI               |
| Dates          | date-fns               | Lightweight, tree-shakeable     |
| Notifications  | None (Phase 2)         | Out of scope                    |

No vendor lock-in. Every dependency replaceable.

---

## Phase 3: Post-Stack Refinement

### 12. Security Vulnerabilities
| Vulnerability          | Mitigation                                          |
|------------------------|-----------------------------------------------------|
| Token storage          | httpOnly, Secure, SameSite=Strict cookie            |
| SQL injection          | JPA parameterized queries only                      |
| CORS                   | Explicit allowed origins in Spring Security config  |
| State machine bypass   | All transitions via backend service only            |
| Input validation       | Bean Validation on all Java DTOs                    |
| Unauthorized access    | org_id scoping on every query                       |
| Audit log tampering    | No UPDATE/DELETE on state_transitions               |
| XSS                    | React escaping + Content-Security-Policy header     |
| Mass assignment        | DTOs never expose JPA entities                      |
| OAuth interception     | PKCE + state parameter validation                   |

### 13. File Structure
Monorepo — single repo, three deployable units.

```
weekly-commit/
  CLAUDE.md
  docs/
  backend/
    src/main/java/com/weeklycommit/
      controller/ service/ repository/ model/
      dto/ security/ scheduler/ config/ exception/
    src/main/resources/
      db/migration/ (V1, V2, V3)
      application.yml
    Dockerfile
  remote/
    src/ (components/ hooks/ store/ api/ types/ utils/)
    WeeklyCommitApp.tsx
    main.tsx
    vite.config.ts / tsconfig.json / Dockerfile
  host/
    src/App.tsx
    vite.config.ts / Dockerfile
  docker-compose.yml
  docker-compose.prod.yml
  .env.example
  .github/workflows/ci.yml
  README.md
  architecture.png
```

### 14. Naming Conventions
Java: Google Style Guide + Checkstyle. CommitController, CommitService, CommitRepository. DTOs: CreateCommitItemRequest, CommitItemResponse. Exceptions: InvalidStateTransitionException.

TypeScript: camelCase vars, PascalCase components. Hooks: useCommitItems, useTeamDashboard. Stores: useCommitStore, useAuthStore. No `any` ever.

SQL: snake_case, plural tables, UUID PKs.

Git: Conventional commits (feat:, fix:, chore:, test:, docs:)

### 15. Testing Strategy
Philosophy: Test highest-risk logic thoroughly. Don't chase coverage %.

Highest-risk:
1. State machine transitions
2. Chess weight ranking + alignment score
3. Carry forward seeding idempotency
4. OAuth callback + JWT issuance
5. Module Federation contract

Backend (JUnit 5 + Mockito):
- CommitServiceTest: all legal/illegal transitions, retract-after-viewed, alignment score, carry forward idempotency
- OAuthCallbackTest: valid/invalid codes, find-or-create user
- CommitControllerTest: role enforcement, cross-user access prevention, 401 on no JWT

Frontend (Vitest + RTL):
- StateMachine.test.tsx: submit disabled without complete items, retract disabled after viewed
- ChessLayer.test.tsx: auto-ranking, weight summary, soft warning

Integration: One full weekly lifecycle E2E test.

Coverage targets:
- State machine service: 100%
- Alignment score calculation: 100%
- OAuth callback: 100%
- Everything else: best effort

### 16. Recommended Tooling
- Claude Code: primary coding agent
- Docker Desktop: full stack locally
- IntelliJ IDEA Community: Java + Spring Boot
- VS Code: TypeScript frontend
- TablePlus: Postgres inspection
- REST Client (.http files committed to repo)
- Swagger UI at /swagger-ui.html

---

## Final Stack Decision Summary
| Layer          | Decision                              | Rationale                          |
|----------------|---------------------------------------|------------------------------------|
| BE Language    | Java 21                               | Required by spec                   |
| FE Language    | TypeScript strict                     | Required by spec                   |
| Database       | PostgreSQL + Flyway                   | Required recommendation            |
| BE Framework   | Spring Boot 3                         | Canonical Java 21                  |
| Java 21 feat   | Virtual threads                       | One-line, signals modern Java      |
| FE Framework   | React 18 + Vite                       | No SSR needed, MFE-friendly        |
| MFE            | Module Federation                     | Required by spec                   |
| State (client) | Zustand                               | Lightweight, TS-native             |
| State (server) | React Query                           | Caching + background refresh       |
| UI             | shadcn/ui                             | Production quality                 |
| Drag & Drop    | @dnd-kit/core                         | Modern, accessible                 |
| Auth           | OAuth 2.0 + Spring Security + JWT     | Provider-agnostic, HP requirement  |
| OAuth (local)  | mock-oauth2-server                    | Real flow locally                  |
| Deployment     | Docker + Railway                      | Fast, real production URL          |
| CI/CD          | GitHub Actions                        | Simple, free, Railway integration  |
| API style      | REST + OpenAPI                        | Simple, auto-documented            |
| Testing (BE)   | JUnit 5 + Mockito                     | Java standard                      |
| Testing (FE)   | Vitest + RTL                          | Vite-native                        |
| Scheduling     | Spring @Scheduled                     | Built-in, no extra infra           |
| Repo           | Monorepo                              | One docker-compose up              |

---

## The Demo Line
*"Switching from our mock OAuth provider to your real provider
is four environment variables. No code changes."*
