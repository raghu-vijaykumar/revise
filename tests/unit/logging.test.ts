import { describe, expect, it } from 'vitest';
import { formatDiagnostic } from '../../apps/desktop/src/main/logging';

describe('diagnostic redaction', () => {
  it('serializes only allowlisted metadata', () => {
    const record = {
      event: 'agent_failed' as const,
      workspaceId: '58ac7960-9012-41cf-9d13-ed970417c790',
      code: 'provider_unavailable' as const,
      secret: 'sk-sensitive',
      sourceText: 'private notes',
    };
    const line = formatDiagnostic(record);
    expect(line).toContain('provider_unavailable');
    expect(line).not.toContain('sk-sensitive');
    expect(line).not.toContain('private notes');
  });
});
