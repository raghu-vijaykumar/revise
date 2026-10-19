// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkspacePicker } from '../../apps/desktop/src/renderer/workspace/WorkspacePicker';
import {
  WorkspaceSwitcher,
  type WorkspaceEntry,
} from '../../apps/desktop/src/renderer/workspace/WorkspaceSwitcher';

const collectionId = '58ac7960-9012-41cf-9d13-ed970417c790';
const physicsId = '6a77bdb5-9f22-4b94-bb40-5bdf0e1329f4';
const biologyId = '57b43850-971b-4cf9-a6d0-47519e9bddbd';
const entries: WorkspaceEntry[] = [
  {
    workspace: {
      id: physicsId,
      collectionId,
      folderName: 'Physics',
      displayName: 'Physics',
      settingsVersion: 1,
    },
    activity: {
      workspaceId: physicsId,
      pendingSaveIds: [biologyId],
      pendingRunIds: [],
      lastError: null,
      sequence: 1,
    },
    available: true,
  },
  {
    workspace: {
      id: biologyId,
      collectionId,
      folderName: 'Biology',
      displayName: 'Biology',
      settingsVersion: 1,
    },
    activity: {
      workspaceId: biologyId,
      pendingSaveIds: [],
      pendingRunIds: [],
      lastError: null,
      sequence: 0,
    },
    available: false,
  },
];

afterEach(cleanup);

describe('workspace controls', () => {
  it('offers a first-run folder action and switches registered content folders', () => {
    const choose = vi.fn();
    const select = vi.fn();
    const view = render(
      <WorkspacePicker
        collections={[]}
        activeCollectionId={null}
        busy={false}
        onChoose={choose}
        onSelect={select}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Choose content folder' }));
    expect(choose).toHaveBeenCalledOnce();
    view.rerender(
      <WorkspacePicker
        collections={[
          {
            id: collectionId,
            parentPath: 'C:\\Learning',
            workspaceIds: [],
            lastActiveWorkspaceId: null,
          },
          {
            id: physicsId,
            parentPath: 'C:\\Research',
            workspaceIds: [],
            lastActiveWorkspaceId: null,
          },
        ]}
        activeCollectionId={collectionId}
        busy={false}
        onChoose={choose}
        onSelect={select}
      />,
    );
    fireEvent.change(screen.getByRole('combobox', { name: 'Content folder' }), {
      target: { value: physicsId },
    });
    expect(select).toHaveBeenCalledWith(physicsId);
    fireEvent.click(screen.getByRole('button', { name: 'Add content folder' }));
    expect(choose).toHaveBeenCalledTimes(2);
  });

  it('creates, renames, and switches without changing another workspace status', () => {
    const create = vi.fn();
    const rename = vi.fn();
    const switchTo = vi.fn();
    const locate = vi.fn();
    render(
      <WorkspaceSwitcher
        entries={entries}
        activeWorkspaceId={physicsId}
        busy={false}
        onSwitch={switchTo}
        onCreate={create}
        onRename={rename}
        onLocate={locate}
      />,
    );
    expect(screen.getByText('1 saving')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Switch workspace' }));
    expect(screen.getByText('Folder missing')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Locate content folder…' }));
    expect(locate).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Rename workspace…' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Rename workspace' }), {
      target: { value: 'Mechanics' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Rename', exact: true }));
    expect(rename).toHaveBeenCalledWith(physicsId, 'Mechanics');
    fireEvent.click(screen.getByRole('button', { name: 'Create workspace' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'New workspace name' }), {
      target: { value: ' Chemistry ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create', exact: true }));
    expect(create).toHaveBeenCalledWith('Chemistry');
    fireEvent.click(screen.getByRole('button', { name: 'Switch workspace' }));
    fireEvent.click(screen.getByRole('button', { name: /Physics\s*1 saving/ }));
    expect(switchTo).toHaveBeenCalledWith(physicsId);
  });

  it('shows origin AI/error badges and an empty workspace action', () => {
    const active: WorkspaceEntry = {
      ...entries[0]!,
      activity: {
        workspaceId: physicsId,
        pendingSaveIds: [],
        pendingRunIds: [biologyId],
        lastError: 'redacted',
        sequence: 2,
      },
    };
    const view = render(
      <WorkspaceSwitcher
        entries={[active]}
        activeWorkspaceId={physicsId}
        busy={false}
        onSwitch={vi.fn()}
        onCreate={vi.fn()}
        onRename={vi.fn()}
        onLocate={vi.fn()}
      />,
    );
    expect(screen.getByText('Needs attention')).toBeTruthy();
    view.rerender(
      <WorkspaceSwitcher
        entries={[]}
        activeWorkspaceId={null}
        busy={false}
        onSwitch={vi.fn()}
        onCreate={vi.fn()}
        onRename={vi.fn()}
        onLocate={vi.fn()}
      />,
    );
    expect(screen.getByText('Choose a workspace')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Create workspace' }));
    expect(screen.getByRole('textbox', { name: 'New workspace name' })).toBeTruthy();
  });
});
