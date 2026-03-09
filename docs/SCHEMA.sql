-- ============================================================
-- Weekly Commit Module — Database Schema
-- Flyway Migrations V1, V2, V3
-- ============================================================
--
-- Hierarchy aligns with Lencioni's "The Advantage" Playbook:
--   Rally Cry (Thematic Goal) → Defining Objectives → Outcomes → Commit Items
-- Standard Operating Objectives (SOOs) are not yet modeled; see docs/THE_ADVANTAGE.md.
-- ============================================================

-- ============================================================
-- V1__initial_schema.sql
-- ============================================================

CREATE TABLE organizations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 VARCHAR NOT NULL,
  alignment_threshold  INTEGER DEFAULT 70,
  created_at           TIMESTAMP DEFAULT NOW()
);

CREATE TABLE users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID NOT NULL REFERENCES organizations(id),
  email          VARCHAR UNIQUE NOT NULL,
  full_name      VARCHAR NOT NULL,
  oauth_subject  VARCHAR UNIQUE NOT NULL,
  manager_id     UUID REFERENCES users(id),
  created_at     TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_roles (
  user_id  UUID NOT NULL REFERENCES users(id),
  role     VARCHAR NOT NULL CHECK (role IN ('EMPLOYEE', 'MANAGER')),
  PRIMARY KEY (user_id, role)
);

CREATE TABLE rally_cries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id),
  title       VARCHAR NOT NULL,
  description TEXT,
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMP DEFAULT NOW()
);
-- Rally Cry = Lencioni "Thematic Goal" — single most important org priority (typically 3–12 months)

CREATE TABLE defining_objectives (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rally_cry_id  UUID NOT NULL REFERENCES rally_cries(id),
  title         VARCHAR NOT NULL,
  description   TEXT,
  active        BOOLEAN DEFAULT true,
  created_at    TIMESTAMP DEFAULT NOW()
);
-- Defining Objectives (DOs) = 4–6 categories of work that achieve the Rally Cry. SOOs (KTLO) not in schema yet.

CREATE TABLE outcomes (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  defining_objective_id  UUID NOT NULL REFERENCES defining_objectives(id),
  owner_id               UUID NOT NULL REFERENCES users(id),
  title                  VARCHAR NOT NULL,
  description            TEXT,
  active                 BOOLEAN DEFAULT true,
  created_at             TIMESTAMP DEFAULT NOW()
);

CREATE TABLE weekly_commits (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id),
  org_id           UUID NOT NULL REFERENCES organizations(id),
  week_start_date  DATE NOT NULL,
  status           VARCHAR NOT NULL
    CHECK (status IN ('DRAFT', 'LOCKED', 'RECONCILING', 'RECONCILED')),
  viewed_at        TIMESTAMP,
  locked_at        TIMESTAMP,
  reconciling_at   TIMESTAMP,
  reconciled_at    TIMESTAMP,
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, week_start_date)
);
-- LOCKED prevents "revisionist history" (The Advantage): goals cannot be edited after submit. Reconcile only after LOCKED.

CREATE TABLE commit_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_commit_id    UUID NOT NULL REFERENCES weekly_commits(id),
  outcome_id          UUID NOT NULL REFERENCES outcomes(id),
  title               VARCHAR NOT NULL,
  description         TEXT,
  chess_piece         VARCHAR NOT NULL
    CHECK (chess_piece IN ('KING', 'QUEEN', 'ROOK', 'BISHOP', 'KNIGHT', 'PAWN')),
  chess_weight        INTEGER NOT NULL
    CHECK (chess_weight IN (100, 80, 60, 40, 20, 10)),
  priority_order      INTEGER NOT NULL,
  actual_outcome      TEXT,
  completion_status   VARCHAR
    CHECK (completion_status IN ('COMPLETED', 'PARTIAL', 'NOT_COMPLETED')),
  carry_forward       BOOLEAN DEFAULT false,
  carry_forward_count INTEGER DEFAULT 0,
  carried_from_id     UUID REFERENCES commit_items(id),
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

