import { app, BrowserWindow, dialog, net, protocol, shell } from 'electron';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { registerIpcRouter } from './ipc/router';
import { installApplicationMenu } from './appMenu';
import { openWorkspaceDatabase } from './storage/migrations';
import { repairHistoryOutbox } from './storage/historyOutbox';
import { WorkspaceManager } from './workspaces/workspaceManager';
import { WorkspaceRegistry } from './workspaces/workspaceRegistry';
import { NoteService } from './notes/noteService';
import { serializeTrustedRichEdit } from './notes/richSave';
import { readChatDraft, saveChatDraft } from './notes/chatDraft';
import { MarkdownFileCoordinator } from './storage/markdownFiles';
import { parseVideoLink } from '@revise/core';
import {
  resolveSectionVideoRequest,
  stageSectionVideo,
  validatedYoutubeMarkdown,
} from './media/videoEmbedService';

const rendererPath = join(__dirname, '../renderer/index.html');
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'revise-media',
    privileges: { standard: true, secure: true, stream: true, supportFetchAPI: true },
  },
]);
if (process.env.REVISE_TEST_USER_DATA) {
  // UI automation must not reuse a real profile or another test's workspace list.
  app.setPath('userData', process.env.REVISE_TEST_USER_DATA);
}

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 980,
    minHeight: 640,
    title: 'Revise',
    backgroundColor: '#15171c',
    webPreferences: {
      // Privileged APIs stay in the preload, never in document or remote content.
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  void window.loadFile(rendererPath);
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => event.preventDefault());
  return window;
}

