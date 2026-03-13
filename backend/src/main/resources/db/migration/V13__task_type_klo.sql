-- V11: Add task_type and klo_category to commit_items for KLO (Keep-the-Lights-On) support.
--      Relax outcome_id NOT NULL so KLO items can exist without an RCDO outcome link.

ALTER TABLE commit_items
    ALTER COLUMN outcome_id DROP NOT NULL,
    ADD COLUMN task_type    VARCHAR(20) NOT NULL DEFAULT 'STRATEGIC',
    ADD COLUMN klo_category VARCHAR(20);
