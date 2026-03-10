-- V3 seed accidentally overwrote Sarah's manager_id to Jordan's id.
-- The intended setup for the mock|manager + mock|employee demo scenario is:
--   Sarah (mock|employee) → reports to Alex (mock|manager)
--   Jordan (mock|dual)    → reports to Alex (mock|manager)
-- Jordan retains his MANAGER role and manages no one in this seed (dual-role demo).
UPDATE users
SET manager_id = 'b0000000-0000-0000-0000-000000000001'
WHERE id = 'b0000000-0000-0000-0000-000000000002';
