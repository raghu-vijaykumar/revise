import { MarkdownManager } from '@tiptap/markdown';
import StarterKit from '@tiptap/starter-kit';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { documentOperationSchema } from '../../packages/core/src/contracts/document';
import { applyDocumentOperations } from '../../packages/core/src/documents/changeEngine';
import { parseMarkdown } from '../../packages/core/src/documents/parseMarkdown';
import { hashText } from '../../packages/core/src/documents/text';
import {
  createRichProjection,
  serializeRichProjection,
  type RichDocument,
} from '../../packages/core/src/documents/renderMarkdown';
import { resolveSectionPath } from '../../apps/desktop/src/main/storage/markdownFiles';

const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

describe('rich editor and canonical Markdown boundary', () => {
  it('patches only changed rich blocks and protects unsupported source syntax', () => {
    const codec = new MarkdownManager({ extensions: [StarterKit] });
    const parse = (markdown: string) => codec.parse(markdown) as RichDocument;
    const serialize = (document: RichDocument) => codec.serialize(document);
    const source =
      '# Motion\r\n\r\nA **bold** sentence.\r\n\r\n:::future-widget\r\nopaque input\r\n:::\r\n';
    const projection = createRichProjection(source, parse);
    expect(projection.document.content.at(-1)?.type).toBe('opaqueMarkdown');
    const edited = structuredClone(projection.document);
    edited.content[1]!.content![0]!.text = 'A clearer sentence.';
    const result = serializeRichProjection(projection, edited, serialize);
    expect(result).toContain('# Motion\r\n\r\n');
    expect(result).toContain(':::future-widget\r\nopaque input\r\n:::');
    expect(result).toContain('A clearer sentence.');
    const erased = structuredClone(projection.document);
    erased.content.pop();
    expect(() => serializeRichProjection(projection, erased, serialize)).toThrow(
      'Protected Markdown',
    );
  });

  it('roundtrips supported rich formatting while source spans retain future syntax', () => {
    const editorCodec = new MarkdownManager({ extensions: [StarterKit] });
    const source =
      '# Motion\n\nA **bold** note with [video](https://www.youtube.com/watch?v=abc123).\n\n- First\n- Second\n\n[Local](./.assets/section-1/clip.mp4)\n\n:::future-widget\nopaque input\n:::\n';
    const rich = editorCodec.parse(source);
    const serialized = editorCodec.serialize(rich);
    expect(serialized).toContain('# Motion');
    expect(serialized).toContain('**bold**');
    expect(serialized).toContain('https://www.youtube.com/watch?v=abc123');
    expect(serialized).toContain('./.assets/section-1/clip.mp4');
    const blocks = parseMarkdown(source).blocks;
    const heading = blocks[0]!;
    const identified = blocks.map((block) => ({
      ...block,
      id: randomUUID(),
      sourceHash: hashText(block.raw),
    }));
    const proposal = applyDocumentOperations(
      {
        workspaceId: '58ac7960-9012-41cf-9d13-ed970417c790',
        sectionId: '6a77bdb5-9f22-4b94-bb40-5bdf0e1329f4',
        fileHash: hashText(source),
        markdown: source,
        blocks: identified,
      },
      [
        {
          id: 'e0bf8e2b-d94a-47b4-9a70-d2e54e50df1b',
          workspaceId: '58ac7960-9012-41cf-9d13-ed970417c790',
          sectionId: '6a77bdb5-9f22-4b94-bb40-5bdf0e1329f4',
          baseFileHash: hashText(source),
          kind: 'update',
          targetBlockId: identified[0]!.id,
          expectedSourceHash: hashText(heading.raw),
          replacementMarkdown: '# Movement',
          reason: 'Improve heading',
          citationIds: [],
        },
      ],
      new Set(),
    );
    expect(proposal.markdown).toBe(source.replace('# Motion', '# Movement'));
    expect(proposal.markdown).toContain(':::future-widget\nopaque input\n:::');
  });

  it('rejects malformed operations and path escapes at separate trust boundaries', async () => {
    expect(() =>
      documentOperationSchema.parse({ kind: 'update', replacementMarkdown: '<script>' }),
    ).toThrow();
    const root = await mkdtemp(join(tmpdir(), 'revise-document-boundary-'));
    roots.push(root);
    await expect(resolveSectionPath(root, '../sibling.md')).rejects.toThrow();
    await expect(resolveSectionPath(root, 'a/../../sibling.md')).rejects.toThrow();
    await expect(resolveSectionPath(root, 'a\\b.md')).rejects.toThrow();
  });
});
