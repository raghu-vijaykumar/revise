// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { SectionEditor } from '../../apps/desktop/src/renderer/editor/SectionEditor';

afterEach(cleanup);
beforeAll(() => {
  // jsdom has no layout geometry; ProseMirror only needs stable values to focus.
  const rect = {
    top: 0,
    bottom: 1,
    left: 0,
    right: 1,
    width: 1,
    height: 1,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect;
  Range.prototype.getClientRects = () => [rect] as unknown as DOMRectList;
  Range.prototype.getBoundingClientRect = () => rect;
  window.scrollBy = () => undefined;
});

describe('direct rich section editor', () => {
  it('renders Markdown as rich content and sends formatted edits through the codec', async () => {
    const onChange = vi.fn();
    const view = render(
      <SectionEditor
        workspaceId="physics"
        sectionId="motion"
        markdown={'# Motion\n\nA note.\n'}
        onChange={onChange}
      />,
    );
    await waitFor(() =>
      expect(view.container.querySelector('.section-prosemirror')).not.toBeNull(),
    );
    expect(view.container.querySelector('h1')?.textContent).toBe('Motion');
    expect(screen.getByRole('toolbar', { name: 'Text formatting' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Heading 2' }));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(onChange.mock.lastCall?.[0]).toContain('## Motion');
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(view.container.querySelector('h1')?.textContent).toBe('Motion'));
  });

  it('renders unsupported Markdown as a protected placeholder without executing HTML', async () => {
    const view = render(
      <SectionEditor
        workspaceId="physics"
        sectionId="unknown"
        markdown={':::future-widget\nsecret syntax\n:::\n\n<script>alert(1)</script>\n'}
        onChange={vi.fn()}
      />,
    );
    await waitFor(() => expect(view.container.querySelectorAll('.opaque-markdown').length).toBe(2));
    expect(view.container.querySelector('script')).toBeNull();
    expect(view.container.textContent).not.toContain('alert(1)');
  });

  it('embeds a portable YouTube link through the restricted player origin', async () => {
    const view = render(
      <SectionEditor
        workspaceId="physics"
        sectionId="motion"
        markdown={'# Motion\n\n[Launch](https://www.youtube.com/watch?v=dQw4w9WgXcQ)\n'}
        onChange={vi.fn()}
      />,
    );
    await waitFor(() => expect(view.container.querySelector('iframe')).not.toBeNull());
    expect(view.container.querySelector('iframe')?.getAttribute('src')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    );
    expect(view.container.querySelector('iframe')?.getAttribute('title')).toBe('Launch');
  });
});
