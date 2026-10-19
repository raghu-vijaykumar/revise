import { z } from 'zod';
import { sha256Schema, workspaceIdSchema } from './workspace';

const webUrlSchema = z.url().refine((value) => {
  const protocol = new URL(value).protocol;
  return protocol === 'https:' || protocol === 'http:';
}, 'Expected an HTTP(S) source URL');

export const sourceLocatorSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('url'), url: webUrlSchema }),
  z.object({ kind: z.literal('page'), page: z.int().positive() }),
  z.object({ kind: z.literal('timestamp'), milliseconds: z.int().nonnegative() }),
  z.object({
    kind: z.literal('imageRegion'),
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    width: z.number().positive().max(1),
    height: z.number().positive().max(1),
  }),
]);

export const sourceCardSchema = z.object({
  id: z.uuid(),
  workspaceId: workspaceIdSchema,
  type: z.enum(['paste', 'file', 'web', 'audio', 'video', 'image', 'pdf']),
  uriOrName: z.string().min(1),
  contentHash: sha256Schema.optional(),
  capturedAt: z.iso.datetime(),
  status: z.enum(['pending', 'ready', 'failed']),
});

export const citationSchema = z.object({
  id: z.uuid(),
  workspaceId: workspaceIdSchema,
  sectionId: z.uuid(),
  blockId: z.uuid(),
  sourceId: z.uuid(),
  locator: sourceLocatorSchema,
  quoteHash: sha256Schema,
});

export type SourceLocator = z.infer<typeof sourceLocatorSchema>;
export type SourceCard = z.infer<typeof sourceCardSchema>;
