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

CREATE TABLE defining_objectives (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rally_cry_id  UUID NOT NULL REFERENCES rally_cries(id),
  title         VARCHAR NOT NULL,
  description   TEXT,
  active        BOOLEAN DEFAULT true,
  created_at    TIMESTAMP DEFAULT NOW()
);

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
