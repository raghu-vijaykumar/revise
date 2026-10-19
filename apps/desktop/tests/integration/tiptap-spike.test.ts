// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';

describe('Tiptap Markdown projection spike', () => {
  it('projects headings, formatting, lists, and links into a rich document', () => {
    const editor = new Editor({
      extensions: [StarterKit, Markdown],
      content:
        '# Motion\n\nA **bold** [video](https://www.youtube.com/watch?v=abc123) and [local clip](./.assets/section-7f3a/motion.mp4).\n\n- One\n- Two',
      contentType: 'markdown',
    });
    try {
      const json = editor.getJSON();
      expect(json.content?.[0]?.type).toBe('heading');
      expect(json.content?.some((node) => node.type === 'bulletList')).toBe(true);
      const markdown = editor.getMarkdown();
      expect(markdown).toContain('**bold**');
      expect(markdown).toContain('https://www.youtube.com/watch?v=abc123');
      expect(markdown).toContain('./.assets/section-7f3a/motion.mp4');
      editor.commands.insertContent('<p>Pasted <strong>rich</strong> text</p>');
      expect(editor.getMarkdown()).toContain('**rich**');
    } finally {
      editor.destroy();
    }
  });
});
