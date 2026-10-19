import React from 'react';

type Props = { workspaceId: string | null; sectionTitle: string | null };

export function ChatPane({ workspaceId, sectionTitle }: Props) {
  const [draft, setDraft] = React.useState('');
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = React.useRef('');

  React.useEffect(() => {
    let current = true;
    setDraft('');
    setLoaded(false);
    setError(false);
    if (workspaceId) {
      void window.revise
        .readChatDraft(workspaceId)
        .then((saved) => {
          if (!current) return;
          latest.current = saved;
          setDraft(saved);
          setLoaded(true);
        })
        .catch(() => {
          if (current) setError(true);
        });
    }
    return () => {
      current = false;
    };
  }, [workspaceId]);

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (workspaceId && loaded)
        void window.revise.saveChatDraft(workspaceId, latest.current).catch(() => undefined);
    },
    [workspaceId, loaded],
  );

  function update(value: string) {
    if (!workspaceId) return;
    latest.current = value;
    setDraft(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void window.revise.saveChatDraft(workspaceId, value).catch(() => undefined);
    }, 180);
  }

  return (
    <aside className="chat" aria-label="AI chat">
      <strong>AI CHAT</strong>
      <p>
        {sectionTitle ? `About ${sectionTitle}` : 'Choose a section to focus the conversation.'}
      </p>
      <div className="chat-composer">
        <label htmlFor="chat-draft">Question draft</label>
        <textarea
          id="chat-draft"
          value={draft}
          onChange={(event) => update(event.target.value)}
          disabled={!workspaceId || !loaded}
          placeholder="Ask about this section…"
          maxLength={10000}
        />
        <small>Draft saved in this workspace.</small>
        {error && (
          <small role="alert">Draft unavailable. Reopen this workspace to try again.</small>
        )}
      </div>
    </aside>
  );
}
