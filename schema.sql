CREATE TABLE IF NOT EXISTS app_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_state_chunks (
  state_key TEXT NOT NULL,
  part_index INTEGER NOT NULL,
  chunk TEXT NOT NULL,
  PRIMARY KEY (state_key, part_index)
);