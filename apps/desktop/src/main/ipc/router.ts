import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import {
  assertWorkspaceOwner,
  commandSchemas,
  type CommandInput,
  type CommandName,
} from '@revise/core';

export type CommandHandlers = {
  [K in CommandName]?: (input: CommandInput<K>) => unknown | Promise<unknown>;
};

export type ResolveCommandOwner = (name: CommandName, input: unknown) => string | Promise<string>;

function assertTrustedRenderer(event: IpcMainInvokeEvent, expectedDocumentUrl: string): void {
  // Rich document iframes and remote embeds must never inherit main-frame IPC rights.
  if (
    event.senderFrame !== event.sender.mainFrame ||
    event.sender.getURL() !== expectedDocumentUrl
  ) {
    throw new Error('Untrusted IPC sender');
  }
}

export function registerIpcRouter(
  handlers: CommandHandlers,
  expectedDocumentUrl: string,
  resolveOwner: ResolveCommandOwner,
): () => void {
  const registered: string[] = [];
  for (const name of Object.keys(commandSchemas) as CommandName[]) {
    const handler = handlers[name];
    if (!handler) continue;
    const channel = `revise:${name}`;
    ipcMain.handle(channel, async (event, untrustedInput: unknown) => {
      assertTrustedRenderer(event, expectedDocumentUrl);
      const input = commandSchemas[name].parse(untrustedInput);
      if ('workspaceId' in input && typeof input.workspaceId === 'string') {
        // Resolve ownership from persisted state, never from the renderer payload.
        assertWorkspaceOwner(input.workspaceId, await resolveOwner(name, input));
      }
      return (handler as (value: unknown) => unknown | Promise<unknown>)(input);
    });
    registered.push(channel);
  }
  return () => {
    for (const channel of registered) ipcMain.removeHandler(channel);
  };
}
