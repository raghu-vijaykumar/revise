import { describe, expect, it } from 'vitest';
import { MarkdownManager } from '@tiptap/markdown';
import StarterKit from '@tiptap/starter-kit';
import { createRichProjection, type RichDocument } from '../../packages/core/src';
import { serializeTrustedRichEdit } from '../../apps/desktop/src/main/notes/richSave';

const codec = new MarkdownManager({ extensions: [StarterKit] });

describe('trusted rich edit boundary', () => {
  it('saves a formatted edit while retaining untouched source bytes', () => {
    const source = '#  Motion\n\nA note.\n';
    const projection = createRichProjection(source, (block) => codec.parse(block) as RichDocument);
    const edited = structuredClone(projection.document);
    edited.content[1]!.content![0]!.text = 'Updated note.';
    expect(serializeTrustedRichEdit(source, edited)).toBe('#  Motion\n\nUpdated note.\n');
  });

  it('rejects unknown rich nodes and executable links', () => {
    expect(() =>
      serializeTrustedRichEdit('# Title\n', { type: 'doc', content: [{ type: 'script' }] }),
    ).toThrow();
    expect(() =>
      serializeTrustedRichEdit('# Title\n', {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'click',
                marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }],
              },
            ],
          },
        ],
      }),
    ).toThrow();
  });
});
