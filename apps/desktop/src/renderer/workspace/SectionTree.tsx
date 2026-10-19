import React from 'react';
import type { Section } from '@revise/core';

type Props = {
  sections: Section[];
  selectedId: string | null;
  onOpen: (id: string) => void;
  onCreate: (title: string, parentId: string | null) => Promise<void>;
  createRequest?: number;
};

export function SectionTree({ sections, selectedId, onOpen, onCreate, createRequest = 0 }: Props) {
  const [addingTo, setAddingTo] = React.useState<string | null | undefined>();
  const [title, setTitle] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (createRequest === 0) return;
    setAddingTo(null);
    setTitle('');
  }, [createRequest]);

  async function add() {
    if (!title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await onCreate(title.trim(), addingTo ?? null);
      setTitle('');
      setAddingTo(undefined);
    } catch {
      setError('Section could not be created.');
    } finally {
      setBusy(false);
    }
  }

  function children(parentId: string | null, depth: number): React.ReactNode {
    return sections
      .filter((section) => section.parentId === parentId)
      .sort((left, right) => left.order - right.order)
      .map((section) => (
        <React.Fragment key={section.id}>
          <div className="section-tree-row" style={{ paddingLeft: 8 + depth * 16 }}>
            <button
              type="button"
              className="section-tree-title"
              aria-current={selectedId === section.id ? 'page' : undefined}
              onClick={() => onOpen(section.id)}
            >
              {section.displayTitle}
            </button>
            <button
              type="button"
              className="section-tree-add-child"
              aria-label={`Add subsection to ${section.displayTitle}`}
              title="Add subsection"
              onClick={() => setAddingTo(section.id)}
            >
              ＋
            </button>
          </div>
          {children(section.id, depth + 1)}
        </React.Fragment>
      ));
  }

  return (
    <div className="section-tree" aria-label="Sections">
      <div className="section-tree-heading">
        <strong>SECTIONS</strong>
        <button
          type="button"
          aria-label="Add section"
          title="Add section"
          onClick={() => setAddingTo(null)}
        >
          ＋
        </button>
      </div>
      {addingTo !== undefined && (
        <form
          className="section-create"
          onSubmit={(event) => {
            event.preventDefault();
            void add();
          }}
        >
          <label htmlFor="new-section-title">{addingTo ? 'New subsection' : 'New section'}</label>
          <input
            id="new-section-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            autoFocus
            maxLength={200}
          />
          <div>
            <button type="submit" disabled={busy || !title.trim()}>
              Create
            </button>
            <button type="button" onClick={() => setAddingTo(undefined)}>
              Cancel
            </button>
          </div>
        </form>
      )}
      {sections.length ? (
        <div className="section-tree-items">{children(null, 0)}</div>
      ) : (
        <p className="section-tree-empty">No sections yet. Add one to start writing.</p>
      )}
      {error && (
        <p role="alert" className="workspace-error">
          {error}
        </p>
      )}
    </div>
  );
}
