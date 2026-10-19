import type { ContentCollection } from '@revise/core';

type Props = {
  collections: ContentCollection[];
  activeCollectionId: string | null;
  busy: boolean;
  onChoose: () => void;
  onSelect: (id: string) => void;
};

export function WorkspacePicker({
  collections,
  activeCollectionId,
  busy,
  onChoose,
  onSelect,
}: Props) {
  if (collections.length === 0) {
    return (
      <div className="first-run">
        <p>Choose where your learning spaces will live.</p>
        <button className="primary-button" onClick={onChoose} disabled={busy}>
          Choose content folder
        </button>
        <small>Each workspace gets its own folder inside it.</small>
      </div>
    );
  }
  return (
    <div className="collection-control">
      <label htmlFor="collection-select">Content folder</label>
      <div className="collection-row">
        <select
          id="collection-select"
          aria-label="Content folder"
          value={activeCollectionId ?? ''}
          onChange={(event) => onSelect(event.target.value)}
        >
          {collections.map((collection) => (
            <option key={collection.id} value={collection.id}>
              {collection.parentPath.split(/[\\/]/).filter(Boolean).at(-1) ?? 'Folder'}
            </option>
          ))}
        </select>
        <button
          title="Add content folder"
          aria-label="Add content folder"
          onClick={onChoose}
          disabled={busy}
        >
          +
        </button>
      </div>
    </div>
  );
}
