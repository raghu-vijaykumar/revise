import { describe, expect, it } from 'vitest';
import {
  parseVideoLink,
  parseVideoMarkdownBlock,
  videoMarkdownLink,
  youtubeEmbedUrl,
} from '../../packages/core/src/documents/videoLinks';

describe('portable video links', () => {
  it('accepts only HTTPS YouTube URLs with a video ID', () => {
    const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    expect(youtubeEmbedUrl(url)).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(youtubeEmbedUrl('https://youtu.be/dQw4w9WgXcQ')).toContain('/embed/dQw4w9WgXcQ');
    expect(youtubeEmbedUrl('http://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(youtubeEmbedUrl('https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(youtubeEmbedUrl('https://www.youtube.com/watch?v=short')).toBeNull();
    expect(parseVideoLink(`${url}&bad=)`)).toBeNull();
  });

  it('keeps a local video as a section-relative Markdown link', () => {
    const sectionId = '58ac7960-9012-41cf-9d13-ed970417c790';
    const link = `./.assets/${sectionId}/${'a'.repeat(64)}.mp4`;
    const parsed = parseVideoMarkdownBlock(`[Motion clip](${link})`);
    expect(parsed).toMatchObject({ kind: 'local', sectionId, url: link });
    expect(videoMarkdownLink(parsed!)).toBe(`[Motion clip](${link})`);
    expect(parseVideoMarkdownBlock(`[Escaped](../other.mp4)`)).toBeNull();
  });
});
