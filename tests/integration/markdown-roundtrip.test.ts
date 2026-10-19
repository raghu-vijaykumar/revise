import { describe, expect, it } from 'vitest';
import {
  parseMarkdown,
  replaceSourceBlock,
  sourceOffset,
  requireSourcePosition,
} from '../../packages/core/src/documents/parseMarkdown';

const source = [
  '# Ring example\r\n',
  '\r\n',
  'A **bold** sentence with [YouTube](https://www.youtube.com/watch?v=abc123).\r\n',
  '\r\n',
  '- First\r\n',
  '- Second\r\n',
  '\r\n',
  '[Local clip](./.assets/section-7f3a/motion.mp4)\r\n',
  '\r\n',
  ':::future-rich-block\r\n',
  'Do not reformat this yet.\r\n',
  ':::x\r\n',
].join('');

describe('source-mapped Markdown codec', () => {
  it('retains every original byte when no block is changed', () => {
    const parsed = parseMarkdown(source);
    expect(parsed.source).toBe(source);
    expect(parsed.blocks[0]?.raw).toBe('# Ring example');
    expect(parsed.blocks.some((block) => block.raw.includes(':::future-rich-block'))).toBe(true);
  });

  it('replaces one block without normalizing its neighbors or unsupported syntax', () => {
    const parsed = parseMarkdown(source);
    const heading = parsed.blocks.find((block) => block.type === 'heading');
    expect(heading).toBeDefined();
    const changed = replaceSourceBlock(parsed, heading!, '# Hash ring');
    expect(changed).toBe(source.replace('# Ring example', '# Hash ring'));
    expect(changed).toContain('[Local clip](./.assets/section-7f3a/motion.mp4)');
    expect(changed).toContain(':::future-rich-block\r\nDo not reformat this yet.\r\n:::x');
  });

  it('rejects a stale block span before writing', () => {
    const parsed = parseMarkdown(source);
    const first = parsed.blocks[0];
    expect(first).toBeDefined();
    expect(() => replaceSourceBlock({ ...parsed, source: 'changed' }, first!, '# New')).toThrow(
      'Stale Markdown block',
    );
  });

  it('can recover offsets from line and column when a parser omits byte offsets', () => {
    expect(sourceOffset('First\r\nSecond', { line: 2, column: 3 })).toBe(9);
    expect(sourceOffset('First\r\nSecond', { line: 1, column: 1, offset: 0 })).toBe(0);
    expect(() => sourceOffset('Only', { line: 3, column: 1 })).toThrow('Invalid Markdown position');
    expect(() => requireSourcePosition(undefined)).toThrow('Markdown block has no source position');
  });
});
