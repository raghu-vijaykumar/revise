import { spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { openWorkspaceDatabase } from '../../apps/desktop/src/main/storage/migrations';
import { MarkdownFileCoordinator } from '../../apps/desktop/src/main/storage/markdownFiles';
import {
  enqueueHistoryCommit,
  listPendingHistory,
  markHistoryComplete,
  repairHistoryOutbox,
} from '../../apps/desktop/src/main/storage/historyOutbox';

const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'revise-recovery-'));
  roots.push(root);
  const files = new MarkdownFileCoordinator(root);
  const initial = await files.save('Motion.md', null, '# Original\n');
  const db = openWorkspaceDatabase(root);
  db.prepare(
    'INSERT INTO sections(id, display_title, relative_markdown_path, file_hash) VALUES (?, ?, ?, ?)',
  ).run('motion', 'Motion', 'Motion.md', initial.hash);
  return { root, db, initial };
}

describe('restart recovery at the Markdown/history boundary', () => {
  it('repairs metadata and Git outbox after an abrupt process exit following atomic rename', async () => {
    const { root, db, initial } = await fixture();
    enqueueHistoryCommit(db, {
      id: 'first-save',
      sectionId: 'motion',
      fileHash: initial.hash,
      baseCommit: null,
    });
    markHistoryComplete(db, 'first-save');
    db.close();

    const script = [
      "const fs=require('node:fs');",
      "const path=require('node:path');",
      "const target=path.join(process.argv[1],'Motion.md');",
      "const temp=target+'.crash.tmp';",
      "const fd=fs.openSync(temp,'wx');",
      "fs.writeFileSync(fd,'# Changed before crash\\n');",
      'fs.fsyncSync(fd);',
      'fs.closeSync(fd);',
      'fs.renameSync(temp,target);',
      'process.exit(17);',
    ].join('');
    const child = spawnSync(process.execPath, ['-e', script, root], { encoding: 'utf8' });
    expect(child.status).toBe(17);
    const reopened = openWorkspaceDatabase(root);
    try {
      const repaired = await repairHistoryOutbox(reopened, root);
      expect(repaired).toEqual({ queued: 1, missingSectionIds: [] });
      const current = await new MarkdownFileCoordinator(root).read('Motion.md');
      expect(current?.content).toBe('# Changed before crash\n');
      expect(reopened.prepare('SELECT file_hash FROM sections WHERE id = ?').get('motion')).toEqual(
        { file_hash: current?.hash },
      );
      expect(listPendingHistory(reopened)).toMatchObject([
        { sectionId: 'motion', fileHash: current?.hash, state: 'pending' },
      ]);
      expect(await repairHistoryOutbox(reopened, root)).toEqual({
        queued: 0,
        missingSectionIds: [],
      });
      expect(listPendingHistory(reopened)).toHaveLength(1);
    } finally {
      reopened.close();
    }
  });

  it('retains an existing pending commit and reports a missing canonical file', async () => {
    const { root, db, initial } = await fixture();
    enqueueHistoryCommit(db, {
      id: 'pending-save',
      sectionId: 'motion',
      fileHash: initial.hash,
      baseCommit: null,
    });
    db.close();
    const reopened = openWorkspaceDatabase(root);
    try {
      expect(await repairHistoryOutbox(reopened, root)).toEqual({
        queued: 0,
        missingSectionIds: [],
      });
      expect(listPendingHistory(reopened)).toHaveLength(1);
      await rm(join(root, 'Motion.md'));
      expect(await repairHistoryOutbox(reopened, root)).toEqual({
        queued: 0,
        missingSectionIds: ['motion'],
      });
      expect(listPendingHistory(reopened)).toHaveLength(1);
    } finally {
      reopened.close();
    }
  });
});
