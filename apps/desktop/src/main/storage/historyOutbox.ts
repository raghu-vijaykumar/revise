import type { DatabaseSync } from 'node:sqlite';

export type HistoryOutboxItem = {
  id: string;
  sectionId: string;
  fileHash: string;
  baseCommit: string | null;
  state: string;
  attempts: number;
  error: string | null;
};

type NewHistoryItem = Pick<HistoryOutboxItem, 'id' | 'sectionId' | 'fileHash' | 'baseCommit'>;

export function enqueueHistoryCommit(db: DatabaseSync, item: NewHistoryItem): void {
  const existing = db
    .prepare('SELECT section_id, file_hash FROM history_outbox WHERE id = ?')
    .get(item.id) as { section_id: string; file_hash: string } | undefined;
  if (existing) {
    if (existing.section_id !== item.sectionId || existing.file_hash !== item.fileHash) {
      throw new Error('Outbox ID reused for different content');
    }
    return;
  }
  db.prepare(
    'INSERT INTO history_outbox(id, section_id, file_hash, base_commit, state) VALUES (?, ?, ?, ?, ?)',
  ).run(item.id, item.sectionId, item.fileHash, item.baseCommit, 'pending');
}

export function listPendingHistory(db: DatabaseSync): HistoryOutboxItem[] {
  const rows = db
    .prepare(
      "SELECT id, section_id, file_hash, base_commit, state, attempts, error FROM history_outbox WHERE state != 'complete' ORDER BY rowid",
    )
    .all() as Array<{
    id: string;
    section_id: string;
    file_hash: string;
    base_commit: string | null;
    state: string;
    attempts: number;
    error: string | null;
  }>;
  return rows.map((row) => ({
    id: row.id,
    sectionId: row.section_id,
    fileHash: row.file_hash,
    baseCommit: row.base_commit,
    state: row.state,
    attempts: row.attempts,
    error: row.error,
  }));
}

export function markHistoryAttempt(db: DatabaseSync, id: string, error: string): void {
  const result = db
    .prepare(
      "UPDATE history_outbox SET attempts = attempts + 1, state = 'retryable_failure', error = ? WHERE id = ? AND state != 'complete'",
    )
    .run(error, id);
  if (result.changes !== 1) throw new Error('Pending history item not found');
}

export function markHistoryComplete(db: DatabaseSync, id: string): void {
  const result = db
    .prepare(
      "UPDATE history_outbox SET state = 'complete', error = NULL WHERE id = ? AND state != 'complete'",
    )
    .run(id);
  if (result.changes !== 1) throw new Error('Pending history item not found');
}

export function recordReviewDecision(
  db: DatabaseSync,
  operationId: string,
  decision: 'accepted' | 'rejected',
): void {
  const row = db.prepare('SELECT decision FROM change_operations WHERE id = ?').get(operationId) as
    { decision: string } | undefined;
  if (!row) throw new Error('Review operation not found');
  if (row.decision === decision) return;
  if (row.decision !== 'pending') throw new Error('Review operation already decided');
  db.prepare('UPDATE change_operations SET decision = ? WHERE id = ?').run(decision, operationId);
}
