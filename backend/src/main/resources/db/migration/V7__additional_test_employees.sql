-- Additional test employees for flow testing
INSERT INTO users (id, org_id, email, full_name, oauth_subject, manager_id)
VALUES
  (
    'b0000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000001',
    'marcus@acme.com',
    'Marcus Chen',
    'mock|marcus',
    'b0000000-0000-0000-0000-000000000001'
  ),
  (
    'b0000000-0000-0000-0000-000000000005',
    'a0000000-0000-0000-0000-000000000001',
    'priya@acme.com',
    'Priya Nair',
    'mock|priya',
    'b0000000-0000-0000-0000-000000000001'
  ),
  (
    'b0000000-0000-0000-0000-000000000006',
    'a0000000-0000-0000-0000-000000000001',
    'tom@acme.com',
    'Tom Rivera',
    'mock|tom',
    'b0000000-0000-0000-0000-000000000001'
  );

INSERT INTO user_roles (user_id, role)
VALUES
  ('b0000000-0000-0000-0000-000000000004', 'EMPLOYEE'),
  ('b0000000-0000-0000-0000-000000000005', 'EMPLOYEE'),
  ('b0000000-0000-0000-0000-000000000006', 'EMPLOYEE');
