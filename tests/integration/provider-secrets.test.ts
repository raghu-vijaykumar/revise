import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const safe = vi.hoisted(() => ({ available: true }));
vi.mock('electron', () => ({
  safeStorage: {
    isAsyncEncryptionAvailable: async () => safe.available,
    encryptStringAsync: async (plain: string) => Buffer.from(`encrypted:${plain}`),
    decryptStringAsync: async (buffer: Buffer) => ({
      result: buffer.toString().replace(/^encrypted:/, ''),
      shouldReEncrypt: false,
    }),
  },
}));

import { ProviderSecrets } from '../../apps/desktop/src/main/secrets/providerSecrets';

const roots: string[] = [];
afterEach(async () => {
  safe.available = true;
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

describe('provider secret store', () => {
  it('persists encrypted credentials outside a workspace', async () => {
    const profile = await mkdtemp(join(tmpdir(), 'revise-profile-'));
    roots.push(profile);
    const store = new ProviderSecrets(profile);
    await store.set('cloud', 'test-super-secret');
    expect(await store.get('cloud')).toBe('test-super-secret');
    expect(await new ProviderSecrets(profile).get('cloud')).toBe('test-super-secret');
    const disk = await readFile(join(profile, 'provider-secrets.json'), 'utf8');
    expect(disk).not.toContain('test-super-secret');
  });

  it('refuses a plaintext fallback when OS encryption is unavailable', async () => {
    const profile = await mkdtemp(join(tmpdir(), 'revise-profile-'));
    roots.push(profile);
    safe.available = false;
    await expect(new ProviderSecrets(profile).set('cloud', 'key')).rejects.toThrow('unavailable');
  });
});
