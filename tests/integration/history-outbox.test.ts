import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it } from 'vitest';
import { migrateWorkspaceDatabase } from '../../apps/desktop/src/main/storage/migrations';
import {
  enqueueHistoryCommit,
  listPendingHistory,
  markHistoryAttempt,
  markHistoryComplete,
  recordReviewDecision,
} from '../../apps/desktop/src/main/storage/historyOutbox';

const databases: DatabaseSync[] = [];
const sectionId = '58ac7960-9012-41cf-9d13-ed970417c790';
const outboxId = '6a77bdb5-9f22-4b94-bb40-5bdf0e1329f4';

afterEach(() => {
  for (const db of databases.splice(0)) db.close();
});

function database(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  databases.push(db);
  db.exec('PRAGMA foreign_keys = ON');
  migrateWorkspaceDatabase(db);
  db.prepare(
    'INSERT INTO sections(id, display_title, relative_markdown_path, file_hash) VALUES (?, ?, ?, ?)',
  ).run(sectionId, 'Motion', 'Motion.md', 'file-one');
  return db;
}

describe('file-to-Git history outbox', () => {
  it('keeps an idempotent pending record until a Git commit is recorded', () => {
    const db = database();
    enqueueHistoryCommit(db, { id: outboxId, sectionId, fileHash: 'file-one', baseCommit: null });
    enqueueHistoryCommit(db, { id: outboxId, sectionId, fileHash: 'file-one', baseCommit: null });
    expect(listPendingHistory(db)).toHaveLength(1);
    markHistoryAttempt(db, outboxId, 'Git unavailable');
    expect(listPendingHistory(db)[0]).toMatchObject({ attempts: 1, error: 'Git unavailable' });
    markHistoryComplete(db, outboxId);
    expect(listPendingHistory(db)).toEqual([]);
  });

  it('rejects reusing an outbox ID for another file hash', () => {
    const db = database();
    enqueueHistoryCommit(db, { id: outboxId, sectionId, fileHash: 'file-one', baseCommit: null });
    expect(() =>
      enqueueHistoryCommit(db, { id: outboxId, sectionId, fileHash: 'file-two', baseCommit: null }),
    ).toThrow('Outbox ID reused');
  });

  it('records one review decision and prevents an opposite replay', () => {
    const db = database();
    db.prepare(
      'INSERT INTO change_sets(id, section_id, base_file_hash, status, created_at) VALUES (?, ?, ?, ?, ?)',
    ).run('set-one', sectionId, 'file-one', 'ready_for_review', '2026-10-19T00:00:00Z');
    db.prepare(
      'INSERT INTO change_operations(id, change_set_id, kind, operation_json) VALUES (?, ?, ?, ?)',
    ).run('operation-one', 'set-one', 'update', '{}');
    recordReviewDecision(db, 'operation-one', 'accepted');
    recordReviewDecision(db, 'operation-one', 'accepted');
    expect(() => recordReviewDecision(db, 'operation-one', 'rejected')).toThrow('already decided');
  });
});