-- Immutable audit log — no UPDATE or DELETE ever permitted
CREATE TABLE state_transitions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_commit_id  UUID NOT NULL REFERENCES weekly_commits(id),
  from_state        VARCHAR,
  to_state          VARCHAR NOT NULL,
  transitioned_by   UUID NOT NULL REFERENCES users(id),
  transitioned_at   TIMESTAMP DEFAULT NOW(),
  notes             TEXT
);

CREATE TABLE manager_notes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_commit_id  UUID NOT NULL REFERENCES weekly_commits(id),
  manager_id        UUID NOT NULL REFERENCES users(id),
  note              TEXT NOT NULL,
  created_at        TIMESTAMP DEFAULT NOW()
);


-- ============================================================
-- V2__indexes.sql
-- ============================================================

CREATE INDEX idx_weekly_commits_user_week
  ON weekly_commits(user_id, week_start_date);

CREATE INDEX idx_weekly_commits_org_status
  ON weekly_commits(org_id, status);

CREATE INDEX idx_commit_items_commit
  ON commit_items(weekly_commit_id);

CREATE INDEX idx_commit_items_outcome
  ON commit_items(outcome_id);

CREATE INDEX idx_commit_items_chess_weight
  ON commit_items(chess_weight DESC);

CREATE INDEX idx_state_transitions_commit
  ON state_transitions(weekly_commit_id);

CREATE INDEX idx_users_org
  ON users(org_id);

CREATE INDEX idx_users_manager
  ON users(manager_id);

CREATE INDEX idx_users_oauth_subject
  ON users(oauth_subject);

CREATE INDEX idx_outcomes_objective
  ON outcomes(defining_objective_id);

CREATE INDEX idx_defining_objectives_rally_cry
  ON defining_objectives(rally_cry_id);

CREATE INDEX idx_rally_cries_org
  ON rally_cries(org_id);


-- ============================================================
-- V3__seed_data.sql
-- ============================================================

-- Organization
INSERT INTO organizations (id, name, alignment_threshold)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Acme Corp',
  70
);

-- Users
INSERT INTO users (id, org_id, email, full_name, oauth_subject)
VALUES
  (
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'manager@acme.com',
    'Alex Manager',
    'mock|manager'
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'employee@acme.com',
    'Sarah Employee',
    'mock|employee'
  ),
  (
    'b0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    'dual@acme.com',
    'Jordan Dual',
    'mock|dual'
  );

-- Manager relationships
UPDATE users SET manager_id = 'b0000000-0000-0000-0000-000000000001'
WHERE id IN (
  'b0000000-0000-0000-0000-000000000002',
  'b0000000-0000-0000-0000-000000000003'
);

-- Jordan also manages Sarah (dual role demo)
UPDATE users SET manager_id = 'b0000000-0000-0000-0000-000000000003'
WHERE id = 'b0000000-0000-0000-0000-000000000002';

-- Roles
INSERT INTO user_roles (user_id, role) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'MANAGER'),
  ('b0000000-0000-0000-0000-000000000002', 'EMPLOYEE'),
  ('b0000000-0000-0000-0000-000000000003', 'EMPLOYEE'),
  ('b0000000-0000-0000-0000-000000000003', 'MANAGER');

-- RCDO Hierarchy
INSERT INTO rally_cries (id, org_id, title, description)
VALUES (
  'c0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Achieve product-market fit in the SMB segment',
  'Our primary focus for Q3 — everything maps here'
);

INSERT INTO defining_objectives (id, rally_cry_id, title, description)
VALUES
  (
    'd0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    'Ship 3 customer-requested features by Q3',
    'Driven by customer interview insights from May'
  ),
  (
    'd0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000001',
    'Reduce onboarding time to under 5 minutes',
    'Current average is 18 minutes — unacceptable for SMB'
  );

INSERT INTO outcomes (id, defining_objective_id, owner_id, title, description)
VALUES
  (
    'e0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    'Reduce API response time below 200ms',
    'P95 latency currently at 450ms'
  ),
  (
    'e0000000-0000-0000-0000-000000000002',
    'd0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    'Ship bulk import feature',
    'Top requested feature from 12 enterprise prospects'
  ),
  (
    'e0000000-0000-0000-0000-000000000003',
    'd0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000003',
    'Redesign onboarding wizard',
    'Remove 6 redundant steps identified in UX audit'
  );
