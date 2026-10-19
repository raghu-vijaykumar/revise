import { describe, expect, it } from 'vitest';
import { parseMarkdown } from '../../packages/core/src/documents/parseMarkdown';
import { hashText } from '../../packages/core/src/documents/text';
import {
  applyDocumentOperations,
  validateSelectionAnchor,
  type DocumentSnapshot,
} from '../../packages/core/src/documents/changeEngine';

const workspaceId = '58ac7960-9012-41cf-9d13-ed970417c790';
const sectionId = '6a77bdb5-9f22-4b94-bb40-5bdf0e1329f4';
const ids = [
  '57b43850-971b-4cf9-a6d0-47519e9bddbd',
  '73ba3c65-98c7-4591-9629-ee21a6c15da1',
  'f0302d46-aaad-4ffd-acba-5942fb75381a',
];
const markdown = '# Motion\n\nA **bold** example.\n\n- One\n- Two\n';

function snapshot(): DocumentSnapshot {
  const blocks = parseMarkdown(markdown).blocks.map((block, index) => ({
    ...block,
    id: ids[index]!,
    sourceHash: hashText(block.raw),
  }));
  return { workspaceId, sectionId, fileHash: hashText(markdown), markdown, blocks };
}

function operation(kind: 'insert' | 'update' | 'delete' | 'move' | 'split' | 'merge', extra = {}) {
  const base = snapshot();
  return {
    id: 'e0bf8e2b-d94a-47b4-9a70-d2e54e50df1b',
    workspaceId,
    sectionId,
    baseFileHash: base.fileHash,
    kind,
    targetBlockId: ids[1],
    expectedSourceHash: base.blocks[1]!.sourceHash,
    replacementMarkdown: 'A revised example.',
    reason: 'Make this clearer',
    citationIds: [],
    ...extra,
  };
}

