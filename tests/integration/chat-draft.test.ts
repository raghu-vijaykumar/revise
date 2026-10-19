import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { openWorkspaceDatabase } from '../../apps/desktop/src/main/storage/migrations';
import { readChatDraft, saveChatDraft } from '../../apps/desktop/src/main/notes/chatDraft';

const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

describe('workspace chat draft', () => {
  it('survives reopen and stays inside its own workspace database', async () => {
    const physics = await mkdtemp(join(tmpdir(), 'revise-chat-physics-'));
    const biology = await mkdtemp(join(tmpdir(), 'revise-chat-biology-'));
    roots.push(physics, biology);
    const first = openWorkspaceDatabase(physics);
    saveChatDraft(first, 'What is momentum?');
    first.close();
    const reopened = openWorkspaceDatabase(physics);
    const other = openWorkspaceDatabase(biology);
    try {
      expect(readChatDraft(reopened)).toBe('What is momentum?');
      expect(readChatDraft(other)).toBe('');
    } finally {
      reopened.close();
      other.close();
    }
  });
});
