-- V9: Add measurability fields to outcomes (startValue, targetValue, currentValue, unit, lastUpdated)
ALTER TABLE outcomes
    ADD COLUMN start_value    DOUBLE PRECISION,
    ADD COLUMN target_value   DOUBLE PRECISION,
    ADD COLUMN current_value  DOUBLE PRECISION,
    ADD COLUMN unit           VARCHAR(50),
    ADD COLUMN last_updated   TIMESTAMP WITHOUT TIME ZONE;

-- Backfill seed outcomes with measurement structure only; progress starts at zero for demo.
-- (Demo shows how employee weekly commits impact these numbers.)
UPDATE outcomes
SET start_value   = 450,
    target_value  = 180,
    current_value = 450,
    unit          = 'ms',
    last_updated  = NOW()
WHERE id = 'e0000000-0000-0000-0000-000000000001';

UPDATE outcomes
SET start_value   = 0,
    target_value  = 1,
    current_value = 0,
    unit          = 'feature',
    last_updated  = NOW()
WHERE id = 'e0000000-0000-0000-0000-000000000002';

UPDATE outcomes
SET start_value   = 0,
    target_value  = 1,
    current_value = 0,
    unit          = 'wizard',
    last_updated  = NOW()
WHERE id = 'e0000000-0000-0000-0000-000000000003';
