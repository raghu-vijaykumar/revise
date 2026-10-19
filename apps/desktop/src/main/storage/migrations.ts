import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import initialSchema from './schema.sql';

const CURRENT_SCHEMA_VERSION = 1;

export function openWorkspaceDatabase(workspaceRoot: string): DatabaseSync {
  const privateRoot = join(workspaceRoot, '.ai-notes');
  mkdirSync(privateRoot, { recursive: true });
  const db = new DatabaseSync(join(privateRoot, 'index.sqlite'), { timeout: 5000 });
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  migrateWorkspaceDatabase(db);
  return db;
}

export function migrateWorkspaceDatabase(db: DatabaseSync): void {
  const row = db.prepare('PRAGMA user_version').get() as { user_version: number };
  if (row.user_version > CURRENT_SCHEMA_VERSION) {
    throw new Error(`Workspace schema ${row.user_version} is newer than this app`);
  }
  if (row.user_version === CURRENT_SCHEMA_VERSION) return;

  // A transaction prevents a half-created index or review table after a crash.
  db.exec('BEGIN IMMEDIATE');
  try {
    if (row.user_version < 1) db.exec(initialSchema);
    db.exec(`PRAGMA user_version = ${CURRENT_SCHEMA_VERSION}`);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
