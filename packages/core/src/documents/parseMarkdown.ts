import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { offsetAt } from './text';

const parser = unified().use(remarkParse).use(remarkGfm);

export type SourceBlock = {
  type: string;
  sourceStart: number;
  sourceEnd: number;
  raw: string;
  plainText: string;
  opaque: boolean;
};

export type ParsedMarkdown = {
  source: string;
  blocks: SourceBlock[];
};

export function sourceOffset(
  source: string,
  point: { line: number; column: number; offset?: number | undefined },
): number {
  return point.offset ?? offsetAt(source, point.line, point.column);
}

export function requireSourcePosition(
  position:
    | {
        start: { line: number; column: number; offset?: number | undefined };
        end: { line: number; column: number; offset?: number | undefined };
      }
    | undefined,
) {
  if (!position) throw new Error('Markdown block has no source position');
  return position;
}

export function parseMarkdown(source: string): ParsedMarkdown {
  const tree = parser.parse(source);
  function visibleText(node: unknown): string {
    if (!node || typeof node !== 'object') return '';
    const value = node as { value?: unknown; children?: unknown };
    if (typeof value.value === 'string') return value.value;
    if (Array.isArray(value.children)) {
      return value.children.map(visibleText).join('');
    }
    return '';
  }
  function containsHtml(node: unknown): boolean {
    if (!node || typeof node !== 'object') return false;
    const value = node as { type?: string; children?: unknown };
    return (
      value.type === 'html' || (Array.isArray(value.children) && value.children.some(containsHtml))
    );
  }
  const blocks = tree.children.map((node) => {
    const position = requireSourcePosition(node.position);
    const sourceStart = sourceOffset(source, position.start);
    const sourceEnd = sourceOffset(source, position.end);
    return {
      type: node.type,
      sourceStart,
      sourceEnd,
      raw: source.slice(sourceStart, sourceEnd),
      plainText: visibleText(node),
      opaque: containsHtml(node) || /(^|\n)\s*:::[^\n]*/.test(source.slice(sourceStart, sourceEnd)),
    };
  });
  return { source, blocks };
}

export function replaceSourceBlock(
  document: ParsedMarkdown,
  block: SourceBlock,
  replacementMarkdown: string,
): string {
  const { source } = document;
  // Patch only the verified source span. This preserves CRLF and future syntax elsewhere.
  if (source.slice(block.sourceStart, block.sourceEnd) !== block.raw) {
    throw new Error('Stale Markdown block');
  }
  return source.slice(0, block.sourceStart) + replacementMarkdown + source.slice(block.sourceEnd);
}
