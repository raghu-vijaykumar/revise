import { assertSafeMarkdownFragment } from './changeEngine';
import { parseMarkdown, type SourceBlock } from './parseMarkdown';
import { hashText } from './text';
import { parseVideoLink, parseVideoMarkdownBlock, videoMarkdownLink } from './videoLinks';

export type RichNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: RichNode[];
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
};
export type RichDocument = { type: 'doc'; content: RichNode[] };
export type RichProjection = {
  source: string;
  fileHash: string;
  document: RichDocument;
  originalNodes: Map<string, RichNode>;
  sourceBlocks: Map<string, SourceBlock>;
  sourceOrder: string[];
};

function withoutSourceId(node: RichNode): RichNode {
  const copy = structuredClone(node);
  if (copy.attrs) delete copy.attrs.sourceId;
  return copy;
}

function sourceIdFor(block: SourceBlock, index: number): string {
  return hashText(`${index}\0${block.sourceStart}\0${block.raw}`);
}

function opaqueNode(block: SourceBlock, sourceId: string): RichNode {
  return { type: 'opaqueMarkdown', attrs: { sourceId, raw: block.raw } };
}

export function createRichProjection(
  source: string,
  parseBlock: (markdown: string) => RichDocument,
): RichProjection {
  const blocks = parseMarkdown(source).blocks;
  const content: RichNode[] = [];
  const originalNodes = new Map<string, RichNode>();
  const sourceBlocks = new Map<string, SourceBlock>();
  const sourceOrder: string[] = [];
  for (const [index, block] of blocks.entries()) {
    const sourceId = sourceIdFor(block, index);
    let node: RichNode;
    try {
      if (block.opaque) throw new Error('Unsupported Markdown syntax');
      assertSafeMarkdownFragment(block.raw);
      const video = parseVideoMarkdownBlock(block.raw);
      if (video) {
        node = { type: 'videoEmbed', attrs: { ...video, sourceId } };
      } else {
        const parsed = parseBlock(block.raw).content;
        if (parsed.length !== 1) throw new Error('Block does not have one rich projection');
        node = { ...parsed[0]!, attrs: { ...parsed[0]!.attrs, sourceId } };
      }
    } catch {
      // Unknown syntax stays a protected, text-only node instead of entering HTML parsing.
      node = opaqueNode(block, sourceId);
    }
    content.push(node);
    originalNodes.set(sourceId, structuredClone(node));
    sourceBlocks.set(sourceId, block);
    sourceOrder.push(sourceId);
  }
  return {
    source,
    fileHash: hashText(source),
    document: { type: 'doc', content },
    originalNodes,
    sourceBlocks,
    sourceOrder,
  };
}

export function serializeRichProjection(
  projection: RichProjection,
  edited: RichDocument,
  serializeBlock: (document: RichDocument) => string,
): string {
  if (hashText(projection.source) !== projection.fileHash) throw new Error('Stale rich projection');
  if (edited.type !== 'doc' || !Array.isArray(edited.content))
    throw new Error('Invalid rich document');
  const seen = new Set<string>();
  const rendered = edited.content.map((node) => {
    const sourceId = typeof node.attrs?.sourceId === 'string' ? node.attrs.sourceId : null;
    const uniqueSourceId = sourceId && !seen.has(sourceId) ? sourceId : null;
    if (uniqueSourceId) seen.add(uniqueSourceId);
    const original = uniqueSourceId ? projection.originalNodes.get(uniqueSourceId) : undefined;
    const sourceBlock = uniqueSourceId ? projection.sourceBlocks.get(uniqueSourceId) : undefined;
    if (node.type === 'opaqueMarkdown') {
      if (
        !original ||
        !sourceBlock ||
        original.type !== 'opaqueMarkdown' ||
        node.attrs?.raw !== sourceBlock.raw
      ) {
        throw new Error('Protected Markdown block changed');
      }
      return { sourceId: uniqueSourceId, markdown: sourceBlock.raw, changed: false };
    }
    if (original?.type === 'opaqueMarkdown') throw new Error('Protected Markdown block changed');
    if (
      original &&
      sourceBlock &&
      JSON.stringify(withoutSourceId(node)) === JSON.stringify(withoutSourceId(original))
    ) {
      return { sourceId: uniqueSourceId, markdown: sourceBlock.raw, changed: false };
    }
    if (node.type === 'videoEmbed') {
      const url = node.attrs?.url;
      const label = node.attrs?.label;
      if (typeof url !== 'string' || typeof label !== 'string')
        throw new Error('Invalid video node');
      const link = parseVideoLink(url, label);
      if (!link) throw new Error('Invalid video link');
      return { sourceId: uniqueSourceId, markdown: videoMarkdownLink(link), changed: true };
    }
    const markdown = serializeBlock({ type: 'doc', content: [withoutSourceId(node)] }).replace(
      /(?:\r?\n)+$/,
      '',
    );
    assertSafeMarkdownFragment(markdown);
    return { sourceId: uniqueSourceId, markdown, changed: true };
  });
  for (const sourceId of projection.sourceOrder) {
    if (projection.originalNodes.get(sourceId)?.type === 'opaqueMarkdown' && !seen.has(sourceId)) {
      throw new Error('Protected Markdown block was removed');
    }
  }
  const originalOrder = projection.sourceOrder;
  const sameStructure =
    rendered.length === originalOrder.length &&
    rendered.every((item, index) => item.sourceId === originalOrder[index]);
  if (sameStructure) {
    let result = projection.source;
    for (const item of [...rendered].reverse()) {
      if (!item.changed || !item.sourceId) continue;
      const block = projection.sourceBlocks.get(item.sourceId)!;
      result = result.slice(0, block.sourceStart) + item.markdown + result.slice(block.sourceEnd);
    }
    return result;
  }
  // Structural edits need new separators. Existing block bodies, including opaque
  // future syntax, still retain their exact original bytes.
  const newline = projection.source.includes('\r\n') ? '\r\n' : '\n';
  const joined = rendered.map((item) => item.markdown).join(`${newline}${newline}`);
  return joined + (projection.source.endsWith(newline) && joined ? newline : '');
}
