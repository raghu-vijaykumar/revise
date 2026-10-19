import { z } from 'zod';
import { sectionIdSchema, sha256Schema, workspaceIdSchema, workspaceNameSchema } from './workspace';
import { reviewDecisionSchema, selectionAnchorSchema } from './document';

const collectionIdSchema = z.uuid();
const sectionTargetSchema = z.object({
  workspaceId: workspaceIdSchema,
  sectionId: sectionIdSchema,
});
const sectionTitleSchema = z.string().trim().min(1).max(200);

export const commandSchemas = {
  'collection.list': z.object({}),
  'collection.chooseFolder': z.object({}),
  'collection.relocate': z.object({ collectionId: collectionIdSchema }),
  'workspace.list': z.object({ collectionId: collectionIdSchema }),
  'workspace.create': z.object({
    collectionId: collectionIdSchema,
    displayName: workspaceNameSchema,
  }),
  'workspace.rename': z.object({
    workspaceId: workspaceIdSchema,
    displayName: workspaceNameSchema,
  }),
  'workspace.switch': z.object({ workspaceId: workspaceIdSchema }),
  'chat.readDraft': z.object({ workspaceId: workspaceIdSchema }),
  'chat.saveDraft': z.object({ workspaceId: workspaceIdSchema, draft: z.string().max(10000) }),
  'section.list': z.object({ workspaceId: workspaceIdSchema }),
  'section.create': z.object({
    workspaceId: workspaceIdSchema,
    title: sectionTitleSchema,
    parentId: sectionIdSchema.nullable().default(null),
  }),
  'section.rename': sectionTargetSchema.extend({ title: sectionTitleSchema }),
  'section.move': sectionTargetSchema.extend({ parentId: sectionIdSchema.nullable() }),
  'section.reorder': z.object({
    workspaceId: workspaceIdSchema,
    parentId: sectionIdSchema.nullable(),
    orderedIds: z.array(sectionIdSchema),
  }),
  'section.delete': sectionTargetSchema,
  'section.restore': sectionTargetSchema,
  'section.open': sectionTargetSchema,
  'section.insertYoutube': sectionTargetSchema.extend({ url: z.url() }),
  'section.insertLocalVideo': sectionTargetSchema,
  'section.openLocalVideo': sectionTargetSchema.extend({ relativeLink: z.string().min(1) }),
  'media.openYoutube': z.object({ url: z.url() }),
  'section.saveRich': sectionTargetSchema.extend({
    sessionId: z.uuid(),
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