describe('reviewable Markdown operations', () => {
  it('patches one verified block and retains all untouched source bytes', () => {
    const proposed = applyDocumentOperations(snapshot(), [operation('update')], new Set());
    expect(proposed.markdown).toBe(markdown.replace('A **bold** example.', 'A revised example.'));
    expect(proposed.appliedOperationIds).toHaveLength(1);
  });

  it('rejects stale hashes, duplicate IDs, and fabricated citations', () => {
    const stale = operation('update', { expectedSourceHash: '0'.repeat(64) });
    expect(() => applyDocumentOperations(snapshot(), [stale], new Set())).toThrow('Stale');
    const valid = operation('update');
    expect(() => applyDocumentOperations(snapshot(), [valid, valid], new Set())).toThrow(
      'Duplicate',
    );
    expect(() =>
      applyDocumentOperations(
        snapshot(),
        [operation('update', { citationIds: [ids[0]] })],
        new Set(),
      ),
    ).toThrow('Unknown citation');
  });

  it('rejects remote executable HTML or dangerous links in proposals', () => {
    expect(() =>
      applyDocumentOperations(
        snapshot(),
        [operation('update', { replacementMarkdown: '<script>alert(1)</script>' })],
        new Set(),
      ),
    ).toThrow('Unsafe Markdown');
    expect(() =>
      applyDocumentOperations(
        snapshot(),
        [operation('update', { replacementMarkdown: '[click](javascript:alert(1))' })],
        new Set(),
      ),
    ).toThrow('Unsafe Markdown');
  });

  it('validates a formatted selection against visible text and revision', () => {
    const base = snapshot();
    const anchor = {
      workspaceId,
      sectionId,
      baseFileHash: base.fileHash,
      blockId: ids[1]!,
      selectedQuoteHash: hashText('bold'),
      relativeRange: { from: 2, to: 6 },
    };
    expect(validateSelectionAnchor(base, anchor, 'bold')).toBe('bold');
    expect(() => validateSelectionAnchor(base, anchor, 'move')).toThrow('Stale selection');
  });

  it('supports insert, delete, split, merge, and move with verified anchors', () => {
    const base = snapshot();
    const inserted = applyDocumentOperations(
      base,
      [
        operation('insert', {
          targetBlockId: undefined,
          expectedSourceHash: undefined,
          afterBlockId: ids[0],
          replacementMarkdown: 'New paragraph.',
        }),
      ],
      new Set(),
    );
    expect(inserted.markdown).toContain('# Motion\n\nNew paragraph.');
    const deleted = applyDocumentOperations(base, [operation('delete')], new Set());
    expect(deleted.markdown).not.toContain('A **bold** example.');
    const split = applyDocumentOperations(
      base,
      [operation('split', { replacementMarkdown: 'First.\n\nSecond.' })],
      new Set(),
    );
    expect(split.markdown).toContain('First.\n\nSecond.');
    const merged = applyDocumentOperations(
      base,
      [
        operation('merge', {
          secondaryBlockId: ids[2],
          expectedSecondaryHash: base.blocks[2]!.sourceHash,
          replacementMarkdown: 'One merged paragraph.',
        }),
      ],
      new Set(),
    );
    expect(merged.markdown).toContain('One merged paragraph.');
    const moved = applyDocumentOperations(
      base,
      [operation('move', { afterBlockId: ids[2] })],
      new Set(),
    );
    expect(moved.markdown.indexOf('A **bold** example.')).toBeGreaterThan(
      moved.markdown.indexOf('- Two'),
    );
  });

  it('rejects an out-of-date source map before applying a proposal', () => {
    const staleFile = { ...snapshot(), fileHash: '0'.repeat(64) };
    expect(() => applyDocumentOperations(staleFile, [operation('update')], new Set())).toThrow(
      'Stale document',
    );
    const staleBlock = snapshot();
    staleBlock.blocks[1] = { ...staleBlock.blocks[1]!, raw: 'Different text' };
    expect(() => applyDocumentOperations(staleBlock, [operation('update')], new Set())).toThrow(
      'Stale block',
    );
    const duplicateBlock = snapshot();
    duplicateBlock.blocks[1] = { ...duplicateBlock.blocks[1]!, id: ids[0]! };
    expect(() => applyDocumentOperations(duplicateBlock, [operation('update')], new Set())).toThrow(
      'Duplicate block',
    );
  });

  it('keeps replayed operations idempotent and rejects overlapping edits', () => {
    const first = operation('update');
    expect(applyDocumentOperations(snapshot(), [first], new Set(), new Set([first.id]))).toEqual({
      markdown,
      appliedOperationIds: [],
    });
    expect(() =>
      applyDocumentOperations(snapshot(), [first, operation('delete', { id: ids[2] })], new Set()),
    ).toThrow('Overlapping proposal');
  });

  it('enforces workspace, revision, and insertion anchors', () => {
    expect(() =>
      applyDocumentOperations(
        snapshot(),
        [operation('update', { workspaceId: ids[0] })],
        new Set(),
      ),
    ).toThrow('Cross-workspace');
    expect(() =>
      applyDocumentOperations(snapshot(), [operation('update', { sectionId: ids[0] })], new Set()),
    ).toThrow('Cross-workspace');
    expect(() =>
      applyDocumentOperations(
        snapshot(),
        [operation('update', { baseFileHash: '0'.repeat(64) })],
        new Set(),
      ),
    ).toThrow('Stale operation');
    expect(() =>
      applyDocumentOperations(
        snapshot(),
        [operation('insert', { afterBlockId: ids[2] + '-missing' })],
        new Set(),
      ),
    ).toThrow();
    expect(() =>
      applyDocumentOperations(
        snapshot(),
        [operation('insert', { afterBlockId: ids[0], citationIds: [ids[1]] })],
        new Set([ids[1]]),
      ),
    ).not.toThrow();
  });

  it('requires verified move, split, and merge structure', () => {
    expect(() =>
      applyDocumentOperations(snapshot(), [operation('move', { afterBlockId: ids[1] })], new Set()),
    ).toThrow('Move requires');
    expect(() =>
      applyDocumentOperations(snapshot(), [operation('move', { afterBlockId: ids[0] })], new Set()),
    ).not.toThrow();
    expect(() => applyDocumentOperations(snapshot(), [operation('split')], new Set())).toThrow(
      'Split requires',
    );
    const base = snapshot();
    expect(() =>
      applyDocumentOperations(
        base,
        [
          operation('merge', {
            secondaryBlockId: ids[0],
            expectedSecondaryHash: base.blocks[0]!.sourceHash,
          }),
        ],
        new Set(),
      ),
    ).toThrow('Merge requires adjacent');
    expect(() =>
      applyDocumentOperations(
        base,
        [
          operation('merge', {
            secondaryBlockId: ids[2],
            expectedSecondaryHash: base.blocks[2]!.sourceHash,
            replacementMarkdown: 'One.\n\nTwo.',
          }),
        ],
        new Set(),
      ),
    ).toThrow('Merge requires adjacent');
  });

  it('rejects selections tied to another workspace or file revision', () => {
    const base = snapshot();
    const anchor = {
      workspaceId,
      sectionId,
      baseFileHash: base.fileHash,
      blockId: ids[1]!,
      selectedQuoteHash: hashText('bold'),
      relativeRange: { from: 2, to: 6 },
    };
    expect(() =>
      validateSelectionAnchor(base, { ...anchor, workspaceId: ids[0]! }, 'bold'),
    ).toThrow('Stale selection revision');
    expect(() =>
      validateSelectionAnchor(base, { ...anchor, baseFileHash: '0'.repeat(64) }, 'bold'),
    ).toThrow('Stale selection revision');
    expect(() => validateSelectionAnchor(base, { ...anchor, blockId: ids[2]! }, 'bold')).toThrow(
      'Stale selection quote',
    );
  });
});
