import React from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

function App(): React.JSX.Element {
  const [contentFolder, setContentFolder] = React.useState<string | null>(null);
  async function chooseContentFolder(): Promise<void> {
    const selected = await window.revise.chooseContentFolder();
    if (selected) setContentFolder(selected);
  }
  return (
    <div className="app-shell">
      <header className="titlebar">
        Revise <span>Workspace &nbsp; Edit &nbsp; View &nbsp; Help</span>
      </header>
      <div className="workspace-shell">
        <nav className="activity" aria-label="Activity">
          <button aria-label="Sections">S</button>
          <button aria-label="Search">⌕</button>
          <button aria-label="AI">A</button>
        </nav>
        <aside className="explorer" aria-label="Section explorer">
          <strong>SECTIONS</strong>
          <p>{contentFolder ? 'Content folder selected' : 'No workspace open'}</p>
          <button onClick={() => void chooseContentFolder()}>Choose content folder</button>
          {contentFolder && <p title={contentFolder}>Ready to create a workspace</p>}
          <div className="explorer-bottom">
            OUTLINE
            <br />
            <br />
            TIMELINE
          </div>
        </aside>
        <aside className="chat" aria-label="AI chat">
          <strong>AI CHAT</strong>
          <p>Your learning partner will appear here.</p>
          <div className="chat-input">Ask about this section…</div>
        </aside>
        <main className="work-area">
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected="true">
              Welcome
            </button>
          </div>
          <section className="welcome">
            <h1>Make room for what you are learning</h1>
            <p>
              Choose a content folder to begin. Each workspace will have its own sections, chat, and
              history.
            </p>
          </section>
        </main>
      </div>
      <footer>Local workspace</footer>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
