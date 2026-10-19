import { contextBridge, ipcRenderer } from 'electron';
import type { ContentCollection, Section, Workspace } from '@revise/core';
import type { WorkspaceActivity } from '../main/workspaces/workspaceManager';
import type { NativeMenuAction } from '../types/menu';

type WorkspaceEntry = { workspace: Workspace; activity: WorkspaceActivity; available: boolean };

// Expose narrow, named capabilities only; document content never gets raw IPC.
contextBridge.exposeInMainWorld('revise', {
  appVersion: '0.1.0',
  chooseContentFolder: (): Promise<string | null> =>
    ipcRenderer.invoke('revise:collection.chooseFolder', {}),
  listCollections: (): Promise<ContentCollection[]> =>
    ipcRenderer.invoke('revise:collection.list', {}),
  relocateCollection: (collectionId: string): Promise<ContentCollection | null> =>
    ipcRenderer.invoke('revise:collection.relocate', { collectionId }),
  listWorkspaces: (collectionId: string): Promise<WorkspaceEntry[]> =>
    ipcRenderer.invoke('revise:workspace.list', { collectionId }),
  createWorkspace: (collectionId: string, displayName: string): Promise<Workspace> =>
    ipcRenderer.invoke('revise:workspace.create', { collectionId, displayName }),
  renameWorkspace: (workspaceId: string, displayName: string): Promise<Workspace> =>
    ipcRenderer.invoke('revise:workspace.rename', { workspaceId, displayName }),
  switchWorkspace: (
    workspaceId: string,
  ): Promise<{ workspace: Workspace; activity: WorkspaceActivity }> =>
    ipcRenderer.invoke('revise:workspace.switch', { workspaceId }),
  readChatDraft: (workspaceId: string): Promise<string> =>
    ipcRenderer.invoke('revise:chat.readDraft', { workspaceId }),
  saveChatDraft: (workspaceId: string, draft: string): Promise<void> =>
    ipcRenderer.invoke('revise:chat.saveDraft', { workspaceId, draft }),
  listSections: (workspaceId: string): Promise<Section[]> =>
    ipcRenderer.invoke('revise:section.list', { workspaceId }),
  createSection: (
    workspaceId: string,
    title: string,
    parentId: string | null = null,
  ): Promise<Section> =>
    ipcRenderer.invoke('revise:section.create', { workspaceId, title, parentId }),
  renameSection: (workspaceId: string, sectionId: string, title: string): Promise<Section> =>
    ipcRenderer.invoke('revise:section.rename', { workspaceId, sectionId, title }),
  moveSection: (
    workspaceId: string,
    sectionId: string,
    parentId: string | null,
  ): Promise<Section> =>
    ipcRenderer.invoke('revise:section.move', { workspaceId, sectionId, parentId }),
  reorderSections: (
    workspaceId: string,
    parentId: string | null,
    orderedIds: string[],
  ): Promise<Section[]> =>
    ipcRenderer.invoke('revise:section.reorder', { workspaceId, parentId, orderedIds }),
  deleteSection: (workspaceId: string, sectionId: string): Promise<void> =>
    ipcRenderer.invoke('revise:section.delete', { workspaceId, sectionId }),
  restoreSection: (workspaceId: string, sectionId: string): Promise<Section> =>
    ipcRenderer.invoke('revise:section.restore', { workspaceId, sectionId }),
  openSection: (
    workspaceId: string,
    sectionId: string,
  ): Promise<{ section: Section; markdown: string; fileHash: string; sessionId: string }> =>
    ipcRenderer.invoke('revise:section.open', { workspaceId, sectionId }),
  saveRichSection: (
    workspaceId: string,
    sectionId: string,
    sessionId: string,
    baseFileHash: string,
    transaction: unknown,
  ): Promise<{ fileHash: string }> =>
    ipcRenderer.invoke('revise:section.saveRich', {
      workspaceId,
      sectionId,
      sessionId,
      baseFileHash,
      transaction,
    }),
  insertYoutube: (
    workspaceId: string,
    sectionId: string,
    url: string,
  ): Promise<{ markdownLink: string }> =>
    ipcRenderer.invoke('revise:section.insertYoutube', { workspaceId, sectionId, url }),
  insertLocalVideo: (
    workspaceId: string,
    sectionId: string,
  ): Promise<{ markdownLink: string; relativeLink: string } | null> =>
    ipcRenderer.invoke('revise:section.insertLocalVideo', { workspaceId, sectionId }),
  openYoutube: (url: string): Promise<void> =>
    ipcRenderer.invoke('revise:media.openYoutube', { url }),
  openLocalVideo: (workspaceId: string, sectionId: string, relativeLink: string): Promise<void> =>
    ipcRenderer.invoke('revise:section.openLocalVideo', { workspaceId, sectionId, relativeLink }),
  onWorkspaceActivity: (listener: (activity: WorkspaceActivity) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, activity: WorkspaceActivity) =>
      listener(activity);
    ipcRenderer.on('revise:workspace.activity', handler);
    return () => ipcRenderer.off('revise:workspace.activity', handler);
  },
  onMenuAction: (listener: (action: NativeMenuAction) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, action: NativeMenuAction) =>
      listener(action);
    ipcRenderer.on('revise:menu.action', handler);
    return () => ipcRenderer.off('revise:menu.action', handler);
  },
});
