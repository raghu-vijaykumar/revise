import { z } from 'zod';
import { sectionIdSchema, sha256Schema, workspaceIdSchema } from './workspace';

export const parsedBlockSchema = z
  .object({
    sidecarId: z.uuid(),
    type: z.string().min(1),
    sourceStart: z.int().nonnegative(),
    sourceEnd: z.int().nonnegative(),
    textHash: sha256Schema,
    parentId: z.uuid().nullable(),
  })
  .refine((block) => block.sourceEnd >= block.sourceStart, 'Invalid source span');

export const selectionAnchorSchema = z.object({
  workspaceId: workspaceIdSchema,
  sectionId: sectionIdSchema,
  baseFileHash: sha256Schema,
  blockId: z.uuid(),
  selectedQuoteHash: sha256Schema,
  relativeRange: z
    .object({ from: z.int().nonnegative(), to: z.int().nonnegative() })
    .refine((range) => range.to > range.from, 'Selection must have length'),
});

export const documentOperationSchema = z
  .object({
    id: z.uuid(),
    workspaceId: workspaceIdSchema,
    sectionId: sectionIdSchema,
    baseFileHash: sha256Schema,
    kind: z.enum(['insert', 'update', 'delete', 'move', 'split', 'merge']),
    targetBlockId: z.uuid().optional(),
    expectedSourceHash: sha256Schema.optional(),
    afterBlockId: z.uuid().optional(),
    replacementMarkdown: z.string().optional(),
    reason: z.string().min(1),
    citationIds: z.array(z.uuid()),
  })
  .superRefine((operation, context) => {
    if (
      operation.kind !== 'insert' &&
      (!operation.targetBlockId || !operation.expectedSourceHash)
    ) {
      context.addIssue({ code: 'custom', message: 'Existing-block edits require target and hash' });
    }
    if (
      ['insert', 'update', 'split', 'merge'].includes(operation.kind) &&
      !operation.replacementMarkdown
    ) {
      context.addIssue({ code: 'custom', message: 'This edit requires replacement Markdown' });
    }
  });

export const selectionAnnotationSchema = z.object({
  id: z.uuid(),
  anchor: selectionAnchorSchema,
  prompt: z.string().min(1),
  status: z.enum(['draft', 'requested', 'proposed', 'conflict', 'cancelled']),
});

export const reviewCommentSchema = z.object({
  id: z.uuid(),
  workspaceId: workspaceIdSchema,
  changeSetId: z.uuid(),
  operationId: z.uuid(),
  author: z.enum(['user', 'agent']),
  body: z.string().min(1),
  createdAt: z.iso.datetime(),
});

export const reviewDecisionSchema = z.object({
  workspaceId: workspaceIdSchema,
  changeSetId: z.uuid(),
  operationId: z.uuid(),
  decision: z.enum(['accept', 'reject']),
  currentFileHash: sha256Schema,
});

export type DocumentOperation = z.infer<typeof documentOperationSchema>;
export type SelectionAnchor = z.infer<typeof selectionAnchorSchema>;
