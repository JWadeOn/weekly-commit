-- Add ADMIN role for user management (add users, assign roles, assign managers/teams).
-- Constraint name follows PostgreSQL convention for CHECK on user_roles.role.
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check
  CHECK (role IN ('EMPLOYEE', 'MANAGER', 'ADMIN'));

-- Seed one admin user (claimable on first sign-in via email; see OAuthUserService).
INSERT INTO users (id, org_id, email, full_name, oauth_subject, manager_id)
VALUES (
  'b2000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'admin@example.com',
  'Admin',
  'demo-claim|admin',
  NULL
);

INSERT INTO user_roles (user_id, role)
VALUES ('b2000000-0000-0000-0000-000000000001', 'ADMIN');
