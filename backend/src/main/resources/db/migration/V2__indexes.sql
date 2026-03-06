CREATE INDEX idx_weekly_commits_user_week
  ON weekly_commits(user_id, week_start_date);

CREATE INDEX idx_weekly_commits_org_status
  ON weekly_commits(org_id, status);

CREATE INDEX idx_commit_items_commit
  ON commit_items(weekly_commit_id);

CREATE INDEX idx_commit_items_outcome
  ON commit_items(outcome_id);

CREATE INDEX idx_commit_items_chess_weight
  ON commit_items(chess_weight DESC);

CREATE INDEX idx_state_transitions_commit
  ON state_transitions(weekly_commit_id);

CREATE INDEX idx_users_org
  ON users(org_id);

CREATE INDEX idx_users_manager
  ON users(manager_id);

CREATE INDEX idx_users_oauth_subject
  ON users(oauth_subject);

CREATE INDEX idx_outcomes_objective
  ON outcomes(defining_objective_id);

CREATE INDEX idx_defining_objectives_rally_cry
  ON defining_objectives(rally_cry_id);

CREATE INDEX idx_rally_cries_org
  ON rally_cries(org_id);
