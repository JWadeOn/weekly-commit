-- V9: Add measurability fields to outcomes (startValue, targetValue, currentValue, unit, lastUpdated)
ALTER TABLE outcomes
    ADD COLUMN start_value    DOUBLE PRECISION,
    ADD COLUMN target_value   DOUBLE PRECISION,
    ADD COLUMN current_value  DOUBLE PRECISION,
    ADD COLUMN unit           VARCHAR(50),
    ADD COLUMN last_updated   TIMESTAMP WITHOUT TIME ZONE;

-- Backfill seed outcomes with representative measurement data
UPDATE outcomes
SET start_value   = 450,
    target_value  = 180,
    current_value = 320,
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
