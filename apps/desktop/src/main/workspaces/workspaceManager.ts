import { randomUUID } from 'node:crypto';
import type { Workspace } from '@revise/core';
import { WorkspaceRegistry } from './workspaceRegistry';

export type WorkspaceActivity = {
  workspaceId: string;
  pendingSaveIds: string[];
  pendingRunIds: string[];
  lastError: string | null;
  sequence: number;
};

type JobKind = 'save' | 'run';

export class WorkspaceManager {
  private activeWorkspaceId: string | null = null;
  private readonly activities = new Map<string, WorkspaceActivity>();
  private readonly listeners = new Set<(activity: WorkspaceActivity) => void>();

  constructor(private readonly registry: WorkspaceRegistry) {}

  getActiveWorkspaceId(): string | null {
    return this.activeWorkspaceId;
  }

  activityFor(workspaceId: string): WorkspaceActivity {
    this.registry.getWorkspace(workspaceId);
    return structuredClone(this.ensureActivity(workspaceId));
  }

  subscribe(listener: (activity: WorkspaceActivity) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async renameWorkspace(workspaceId: string, displayName: string): Promise<Workspace> {
    const activity = this.activityFor(workspaceId);
    if (activity.pendingSaveIds.length || activity.pendingRunIds.length) {
      throw new Error('Wait for workspace activity before renaming its folder');
    }
    return this.registry.renameWorkspace(workspaceId, displayName);
  }

  async switchWorkspace(
    workspaceId: string,
    checkpointDrafts: (originWorkspaceId: string) => Promise<void> = async () => undefined,
  ): Promise<{ workspace: Workspace; activity: WorkspaceActivity }> {
    const workspace = this.registry.getWorkspace(workspaceId);
    await this.registry.resolveWorkspaceRoot(workspaceId);
    const origin = this.activeWorkspaceId;
    if (origin && origin !== workspaceId) {
      // A failed durable checkpoint keeps the original workspace selected.
      await checkpointDrafts(origin);
    }
    await this.registry.setLastActive(workspaceId);
    this.activeWorkspaceId = workspaceId;
    return { workspace, activity: this.activityFor(workspaceId) };
  }

  async runInWorkspace<T>(
    workspaceId: string,
    kind: JobKind,
    work: (workspaceRoot: string, jobId: string) => Promise<T>,
  ): Promise<T> {
    const root = await this.registry.resolveWorkspaceRoot(workspaceId);
    const jobId = randomUUID();
    const activity = this.ensureActivity(workspaceId);
    const pending = kind === 'save' ? activity.pendingSaveIds : activity.pendingRunIds;
    pending.push(jobId);
    this.emit(activity);
    try {
      const result = await work(root, jobId);
      activity.lastError = null;
      return result;
    } catch (error) {
      // Private content and provider details stay out of workspace activity events.
      activity.lastError = kind === 'save' ? 'Background save failed' : 'AI run failed';
      throw error;
    } finally {
      const position = pending.indexOf(jobId);
      if (position >= 0) pending.splice(position, 1);
      this.emit(activity);
    }
  }

  private ensureActivity(workspaceId: string): WorkspaceActivity {
    let activity = this.activities.get(workspaceId);
    if (!activity) {
      activity = {
        workspaceId,
        pendingSaveIds: [],
        pendingRunIds: [],
        lastError: null,
        sequence: 0,
      };
      this.activities.set(workspaceId, activity);
    }
    return activity;
  }

  private emit(activity: WorkspaceActivity): void {
    activity.sequence += 1;
    for (const listener of this.listeners) listener(structuredClone(activity));
  }
}
