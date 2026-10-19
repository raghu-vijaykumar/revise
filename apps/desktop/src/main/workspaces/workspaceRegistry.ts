import { randomUUID } from 'node:crypto';
import {
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  realpath,
  rename,
  stat,
  unlink,
} from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import {
  contentCollectionSchema,
  workspaceNameSchema,
  workspaceSchema,
  type ContentCollection,
  type Workspace,
} from '@revise/core';
import { z } from 'zod';

const registrySchema = z.object({
  version: z.literal(1),
  collections: z.array(contentCollectionSchema),
  workspaces: z.array(workspaceSchema),
});
type RegistryData = z.infer<typeof registrySchema>;
const EMPTY: RegistryData = { version: 1, collections: [], workspaces: [] };

export class WorkspaceUnavailableError extends Error {}
export class WorkspaceCollisionError extends Error {}

async function writeJsonAtomic(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  const file = await open(temporary, 'wx');
  try {
    await file.writeFile(JSON.stringify(value, null, 2), 'utf8');
    await file.sync();
  } finally {
    await file.close();
  }
  try {
    await rename(temporary, path);
  } catch (error) {
    await unlink(temporary).catch(() => undefined);
    throw error;
  }
}

function immediateChild(parent: string, folderName: string): string {
  const target = resolve(parent, folderName);
  const fromParent = relative(parent, target);
  if (
    !fromParent ||
    fromParent === '..' ||
    fromParent.startsWith(`..${sep}`) ||
    isAbsolute(fromParent) ||
    fromParent.includes(sep)
  ) {
    throw new WorkspaceUnavailableError(
      'Workspace folder is not an immediate child of its collection',
    );
  }
  return target;
}

export class WorkspaceRegistry {
  private constructor(
    private readonly registryPath: string,
    private data: RegistryData,
  ) {}

  static async open(userDataPath: string): Promise<WorkspaceRegistry> {
    const path = join(userDataPath, 'workspace-registry.json');
    let data: RegistryData;
    try {
      data = registrySchema.parse(JSON.parse(await readFile(path, 'utf8')));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      data = structuredClone(EMPTY);
    }
    const registry = new WorkspaceRegistry(path, data);
    await registry.reconcileKnownFolders();
    return registry;
  }

  listCollections(): ContentCollection[] {
    return structuredClone(this.data.collections);
  }

  listWorkspaces(collectionId: string): Workspace[] {
    this.requireCollection(collectionId);
    return structuredClone(
      this.data.workspaces.filter((workspace) => workspace.collectionId === collectionId),
    );
  }

  getWorkspace(id: string): Workspace {
    const found = this.data.workspaces.find((workspace) => workspace.id === id);
    if (!found) throw new WorkspaceUnavailableError('Unknown workspace');
    return structuredClone(found);
  }

  async registerCollection(selectedParentPath: string): Promise<ContentCollection> {
    const parentPath = await realpath(selectedParentPath);
    if (!(await stat(parentPath)).isDirectory())
      throw new WorkspaceUnavailableError('Content folder is not a directory');
    const existing = this.data.collections.find(
      (collection) => collection.parentPath.toLowerCase() === parentPath.toLowerCase(),
    );
    if (existing) return structuredClone(existing);
    const collection: ContentCollection = {
      id: randomUUID(),
      parentPath,
      workspaceIds: [],
      lastActiveWorkspaceId: null,
    };
    this.data.collections.push(collection);
    await this.persist();
    return structuredClone(collection);
  }

