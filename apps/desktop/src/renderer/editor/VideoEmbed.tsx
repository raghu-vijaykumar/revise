import React from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';
import { parseVideoLink } from '@revise/core';

function VideoView({ node, extension }: NodeViewProps) {
  const url = typeof node.attrs.url === 'string' ? node.attrs.url : '';
  const label = typeof node.attrs.label === 'string' ? node.attrs.label : 'Video';
  const link = parseVideoLink(url, label);
  const workspaceId = extension.options.workspaceId as string;
  const sectionId = extension.options.sectionId as string;
  const localSource =
    link?.kind === 'local' && link.sectionId === sectionId
      ? `revise-media://${workspaceId}/${sectionId}/${link.fileName}`
      : null;

  return (
    <NodeViewWrapper className="video-embed" contentEditable={false}>
      {link?.kind === 'youtube' ? (
        <>
          <iframe
            src={link.embedUrl}
            title={label}
            sandbox="allow-scripts allow-same-origin allow-presentation"
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
          <button type="button" onClick={() => void window.revise.openYoutube(link.url)}>
            Open on YouTube ↗
          </button>
        </>
      ) : localSource ? (
        <>
          <video src={localSource} controls preload="metadata" aria-label={label} />
          <button
            type="button"
            onClick={() => void window.revise.openLocalVideo(workspaceId, sectionId, url)}
          >
            Open local video ↗
          </button>
        </>
      ) : (
        <span>Video unavailable</span>
      )}
    </NodeViewWrapper>
  );
}

export const VideoEmbed = Node.create<{ workspaceId: string; sectionId: string }>({
  name: 'videoEmbed',
  group: 'block',
  atom: true,
  selectable: true,
  addOptions() {
    return { workspaceId: '', sectionId: '' };
  },
  addAttributes() {
    return {
      url: { default: '', parseHTML: () => '', renderHTML: () => ({}) },
      label: { default: 'Video', parseHTML: () => 'Video', renderHTML: () => ({}) },
    };
  },
  renderHTML({ HTMLAttributes }) {
    // The safe media URL is resolved by the NodeView, never from document HTML.
    return ['div', mergeAttributes(HTMLAttributes, { 'data-video-embed': '' }), 'Video'];
  },
  addNodeView() {
    return ReactNodeViewRenderer(VideoView);
  },
});
