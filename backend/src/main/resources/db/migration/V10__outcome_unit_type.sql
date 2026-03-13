-- V10: Add unit_label (human-readable suffix) and unit_type (display category) to outcomes
ALTER TABLE outcomes
    ADD COLUMN unit_label VARCHAR(100),
    ADD COLUMN unit_type  VARCHAR(20);

-- Backfill seed data
UPDATE outcomes SET unit_label = 'ms',       unit_type = 'TIME'    WHERE id = 'e0000000-0000-0000-0000-000000000001';
UPDATE outcomes SET unit_label = 'features', unit_type = 'NUMERIC' WHERE id = 'e0000000-0000-0000-0000-000000000002';
UPDATE outcomes SET unit_label = 'wizards',  unit_type = 'NUMERIC' WHERE id = 'e0000000-0000-0000-0000-000000000003';
