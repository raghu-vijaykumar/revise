import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  handlers: new Map<string, (event: unknown, input: unknown) => Promise<unknown>>(),
  removed: [] as string[],
}));

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, handler: (event: unknown, input: unknown) => Promise<unknown>) => {
      mocks.handlers.set(channel, handler);
    },
    removeHandler: (channel: string) => mocks.removed.push(channel),
  },
}));

import { registerIpcRouter } from '../../apps/desktop/src/main/ipc/router';

const workspaceId = '58ac7960-9012-41cf-9d13-ed970417c790';
const sectionId = '6a77bdb5-9f22-4b94-bb40-5bdf0e1329f4';
const expectedUrl = 'file:///revise/index.html';

function trustedEvent() {
  const frame = {};
  return { senderFrame: frame, sender: { mainFrame: frame, getURL: () => expectedUrl } };
}

beforeEach(() => {
  mocks.handlers.clear();
  mocks.removed.length = 0;
});

describe('main-process command router', () => {
  it('accepts a valid scoped command and unregisters it on disposal', async () => {
    const ownerLookup = vi.fn(() => ({ workspaceId, sectionId }));
    const dispose = registerIpcRouter(
      { 'section.open': ownerLookup },
      expectedUrl,
      () => workspaceId,
    );
    const invoke = mocks.handlers.get('revise:section.open');
    await expect(invoke?.(trustedEvent(), { workspaceId, sectionId })).resolves.toEqual({
      workspaceId,
      sectionId,
    });
    expect(ownerLookup).toHaveBeenCalledOnce();
    dispose();
    expect(mocks.removed).toContain('revise:section.open');
  });

  it('rejects malformed input and a remote or subframe sender', async () => {
    registerIpcRouter({ 'section.open': vi.fn() }, expectedUrl, () => workspaceId);
    const invoke = mocks.handlers.get('revise:section.open');
    await expect(invoke?.(trustedEvent(), { workspaceId, sectionId: 'bad' })).rejects.toThrow();
    const remote = trustedEvent();
    remote.sender.getURL = () => 'https://youtube.com';
    await expect(invoke?.(remote, { workspaceId, sectionId })).rejects.toThrow(
      'Untrusted IPC sender',
    );
    const subframe = trustedEvent();
    subframe.senderFrame = {};
    await expect(invoke?.(subframe, { workspaceId, sectionId })).rejects.toThrow(
      'Untrusted IPC sender',
    );
  });

  it('rejects another workspace owner before calling the handler', async () => {
    const handler = vi.fn();
    registerIpcRouter({ 'section.open': handler }, expectedUrl, () => sectionId);
    const invoke = mocks.handlers.get('revise:section.open');
    await expect(invoke?.(trustedEvent(), { workspaceId, sectionId })).rejects.toThrow(
      'Workspace owner mismatch',
    );
    expect(handler).not.toHaveBeenCalled();
  });
});
