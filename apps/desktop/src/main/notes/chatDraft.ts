import type { DatabaseSync } from 'node:sqlite';

const key = 'chat.draft';

export function readChatDraft(db: DatabaseSync): string {
  const row = db.prepare('SELECT value FROM workspace_meta WHERE key = ?').get(key) as
    { value: string } | undefined;
  return row?.value ?? '';
}

export function saveChatDraft(db: DatabaseSync, draft: string): void {
  db.prepare(
    'INSERT INTO workspace_meta(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  ).run(key, draft);
}
