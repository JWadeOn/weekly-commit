-- Unplanned (mid-week) items and BUMPED completion status for spec compliance.
-- commit_items: unplanned flag and FK to the item that was "bumped" to make room.
-- completion_status: allow 'BUMPED' for items that were bumped by an unplanned addition.

ALTER TABLE commit_items
  ADD COLUMN unplanned BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE commit_items
  ADD COLUMN bumped_item_id UUID REFERENCES commit_items(id);

ALTER TABLE commit_items
  DROP CONSTRAINT IF EXISTS commit_items_completion_status_check;

ALTER TABLE commit_items
  ADD CONSTRAINT commit_items_completion_status_check
  CHECK (completion_status IS NULL OR completion_status IN ('COMPLETED', 'PARTIAL', 'NOT_COMPLETED', 'BUMPED'));
