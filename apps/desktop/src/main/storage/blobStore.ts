import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { copyFile, lstat, mkdir, realpath, rename, stat, unlink } from 'node:fs/promises';
import { extname, isAbsolute, join, relative, resolve, sep } from 'node:path';

export async function hashFile(path: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}

export async function confinedDirectory(
  workspaceRoot: string,
  targetDirectory: string,
): Promise<string> {
  const root = await realpath(workspaceRoot);
  const lexicalTarget = resolve(targetDirectory);
  const lexicalFromRoot = relative(root, lexicalTarget);
  if (
    lexicalFromRoot === '..' ||
    lexicalFromRoot.startsWith(`..${sep}`) ||
    isAbsolute(lexicalFromRoot)
  ) {
    throw new Error('Media directory escapes its workspace');
  }
  let current = root;
  for (const part of lexicalFromRoot.split(sep)) {
    current = join(current, part);
    try {
      // Reject an existing junction before recursive mkdir follows it.
      if ((await lstat(current)).isSymbolicLink())
        throw new Error('Linked media directory is unsafe');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  await mkdir(targetDirectory, { recursive: true });
  const target = await realpath(targetDirectory);
  const fromRoot = relative(root, target);
  if (fromRoot === '..' || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)) {
    throw new Error('Media directory escapes its workspace');
  }
  return target;
}

export async function stageVerifiedCopy(
  sourcePath: string,
  targetDirectory: string,
  extension: string,
): Promise<{ contentHash: string; fileName: string; byteLength: number }> {
  const source = await realpath(sourcePath);
  const before = await stat(source);
  if (!before.isFile()) throw new Error('Expected a regular media file');
  const contentHash = await hashFile(source);
  const fileName = `${contentHash}${extension}`;
  const destination = join(targetDirectory, fileName);
  const temporary = join(targetDirectory, `.${randomUUID()}.tmp`);
  try {
    await copyFile(source, temporary);
    const after = await stat(source);
    if (
      after.size !== before.size ||
      after.mtimeMs !== before.mtimeMs ||
      (await hashFile(temporary)) !== contentHash
    ) {
      throw new Error('Media changed during copy');
    }
    try {
      const existing = await stat(destination);
      if (!existing.isFile() || (await hashFile(destination)) !== contentHash) {
        throw new Error('Media destination hash collision');
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      await rename(temporary, destination);
    }
    return { contentHash, fileName, byteLength: before.size };
  } finally {
    await unlink(temporary).catch(() => undefined);
  }
}

export async function stageSourceBlob(
  workspaceRoot: string,
  sourcePath: string,
): Promise<{ contentHash: string; relativePath: string; byteLength: number }> {
  const directory = await confinedDirectory(workspaceRoot, join(workspaceRoot, 'assets', 'blobs'));
  const extension = extname(sourcePath).toLowerCase();
  const staged = await stageVerifiedCopy(sourcePath, directory, extension);
  return {
    contentHash: staged.contentHash,
    relativePath: `assets/blobs/${staged.fileName}`,
    byteLength: staged.byteLength,
  };
}