app.whenReady().then(async () => {
  installApplicationMenu((action) => {
    const window = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
    window?.webContents.send('revise:menu.action', action);
  });
  const registry = await WorkspaceRegistry.open(app.getPath('userData'));
  const manager = new WorkspaceManager(registry);
  const saveQueues = new Map<string, Promise<unknown>>();
  const editSessions = new Map<
    string,
    { workspaceId: string; sectionId: string; source: string; lastHash: string }
  >();
  protocol.handle('revise-media', async (request) => {
    try {
      const url = new URL(request.url);
      const workspaceId = url.hostname;
      const sectionId = url.pathname.split('/').filter(Boolean)[0] ?? '';
      const file = await withNotes(workspaceId, async (notes, root) => {
        const section = notes.getSection(sectionId);
        return resolveSectionVideoRequest(
          root,
          section.relativeMarkdownPath,
          workspaceId,
          sectionId,
          request.url,
        );
      });
      return net.fetch(pathToFileURL(file).toString());
    } catch {
      return new Response('Video unavailable', { status: 404 });
    }
  });
  const withNotes = async <T>(
    workspaceId: string,
    action: (
      notes: NoteService,
      root: string,
      db: ReturnType<typeof openWorkspaceDatabase>,
    ) => T | Promise<T>,
  ): Promise<T> => {
    const root = await registry.resolveWorkspaceRoot(workspaceId);
    const db = openWorkspaceDatabase(root);
    try {
      return await action(new NoteService(workspaceId, root, db), root, db);
    } finally {
      db.close();
    }
  };
  const chooseParent = async (): Promise<string | null> => {
    const choice = await dialog.showOpenDialog({
      title: 'Choose a content folder',
      properties: ['openDirectory', 'createDirectory'],
    });
    return choice.canceled ? null : (choice.filePaths[0] ?? null);
  };
  manager.subscribe((activity) => {
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send('revise:workspace.activity', activity);
    }
  });
  registerIpcRouter(
    {
      'collection.list': () => registry.listCollections(),
      'collection.chooseFolder': async () => {
        const selected = await chooseParent();
        if (!selected) return null;
        const collection = await registry.registerCollection(selected);
        return collection.parentPath;
      },
      'collection.relocate': async ({ collectionId }) => {
        const selected = await chooseParent();
        return selected ? registry.relocateCollection(collectionId, selected) : null;
      },
      'workspace.list': async ({ collectionId }) =>
        Promise.all(
          registry.listWorkspaces(collectionId).map(async (workspace) => ({
            workspace,
            activity: manager.activityFor(workspace.id),
            available: await registry.resolveWorkspaceRoot(workspace.id).then(
              () => true,
              () => false,
            ),
          })),
        ),
      'workspace.create': ({ collectionId, displayName }) =>
        registry.createWorkspace(collectionId, displayName),
      'workspace.rename': ({ workspaceId, displayName }) =>
        manager.renameWorkspace(workspaceId, displayName),
      'workspace.switch': async ({ workspaceId }) => {
        const root = await registry.resolveWorkspaceRoot(workspaceId);
        const db = openWorkspaceDatabase(root);
        try {
          await repairHistoryOutbox(db, root);
        } finally {
          db.close();
        }
        return manager.switchWorkspace(workspaceId);
      },
      'chat.readDraft': ({ workspaceId }) =>
        withNotes(workspaceId, (_notes, _root, db) => readChatDraft(db)),
      'chat.saveDraft': ({ workspaceId, draft }) =>
        withNotes(workspaceId, (_notes, _root, db) => saveChatDraft(db, draft)),
      'section.list': ({ workspaceId }) => withNotes(workspaceId, (notes) => notes.listSections()),
      'section.create': ({ workspaceId, title, parentId }) =>
        manager.runInWorkspace(workspaceId, 'save', () =>
          withNotes(workspaceId, (notes) => notes.createSection(title, parentId)),
        ),
      'section.rename': ({ workspaceId, sectionId, title }) =>
        withNotes(workspaceId, (notes) => notes.renameSection(sectionId, title)),
      'section.move': ({ workspaceId, sectionId, parentId }) =>
        manager.runInWorkspace(workspaceId, 'save', () =>
          withNotes(workspaceId, (notes) => notes.moveSection(sectionId, parentId)),
        ),
      'section.reorder': ({ workspaceId, parentId, orderedIds }) =>
        withNotes(workspaceId, (notes) => notes.reorderSections(parentId, orderedIds)),
      'section.delete': ({ workspaceId, sectionId }) =>
        withNotes(workspaceId, (notes) => notes.deleteSection(sectionId)),
      'section.restore': ({ workspaceId, sectionId }) =>
        withNotes(workspaceId, (notes) => notes.restoreSection(sectionId)),
      'section.open': ({ workspaceId, sectionId }) =>
        withNotes(workspaceId, async (notes, root) => {
          const section = notes.getSection(sectionId);
          const file = await new MarkdownFileCoordinator(root).read(section.relativeMarkdownPath);
          if (!file) throw new Error('Section Markdown file is unavailable');
          const sessionId = randomUUID();
          editSessions.set(sessionId, {
            workspaceId,
            sectionId,
            source: file.content,
            lastHash: file.hash,
          });
          return { section, markdown: file.content, fileHash: file.hash, sessionId };
        }),
      'section.saveRich': ({ workspaceId, sectionId, sessionId, baseFileHash, transaction }) => {
        const key = `${workspaceId}:${sectionId}`;
        const previous = saveQueues.get(key) ?? Promise.resolve();
        const pending = previous
          .catch(() => undefined)
          .then(() =>
            manager.runInWorkspace(workspaceId, 'save', () =>
              withNotes(workspaceId, async (notes, root) => {
                const session = editSessions.get(sessionId);
                if (
                  !session ||
                  session.workspaceId !== workspaceId ||
                  session.sectionId !== sectionId ||
                  session.lastHash !== baseFileHash
                )
                  throw new Error('Stale editor session');
                const section = notes.getSection(sectionId);
                const current = await new MarkdownFileCoordinator(root).read(
                  section.relativeMarkdownPath,
                );
                if (!current || current.hash !== baseFileHash)
                  throw new Error('Section changed on disk; reopen before saving');
                const markdown = serializeTrustedRichEdit(session.source, transaction);
                const saved = await notes.saveSection(sectionId, baseFileHash, markdown);
                session.lastHash = saved.fileHash;
                return saved;
              }),
            ),
          );
        saveQueues.set(key, pending);
        void pending
          .finally(() => {
            if (saveQueues.get(key) === pending) saveQueues.delete(key);
          })
          .catch(() => undefined);
        return pending;
      },
      'section.insertYoutube': ({ workspaceId, sectionId, url }) =>
        withNotes(workspaceId, (notes) => {
          notes.getSection(sectionId);
          return { markdownLink: validatedYoutubeMarkdown(url) };
        }),
      'section.insertLocalVideo': async ({ workspaceId, sectionId }) => {
        const selected = await dialog.showOpenDialog({
          title: 'Choose a local video',
          properties: ['openFile'],
          filters: [{ name: 'Videos', extensions: ['mp4', 'webm'] }],
        });
        if (selected.canceled || !selected.filePaths[0]) return null;
        return withNotes(workspaceId, (notes, root) => {
          const section = notes.getSection(sectionId);
          return stageSectionVideo(
            root,
            section.relativeMarkdownPath,
            sectionId,
            selected.filePaths[0]!,
          );
        });
      },
      'section.openLocalVideo': ({ workspaceId, sectionId, relativeLink }) =>
        withNotes(workspaceId, async (notes, root) => {
          const section = notes.getSection(sectionId);
          const link = parseVideoLink(relativeLink);
          if (!link || link.kind !== 'local' || link.sectionId !== sectionId)
            throw new Error('Invalid local video link');
          const file = await resolveSectionVideoRequest(
            root,
            section.relativeMarkdownPath,
            workspaceId,
            sectionId,
            `revise-media://${workspaceId}/${sectionId}/${link.fileName}`,
          );
          const issue = await shell.openPath(file);
          if (issue) throw new Error('Video could not be opened');
        }),
      'media.openYoutube': async ({ url }) => {
        validatedYoutubeMarkdown(url);
        await shell.openExternal(url);
      },
    },
    pathToFileURL(rendererPath).href,
    (_name, input) => {
      if (
        input &&
        typeof input === 'object' &&
        'workspaceId' in input &&
        typeof input.workspaceId === 'string'
      ) {
        return registry.getWorkspace(input.workspaceId).id;
      }
      throw new Error('Workspace owner could not be resolved');
    },
  );
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
