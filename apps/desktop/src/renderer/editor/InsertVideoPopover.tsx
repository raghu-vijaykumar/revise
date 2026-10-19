import React from 'react';

type Props = {
  onClose: () => void;
  onYoutube: (url: string) => Promise<void>;
  onLocal: () => Promise<void>;
};

export function InsertVideoPopover({ onClose, onYoutube, onLocal }: Props) {
  const [url, setUrl] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      onClose();
    } catch {
      setError('Video could not be added. Check the URL or file and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="insert-video-popover" role="dialog" aria-label="Insert video">
      <div className="popover-heading">
        <strong>Insert video</strong>
        <button type="button" aria-label="Close insert video" onClick={onClose}>
          ×
        </button>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void run(() => onYoutube(url.trim()));
        }}
      >
        <label htmlFor="youtube-url">YouTube URL</label>
        <input
          id="youtube-url"
          type="url"
          placeholder="https://www.youtube.com/watch?v=…"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          autoFocus
        />
        <button type="submit" disabled={busy || !url.trim()}>
          Embed YouTube video
        </button>
      </form>
      <div className="video-choice">or</div>
      <button type="button" onClick={() => void run(onLocal)} disabled={busy}>
        Choose local MP4 or WebM…
      </button>
      <small>Local files are copied beside this section.</small>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
