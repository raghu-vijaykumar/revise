import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  migrateWorkspaceDatabase,
  openWorkspaceDatabase,
} from '../../apps/desktop/src/main/storage/migrations';

const opened: DatabaseSync[] = [];
const temporaryRoots: string[] = [];

afterEach(() => {
  for (const db of opened.splice(0)) db.close();
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('workspace migration', () => {
  it('opens one workspace-local database and reopens its schema without replacing it', () => {
    const root = mkdtempSync(join(tmpdir(), 'revise-sql-'));
    temporaryRoots.push(root);
    const first = openWorkspaceDatabase(root);
    opened.push(first);
    first
      .prepare('INSERT INTO workspace_meta(key, value) VALUES (?, ?)')
      .run('identity', 'physics');
    first.close();
    opened.pop();

    expect(existsSync(join(root, '.ai-notes', 'index.sqlite'))).toBe(true);
    const second = openWorkspaceDatabase(root);
    opened.push(second);
    const row = second.prepare("SELECT value FROM workspace_meta WHERE key = 'identity'").get() as {
      value: string;
    };
    expect(row.value).toBe('physics');
  });

  it('creates the review tables and a usable FTS index once', () => {
    const db = new DatabaseSync(':memory:');
    opened.push(db);
    migrateWorkspaceDatabase(db);
    migrateWorkspaceDatabase(db);

    const version = db.prepare('PRAGMA user_version').get() as { user_version: number };
    expect(version.user_version).toBe(1);
    db.prepare('INSERT INTO section_search(section_id, title, body) VALUES (?, ?, ?)').run(
      'one',
      'Forces',
      'Acceleration changes with force',
    );
    const result = db
      .prepare("SELECT section_id FROM section_search WHERE section_search MATCH 'force'")
      .get() as { section_id: string } | undefined;
    expect(result?.section_id).toBe('one');
  });

  it('refuses to open a database from a future app version', () => {
    const db = new DatabaseSync(':memory:');
    opened.push(db);
    db.exec('PRAGMA user_version = 2');
    expect(() => migrateWorkspaceDatabase(db)).toThrow('newer than this app');
  });
});
