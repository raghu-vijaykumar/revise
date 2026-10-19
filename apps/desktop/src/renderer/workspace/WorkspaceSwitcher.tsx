import React from 'react';
import type { Workspace } from '@revise/core';
import type { WorkspaceActivity } from '../../main/workspaces/workspaceManager';

export type WorkspaceEntry = {
  workspace: Workspace;
  activity: WorkspaceActivity;
  available: boolean;
};
type Props = {
  entries: WorkspaceEntry[];
  activeWorkspaceId: string | null;
  busy: boolean;
  onSwitch: (id: string) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onLocate: () => void;
  menuRequest?: { sequence: number; action: 'new-workspace' | 'switch-workspace' } | null;
};

function activityLabel(entry: WorkspaceEntry): string | null {
  if (!entry.available) return 'Folder missing';
  if (entry.activity.lastError) return 'Needs attention';
  const saves = entry.activity.pendingSaveIds.length;
  const runs = entry.activity.pendingRunIds.length;
  if (saves || runs)
    return [saves && `${saves} saving`, runs && `${runs} AI running`].filter(Boolean).join(' · ');
  return null;
}

export function WorkspaceSwitcher({
  entries,
  activeWorkspaceId,
  busy,
  onSwitch,
  onCreate,
  onRename,
  onLocate,
  menuRequest,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<'create' | 'rename' | null>(null);
  const [name, setName] = React.useState('');
  const active = entries.find((entry) => entry.workspace.id === activeWorkspaceId);

  React.useEffect(() => {
    if (!menuRequest) return;
    setOpen(true);
    setMode(menuRequest.action === 'new-workspace' ? 'create' : null);
    setName('');
  }, [menuRequest]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    if (mode === 'create') onCreate(clean);
    if (mode === 'rename' && active) onRename(active.workspace.id, clean);
    setMode(null);
    setName('');
    setOpen(false);
  }

  return (
    <div className="workspace-switcher">
      <div className="workspace-heading">WORKSPACE</div>
      <div className="workspace-current-row">
        <button
          className="workspace-current"
          aria-label="Switch workspace"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          disabled={busy}
        >
          <span className="workspace-monogram">
            {active?.workspace.displayName.slice(0, 1).toUpperCase() ?? 'W'}
          </span>
          <span className="workspace-current-name">
            {active?.workspace.displayName ?? 'Choose a workspace'}
          </span>
          <span aria-hidden="true">⌄</span>
        </button>
        <button
          className="icon-button"
          aria-label="Create workspace"
          title="Create workspace"
          onClick={() => {
            setMode('create');
            setName('');
            setOpen(true);
          }}
        >
          +
        </button>
      </div>
      {active && activityLabel(active) && (
        <div className="workspace-status">{activityLabel(active)}</div>
      )}
      {open && (
        <div className="workspace-menu">
          {entries.map((entry) => (
            <button
              key={entry.workspace.id}
              className={`workspace-option ${entry.workspace.id === activeWorkspaceId ? 'selected' : ''}`}
              onClick={() => {
                onSwitch(entry.workspace.id);
                setOpen(false);
              }}
              disabled={busy || !entry.available}
              title={entry.activity.lastError ?? undefined}
            >
              <span>{entry.workspace.displayName}</span>
              {activityLabel(entry) && <small>{activityLabel(entry)}</small>}
            </button>
          ))}
          {entries.some((entry) => !entry.available) && (
            <button className="workspace-menu-action" onClick={onLocate}>
              Locate content folder…
            </button>
          )}
          {active && (
            <button
              className="workspace-menu-action"
              onClick={() => {
                setMode('rename');
                setName(active.workspace.displayName);
              }}
            >
              Rename workspace…
            </button>
          )}
          <button
            className="workspace-menu-action"
            onClick={() => {
              setMode('create');
              setName('');
            }}
          >
            New workspace…
          </button>
          {mode && (
            <form className="workspace-name-form" onSubmit={submit}>
              <label htmlFor="workspace-name">
                {mode === 'create' ? 'New workspace name' : 'Rename workspace'}
              </label>
              <input
                id="workspace-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={100}
                autoFocus
              />
              <div className="workspace-form-actions">
                <button type="button" onClick={() => setMode(null)}>
                  Cancel
                </button>
                <button type="submit" disabled={!name.trim() || busy}>
                  {mode === 'create' ? 'Create' : 'Rename'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
