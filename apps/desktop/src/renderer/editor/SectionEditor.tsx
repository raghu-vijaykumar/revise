import React from 'react';
import { Extension, Node, type JSONContent } from '@tiptap/core';
import { MarkdownManager } from '@tiptap/markdown';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  createRichProjection,
  parseVideoMarkdownBlock,
  serializeRichProjection,
  type RichDocument,
} from '@revise/core';
import { InsertVideoPopover } from './InsertVideoPopover';
import { VideoEmbed } from './VideoEmbed';

const SourceIdentity = Extension.create({
  name: 'sourceIdentity',
  addGlobalAttributes() {
    return [
      {
        types: 'nodes',
        attributes: {
          sourceId: {
            default: null,
            parseHTML: () => null,
            renderHTML: () => ({}),
          },
        },
      },
    ];
  },
});

const OpaqueMarkdown = Node.create({
  name: 'opaqueMarkdown',
  group: 'block',
  atom: true,
  selectable: false,
  addAttributes() {
    return {
      raw: { default: '', parseHTML: () => '', renderHTML: () => ({}) },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-opaque-markdown]' }];
  },
  renderHTML() {
    // The original text stays in the projection map, never in rendered HTML.
    return [
      'div',
      { 'data-opaque-markdown': '', class: 'opaque-markdown', contenteditable: 'false' },
      'Unsupported block preserved',
    ];
  },
});

const markdownCodec = new MarkdownManager({ extensions: [StarterKit] });

export type SectionEditorProps = {
  workspaceId: string;
  sectionId: string;
  markdown: string;
  onChange: (markdown: string, document: RichDocument) => void;
};

export function SectionEditor({ workspaceId, sectionId, markdown, onChange }: SectionEditorProps) {
  const [error, setError] = React.useState<string | null>(null);
  const [videoOpen, setVideoOpen] = React.useState(false);
  const projection = React.useMemo(
    () => createRichProjection(markdown, (block) => markdownCodec.parse(block) as RichDocument),
    [markdown],
  );
  const editor = useEditor(
    {
      extensions: [
        StarterKit,
        SourceIdentity,
        OpaqueMarkdown,
        VideoEmbed.configure({ workspaceId, sectionId }),
      ],
      content: projection.document as JSONContent,
      contentType: 'json',
      immediatelyRender: false,
      editorProps: {
        attributes: { class: 'section-prosemirror', 'aria-label': 'Section content' },
      },
      onUpdate({ editor: current }) {
        try {
          const next = serializeRichProjection(
            projection,
            current.getJSON() as RichDocument,
            (document) => markdownCodec.serialize(document as JSONContent),
          );
          setError(null);
          onChange(next, current.getJSON() as RichDocument);
        } catch {
          setError('This edit could not be saved safely. Undo the last change.');
        }
      },
    },
    [workspaceId, sectionId],
  );

  function insertVideo(markdownLink: string): void {
    const link = parseVideoMarkdownBlock(markdownLink);
    if (!link || !editor) throw new Error('Invalid video');
    editor
      .chain()
      .focus()
      .insertContent({ type: 'videoEmbed', attrs: { url: link.url, label: link.label } })
      .run();
  }

  const action = (label: string, selected: boolean, run: () => void) => (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={selected}
      onMouseDown={(event) => event.preventDefault()}
      onClick={run}
    >
      {label}
    </button>
  );

  return (
    <div className="section-editor">
      <div className="editor-toolbar" role="toolbar" aria-label="Text formatting">
        {action('Heading 1', editor?.isActive('heading', { level: 1 }) ?? false, () =>
          editor?.chain().focus().toggleHeading({ level: 1 }).run(),
        )}
        {action('Heading 2', editor?.isActive('heading', { level: 2 }) ?? false, () =>
          editor?.chain().focus().toggleHeading({ level: 2 }).run(),
        )}
        {action('Bold', editor?.isActive('bold') ?? false, () =>
          editor?.chain().focus().toggleBold().run(),
        )}
        {action('Italic', editor?.isActive('italic') ?? false, () =>
          editor?.chain().focus().toggleItalic().run(),
        )}
        {action('Bullet list', editor?.isActive('bulletList') ?? false, () =>
          editor?.chain().focus().toggleBulletList().run(),
        )}
        {action('Numbered list', editor?.isActive('orderedList') ?? false, () =>
          editor?.chain().focus().toggleOrderedList().run(),
        )}
        <span className="toolbar-gap" />
        {action('Undo', false, () => editor?.chain().focus().undo().run())}
        {action('Redo', false, () => editor?.chain().focus().redo().run())}
        <span className="toolbar-gap" />
        <button
          type="button"
          aria-label="Insert video"
          aria-expanded={videoOpen}
          onClick={() => setVideoOpen((open) => !open)}
        >
          ▣ Video
        </button>
      </div>
      {videoOpen && (
        <InsertVideoPopover
          onClose={() => setVideoOpen(false)}
          onYoutube={async (url) => {
            const result = await window.revise.insertYoutube(workspaceId, sectionId, url);
            insertVideo(result.markdownLink);
          }}
          onLocal={async () => {
            const result = await window.revise.insertLocalVideo(workspaceId, sectionId);
            if (result) insertVideo(result.markdownLink);
          }}
        />
      )}
      {error && (
        <p className="editor-error" role="alert">
          {error}
        </p>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
