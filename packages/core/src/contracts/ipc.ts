import { z } from 'zod';
import { sectionIdSchema, sha256Schema, workspaceIdSchema, workspaceNameSchema } from './workspace';
import { reviewDecisionSchema, selectionAnchorSchema } from './document';

const collectionIdSchema = z.uuid();
const sectionTargetSchema = z.object({
  workspaceId: workspaceIdSchema,
  sectionId: sectionIdSchema,
});

export const commandSchemas = {
  'collection.chooseFolder': z.object({}),
  'workspace.list': z.object({ collectionId: collectionIdSchema }),
  'workspace.create': z.object({
    collectionId: collectionIdSchema,
    displayName: workspaceNameSchema,
  }),
  'workspace.switch': z.object({ workspaceId: workspaceIdSchema }),
  'section.open': sectionTargetSchema,
  'section.saveRich': sectionTargetSchema.extend({
    baseFileHash: sha256Schema,
    transaction: z.unknown(),
  }),
  'agent.start': sectionTargetSchema
    .extend({
      providerId: z.string().min(1),
      prompt: z.string().min(1),
      contextManifest: z.object({
        workspaceId: workspaceIdSchema,
        sectionIds: z.array(sectionIdSchema),
      }),
      selectionAnchor: selectionAnchorSchema.optional(),
    })
    .refine((input) => input.contextManifest.workspaceId === input.workspaceId, {
      message: 'Agent context belongs to another workspace',
    }),
  'review.decide': reviewDecisionSchema,
  'history.list': sectionTargetSchema.extend({ cursor: z.string().optional() }),
  'workspace.exportBasic': z.object({ workspaceId: workspaceIdSchema }),
} as const;

export const workspaceActivityEventSchema = z.object({
  workspaceId: workspaceIdSchema,
  pendingSaveIds: z.array(z.uuid()),
  pendingRunIds: z.array(z.uuid()),
  lastError: z.string().nullable(),
  sequence: z.int().nonnegative(),
});

export function assertWorkspaceOwner(
  requestedWorkspaceId: string,
  actualWorkspaceId: string,
): void {
  if (requestedWorkspaceId !== actualWorkspaceId) throw new Error('Workspace owner mismatch');
}

export type CommandName = keyof typeof commandSchemas;
export type CommandInput<K extends CommandName> = z.infer<(typeof commandSchemas)[K]>;
