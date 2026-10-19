// @vitest-environment jsdom
import React from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Section } from '../../packages/core/src';
import { SectionTree } from '../../apps/desktop/src/renderer/workspace/SectionTree';
import { InsertVideoPopover } from '../../apps/desktop/src/renderer/editor/InsertVideoPopover';
import { useSectionDocument } from '../../apps/desktop/src/renderer/editor/useSectionDocument';
import { WorkspaceDocument } from '../../apps/desktop/src/renderer/workspace/WorkspaceDocument';
import { SplitHandle } from '../../apps/desktop/src/renderer/workspace/SplitHandle';
import { ChatPane } from '../../apps/desktop/src/renderer/workspace/ChatPane';

const workspaceId = '58ac7960-9012-41cf-9d13-ed970417c790';
const sectionId = '6a77bdb5-9f22-4b94-bb40-5bdf0e1329f4';
const fileHash = 'a'.repeat(64);
const section: Section = {
  id: sectionId,
  workspaceId,
  displayTitle: 'Motion',
  parentId: null,
  order: 0,
  relativeMarkdownPath: `sections/${sectionId}/index.md`,
  fileHash,
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('section workspace controls', () => {
  it('keeps a question draft with its original workspace while switching', async () => {
    const biologyId = '57b43850-971b-4cf9-a6d0-47519e9bddbd';
    const readChatDraft = vi.fn(async (id: string) =>
      id === workspaceId ? 'Physics question' : 'Biology question',
    );
    const saveChatDraft = vi.fn(async () => undefined);
    vi.stubGlobal('revise', { readChatDraft, saveChatDraft });
    const view = render(
      <ChatPane key={workspaceId} workspaceId={workspaceId} sectionTitle="Motion" />,
    );
    await waitFor(() =>
      expect(
        (screen.getByRole('textbox', { name: 'Question draft' }) as HTMLTextAreaElement).value,
      ).toBe('Physics question'),
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'Question draft' }), {
      target: { value: 'How does velocity change?' },
    });
    view.rerender(<ChatPane key={biologyId} workspaceId={biologyId} sectionTitle="Cells" />);
    await waitFor(() =>
      expect(saveChatDraft).toHaveBeenCalledWith(workspaceId, 'How does velocity change?'),
    );
    await waitFor(() =>
      expect(
        (screen.getByRole('textbox', { name: 'Question draft' }) as HTMLTextAreaElement).value,
      ).toBe('Biology question'),
    );
  });
  it('lets keyboard users resize the explorer within its bounds', () => {
    const onChange = vi.fn();
    render(
      <SplitHandle
        label="Resize section explorer"
        value={240}
        min={200}
        max={250}
        onChange={onChange}
      />,
    );
    const handle = screen.getByRole('separator', { name: 'Resize section explorer' });
    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith(250);
    fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenCalledWith(224);
  });
  it('shows title-only section navigation and creates a nested section', async () => {
    const onCreate = vi.fn(async () => undefined);
    const onOpen = vi.fn();
    render(
      <SectionTree
        sections={[section]}
        selectedId={section.id}
        onOpen={onOpen}
        onCreate={onCreate}
      />,
    );
    expect(screen.getByRole('button', { name: 'Motion' }).getAttribute('aria-current')).toBe(
      'page',
    );
    expect(screen.queryByText('index.md')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Motion' }));
    expect(onOpen).toHaveBeenCalledWith(section.id);
    fireEvent.click(screen.getByRole('button', { name: 'Add subsection to Motion' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'New subsection' }), {
      target: { value: 'Velocity' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(onCreate).toHaveBeenCalledWith('Velocity', section.id));
  });

  it('flushes a rich edit to its original workspace when the editor closes', async () => {
    const openSection = vi.fn(async () => ({
      section,
      markdown: '# Motion\n',
      fileHash,
      sessionId: sectionId,
    }));
    const saveRichSection = vi.fn(async () => ({ fileHash: 'b'.repeat(64) }));
    vi.stubGlobal('revise', { openSection, saveRichSection });
    const hook = renderHook(() => useSectionDocument(workspaceId, sectionId));
    await waitFor(() => expect(hook.result.current.status).toBe('saved'));
    const edit = {
      type: 'doc' as const,
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Motion' }] },
      ],
    };
    act(() => hook.result.current.onChange('## Motion\n', edit));
    hook.unmount();
    await waitFor(() =>
      expect(saveRichSection).toHaveBeenCalledWith(
        workspaceId,
        sectionId,
        sectionId,
        fileHash,
        edit,
      ),
    );
  });

  it('opens an editable section and reports its saved state', async () => {
    vi.stubGlobal('revise', {
      openSection: vi.fn(async () => ({
        section,
        markdown: '# Motion\n',
        fileHash,
        sessionId: sectionId,
      })),
      saveRichSection: vi.fn(async () => ({ fileHash })),
    });
    const view = render(<WorkspaceDocument workspaceId={workspaceId} section={section} />);
    await waitFor(() =>
      expect(view.container.querySelector('.section-prosemirror h1')?.textContent).toBe('Motion'),
    );
    expect(screen.getByRole('status').textContent).toBe('Saved');
  });

  it('offers both video routes and keeps a failed choice recoverable', async () => {
    const onClose = vi.fn();
    const onYoutube = vi.fn(async () => {
      throw new Error('Invalid URL');
    });
    const onLocal = vi.fn(async () => undefined);
    render(<InsertVideoPopover onClose={onClose} onYoutube={onYoutube} onLocal={onLocal} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'YouTube URL' }), {
      target: { value: 'https://youtu.be/dQw4w9WgXcQ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Embed YouTube video' }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Choose local MP4 or WebM…' }));
    await waitFor(() => expect(onLocal).toHaveBeenCalledOnce());
    expect(onClose).toHaveBeenCalledOnce();
  });
});
