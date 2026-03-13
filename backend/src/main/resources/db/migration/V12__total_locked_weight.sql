-- Snapshot the total weight at the moment a commit transitions DRAFT → LOCKED.
-- Immutable once set: never updated by application code after that point.
ALTER TABLE weekly_commits
    ADD COLUMN total_locked_weight INTEGER;
