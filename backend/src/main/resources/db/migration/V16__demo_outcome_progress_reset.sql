-- Reset outcome progress to zero for demo: gauges start empty so the demo can show
-- how employee weekly commits (and manual outcome updates) impact the numbers.
UPDATE outcomes
SET current_value = start_value,
    last_updated  = NOW()
WHERE id = 'e0000000-0000-0000-0000-000000000001';

UPDATE outcomes
SET current_value = 0,
    last_updated  = NOW()
WHERE id IN (
  'e0000000-0000-0000-0000-000000000002',
  'e0000000-0000-0000-0000-000000000003'
);
