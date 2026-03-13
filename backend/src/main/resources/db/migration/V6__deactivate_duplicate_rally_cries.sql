-- Enforce single active Rally Cry per org (Lencioni, The Advantage).
-- For any org that has more than one active Rally Cry, keep the earliest
-- (by created_at) active and deactivate the rest. This is a no-op on
-- clean databases; it repairs data created before the backend guard was
-- in place.
UPDATE rally_cries rc
SET active = false
WHERE active = true
  AND id NOT IN (
      SELECT DISTINCT ON (org_id) id
      FROM rally_cries
      WHERE active = true
      ORDER BY org_id, created_at ASC
  );
