# Research and Technical Decisions

**Reviewed**: 2026-10-19. Primary documentation linked below. These are design
decisions for planning; dependency versions and licenses are checked again before
application implementation.

## Desktop shell and remote content

**Decision**: Electron for the desktop shell. Use `WebContentsView` for research
pages, with sandbox and context isolation, disabled Node integration, narrow IPC,
and explicit permission/navigation/popup policies. Electron [documents the
security model](https://www.electronjs.org/docs/latest/tutorial/security/),
[WebContentsView](https://www.electronjs.org/docs/latest/api/web-contents-view),
and [discourages the webview tag](https://www.electronjs.org/docs/latest/api/webview-tag).

**Rationale**: Embedded browsing is a core product flow and Electron provides
direct control over process isolation and browser sessions.

**Alternatives**: Tauri reduces shell size but requires a separate embedded web
strategy and platform-specific behavior; a pure web app limits local files and
browser integration.

## Editor and canonical document

**Decision**: Ordinary `.md` files are canonical, one per visible section.
Use a direct rich editor for approved sections and editable proposal documents,
with source-mapped Markdown import/export. No Markdown source mode appears in
the app. Track block IDs and source spans in rebuildable sidecar metadata.
Keep unchanged bytes intact for scoped edits. [CommonMark](https://spec.commonmark.org/)
and [GFM](https://github.github.com/gfm/) provide the portable baseline.
A local video attachment is represented by a normal Markdown link; the rich
editor renders that link as an embedded player. Unsupported future syntax is
preserved as a protected opaque node or unchanged source span.

**Rationale**: The user requires Markdown files as the underlying artifact.
Source maps permit targeted review while the original remains readable in an
external text editor. The rich view is a projection, not a second document format.

**Implementation candidates**: [Tiptap's ProseMirror-based editor](https://tiptap.dev/docs/editor/extensions/custom-extensions/create-new/node)
for rich documents, [Bubble Menu](https://tiptap.dev/docs/editor/extensions/functionality/bubble-menu)
for text-selection formatting and Ask AI, and [Node Views](https://tiptap.dev/docs/editor/extensions/custom-extensions/node-views)
for inline video. Its official [Markdown package](https://tiptap.dev/docs/editor/markdown/getting-started/basic-usage)
provides parsing/serialization hooks but is marked Beta; a phase-0 spike must
prove roundtrips for headings, lists, tables, links, pasted formatting, video
links, and unsupported syntax before adopting it. If it loses source, use a
controlled source-mapped codec around the ProseMirror document. Local selection
annotations and review comments must be app-owned metadata; the published
[Tiptap Comments](https://tiptap.dev/docs/comments/core-concepts/configure)
integration is tied to a collaboration provider and is not the planned
local-first storage path. Parsing must not reserialize an unchanged file.

**Alternative rejected**: Tiptap/ProseMirror JSON as canonical state would
make Markdown an export rather than the user's file. The rich editor is a
temporary editing projection; validated Markdown remains authoritative.

## Storage, search, and history

**Workspace collection decision**: Let the user choose a parent content
folder through a native picker. Create each named workspace as an immediate
subfolder with its own Markdown tree, assets, SQLite store, pending proposals,
chat, and internal Git history. Keep only the parent path, stable workspace IDs,
and last active workspace in the app profile. Scope service instances and
events to a workspace ID; switching never reuses another workspace's tabs,
search index, or model context. A missing or read-only parent requires an
explicit locate/open action, and changing the parent does not move data.

**Rationale**: Physics and Biology can be managed, copied, and backed up as
separate readable directories while the app presents a single section explorer
for the active workspace. Per-workspace stores make accidental cross-subject
search or AI context leakage easier to detect and prevent.

**Alternative rejected**: One shared Markdown tree with a workspace tag would
mix assets, history, and search scope and would not give each space its own
subfolder as requested.

**Decision**: Save `.md` files atomically, use an internal Git repository for
per-file history, and keep SQLite as a rebuildable index/metadata store with a
durable Git-commit outbox. FTS5 indexes extracted Markdown text. The app must
reconcile filesystem, outbox, and Git after interruption. Git's
[path-limited log](https://git-scm.com/docs/git-log),
[commit](https://git-scm.com/docs/git-commit), and
[show](https://git-scm.com/docs/git-show) support the selected file's timeline;
SQLite [transactions](https://www.sqlite.org/lang_transaction.html),
[FTS5](https://www.sqlite.org/fts5.html), and the
[backup API](https://www.sqlite.org/backup.html) cover derived metadata.

**Rationale**: The user's file remains open outside the app and history behaves
like a per-file timeline. Git and the filesystem cannot share one transaction,
so a visible pending state and repair process are part of the first release.

**Alternatives**: SQLite-only revisions were rejected after review because the
file timeline and Markdown ownership favor an internal Git ledger. SQLite
remains derived for note content, while storing jobs and decisions durably.

## Model gateway and credentials

**Decision**: Normalize request, stream, cancel, error, capability, and context
manifest across provider adapters. Start with one cloud BYOK adapter and add
others as acceptance tests mature. Provider APIs differ: [OpenAI streaming](https://developers.openai.com/api/docs/guides/streaming-responses),
[Anthropic streaming](https://platform.claude.com/docs/en/build-with-claude/streaming),
[Gemini API](https://ai.google.dev/api), and [Ollama API](https://github.com/ollama/ollama/blob/main/docs/api.md).
Store secrets through an OS-backed mechanism such as
[Electron safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage),
with its documented same-user limitations.

**Rationale**: Users can switch providers without moving notes, and the UI can
truthfully distinguish cloud from local processing.

**Alternatives**: Direct provider calls from the renderer expose keys and make
context disclosure hard to enforce. A single provider-specific domain model
would make later adapters costly.

## PDF, images, and handwriting

**Decision**: Extract selectable PDF text with
[PDF.js](https://mozilla.github.io/pdf.js/examples/index.html); render scanned
pages before OCR. [Tesseract.js](https://github.com/naptha/tesseract.js/blob/master/docs/faq.md)
does not accept PDF input directly and is weak on handwriting. Keep originals
and label OCR or interpretation as machine-derived.

**Rationale**: A reviewable extract plus original source prevents silent loss.

**Alternatives**: Cloud vision can improve difficult handwriting but must be an
explicit cloud request and cannot be called fully offline.

## Audio and video

**Decision**: Use [FFmpeg](https://github.com/FFmpeg/FFmpeg/blob/master/doc/ffmpeg.texi)
for demuxing and [whisper.cpp](https://github.com/ggml-org/whisper.cpp/blob/master/README.md)
for local timestamped speech segments. Add frame sampling and vision analysis
only after transcript quality, cost, and provenance are measured.

**Rationale**: Audio-first analysis delivers useful notes while retaining a
clear distinction between spoken and visual evidence. Model download/packaging
must be explicit; [FFmpeg license](https://ffmpeg.org/legal.html) obligations
must be reviewed.

**Alternatives**: Cloud transcription is easier to integrate but sends audio
out of the device. Direct arbitrary YouTube transcription is not assumed:
[caption list](https://developers.google.com/youtube/data/reference/rest/v3/captions/list)
does not contain caption text and [caption download](https://developers.google.com/youtube/data/reference/rest/v3/captions/download)
has authorization constraints.

## Web capture

**Decision**: Research browser capture is off by default. Capture only an
explicit page/selection with URL and capture time, sanitize extracted HTML,
and review the result before note changes. [Mozilla Readability](https://github.com/mozilla/readability/blob/main/README.md)
warns that its result is not sanitized. A future extension path can use
[activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab)
for gesture-scoped access, but is not required for the desktop MVP.

**Rationale**: Browsing history is sensitive and source pages are untrusted.
URL fetches must reject local/private destinations and redirected targets per
[OWASP SSRF guidance](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html).

**Alternatives**: Always-on automatic capture is easier to market but violates
the intended privacy boundary and would collect irrelevant/private pages.

## Fully offline processing

**Decision**: Offline is a tested capability profile. Manual editing and exact
search require no model; generation and extraction list required installed
models/assets and disclose downloads. If using Transformers.js, configure local
asset paths and disable remote models; its [custom usage guide](https://huggingface.co/docs/transformers.js/custom_usage)
shows that defaults may fetch assets remotely.

**Rationale**: Local storage alone cannot justify an offline claim.

## Quality tooling and desktop test harness

**Decision**: Set up static checks, coverage, and real-app UI automation in
the first code scaffold. Use [typescript-eslint flat configuration](https://typescript-eslint.io/getting-started/)
and Prettier for lint/format checks, Vitest with
[V8 coverage and threshold rules](https://vitest.dev/config/coverage.html)
for domain/main/renderer tests, and [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
for renderer interactions. Use [Playwright's Electron API](https://playwright.dev/docs/api/class-electron)
for desktop journeys and [visual comparisons](https://playwright.dev/docs/test-snapshots)
for a small set of stable screen baselines.

**Rationale**: Coverage reports expose untested paths in the Markdown codec,
change validation, review, and recovery services. Component tests can verify
rich editor commands, while the real Electron harness verifies persistence,
global tabs, IPC, native dialogs, and section-level UI behavior together.
Visual baselines are generated and checked on one pinned Windows environment
because rendering can vary across operating systems and fonts. Playwright's
Electron support is marked experimental, so the scaffold must prove launch,
close, dialog control, and artifact capture before feature suites rely on it.

**Alternatives**: Browser-only E2E tests cannot prove Electron main/preload
behavior. Screenshot-only tests miss saved-state and review decisions. A single
aggregate coverage percentage can conceal untested critical modules, so the
plan also sets module and per-file floors with documented exclusions.
