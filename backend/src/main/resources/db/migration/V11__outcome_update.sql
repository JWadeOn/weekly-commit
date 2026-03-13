-- Ledger of Execution: immutable audit trail for every outcome value change.
-- Forces engineers to record the method (action_taken) and evidence (verification_type).
CREATE TABLE outcome_updates (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    outcome_id        UUID        NOT NULL REFERENCES outcomes(id),
    old_value         DOUBLE PRECISION,
    new_value         DOUBLE PRECISION NOT NULL,
    action_taken      TEXT        NOT NULL,
    verification_type VARCHAR(20) NOT NULL,
    updated_by        UUID        REFERENCES users(id),
    timestamp         TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_outcome_updates_outcome_id ON outcome_updates(outcome_id);