  async relocateCollection(id: string, selectedParentPath: string): Promise<ContentCollection> {
    const collection = this.requireCollection(id);
    const nextParent = await realpath(selectedParentPath);
    if (!(await stat(nextParent)).isDirectory()) {
      throw new WorkspaceUnavailableError('Content folder is not a directory');
    }
    if (
      this.data.collections.some(
        (entry) => entry.id !== id && entry.parentPath.toLowerCase() === nextParent.toLowerCase(),
      )
    ) {
      throw new WorkspaceCollisionError('Content folder is already registered');
    }
    // Check existing workspace identities before rebinding a collection path.
    for (const workspace of this.data.workspaces.filter((entry) => entry.collectionId === id)) {
      const root = immediateChild(nextParent, workspace.folderName);
      try {
        const metadata = workspaceSchema.parse(
          JSON.parse(await readFile(join(root, '.ai-notes', 'workspace.json'), 'utf8')),
        );
        if (metadata.id !== workspace.id) {
          throw new WorkspaceUnavailableError('Selected folder has another workspace identity');
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
        throw error;
      }
    }
    collection.parentPath = nextParent;
    await this.persist();
    return structuredClone(collection);
  }

  async createWorkspace(collectionId: string, rawName: string): Promise<Workspace> {
    const folderName = workspaceNameSchema.parse(rawName);
    const collection = this.requireCollection(collectionId);
    const parent = await this.availableParent(collection);
    if (await this.folderNameTaken(parent, folderName))
      throw new WorkspaceCollisionError('Workspace folder already exists');
    const root = immediateChild(parent, folderName);
    await mkdir(root);
    const workspace: Workspace = {
      id: randomUUID(),
      collectionId,
      folderName,
      displayName: rawName,
      settingsVersion: 1,
    };
    await writeJsonAtomic(join(root, '.ai-notes', 'workspace.json'), workspace);
    this.data.workspaces.push(workspace);
    collection.workspaceIds.push(workspace.id);
    if (!collection.lastActiveWorkspaceId) collection.lastActiveWorkspaceId = workspace.id;
    await this.persist();
    return structuredClone(workspace);
  }

  async renameWorkspace(id: string, rawName: string): Promise<Workspace> {
    const newName = workspaceNameSchema.parse(rawName);
    const workspace = this.requireWorkspace(id);
    const oldRoot = await this.resolveWorkspaceRoot(id);
    const collection = this.requireCollection(workspace.collectionId);
    const parent = await this.availableParent(collection);
    if (
      workspace.folderName.toLowerCase() !== newName.toLowerCase() &&
      (await this.folderNameTaken(parent, newName))
    ) {
      throw new WorkspaceCollisionError('Workspace folder already exists');
    }
    const nextRoot = immediateChild(parent, newName);
    if (oldRoot !== nextRoot) await rename(oldRoot, nextRoot);
    workspace.folderName = newName;
    workspace.displayName = rawName;
    await writeJsonAtomic(join(nextRoot, '.ai-notes', 'workspace.json'), workspace);
    await this.persist();
    return structuredClone(workspace);
  }

  async setLastActive(workspaceId: string): Promise<void> {
    const workspace = this.requireWorkspace(workspaceId);
    const collection = this.requireCollection(workspace.collectionId);
    collection.lastActiveWorkspaceId = workspaceId;
    await this.persist();
  }

  async resolveWorkspaceRoot(id: string): Promise<string> {
    const workspace = this.requireWorkspace(id);
    const collection = this.requireCollection(workspace.collectionId);
    const parent = await this.availableParent(collection);
    const root = immediateChild(parent, workspace.folderName);
    try {
      if ((await lstat(root)).isSymbolicLink() || !(await stat(root)).isDirectory()) {
        throw new WorkspaceUnavailableError('Workspace folder is not a directory');
      }
      const privateDirectory = join(root, '.ai-notes');
      if ((await lstat(privateDirectory)).isSymbolicLink()) {
        throw new WorkspaceUnavailableError('Workspace metadata folder is linked elsewhere');
      }
      const metadata = workspaceSchema.parse(
        JSON.parse(await readFile(join(privateDirectory, 'workspace.json'), 'utf8')),
      );
      if (metadata.id !== id || metadata.collectionId !== collection.id) {
        throw new WorkspaceUnavailableError(
          'Workspace folder identity does not match the registry',
        );
      }
      return root;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new WorkspaceUnavailableError('Workspace folder is unavailable');
      }
      throw error;
    }
  }

  private requireWorkspace(id: string): Workspace {
    const workspace = this.data.workspaces.find((entry) => entry.id === id);
    if (!workspace) throw new WorkspaceUnavailableError('Unknown workspace');
    return workspace;
  }

  private requireCollection(id: string): ContentCollection {
    const collection = this.data.collections.find((entry) => entry.id === id);
    if (!collection) throw new WorkspaceUnavailableError('Unknown content collection');
    return collection;
  }

  private async availableParent(collection: ContentCollection): Promise<string> {
    try {
      const parent = await realpath(collection.parentPath);
      if (!(await stat(parent)).isDirectory())
        throw new WorkspaceUnavailableError('Content folder is not a directory');
      return parent;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new WorkspaceUnavailableError('Content folder is unavailable');
      }
      throw error;
    }
  }

  private async folderNameTaken(parent: string, name: string): Promise<boolean> {
    const entries = await readdir(parent);
    return entries.some((entry) => entry.toLowerCase() === name.toLowerCase());
  }

  private async reconcileKnownFolders(): Promise<void> {
    let changed = false;
    const discovered = new Set<string>();
    for (const collection of this.data.collections) {
      let parent: string;
      try {
        parent = await this.availableParent(collection);
      } catch (error) {
        if (error instanceof WorkspaceUnavailableError) continue;
        throw error;
      }
      for (const entry of await readdir(parent, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const metadataPath = join(parent, entry.name, '.ai-notes', 'workspace.json');
        let metadata: Workspace;
        try {
          metadata = workspaceSchema.parse(JSON.parse(await readFile(metadataPath, 'utf8')));
        } catch (error) {
          if (
            (error as NodeJS.ErrnoException).code === 'ENOENT' ||
            error instanceof z.ZodError ||
            error instanceof SyntaxError
          )
            continue;
          throw error;
        }
        if (metadata.collectionId !== collection.id) continue;
        if (discovered.has(metadata.id))
          throw new WorkspaceCollisionError('Duplicate workspace identity on disk');
        discovered.add(metadata.id);
        const existing = this.data.workspaces.find((workspace) => workspace.id === metadata.id);
        if (existing) {
          if (existing.collectionId !== collection.id)
            throw new WorkspaceCollisionError('Workspace ID appears in another collection');
          if (existing.folderName !== entry.name) {
            existing.folderName = entry.name;
            changed = true;
          }
        } else {
          this.data.workspaces.push({ ...metadata, folderName: entry.name });
          changed = true;
        }
        if (!collection.workspaceIds.includes(metadata.id)) {
          collection.workspaceIds.push(metadata.id);
          changed = true;
        }
      }
    }
    if (changed) await this.persist();
  }

  private async persist(): Promise<void> {
    this.data = registrySchema.parse(this.data);
    await writeJsonAtomic(this.registryPath, this.data);
  }
}
