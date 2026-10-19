CREATE TABLE IF NOT EXISTS workspace_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS sections (
  id TEXT PRIMARY KEY,
  parent_id TEXT REFERENCES sections(id),
  display_title TEXT NOT NULL,
  relative_markdown_path TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  file_hash TEXT NOT NULL,
  deleted_at TEXT
) STRICT;

CREATE TABLE IF NOT EXISTS agent_runs (
  id TEXT PRIMARY KEY,
  section_id TEXT NOT NULL REFERENCES sections(id),
  provider_id TEXT NOT NULL,
  context_manifest_json TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS change_sets (
  id TEXT PRIMARY KEY,
  run_id TEXT REFERENCES agent_runs(id),
  section_id TEXT NOT NULL REFERENCES sections(id),
  base_file_hash TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS change_operations (
  id TEXT PRIMARY KEY,
  change_set_id TEXT NOT NULL REFERENCES change_sets(id),
  kind TEXT NOT NULL,
  operation_json TEXT NOT NULL,
  decision TEXT NOT NULL DEFAULT 'pending'
) STRICT;

CREATE TABLE IF NOT EXISTS draft_checkpoints (
  id TEXT PRIMARY KEY,
  section_id TEXT NOT NULL REFERENCES sections(id),
  base_file_hash TEXT NOT NULL,
  transaction_json TEXT NOT NULL,
  status TEXT NOT NULL,
  queued_at TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  section_id TEXT REFERENCES sections(id),
  role TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  uri_or_name TEXT NOT NULL,
  content_hash TEXT,
  status TEXT NOT NULL,
  captured_at TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS citations (
  id TEXT PRIMARY KEY,
  section_id TEXT NOT NULL REFERENCES sections(id),
  block_id TEXT NOT NULL,
  source_id TEXT NOT NULL REFERENCES sources(id),
  locator_json TEXT NOT NULL,
  quote_hash TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS claim_statuses (
  section_id TEXT NOT NULL REFERENCES sections(id),
  block_id TEXT NOT NULL,
  text_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('sourced', 'unsourced')),
  source_id TEXT REFERENCES sources(id),
  PRIMARY KEY (section_id, block_id)
) STRICT;

CREATE TABLE IF NOT EXISTS attachments (
  content_hash TEXT PRIMARY KEY,
  section_id TEXT NOT NULL REFERENCES sections(id),
  relative_path TEXT NOT NULL,
  media_type TEXT NOT NULL,
  byte_length INTEGER NOT NULL,
  ref_count INTEGER NOT NULL DEFAULT 1
) STRICT;

CREATE TABLE IF NOT EXISTS history_outbox (
  id TEXT PRIMARY KEY,
  section_id TEXT NOT NULL REFERENCES sections(id),
  file_hash TEXT NOT NULL,
  base_commit TEXT,
  state TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  error TEXT
) STRICT;

CREATE VIRTUAL TABLE IF NOT EXISTS section_search USING fts5(section_id UNINDEXED, title, body);
