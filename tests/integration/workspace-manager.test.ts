import { mkdtemp, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { WorkspaceManager } from '../../apps/desktop/src/main/workspaces/workspaceManager';
import {
  WorkspaceCollisionError,
  WorkspaceRegistry,
  WorkspaceUnavailableError,
} from '../../apps/desktop/src/main/workspaces/workspaceRegistry';

const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'revise-workspaces-'));
  roots.push(root);
  const parent = join(root, 'collection');
  await mkdir(parent);
  const registry = await WorkspaceRegistry.open(join(root, 'app-data'));
  const collection = await registry.registerCollection(parent);
  return { root, parent, registry, collection };
}

describe('content collections and workspaces', () => {
  it('persists separate immediate subfolders and stable IDs across restart', async () => {
    const { root, parent, registry, collection } = await fixture();
    const physics = await registry.createWorkspace(collection.id, 'Physics');
    const biology = await registry.createWorkspace(collection.id, 'Biology');
    expect(await registry.resolveWorkspaceRoot(physics.id)).toBe(join(parent, 'Physics'));
    expect(await registry.resolveWorkspaceRoot(biology.id)).toBe(join(parent, 'Biology'));
    const reopened = await WorkspaceRegistry.open(join(root, 'app-data'));
    expect(reopened.listWorkspaces(collection.id).map((workspace) => workspace.id)).toEqual([
      physics.id,
      biology.id,
    ]);
    expect((await reopened.registerCollection(parent)).id).toBe(collection.id);
  });

  it('renames the folder safely, catches case-insensitive collisions, and detects missing storage', async () => {
    const { parent, registry, collection } = await fixture();
    const physics = await registry.createWorkspace(collection.id, 'Physics');
    await registry.createWorkspace(collection.id, 'Biology');
    await expect(registry.createWorkspace(collection.id, 'physics')).rejects.toBeInstanceOf(
      WorkspaceCollisionError,
    );
    await expect(registry.renameWorkspace(physics.id, 'Biology')).rejects.toBeInstanceOf(
      WorkspaceCollisionError,
    );
    await expect(registry.createWorkspace(collection.id, '../escape')).rejects.toThrow();
    expect((await registry.renameWorkspace(physics.id, 'Mechanics')).id).toBe(physics.id);
    expect(await registry.resolveWorkspaceRoot(physics.id)).toBe(join(parent, 'Mechanics'));
    await rename(join(parent, 'Mechanics'), join(parent, 'moved-away'));
    await expect(registry.resolveWorkspaceRoot(physics.id)).rejects.toBeInstanceOf(
      WorkspaceUnavailableError,
    );
  });

  it('recovers registry metadata after a folder operation completed before registry persistence', async () => {
    const { root, parent, registry, collection } = await fixture();
    const physics = await registry.createWorkspace(collection.id, 'Physics');
    const registryPath = join(root, 'app-data', 'workspace-registry.json');
    const oldData = JSON.parse(await readFile(registryPath, 'utf8')) as {
      workspaces: unknown[];
      collections: Array<{ workspaceIds: string[] }>;
    };
    oldData.workspaces = [];
    oldData.collections[0]!.workspaceIds = [];
    await writeFile(registryPath, JSON.stringify(oldData));
    const reopened = await WorkspaceRegistry.open(join(root, 'app-data'));
    expect(reopened.listWorkspaces(collection.id)[0]?.id).toBe(physics.id);
    await rename(join(parent, 'Physics'), join(parent, 'Mechanics'));
    const renamedOnDisk = await WorkspaceRegistry.open(join(root, 'app-data'));
    expect(renamedOnDisk.getWorkspace(physics.id).folderName).toBe('Mechanics');
  });

  it('locates a moved content folder using persisted workspace identities', async () => {
    const { root, parent, registry, collection } = await fixture();
    const physics = await registry.createWorkspace(collection.id, 'Physics');
    const moved = join(root, 'relocated-content');
    await rename(parent, moved);
    await expect(registry.resolveWorkspaceRoot(physics.id)).rejects.toBeInstanceOf(
      WorkspaceUnavailableError,
    );
    expect((await registry.relocateCollection(collection.id, moved)).parentPath).toBe(moved);
    expect(await registry.resolveWorkspaceRoot(physics.id)).toBe(join(moved, 'Physics'));
  });

  it('keeps background work bound to its origin and refuses a switch after checkpoint failure', async () => {
    const { registry, collection } = await fixture();
    const physics = await registry.createWorkspace(collection.id, 'Physics');
    const biology = await registry.createWorkspace(collection.id, 'Biology');
    const manager = new WorkspaceManager(registry);
    await manager.switchWorkspace(physics.id);
    let finish!: () => void;
    let started!: () => void;
    const entered = new Promise<void>((resolve) => {
      started = resolve;
    });
    const work = manager.runInWorkspace(physics.id, 'save', async () => {
      started();
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
    });
    await entered;
    expect(manager.activityFor(physics.id).pendingSaveIds).toHaveLength(1);
    await expect(
      manager.switchWorkspace(biology.id, async () => {
        throw new Error('Checkpoint failed');
      }),
    ).rejects.toThrow('Checkpoint failed');
    expect(manager.getActiveWorkspaceId()).toBe(physics.id);
    await manager.switchWorkspace(biology.id, async () => undefined);
    expect(manager.getActiveWorkspaceId()).toBe(biology.id);
    finish();
    await work;
    expect(manager.activityFor(physics.id).pendingSaveIds).toEqual([]);
    expect(manager.activityFor(biology.id).sequence).toBe(0);
  });
});
