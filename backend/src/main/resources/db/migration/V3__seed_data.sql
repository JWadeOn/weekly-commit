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
