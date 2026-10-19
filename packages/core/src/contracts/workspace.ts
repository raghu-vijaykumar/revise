import { z } from 'zod';

export const workspaceIdSchema = z.uuid();
export const sectionIdSchema = z.uuid();
export const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/i);

const windowsDevices = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;
export const workspaceNameSchema = z
  .string()
  .min(1)
  .max(100)
  .refine((name) => {
    // The display name is also an immediate child directory of the chosen parent.
    return (
      name === name.trim() &&
      name !== '.' &&
      name !== '..' &&
      !name.endsWith('.') &&
      !/[<>:"/\\|?*\x00-\x1f]/.test(name) &&
      !windowsDevices.test(name)
    );
  }, 'Unsafe workspace folder name');

export const relativeMarkdownPathSchema = z
  .string()
  .min(4)
  .refine((value) => {
    const parts = value.split('/');
    return (
      value.endsWith('.md') &&
      !value.startsWith('/') &&
      !value.includes('\\') &&
      !value.includes(':') &&
      parts.every((part) => part.length > 0 && part !== '.' && part !== '..')
    );
  }, 'Expected a confined relative Markdown path');

export const contentCollectionSchema = z.object({
  id: z.uuid(),
  parentPath: z.string().min(1),
  workspaceIds: z.array(workspaceIdSchema),
  lastActiveWorkspaceId: workspaceIdSchema.nullable(),
});

export const workspaceSchema = z.object({
  id: workspaceIdSchema,
  collectionId: z.uuid(),
  folderName: workspaceNameSchema,
  displayName: z.string().min(1),
  settingsVersion: z.int().positive(),
});

export const sectionSchema = z.object({
  id: sectionIdSchema,
  workspaceId: workspaceIdSchema,
  displayTitle: z.string().min(1),
  parentId: sectionIdSchema.nullable(),
  order: z.int().nonnegative(),
  relativeMarkdownPath: relativeMarkdownPathSchema,
  fileHash: sha256Schema,
});

export type ContentCollection = z.infer<typeof contentCollectionSchema>;
export type Workspace = z.infer<typeof workspaceSchema>;
export type Section = z.infer<typeof sectionSchema>;
