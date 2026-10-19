import type { ContentCollection, Section, Workspace } from '@revise/core';
import type { WorkspaceActivity } from '../main/workspaces/workspaceManager';
import type { NativeMenuAction } from './menu';

export {};

declare global {
  interface Window {
    revise: {
      appVersion: string;
      chooseContentFolder(): Promise<string | null>;
      listCollections(): Promise<ContentCollection[]>;
      relocateCollection(collectionId: string): Promise<ContentCollection | null>;
      listWorkspaces(
        collectionId: string,
      ): Promise<Array<{ workspace: Workspace; activity: WorkspaceActivity; available: boolean }>>;
      createWorkspace(collectionId: string, displayName: string): Promise<Workspace>;
      renameWorkspace(workspaceId: string, displayName: string): Promise<Workspace>;
      switchWorkspace(
        workspaceId: string,
      ): Promise<{ workspace: Workspace; activity: WorkspaceActivity }>;
      readChatDraft(workspaceId: string): Promise<string>;
      saveChatDraft(workspaceId: string, draft: string): Promise<void>;
      listSections(workspaceId: string): Promise<Section[]>;
      createSection(workspaceId: string, title: string, parentId?: string | null): Promise<Section>;
      renameSection(workspaceId: string, sectionId: string, title: string): Promise<Section>;
      moveSection(
        workspaceId: string,
        sectionId: string,
        parentId: string | null,
      ): Promise<Section>;
      reorderSections(
        workspaceId: string,
        parentId: string | null,
        orderedIds: string[],
      ): Promise<Section[]>;
      deleteSection(workspaceId: string, sectionId: string): Promise<void>;
      restoreSection(workspaceId: string, sectionId: string): Promise<Section>;
      openSection(
        workspaceId: string,
        sectionId: string,
      ): Promise<{ section: Section; markdown: string; fileHash: string; sessionId: string }>;
      saveRichSection(
        workspaceId: string,
        sectionId: string,
        sessionId: string,
        baseFileHash: string,
        transaction: unknown,
      ): Promise<{ fileHash: string }>;
      insertYoutube(
        workspaceId: string,
        sectionId: string,
        url: string,
      ): Promise<{ markdownLink: string }>;
      insertLocalVideo(
        workspaceId: string,
        sectionId: string,
      ): Promise<{ markdownLink: string; relativeLink: string } | null>;
      openYoutube(url: string): Promise<void>;
      openLocalVideo(workspaceId: string, sectionId: string, relativeLink: string): Promise<void>;
      onWorkspaceActivity(listener: (activity: WorkspaceActivity) => void): () => void;
      onMenuAction(listener: (action: NativeMenuAction) => void): () => void;
    };
  }
}
