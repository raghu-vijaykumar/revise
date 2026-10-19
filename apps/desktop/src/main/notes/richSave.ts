import { MarkdownManager } from '@tiptap/markdown';
import StarterKit from '@tiptap/starter-kit';
import {
  createRichProjection,
  serializeRichProjection,
  type RichDocument,
  type RichNode,
} from '@revise/core';

const markdownCodec = new MarkdownManager({ extensions: [StarterKit] });
const supportedNodes = new Set([
  'paragraph',
  'heading',
  'blockquote',
  'bulletList',
  'orderedList',
  'listItem',
  'codeBlock',
  'horizontalRule',
  'hardBreak',
  'text',
  'videoEmbed',
  'opaqueMarkdown',
]);
const supportedMarks = new Set(['bold', 'italic', 'strike', 'code', 'link']);

function validateNode(node: RichNode, depth: number, count: { value: number }): void {
  count.value += 1;
  if (depth > 40 || count.value > 20_000 || !supportedNodes.has(node.type))
    throw new Error('Unsupported rich document node');
  if (node.text !== undefined && (node.type !== 'text' || typeof node.text !== 'string'))
    throw new Error('Invalid rich text');
  if (node.marks?.some((mark) => !supportedMarks.has(mark.type)))
    throw new Error('Unsupported rich text mark');
  if (node.content && !Array.isArray(node.content))
    throw new Error('Invalid rich document content');
  for (const child of node.content ?? []) validateNode(child, depth + 1, count);
}

export function serializeTrustedRichEdit(source: string, edited: unknown): string {
  // Renderer JSON is an untrusted request. Bound its size and node vocabulary
  // before using the server's own Markdown parser and source-preserving codec.
  if (JSON.stringify(edited).length > 2_000_000) throw new Error('Rich document is too large');
  if (
    !edited ||
    typeof edited !== 'object' ||
    (edited as RichDocument).type !== 'doc' ||
    !Array.isArray((edited as RichDocument).content)
  ) {
    throw new Error('Invalid rich document');
  }
  const document = edited as RichDocument;
  const count = { value: 0 };
  for (const node of document.content) validateNode(node, 0, count);
  const projection = createRichProjection(
    source,
    (block) => markdownCodec.parse(block) as RichDocument,
  );
  return serializeRichProjection(projection, document, (block) => markdownCodec.serialize(block));
}
