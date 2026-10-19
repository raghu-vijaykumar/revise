# Security boundaries

Revise stores canonical sections in user-selected local Markdown workspaces.
The renderer never chooses an arbitrary filesystem root for a privileged
command: the main process resolves a stable workspace ID through its registry,
then checks section ownership and confined relative paths. A workspace switch
keeps already queued saves and AI runs bound to their origin workspace.

Electron uses context isolation, sandboxing, and no Node integration in the
renderer. The preload exposes named operations only; raw IPC, filesystem,
shell, and credential APIs are never exposed to rich content. Remote YouTube
players and the later research browser must use isolated sessions with no
privileged preload, constrained navigation and permission policy, and an
ordinary link fallback. Renderer CSP denies remote scripts by default; the
player design needs a separate isolated view and explicit allowed origins.

Cloud providers are optional. Before sending, show the active workspace and
exact content scope. Secrets go to the OS credential store, not Markdown,
SQLite prompts, exported data, logs, or browser content. Model and imported
source output are untrusted: validate operation schemas, source locators,
file hashes, and ownership before making a proposal. Only explicit review
can write accepted AI changes.

Before the MVP installer is released, verify archive contents, log redaction,
installed-app IPC boundaries, attachment path traversal, and whether any
media license requires notice or redistribution terms.
