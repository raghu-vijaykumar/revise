import { describe, expect, it } from 'vitest';
import {
  relativeMarkdownPathSchema,
  workspaceNameSchema,
} from '../../packages/core/src/contracts/workspace';
import {
  documentOperationSchema,
  selectionAnchorSchema,
} from '../../packages/core/src/contracts/document';
import { sourceLocatorSchema } from '../../packages/core/src/contracts/source';

const id = '58ac7960-9012-41cf-9d13-ed970417c790';
const hash = 'a'.repeat(64);

describe('workspace and document contracts', () => {
  it('rejects workspace names that could collide with paths or Windows devices', () => {
    expect(workspaceNameSchema.safeParse('Physics').success).toBe(true);
    for (const name of ['..', 'CON', 'Biology/', 'Physics.', ' Physics ', '']) {
      expect(workspaceNameSchema.safeParse(name).success).toBe(false);
    }
  });

  it('accepts nested Markdown paths but rejects escapes and arbitrary files', () => {
    expect(relativeMarkdownPathSchema.safeParse('Mechanics/Newtons Laws.md').success).toBe(true);
    for (const path of ['../private.md', '/outside.md', 'C:/outside.md', 'notes.txt', 'a//b.md']) {
      expect(relativeMarkdownPathSchema.safeParse(path).success).toBe(false);
    }
  });

  it('requires a real target and hash before changing an existing block', () => {
    const operation = {
      id,
      workspaceId: id,
      sectionId: id,
      baseFileHash: hash,
      kind: 'update',
      replacementMarkdown: 'A revised statement',
      reason: 'Clarify the example',
      citationIds: [],
    };
    expect(documentOperationSchema.safeParse(operation).success).toBe(false);
    expect(
      documentOperationSchema.safeParse({
        ...operation,
        targetBlockId: id,
        expectedSourceHash: hash,
      }).success,
    ).toBe(true);
  });

  it('rejects inverted selection ranges and unsupported source locators', () => {
    const anchor = {
      workspaceId: id,
      sectionId: id,
      baseFileHash: hash,
      blockId: id,
      selectedQuoteHash: hash,
      relativeRange: { from: 8, to: 2 },
    };
    expect(selectionAnchorSchema.safeParse(anchor).success).toBe(false);
    expect(sourceLocatorSchema.safeParse({ kind: 'url', url: 'javascript:alert(1)' }).success).toBe(
      false,
    );
    expect(sourceLocatorSchema.safeParse({ kind: 'page', page: 3 }).success).toBe(true);
  });
});
