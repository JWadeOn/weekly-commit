-- Rename task_type value from KLO to KTLO (acronym update).
UPDATE commit_items SET task_type = 'KTLO' WHERE task_type = 'KLO';
