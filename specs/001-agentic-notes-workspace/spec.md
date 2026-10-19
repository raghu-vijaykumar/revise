# Feature Specification: AI Notes Workspace

**Feature Branch**: `001-agentic-notes-workspace`
**Created**: 2026-10-19
**Status**: Draft for wireframe review
**Input**: [Shared AI note taking concept](https://chatgpt.com/share/6ad598ab-9418-83e8-a7c6-e1ec418579bf) and user's desktop-first, wireframes-first instruction.

## User Scenarios & Testing

### User Story 1 - Build and organize notes directly (Priority: P1)

As a learner, I choose a parent content folder, keep separate subject
workspaces such as Physics and Biology beneath it, and create and edit rich
sections within the active workspace. I can reorder and find content without
depending on an account or connection. Each
section is backed by an ordinary Markdown file, but the app presents sections
and rich content rather than filenames or Markdown syntax.

**Why this priority**: The note is the durable product; it must work before AI.

**Independent Test**: Choose a parent folder, create Physics and Biology
workspaces, switch between them, and create, edit, reopen, and search a section
while disconnected; confirm content and active state stay isolated.

**Acceptance Scenarios**:

1. **Given** an empty workspace, **When** I create a section and add headings,
   formatted text, lists, and a video, **Then** I can type, paste, format,
   reorder, and play that content directly in the rich editor.
2. **Given** saved sections, **When** I search by title or body phrase, **Then** I
   can open a matching section and see its location in the section tree.
3. **Given** a disconnected device, **When** I restart the app, **Then** the
   approved content remains available for reading and editing.
4. **Given** nested sections in the left explorer, **When** I move a section
   or switch a right editor tab, **Then** its hierarchy and selection stay
   clear without showing file extensions or hiding AI chat.
5. **Given** I edit a section's backing Markdown file outside the app, **When** I return,
   **Then** the app detects the change and refreshes or presents a conflict if
   an in-app draft targets the same content.
6. **Given** two sections and a research view are open, **When** I switch
   among their global editor tabs, **Then** all three remain available, the
   section selection is unchanged, and the AI chat stays visible.
7. **Given** first launch, **When** I select a content folder and create Physics
   and Biology, **Then** each workspace has its own named subfolder beneath
   that folder and each section is saved inside the selected workspace.
8. **Given** Physics is active with open tabs and an unfinished AI proposal,
   **When** I switch to Biology, **Then** the explorer, chat, tabs, search,
   sources, and Timeline show Biology only; returning to Physics restores its
   pending state without applying or moving any content.
9. **Given** the selected content folder is moved or unavailable, **When** I
   reopen the app, **Then** I can locate it again or choose another existing
   collection without the app silently creating a replacement or losing data.
10. **Given** I insert a YouTube URL into a section, **When** I reopen it,
    **Then** a playable embed appears within the rich document when online,
    the backing Markdown contains a normal URL link, and a link remains usable
    when embedding or network playback is unavailable.
11. **Given** I choose a local video, **When** I insert it into a section,
    **Then** the app copies it to a section-adjacent media folder, adds a
    relative Markdown link, and plays it within the rich document. Moving or
    exporting the section retains the playable relative link and media file.
12. **Given** I edit a section or start an AI request in Physics, **When** I
    switch to Biology, **Then** saving and the AI request continue under Physics
    in the background, Biology stays responsive, and Physics shows progress or
    a recoverable error when I return. No AI change is accepted automatically.

### User Story 2 - Ask an agent and review its changes (Priority: P1)

As a learner, I ask the agent by text or dictation to create or improve a note,
watch a live proposed preview, inspect a rich diff, and accept or reject changes.

**Why this priority**: This is the defining persistent-chat and editor workflow.

**Independent Test**: With one existing note and a configured model, request a
revision, inspect added/removed/moved blocks, and accept only one operation.

**Acceptance Scenarios**:

1. **Given** a note at revision 3, **When** the agent proposes changes, **Then**
   the current approved note remains intact and the preview is visually distinct.
2. **Given** a proposal containing three operations, **When** I accept one and
   reject two, **Then** only the accepted operation enters the approved note.
3. **Given** I edit a target block during generation, **When** the proposal is
   ready, **Then** the app flags the conflict and never silently overwrites me.
4. **Given** no usable model credentials or a model failure, **When** I ask for
   help, **Then** my note stays editable and no partial proposal is approved.
5. **Given** a pending proposal, **When** I open its Changes editor tab,
   **Then** the conversation and selected section remain visible on the left.
6. **Given** proposed rich text, **When** I type, paste, format a heading, or
   undo in the Changes view, **Then** the revised proposal updates in place,
   remains visibly pending, and needs explicit acceptance before saving.
7. **Given** a proposed change, **When** I use its compact top-right controls,
   **Then** I can accept, decline, or attach a comment to that change without
   leaving the rich document.
8. **Given** I select text or a block in a section, **When** I add an
   annotation asking AI to update it, **Then** the selection and section
   revision are attached to the request; the answer returns as a reviewable
   change on that selection and never silently edits other content.
9. **Given** an AI proposal adds a factual claim without a supporting source,
   **When** I review it and after I accept it, **Then** the claim is visibly
   labeled unsourced until a source is attached; the review does not imply a
   citation that the agent did not provide.

### User Story 3 - Inspect provenance and recover history (Priority: P1)

As a learner, I can see where an AI-added claim came from, inspect prior
revisions, and restore an approved version after a mistake or crash.

**Why this priority**: Trust requires traceability and recovery.

**Independent Test**: Accept a cited edit, edit manually, restore an older
revision, then reopen the app and inspect the complete history.

**Acceptance Scenarios**:

1. **Given** a sourced proposal, **When** I inspect its citation, **Then** I can
   reach the relevant page, timestamp, URL, or captured passage when available.
2. **Given** multiple revisions, **When** I choose Restore, **Then** a new
   revision records the restoration and the prior revisions remain inspectable.
3. **Given** an interrupted save, **When** the app reopens, **Then** it recovers
   to a consistent approved state and reports any incomplete background snapshot.
4. **Given** a selected section, **When** I expand its Timeline beneath the
   section tree, **Then** I see only that section's revisions; selecting one opens a
   read-only revision or comparison in the right editor group.

### User Story 4 - Import and consolidate sources (Priority: P2)

As a learner, I add text, files, audio, images, webpages, and video, inspect the
extracted material, and ask the agent to update related notes with citations.

**Why this priority**: Multiple source types are central to the stated product.

**Independent Test**: Import one supported example of each type; verify source
status, preview, locator, extraction error, and a reviewable note proposal.

**Acceptance Scenarios**:

1. **Given** a supported file, **When** I import it, **Then** I see durable job
   progress, an extracted preview, and an option to add it to a note.
2. **Given** a video with speech and a diagram, **When** analysis completes,
   **Then** transcript and visual observations are distinguishable and linked to
   time locations, with uncertainty visible where extraction is weak.
3. **Given** an unsupported, corrupt, oversized, or encrypted source, **When**
   extraction fails, **Then** the original stays accessible and I can retry or
   cancel without corrupting notes.
4. **Given** a URL lacking accessible content, **When** capture fails, **Then**
   the app keeps the URL as a source and offers manual paste or file import.
5. **Given** a video added to a section, **When** I reopen that section,
   **Then** the player remains embedded beside the text and the backing
   Markdown still contains a portable link to the media asset.

### User Story 5 - Browse while learning (Priority: P2)

As a learner, I browse inside the desktop app and explicitly capture an article,
selection, or annotation into a research session that can feed note proposals.

**Why this priority**: The requested research workflow should stay beside notes.

**Independent Test**: Browse with capture off, opt in, capture a selected
passage, inspect its source card, and propose a note change.

**Acceptance Scenarios**:

1. **Given** capture is off, **When** I visit pages, **Then** page content is not
   saved into the knowledge workspace by default.
2. **Given** capture is on for a session, **When** I save a selection, **Then** I
   can review the passage, URL, title, capture time, and destination note.
3. **Given** a private or excluded page, **When** I browse, **Then** capture is
   blocked or requires a fresh explicit action before content is stored.

### User Story 6 - Learn my style without hidden changes (Priority: P2)

As a learner, I can set explanation preferences and inspect suggested changes
to those preferences based on repeated feedback.

**Why this priority**: Personalization must remain legible and editable.

**Independent Test**: Set an explicit preference, review a learned suggestion,
disable learning, and confirm notes remain unchanged.

**Acceptance Scenarios**:

1. **Given** I repeatedly ask for worked examples, **When** the app identifies
   a pattern, **Then** it suggests a preference rather than silently changing it.
2. **Given** a saved preference, **When** I edit, reset, or disable it, **Then**
   later proposals reflect that decision.

### User Story 7 - Use local models and portable data (Priority: P3)

As a learner, I can choose locally installed processing models, understand what
works fully offline, and export notes and attachments in readable formats.

**Why this priority**: This completes the local-first promise beyond storage.

**Independent Test**: Disconnect the device, run a supported local workflow,
and export then reimport a workspace without data loss.

**Acceptance Scenarios**:

1. **Given** required local models are installed, **When** I work offline,
   **Then** supported generation and extraction run without network traffic.
2. **Given** no local model, **When** I attempt offline generation, **Then** the
   app explains the limitation while retaining manual editing and search.

### Edge Cases

- Two proposals touch the same block; one is accepted first.
- The user edits while an agent is streaming, or closes the app during review.
- A source contains instructions to the agent, HTML scripts, or false citations.
- A cloud request would include private note excerpts or a large attachment.
- A PDF is scanned, a video has no audio, transcription is uncertain, or a URL
  has no extractable body.
- A source is duplicated, moved, deleted, or inaccessible after citation.
- Storage fills, a model times out, network disappears, or snapshot creation fails.
- A note has thousands of blocks or a media import lasts longer than a session.
- A selected passage changes or is deleted while an annotation request runs;
  the result becomes a visible conflict instead of targeting a guessed range.
- Two workspace names would resolve to the same folder; a chosen parent folder
  is read-only, moved, or contains an unrelated same-named directory.
- A user switches workspaces while an editor has unsaved changes or an AI run
  is in progress; content and events remain attached to their origin workspace.
- A YouTube video is unavailable offline, private, age-restricted, or disallows
  embedding; the original URL remains openable and no content is downloaded.
- A local video is moved with its section, or an attachment copy fails midway;
  the relative link must never point silently to an incomplete file.
- Pasted rich content contains unsupported formatting or an unknown Markdown
  extension; the app preserves it safely or reports what cannot be represented.

## Requirements

### Functional Requirements

- **FR-001 (P1)**: Users MUST create local workspaces and rich, editable
  sections backed by human-readable `.md` files without an account. The app
  MUST hide filenames, extensions, and Markdown syntax in its normal UI.
- **FR-002 (P1)**: Users MUST create, split, move, and reorder sections and
  content blocks in a navigable section hierarchy.
- **FR-003 (P1)**: The workspace MUST present agent interaction and the active
  section together, with a persistent AI chat on the left, a section explorer
  at the far left, and a resizable right editor group with one global tab
  strip for open sections and work views.
- **FR-004 (P1)**: Users MUST configure at least one model provider and see
  which content a cloud request will send before enabling that route.
- **FR-005 (P1)**: Agent edits MUST enter a visible proposal state before they
  can affect the approved note.
- **FR-006 (P1)**: Review MUST show additions, deletions, rewrites, and moves
  in a rich editable Changes tab in the right pane while AI chat stays visible.
  Each change MUST have compact, accessible top-right accept, decline, and
  comment controls. Users MUST be able to edit and format proposed content
  before accepting it, without that edit bypassing review. Comments MUST be
  saved locally and MAY be explicitly sent to AI to request another revision.
- **FR-007 (P1)**: Proposals MUST be checked against the revision they target;
  overlapping user changes MUST require explicit resolution.
- **FR-008 (P1)**: Approved and manual edits MUST have durable history shown
  in a per-selected-section Timeline beneath the section explorer. Selecting
  a revision MUST open a read-only view or comparison as an editor tab in the
  right pane. Restore MUST preserve later revisions. A pending history entry
  MUST be visible and repairable after interruption.
- **FR-009 (P1)**: Users MUST be able to search note titles and body text.
- **FR-010 (P1)**: The app MUST recover a consistent approved state after an
  interruption and show incomplete background work.
- **FR-011 (P2)**: Users MUST import text, PDF, image, audio, and user-provided
  video files; each import MUST retain an inspectable original and source card.
- **FR-012 (P2)**: Extraction jobs MUST expose progress, cancellation, retry,
  failure details, and a reviewable extracted preview.
- **FR-013 (P2)**: Generated factual additions MUST cite a source locator when
  supported. The P1 baseline for visible unsourced claims is FR-032.
- **FR-014 (P2)**: The app MUST offer an embedded browser with capture off by
  default in its own right editor tab, with explicit controls for saving pages,
  selections, and annotations while the chat remains visible.
- **FR-015 (P2)**: Users MUST connect related notes, see backlinks, and search
  beyond exact keywords when an appropriate local index is available.
- **FR-016 (P2)**: Users MUST create freehand sketches and retain the original
  editable drawing alongside any AI interpretation.
- **FR-017 (P2)**: Explicit preferences MUST be editable; inferred preferences
  MUST be suggested for approval and may be disabled or reset.
- **FR-018 (P3)**: Users MUST be able to select installed local models for
  supported processing and clearly see remaining online dependencies.
- **FR-019 (P3)**: Users MUST export notes, attachments, provenance, and history
  in documented readable forms and reimport their own export. A minimal P1
  export of Markdown and linked media is required separately by FR-033.
- **FR-020 (P3)**: Optional multi-device sync MUST preserve offline editing and
  surface conflicting revisions before overwriting either version.
- **FR-021 (P1)**: Users MUST be able to dictate an agent request with a visible
  recording indicator, review the transcript, and cancel before sending it.
- **FR-022 (P1)**: The section explorer MUST show named sections and their
  hierarchy, support moving/reordering them, and retain the current section
  selection while the user switches among global editor tabs. It MUST not
  list media files as separate content entries merely because they are embedded.
- **FR-023 (P1)**: The section view MUST be a direct rich text editor with
  typing, selection, headings, lists, links, copy/paste, undo/redo, and inline
  media. It MUST not expose a Markdown source editing mode. Saving MUST
  serialize to the same backing `.md` file and preserve unsupported syntax
  rather than silently deleting or rewriting it.
- **FR-024 (P3)**: The rendering system MUST support documented, versioned
  custom Markdown rules for richer blocks with a protected opaque-node or
  plain-text fallback in the rich editor. The initial custom syntax is a later
  design decision.
- **FR-025 (P1)**: The right editor group MUST allow multiple sections and
  work views to be open, switched, and closed independently of the section
  explorer's selection. Import, browser, settings, changes, and revision views
  use the same global tab strip rather than tabs nested inside a section.
- **FR-026 (P1)**: Selecting text or a content block MUST offer an anchored
  annotation action to ask AI for a scoped update. The annotation MUST retain
  the selected quote/range, section identity, and base revision, and produce a
  reviewable proposal or a visible conflict if its anchor is stale.
- **FR-027 (P1)**: A section MUST support inline video in its direct rich editor.
  A user MAY paste a supported YouTube video URL; the app stores a normal URL
  link in Markdown and renders an isolated embedded player while online. A
  user MAY choose a local MP4 or WebM video; the app MUST copy it to a media folder beside
  the section's `.md` file and store a relative Markdown link. Both retain an
  accessible link fallback if playback or embedding fails. Playback state is
  outside the document. MVP embedding MUST NOT download or analyze video.
- **FR-028 (P1)**: On first use, users MUST select a parent content folder.
  They MUST be able to create, name, open, rename, and switch multiple
  workspaces within it. Each workspace MUST occupy a distinct immediate
  subfolder; the app MUST show the active workspace and offer a switcher above
  the section explorer without displaying `.md` filenames there.
- **FR-029 (P1)**: Sections, Markdown files, attachments, sources, chat,
  proposals, tabs, search, preferences, and per-section history MUST belong to
  one workspace. Switching MUST preserve each workspace's unfinished state and
  prevent cross-workspace reads or writes unless the user explicitly chooses
  to copy or import content. Shared provider credentials MAY remain in the OS
  vault, but content disclosure and permission scopes MUST name the workspace.
- **FR-030 (P1)**: The chosen parent path and workspace-to-subfolder mapping
  MUST be recoverable on restart. Names MUST avoid path collisions and escapes.
  An unavailable, read-only, or relocated folder MUST produce a recoverable
  prompt instead of silent recreation, overwrite, or data loss. Changing the
  parent folder MUST be an explicit open/relocate flow with no implicit move.
- **FR-031 (P1)**: A workspace switch MUST leave the origin workspace's
  document saves, history commits, and already-started AI jobs running in the
  background. Before leaving an edited section, the app MUST durably capture
  its pending draft or report that it cannot safely switch. Progress,
  completion, and errors MUST remain attached to the origin workspace and be
  visible when it is reopened. Background AI results remain proposed until the
  user reviews them.
- **FR-032 (P1)**: Factual content added by AI without a verified source
  locator MUST be visibly marked `Unsourced` in both the pending rich diff and
  the approved section and its readable Markdown. A citation badge MUST only
  appear when a real source card and locator are attached. The label remains
  until a source is supplied or the claim is removed.
- **FR-033 (P1)**: Users MUST be able to export one workspace as readable
  Markdown files with its linked local media and a documented folder layout.
  The export MUST preserve relative links, include an export manifest, and
  report missing media rather than silently omitting it. Extended provenance,
  history, and reimport support remain in FR-019.

### Engineering Quality Requirements

These requirements apply when application implementation begins after the
wireframe review gate. They are part of the initial project scaffold, not a
later polish phase.

- **QR-001 (P1)**: The repository MUST provide one documented command that
  runs formatting checks, linting, strict TypeScript checks, unit and
  integration tests with coverage, and desktop UI tests. Each check MUST also
  be runnable independently with concise failure output.
- **QR-002 (P1)**: Production TypeScript and TSX MUST pass formatting, ESLint,
  and strict type checks with no warning or error budget. Generated code and
  third-party assets MAY be excluded only by documented paths.
- **QR-003 (P1)**: Automated unit, component, and integration tests MUST
  produce machine-readable and browsable coverage reports. Coverage MUST
  include domain logic, main-process services, and renderer behavior, with
  aggregate floors of 80% lines, statements, and functions and 75% branches.
  Each nontrivial production file MUST reach at least 60% lines. Markdown
  conversion, change validation, review decisions, and history recovery MUST
  each reach at least 90% lines and 85% branches. Exceptions require a written
  reason and replacement behavioral evidence; thresholds cannot be lowered
  silently.
- **QR-004 (P1)**: Desktop UI automation MUST launch the real app against an
  isolated disposable parent folder with at least two workspaces and cover
  folder selection, workspace creation/switching, isolation, section navigation, global tabs,
  rich formatting and paste, local and YouTube inline video with fallback,
  background save/AI activity across workspace switches, basic export with
  linked media, unsourced claim labeling, text selection and annotation,
  editable diff and per-change controls, Timeline, offline behavior, and the
  main empty/error states. Tests MUST confirm AI chat remains visible beside
  the section explorer and editor at both target viewports. They MUST assert
  visible behavior and persistence, not only that controls render.
- **QR-005 (P1)**: A focused visual regression suite MUST cover parent-folder
  setup, the workspace switcher, the rich workspace, editable Changes,
  selection annotation, and Timeline at the reference
  desktop viewport and one narrower viewport. Baseline changes require visual
  review. Dynamic video frames and timestamps MUST be stabilized or excluded
  from screenshot comparisons without removing behavioral playback checks.
- **QR-006 (P1)**: Pull requests and the main branch MUST run the static,
  coverage, and UI gates in automation on the Windows reference environment.
  Failed gates block a release claim; the CI run retains coverage reports,
  screenshots, traces, and concise failure logs for review.
- **QR-007 (P1)**: The MVP exit gate MUST build and install a packaged Windows
  app on a clean test environment and run a startup, folder selection, local
  video, save/reopen, and uninstall smoke test. A keyboard-only smoke MUST
  traverse workspace switching, section navigation, editor formatting, AI
  request/review controls, Timeline, and export with visible focus and no trap.

### Key Entities

- **Content collection**: user-selected parent folder containing separately
  named workspace subfolders and a local registry of their identities.
- **Workspace**: one subfolder containing its own sections, assets, sources,
  chat, pending changes, history, preferences, and local settings.
- **Section / Block**: Rich UI section backed by a Markdown file, with stable
  identities, parsed blocks, and a current file revision.
- **Selection annotation / Review comment**: Anchored request on approved
  text or feedback on a pending proposed change.
- **Source / Segment**: original material and extract with a precise locator.
- **Citation**: link from a claim or block to a source segment.
- **Claim status**: sourced or `Unsourced` state attached to a factual AI
  addition and reflected in the readable Markdown after approval.
- **Draft checkpoint / Workspace activity**: durable pending rich edit and
  origin-labeled save/AI status across workspace switches.
- **Video embed / Attachment**: user-provided YouTube URL or section-adjacent
  local video with a portable Markdown link and derived player.
- **Agent run / Change set / Operation**: request, proposed edits, and decisions.
- **Revision**: durable approved or manual state and its ancestry.
- **Import job**: progress and outcomes for source extraction.
- **Preference**: explicit or proposed style rule, scope, and status.
- **Knowledge link**: navigable relationship between sections.

## Success Criteria

### Measurable Outcomes

- **SC-001**: In a usability test, 8 of 10 first-time users can create a rich
  section, annotate a selection for AI, edit a proposal, and accept only one
  proposed change without help.
- **SC-002**: All approved content remains recoverable after forced shutdowns
  at each documented save/review transition in the release test matrix.
- **SC-003**: In a 1,000-section sample, 95% of local searches show results within
  one second on the target reference desktop.
- **SC-004**: Every AI-approved operation in the release test can be traced to
  its request and approval decision; sourced factual blocks open a locator.
- **SC-005**: Rich editing, opening sections, and exact-text search remain usable
  after network disconnection in all offline acceptance scenarios.
- **SC-006**: In moderated review, at least 8 of 10 users correctly identify
  whether content is draft, proposed, or approved and whether a model call is
  local or cloud-based.
- **SC-007**: The first implementation milestone's verification command and
  Windows CI run pass all QR-001–QR-007 gates on a clean checkout; coverage
  reports include the planned production paths and meet the stated floors.
- **SC-008**: Desktop UI tests exercise the complete section-to-annotation-to-
  editable-review-to-history journey and detect an intentionally broken tab
  switch or accept action during harness validation.
- **SC-009**: In the release test, creating Physics and Biology under a chosen
  folder yields two distinct subfolders. Switching and restarting preserve each
  workspace's sections, open context, pending proposals, and history; searches
  and AI requests never expose content from the other workspace by default.
- **SC-010**: In the MVP test, a YouTube URL and local video both reopen as
  inline players in their section, the local file remains beside that section,
  and offline/blocked playback retains a usable link. Switching workspaces
  during a save and an AI run completes both under the origin workspace.
- **SC-011**: The MVP export opens on another machine as Markdown with working
  relative local-media links; unsupported AI claims remain visibly unsourced;
  the packaged Windows and keyboard-only smoke tests pass before release.

## Assumptions

- Single-user desktop app with multiple local workspaces first; Windows is the initial verification
  platform, with macOS and Linux compatibility planned before broad release.
- One parent content folder is active at a time. Opening another parent is an
  explicit action and never silently moves existing workspace folders.
- A model provider is optional for editing and search; the user supplies any
  cloud API key. Cloud processing is opt-in and is not described as offline.
- MVP YouTube support is online playback of user-provided video URLs only;
  the saved Markdown URL remains usable independently of the app. Video
  transcription, frame analysis, downloading, and other extraction are P2.
- Browser capture is explicit per session. Private pages are excluded by default.
- P1 is the first code milestone after wireframe review; P2 and P3 are planned
  releases, not promises for the first implementation increment.
- Approval applies to agent changes; direct manual edits save as user revisions.
- `.md` files are authoritative. Rich editor projections, extracted text, search indexes,
  and block identity maps are derived and can be rebuilt. Custom Markdown
  syntax is designed later; the first release preserves unknown constructs.
