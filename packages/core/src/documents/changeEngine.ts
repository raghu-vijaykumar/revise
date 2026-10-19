import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import {
  documentOperationSchema,
  selectionAnchorSchema,
  type DocumentOperation,
  type SelectionAnchor,
} from '../contracts/document';
import type { SourceBlock } from './parseMarkdown';
import { hashText } from './text';

export type IdentifiedBlock = SourceBlock & { id: string; sourceHash: string };
export type DocumentSnapshot = {
  workspaceId: string;
  sectionId: string;
  fileHash: string;
  markdown: string;
  blocks: IdentifiedBlock[];
};

type Patch = { start: number; end: number; replacement: string };
const parser = unified().use(remarkParse).use(remarkGfm);

export function assertSafeMarkdownFragment(markdown: string): number {
  const tree = parser.parse(markdown);
  function inspect(node: unknown): void {
    if (!node || typeof node !== 'object') return;
    const value = node as { type?: string; url?: string; children?: unknown[] };
    if (value.type === 'html') throw new Error('Unsafe Markdown HTML');
    if (typeof value.url === 'string' && /^[a-z][a-z0-9+.-]*:/i.test(value.url)) {
      const scheme = value.url.split(':', 1)[0]?.toLowerCase();
      if (scheme !== 'https' && scheme !== 'http' && scheme !== 'mailto') {
        throw new Error('Unsafe Markdown link');
      }
    }
    for (const child of value.children ?? []) inspect(child);
  }
  inspect(tree);
  return tree.children.length;
}

function verifySnapshot(snapshot: DocumentSnapshot): Map<string, IdentifiedBlock> {
  if (hashText(snapshot.markdown) !== snapshot.fileHash) throw new Error('Stale document snapshot');
  const blocks = new Map<string, IdentifiedBlock>();
  for (const block of snapshot.blocks) {
    if (blocks.has(block.id)) throw new Error('Duplicate block ID');
    if (
      snapshot.markdown.slice(block.sourceStart, block.sourceEnd) !== block.raw ||
      hashText(block.raw) !== block.sourceHash
    ) {
      throw new Error('Stale block source map');
    }
    blocks.set(block.id, block);
  }
  return blocks;
}

function verifiedTarget(
  blocks: Map<string, IdentifiedBlock>,
  blockId: string | undefined,
  expectedHash: string | undefined,
): IdentifiedBlock {
  const target = blockId ? blocks.get(blockId) : undefined;
  if (!target || target.sourceHash !== expectedHash) throw new Error('Stale target block');
  return target;
}

export function validateSelectionAnchor(
  snapshot: DocumentSnapshot,
  rawAnchor: SelectionAnchor,
  selectedQuote: string,
): string {
  const anchor = selectionAnchorSchema.parse(rawAnchor);
  const blocks = verifySnapshot(snapshot);
  if (
    anchor.workspaceId !== snapshot.workspaceId ||
    anchor.sectionId !== snapshot.sectionId ||
    anchor.baseFileHash !== snapshot.fileHash
  ) {
    throw new Error('Stale selection revision');
  }
  const block = blocks.get(anchor.blockId);
  const exact = block?.plainText.slice(anchor.relativeRange.from, anchor.relativeRange.to);
  if (!exact || exact !== selectedQuote || hashText(exact) !== anchor.selectedQuoteHash) {
    throw new Error('Stale selection quote');
  }
  return exact;
}

export function applyDocumentOperations(
  snapshot: DocumentSnapshot,
  rawOperations: DocumentOperation[],
  knownCitationIds: ReadonlySet<string>,
  previouslyAppliedIds: ReadonlySet<string> = new Set(),
): { markdown: string; appliedOperationIds: string[] } {
  const blocks = verifySnapshot(snapshot);
  const patches: Patch[] = [];
  const seen = new Set<string>();
  const appliedOperationIds: string[] = [];
  for (const raw of rawOperations) {
    const operation = documentOperationSchema.parse(raw);
    if (seen.has(operation.id)) throw new Error('Duplicate operation ID');
    seen.add(operation.id);
    if (previouslyAppliedIds.has(operation.id)) continue;
    if (
      operation.workspaceId !== snapshot.workspaceId ||
      operation.sectionId !== snapshot.sectionId
    ) {
      throw new Error('Cross-workspace operation target');
    }
    if (operation.baseFileHash !== snapshot.fileHash) throw new Error('Stale operation revision');
    for (const citationId of operation.citationIds) {
      if (!knownCitationIds.has(citationId)) throw new Error('Unknown citation reference');
    }

    const replacement = operation.replacementMarkdown ?? '';
    if (replacement) assertSafeMarkdownFragment(replacement);
    if (operation.kind === 'insert') {
      const after = operation.afterBlockId ? blocks.get(operation.afterBlockId) : undefined;
      if (snapshot.blocks.length && !after) throw new Error('Insert requires a known block anchor');
      const at = after?.sourceEnd ?? 0;
      patches.push({ start: at, end: at, replacement: after ? `\n\n${replacement}` : replacement });
    } else {
      const target = verifiedTarget(blocks, operation.targetBlockId, operation.expectedSourceHash);
      if (operation.kind === 'move') {
        const after = operation.afterBlockId ? blocks.get(operation.afterBlockId) : undefined;
        if (!after || after.id === target.id) throw new Error('Move requires another block anchor');
        patches.push({ start: target.sourceStart, end: target.sourceEnd, replacement: '' });
        patches.push({
          start: after.sourceEnd,
          end: after.sourceEnd,
          replacement: `\n\n${target.raw}`,
        });
      } else if (operation.kind === 'merge') {
        const second = verifiedTarget(
          blocks,
          operation.secondaryBlockId,
          operation.expectedSecondaryHash,
        );
        const index = snapshot.blocks.findIndex((block) => block.id === target.id);
        if (
          snapshot.blocks[index + 1]?.id !== second.id ||
          assertSafeMarkdownFragment(replacement) !== 1
        ) {
          throw new Error('Merge requires adjacent blocks and one replacement block');
        }
        patches.push({ start: target.sourceStart, end: second.sourceEnd, replacement });
      } else {
        if (operation.kind === 'split' && assertSafeMarkdownFragment(replacement) < 2) {
          throw new Error('Split requires multiple replacement blocks');
        }
        patches.push({
          start: target.sourceStart,
          end: target.sourceEnd,
          replacement: operation.kind === 'delete' ? '' : replacement,
        });
      }
    }
    appliedOperationIds.push(operation.id);
  }

  const ascending = [...patches].sort(
    (left, right) => left.start - right.start || left.end - right.end,
  );
  for (let index = 1; index < ascending.length; index += 1) {
    const previous = ascending[index - 1]!;
    const current = ascending[index]!;
    if (current.start < previous.end || current.start === previous.start) {
      throw new Error('Overlapping proposal operations');
    }
  }
  // Descending application keeps every source offset anchored to the approved file.
  let markdown = snapshot.markdown;
  for (const patch of ascending.reverse()) {
    markdown = markdown.slice(0, patch.start) + patch.replacement + markdown.slice(patch.end);
  }
  return { markdown, appliedOperationIds };
}
