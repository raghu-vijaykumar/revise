import React from 'react';
import { createRoot } from 'react-dom/client';
import type { ContentCollection, Section } from '@revise/core';
import { WorkspacePicker } from './workspace/WorkspacePicker';
import { WorkspaceSwitcher, type WorkspaceEntry } from './workspace/WorkspaceSwitcher';
import { SectionTree } from './workspace/SectionTree';
import { WorkspaceDocument } from './workspace/WorkspaceDocument';
import { SplitHandle } from './workspace/SplitHandle';
import { ChatPane } from './workspace/ChatPane';
import './style.css';

function App(): React.JSX.Element {
  const [collections, setCollections] = React.useState<ContentCollection[]>([]);
  const [collectionId, setCollectionId] = React.useState<string | null>(null);
  const [entries, setEntries] = React.useState<WorkspaceEntry[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [workspaceMenuRequest, setWorkspaceMenuRequest] = React.useState<{
    sequence: number;
    action: 'new-workspace' | 'switch-workspace';
  } | null>(null);
  const [newSectionRequest, setNewSectionRequest] = React.useState(0);
  const [sections, setSections] = React.useState<Section[]>([]);
  const [tabsByWorkspace, setTabsByWorkspace] = React.useState<
    Record<string, { ids: string[]; activeId: string | null }>
  >({});
  const [explorerWidth, setExplorerWidth] = React.useState(
    () => Number(localStorage.getItem('revise.explorerWidth')) || 287,
  );
  const [chatWidth, setChatWidth] = React.useState(
    () => Number(localStorage.getItem('revise.chatWidth')) || 382,
  );

  const activeCollection = collections.find((collection) => collection.id === collectionId);
  const activeWorkspace = entries.find((entry) => entry.workspace.id === activeWorkspaceId);
  const workspaceTabs = activeWorkspaceId ? tabsByWorkspace[activeWorkspaceId] : undefined;
  const activeSection = sections.find((section) => section.id === workspaceTabs?.activeId);

  React.useEffect(() => {
    localStorage.setItem('revise.explorerWidth', String(explorerWidth));
  }, [explorerWidth]);
  React.useEffect(() => {
    localStorage.setItem('revise.chatWidth', String(chatWidth));
  }, [chatWidth]);

  React.useEffect(() => {
    let current = true;
    setSections([]);
    if (activeWorkspaceId) {
      void window.revise
        .listSections(activeWorkspaceId)
        .then((items) => {
          if (current) setSections(items);
        })
        .catch(() => {
          if (current) setError('Sections could not be loaded.');
        });
    }
    return () => {
      current = false;
    };
  }, [activeWorkspaceId]);

  function openSection(id: string): void {
    if (!activeWorkspaceId) return;
    setTabsByWorkspace((previous) => {
      const existing = previous[activeWorkspaceId] ?? { ids: [], activeId: null };
      return {
        ...previous,
        [activeWorkspaceId]: {
          ids: existing.ids.includes(id) ? existing.ids : [...existing.ids, id],
          activeId: id,
        },
      };
    });
  }

  async function createSection(title: string, parentId: string | null): Promise<void> {
    if (!activeWorkspaceId) return;
    const created = await window.revise.createSection(activeWorkspaceId, title, parentId);
    setSections(await window.revise.listSections(activeWorkspaceId));
    openSection(created.id);
  }

  function closeTab(id: string): void {
    if (!activeWorkspaceId) return;
    setTabsByWorkspace((previous) => {
      const existing = previous[activeWorkspaceId] ?? { ids: [], activeId: null };
      const ids = existing.ids.filter((candidate) => candidate !== id);
      return {
        ...previous,
        [activeWorkspaceId]: {
          ids,
          activeId: existing.activeId === id ? (ids.at(-1) ?? null) : existing.activeId,
        },
      };
    });
  }

  const openCollection = React.useCallback(async (collection: ContentCollection) => {
    setCollectionId(collection.id);
    setActiveWorkspaceId(null);
    setWorkspaceMenuRequest(null);
    setNewSectionRequest(0);
    const available = await window.revise.listWorkspaces(collection.id);
    setEntries(available);
    const restore = available.find(
      (entry) => entry.workspace.id === collection.lastActiveWorkspaceId && entry.available,
    );
    if (restore) {
      await window.revise.switchWorkspace(restore.workspace.id);
      setActiveWorkspaceId(restore.workspace.id);
    }
  }, []);

  React.useEffect(() => {
    let current = true;
    void window.revise
      .listCollections()
      .then(async (saved) => {
        if (!current) return;
        setCollections(saved);
        if (saved[0]) await openCollection(saved[0]);
      })
      .catch(() => {
        if (current) setError('Saved content folders could not be opened.');
      });
    const stop = window.revise.onWorkspaceActivity((activity) => {
      if (!current) return;
      setEntries((previous) =>
        previous.map((entry) =>
          entry.workspace.id === activity.workspaceId && activity.sequence > entry.activity.sequence
            ? { ...entry, activity }
            : entry,
        ),
      );
    });
    return () => {
      current = false;
      stop();
    };
  }, [openCollection]);

  async function chooseContentFolder(): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      const selected = await window.revise.chooseContentFolder();
      if (!selected) return false;
      const all = await window.revise.listCollections();
      setCollections(all);
      const collection = all.find((entry) => entry.parentPath === selected);
      if (collection) await openCollection(collection);
      return Boolean(collection);
    } catch {
      setError('Could not use the selected content folder.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function createWorkspace(name: string): Promise<void> {
    if (!collectionId) return;
    setBusy(true);
    setError(null);
    try {
      const workspace = await window.revise.createWorkspace(collectionId, name);
      setEntries(await window.revise.listWorkspaces(collectionId));
      await window.revise.switchWorkspace(workspace.id);
      setActiveWorkspaceId(workspace.id);
    } catch {
      setError('Workspace name or folder is unavailable. Choose another name.');
    } finally {
      setBusy(false);
    }
  }

  async function switchWorkspace(id: string): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await window.revise.switchWorkspace(id);
      setActiveWorkspaceId(id);
      setNewSectionRequest(0);
    } catch {
      setError('Workspace could not open. Check its folder or locate the content folder.');
    } finally {
      setBusy(false);
    }
  }

  async function renameWorkspace(id: string, name: string): Promise<void> {
    if (!collectionId) return;
    setBusy(true);
    setError(null);
    try {
      await window.revise.renameWorkspace(id, name);
      setEntries(await window.revise.listWorkspaces(collectionId));
    } catch {
      setError('Workspace could not be renamed. Check the name and background activity.');
    } finally {
      setBusy(false);
    }
  }

  async function relocateCollection(): Promise<void> {
    if (!collectionId) return;
    setBusy(true);
    setError(null);
    try {
      const relocated = await window.revise.relocateCollection(collectionId);
      if (relocated) {
        setCollections(await window.revise.listCollections());
        await openCollection(relocated);
      }
    } catch {
      setError('That folder does not match the saved workspace.');
    } finally {
      setBusy(false);
    }
  }

  React.useEffect(
    () =>
      window.revise.onMenuAction((action) => {
        if (action === 'choose-content-folder') {
          void chooseContentFolder();
        } else if (action === 'new-workspace') {
          if (collectionId) {
            setWorkspaceMenuRequest((previous) => ({
              sequence: (previous?.sequence ?? 0) + 1,
              action,
            }));
          } else {
            void chooseContentFolder().then((selected) => {
              if (selected)
                setWorkspaceMenuRequest((previous) => ({
                  sequence: (previous?.sequence ?? 0) + 1,
                  action,
                }));
            });
          }
        } else if (action === 'switch-workspace') {
          if (collectionId)
            setWorkspaceMenuRequest((previous) => ({
              sequence: (previous?.sequence ?? 0) + 1,
              action,
            }));
          else setError('Choose a content folder first.');
        } else if (action === 'new-section') {
          if (activeWorkspaceId) setNewSectionRequest((previous) => previous + 1);
          else setError('Create or open a workspace first.');
        }
      }),
    [activeWorkspaceId, collectionId],
  );

  return (
    <div className="app-shell">
      <div
        className="workspace-shell"
        style={
          {
            '--explorer-width': `${explorerWidth}px`,
            '--chat-width': `${chatWidth}px`,
          } as React.CSSProperties
        }
      >
        <nav className="activity" aria-label="Activity">
          <button aria-label="Sections">S</button>
          <button aria-label="Search">⌕</button>
          <button aria-label="AI">A</button>
        </nav>
        <aside className="explorer" aria-label="Section explorer">
          <strong className="explorer-title">SECTIONS</strong>
          <WorkspacePicker
            collections={collections}
            activeCollectionId={collectionId}
            busy={busy}
            onChoose={() => void chooseContentFolder()}
            onSelect={(id) => {
              const collection = collections.find((entry) => entry.id === id);
              if (collection) void openCollection(collection);
            }}
          />
          {activeCollection && <p className="folder-confirmation">Content folder selected</p>}
          {activeCollection && (
            <WorkspaceSwitcher
              entries={entries}
              activeWorkspaceId={activeWorkspaceId}
              busy={busy}
              onSwitch={(id) => void switchWorkspace(id)}
              onCreate={(name) => void createWorkspace(name)}
              onRename={(id, name) => void renameWorkspace(id, name)}
              onLocate={() => void relocateCollection()}
              menuRequest={workspaceMenuRequest}
            />
          )}
          {error && (
            <p className="workspace-error" role="alert">
              {error}
            </p>
          )}
          {activeWorkspaceId ? (
            <SectionTree
              sections={sections}
              selectedId={activeSection?.id ?? null}
              onOpen={openSection}
              onCreate={createSection}
              createRequest={newSectionRequest}
            />
          ) : (
            <div className="section-list-placeholder">
              {activeCollection ? 'Create or open a workspace to begin.' : ''}
            </div>
          )}
          <div className="explorer-bottom">
            <div>OUTLINE</div>
            <p>{activeWorkspace ? 'Choose a section' : 'No section open'}</p>
            <div>TIMELINE</div>
            <p>{activeWorkspace ? 'Choose a section' : 'No section open'}</p>
          </div>
        </aside>
        <SplitHandle
          label="Resize section explorer"
          value={explorerWidth}
          min={200}
          max={380}
          onChange={setExplorerWidth}
        />
        <ChatPane
          key={activeWorkspaceId ?? 'no-workspace'}
          workspaceId={activeWorkspaceId}
          sectionTitle={activeSection?.displayTitle ?? null}
        />
        <SplitHandle
          label="Resize AI chat"
          value={chatWidth}
          min={240}
          max={540}
          onChange={setChatWidth}
        />
        <main className="work-area">
          <div className="tabs" role="tablist">
            {!workspaceTabs?.ids.length && (
              <button role="tab" aria-selected="true">
                Welcome
              </button>
            )}
            {workspaceTabs?.ids.map((id) => {
              const section = sections.find((item) => item.id === id);
              if (!section) return null;
              return (
                <div className="tab-item" key={id}>
                  <button
                    role="tab"
                    aria-selected={workspaceTabs.activeId === id}
                    onClick={() => openSection(id)}
                  >
                    {section.displayTitle}
                  </button>
                  <button
                    type="button"
                    className="tab-close"
                    aria-label={`Close ${section.displayTitle}`}
                    onClick={() => closeTab(id)}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
          {activeWorkspaceId && activeSection ? (
            <WorkspaceDocument
              key={`${activeWorkspaceId}:${activeSection.id}`}
              workspaceId={activeWorkspaceId}
              section={activeSection}
            />
          ) : (
            <section className="welcome">
              <h1>
                {activeWorkspace
                  ? activeWorkspace.workspace.displayName
                  : 'Make room for what you are learning'}
              </h1>
              <p>
                {activeWorkspace
                  ? 'Create a section to start writing and collecting ideas in this workspace.'
                  : 'Choose a content folder to begin. Each workspace has its own sections, chat, and history.'}
              </p>
            </section>
          )}
        </main>
      </div>
      <footer>{activeWorkspace ? activeWorkspace.workspace.displayName : 'Local workspace'}</footer>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
