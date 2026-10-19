import { describe, expect, it } from 'vitest';
import {
  commandSchemas,
  assertWorkspaceOwner,
  workspaceActivityEventSchema,
} from '../../packages/core/src/contracts/ipc';

const physics = '58ac7960-9012-41cf-9d13-ed970417c790';
const biology = '6a77bdb5-9f22-4b94-bb40-5bdf0e1329f4';

describe('privileged command boundary', () => {
  it('rejects a section command that claims another workspace', () => {
    const input = { workspaceId: physics, sectionId: biology };
    expect(commandSchemas['section.open'].parse(input)).toEqual(input);
    expect(() => assertWorkspaceOwner(physics, biology)).toThrow('Workspace owner mismatch');
    expect(() => assertWorkspaceOwner(physics, physics)).not.toThrow();
  });

  it('rejects malformed or unscoped agent requests', () => {
    expect(
      commandSchemas['agent.start'].safeParse({ sectionId: physics, prompt: 'Explain this' })
        .success,
    ).toBe(false);
    expect(
      commandSchemas['agent.start'].safeParse({
        workspaceId: physics,
        sectionId: biology,
        providerId: 'cloud',
        prompt: '',
        contextManifest: { workspaceId: biology, sectionIds: [] },
      }).success,
    ).toBe(false);
  });

  it('keeps background activity labeled with its origin workspace', () => {
    expect(
      workspaceActivityEventSchema.safeParse({
        workspaceId: physics,
        pendingSaveIds: [],
        pendingRunIds: [biology],
        lastError: null,
        sequence: 2,
      }).success,
    ).toBe(true);
  });
});
