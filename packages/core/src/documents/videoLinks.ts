const videoId = /^[A-Za-z0-9_-]{11}$/;
const localLink = /^\.\/\.assets\/([0-9a-f-]{36})\/([a-f0-9]{64}\.(?:mp4|webm))$/i;

export type VideoLink =
  | { kind: 'youtube'; url: string; label: string; embedUrl: string }
  | { kind: 'local'; url: string; label: string; sectionId: string; fileName: string };

export function youtubeEmbedUrl(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username || url.password) return null;
  const host = url.hostname.toLowerCase();
  let id: string | null = null;
  if (host === 'youtu.be' || host === 'www.youtu.be') {
    id = url.pathname.slice(1);
  } else if (
    ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'www.youtube-nocookie.com'].includes(host)
  ) {
    if (url.pathname === '/watch') id = url.searchParams.get('v');
    else if (/^\/(?:shorts|embed|live)\//.test(url.pathname))
      id = url.pathname.split('/')[2] ?? null;
  }
  return id && videoId.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}

export function parseVideoLink(url: string, label = 'Video'): VideoLink | null {
  if (/[()\s\\]/.test(url)) return null;
  const embedUrl = youtubeEmbedUrl(url);
  if (embedUrl) return { kind: 'youtube', url, label, embedUrl };
  const local = localLink.exec(url);
  if (local) return { kind: 'local', url, label, sectionId: local[1]!, fileName: local[2]! };
  return null;
}

export function parseVideoMarkdownBlock(markdown: string): VideoLink | null {
  const match = /^\[([^\]\r\n]+)\]\(([^()\s]+)\)$/.exec(markdown.trim());
  return match ? parseVideoLink(match[2]!, match[1]!) : null;
}

export function videoMarkdownLink(link: VideoLink): string {
  const label = link.label.replaceAll('\\', '\\\\').replaceAll('[', '\\[').replaceAll(']', '\\]');
  return `[${label}](${link.url})`;
}
