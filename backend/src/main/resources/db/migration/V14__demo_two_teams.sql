-- Two demo teams for deployed instance: Team 1 and Team 2, each with 1 manager and 3 employees.
-- Users have oauth_subject like 'demo-claim|team1-manager' so they can be "claimed" on first
-- sign-in by matching email (see OAuthUserService claim-by-email). Create these 8 users in Auth0
-- (or your IdP) with the same emails to get the correct roles and manager structure.

-- Team 1: manager + 3 employees
INSERT INTO users (id, org_id, email, full_name, oauth_subject, manager_id)
VALUES
  (
    'b1000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'team1-manager@example.com',
    'Team 1 Manager',
    'demo-claim|team1-manager',
    NULL
  ),
  (
    'b1000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'team1-e1@example.com',
    'Team 1 Employee 1',
    'demo-claim|team1-e1',
    'b1000000-0000-0000-0000-000000000001'
  ),
  (
    'b1000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    'team1-e2@example.com',
    'Team 1 Employee 2',
    'demo-claim|team1-e2',
    'b1000000-0000-0000-0000-000000000001'
  ),
  (
    'b1000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000001',
    'team1-e3@example.com',
    'Team 1 Employee 3',
    'demo-claim|team1-e3',
    'b1000000-0000-0000-0000-000000000001'
  );

-- Team 2: manager + 3 employees
INSERT INTO users (id, org_id, email, full_name, oauth_subject, manager_id)
VALUES
  (
    'b1000000-0000-0000-0000-000000000005',
    'a0000000-0000-0000-0000-000000000001',
    'team2-manager@example.com',
    'Team 2 Manager',
    'demo-claim|team2-manager',
    NULL
  ),
  (
    'b1000000-0000-0000-0000-000000000006',
    'a0000000-0000-0000-0000-000000000001',
    'team2-e1@example.com',
    'Team 2 Employee 1',
    'demo-claim|team2-e1',
    'b1000000-0000-0000-0000-000000000005'
  ),
  (
    'b1000000-0000-0000-0000-000000000007',
    'a0000000-0000-0000-0000-000000000001',
    'team2-e2@example.com',
    'Team 2 Employee 2',
    'demo-claim|team2-e2',
    'b1000000-0000-0000-0000-000000000005'
  ),
  (
    'b1000000-0000-0000-0000-000000000008',
    'a0000000-0000-0000-0000-000000000001',
    'team2-e3@example.com',
    'Team 2 Employee 3',
    'demo-claim|team2-e3',
    'b1000000-0000-0000-0000-000000000005'
  );

-- Roles: managers get MANAGER, employees get EMPLOYEE
INSERT INTO user_roles (user_id, role)
VALUES
  ('b1000000-0000-0000-0000-000000000001', 'MANAGER'),
  ('b1000000-0000-0000-0000-000000000002', 'EMPLOYEE'),
  ('b1000000-0000-0000-0000-000000000003', 'EMPLOYEE'),
  ('b1000000-0000-0000-0000-000000000004', 'EMPLOYEE'),
  ('b1000000-0000-0000-0000-000000000005', 'MANAGER'),
  ('b1000000-0000-0000-0000-000000000006', 'EMPLOYEE'),
  ('b1000000-0000-0000-0000-000000000007', 'EMPLOYEE'),
  ('b1000000-0000-0000-0000-000000000008', 'EMPLOYEE');
