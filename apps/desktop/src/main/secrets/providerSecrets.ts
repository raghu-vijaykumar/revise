import { randomUUID } from 'node:crypto';
import { mkdir, open, readFile, rename, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { safeStorage } from 'electron';

function providerName(providerId: string): string {
  if (!/^[a-z0-9_-]{1,64}$/i.test(providerId)) throw new Error('Invalid provider ID');
  return providerId;
}

export class ProviderSecrets {
  private pending: Promise<void> = Promise.resolve();
  private readonly path: string;

  constructor(profilePath: string) {
    // Profile storage is deliberately separate from workspace Markdown and exports.
    this.path = join(profilePath, 'provider-secrets.json');
  }

  private async readEncrypted(): Promise<Record<string, string>> {
    try {
      const parsed: unknown = JSON.parse(await readFile(this.path, 'utf8'));
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
        throw new Error('Invalid secret store');
      const entries = Object.entries(parsed);
      if (
        !entries.every(
          ([key, value]) => /^[a-z0-9_-]{1,64}$/i.test(key) && typeof value === 'string',
        )
      ) {
        throw new Error('Invalid secret store');
      }
      return Object.fromEntries(entries);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {};
      throw error;
    }
  }

  async get(providerId: string): Promise<string | null> {
    await this.pending;
    const stored = (await this.readEncrypted())[providerName(providerId)];
    if (!stored) return null;
    if (!(await safeStorage.isAsyncEncryptionAvailable()))
      throw new Error('OS encryption unavailable');
    const result = await safeStorage.decryptStringAsync(Buffer.from(stored, 'base64'));
    if (result.shouldReEncrypt) await this.set(providerId, result.result);
    return result.result;
  }

  async set(providerId: string, secret: string): Promise<void> {
    const operation = this.pending.then(async () => {
      const key = providerName(providerId);
      if (!(await safeStorage.isAsyncEncryptionAvailable()))
        throw new Error('OS encryption unavailable');
      const encrypted = (await safeStorage.encryptStringAsync(secret)).toString('base64');
      const values = await this.readEncrypted();
      values[key] = encrypted;
      await mkdir(join(this.path, '..'), { recursive: true });
      const temporary = `${this.path}.${randomUUID()}.tmp`;
      try {
        const file = await open(temporary, 'wx', 0o600);
        try {
          await file.writeFile(JSON.stringify(values), 'utf8');
          await file.sync();
        } finally {
          await file.close();
        }
        await rename(temporary, this.path);
      } catch (error) {
        await unlink(temporary).catch(() => undefined);
        throw error;
      }
    });
    this.pending = operation.then(
      () => undefined,
      () => undefined,
    );
    return operation;
  }
}
