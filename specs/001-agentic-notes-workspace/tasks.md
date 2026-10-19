# Tasks: AI Notes Workspace

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts](contracts/), and
[wireframes](wireframes/README.md).
**State**: Wireframe direction reviewed through user feedback; implementation
authorized by the explicit `speckit-implement` request on 2026-10-19.
**Format**: `[ID] [P?] [US?] action in exact path`.

## Phase 0: Wireframe review gate

**Goal**: Resolve UX decisions before application code. The current eleven
wireframes and spec pack are the first delivery.

- [X] T001 Record the user's screen-by-screen feedback, including parent-folder selection and workspace switching, in specs/001-agentic-notes-workspace/wireframes/README.md.
- [X] T002 Reconcile approved decisions and any changed acceptance criteria in specs/001-agentic-notes-workspace/spec.md and specs/001-agentic-notes-workspace/plan.md.
- [X] T003 Mark the user-reviewed wireframe direction and implementation authorization in specs/001-agentic-notes-workspace/wireframes/README.md.

**Checkpoint**: Do not start T004 or any application source task until T003.

## Phase 1: Setup

**Goal**: Buildable desktop shell with lint, type checking, coverage, real-app
UI automation, Windows installer configuration, and documented safety boundaries
in place before feature code.

- [X] T004 Create the pnpm workspace, strict TypeScript configurations, and package manifests in package.json, pnpm-workspace.yaml, apps/desktop/package.json, and packages/core/package.json.
- [X] T005 Create Electron main, isolated preload, and React renderer entry points in apps/desktop/src/main/index.ts, apps/desktop/src/preload/index.ts, and apps/desktop/src/renderer/main.tsx.
- [X] T006 Configure Prettier, ESLint with TypeScript rules, strict type checking, Vitest unit/component/integration runners with React Testing Library and V8 coverage, documented include/exclude paths and QR-003 thresholds, plus concise `format:check`, `lint`, `typecheck`, `test:unit`, `test:integration`, `test:coverage`, and `verify` scripts in eslint.config.mjs, .prettierrc.json, vitest.config.ts, package.json, and docs/QUALITY.md.
- [X] T007 [P] Create a versioned workspace-local SQLite migration runner and initial schema in apps/desktop/src/main/storage/migrations.ts and apps/desktop/src/main/storage/schema.sql.
- [X] T008 [P] Record threat boundaries and provider/media license checks in docs/SECURITY.md and docs/THIRD_PARTY.md.
- [X] T009 Configure a reproducible Windows installer and installed-app launch path in apps/desktop/electron-builder.yml and apps/desktop/package.json; retain a clean-machine package smoke command for the P1 gate.
- [X] T010 Set up Playwright Electron UI automation with a disposable parent folder and two workspace fixtures, stable model/media fixtures, native-dialog handling, screenshot/trace retention, 1760×980 and 1280×800 projects, and a shell startup/close/no-sensitive-log smoke test with a reviewed shell baseline; wire `test:ui` and `verify` into Windows pull-request/main CI in playwright.config.ts, apps/desktop/tests/e2e/fixtures.ts, apps/desktop/tests/e2e/shell.spec.ts, package.json, and .github/workflows/verify.yml.

## Phase 2: Foundational contracts

**Goal**: One validated document writer and durable local state before stories.

- [X] T011 Define content-collection and workspace identity, section identity, Markdown file hash, parsed-block sidecar ID, selection annotation anchor, review comment, source locator, and workspace-scoped operation schemas in packages/core/src/contracts/workspace.ts, packages/core/src/contracts/document.ts, and packages/core/src/contracts/source.ts.
- [X] T012 Define typed folder-picker, workspace lifecycle, and section/agent commands/events with workspace-owner validation in packages/core/src/contracts/ipc.ts and apps/desktop/src/main/ipc/router.ts.
- [X] T013 Spike a Tiptap/ProseMirror rich document and source-mapped Markdown codec; prove headings, lists, formatting, pasted text, YouTube HTTPS and relative local-video links, and unknown syntax roundtrip before choosing the codec in packages/core/src/documents/parseMarkdown.ts and packages/core/src/documents/text.ts.
- [X] T014 Implement a workspace-bound single-writer atomic Markdown file coordinator and external-change watcher with confined path resolution in apps/desktop/src/main/storage/markdownFiles.ts.
- [X] T015 Add review decisions and durable file-to-Git history outbox in apps/desktop/src/main/storage/historyOutbox.ts and apps/desktop/src/main/storage/schema.sql.
- [ ] T016 Add file-hash/span preconditions, idempotency checks, byte-preserving Markdown patches, safe rich projection, and selection-anchor validation in packages/core/documents/changeEngine.ts.
- [X] T017 [P] Add confined local-video staging and verified copy into a section-adjacent `.assets/<section-id>/` folder, plus workspace-local blob staging for later source imports, in apps/desktop/src/main/storage/blobStore.ts and apps/desktop/src/main/storage/sectionMedia.ts.
- [X] T018 [P] Add OS-backed secret access and redacted diagnostics in apps/desktop/src/main/secrets/providerSecrets.ts and apps/desktop/src/main/logging.ts.
- [ ] T019 Test rich-edit/Markdown roundtrip, YouTube and section-relative video links, unsupported syntax preservation, malformed/duplicate operations, stale selection anchors, and rejected cross-workspace targeting/path escapes; prove coverage includes the production codec and change engine and enforces their critical-module floors in tests/integration/document-boundary.test.ts and vitest.config.ts.
- [ ] T020 Test forced-shutdown recovery across atomic file replacement and pending Git outbox repair in tests/integration/recovery.test.ts.
- [ ] T021 Implement native parent-folder selection, a persistent content-collection registry, workspace create/open/rename/switch, stable IDs, unique immediate subfolders, unavailable-folder recovery, and origin-bound background save/Git/AI lifecycle in apps/desktop/src/main/workspaces/workspaceManager.ts and apps/desktop/src/main/workspaces/workspaceRegistry.ts.

**Checkpoint**: Shared document, security, and storage contracts pass before
US1; static checks, coverage reporting and current thresholds, and the real
Electron UI smoke test pass through `pnpm verify` locally and in Windows CI.

## Phase 3: User Story 1 — Build and organize sections (P1)

**Goal**: Separate local workspaces and rich sections usable without any model or account.

**Independent test**: Select a parent folder, create Physics and Biology,
switch while a save runs without mixing state, then create, format, insert a
YouTube URL and local video, export the Markdown/media tree, search, and reopen
a section with local work still available while disconnected.

- [ ] T022 [US1] Build first-run folder selection, a named workspace switcher above the section tree, create/rename/open controls, per-workspace saving/AI/error badges, active-workspace label, and missing-folder recovery from wireframes 09–10 in apps/desktop/src/renderer/workspace/WorkspacePicker.tsx and apps/desktop/src/renderer/workspace/WorkspaceSwitcher.tsx.
- [ ] T023 [US1] Implement workspace-scoped section create, rename, nest, move with its companion media folder, reorder, and recoverable delete backed by one `.md` file per section in apps/desktop/src/main/notes/noteService.ts.
- [ ] T024 [US1] Build direct Tiptap/ProseMirror rich editing with headings, lists, formatting, copy/paste, undo/redo, text selection, and isolated inline YouTube/local video players with original-link fallback; serialize validated edits to Markdown without a source mode in apps/desktop/src/renderer/editor/SectionEditor.tsx and packages/core/documents/renderMarkdown.ts.
- [ ] T025 [US1] Add the editor's Insert Video action for a validated YouTube URL or native local-file choice; store only a normal HTTPS/relative Markdown link, copy local media beside the section before saving, and make failures recoverable from wireframe 03 in apps/desktop/src/renderer/editor/InsertVideoPopover.tsx, apps/desktop/src/main/media/videoEmbedService.ts, and apps/desktop/src/main/storage/sectionMedia.ts.
- [ ] T026 [US1] Build the section explorer, workspace-scoped persistent chat, resizable boundaries, and workspace-scoped global right editor tabs for multiple open sections and work views from wireframe 01 in apps/desktop/src/renderer/workspace/Workspace.tsx; tab or workspace switching must not change another workspace's section selection, chat context, or background jobs, and no extension appears in normal UI.
- [ ] T027 [US1] Add a durable draft checkpoint before workspace switch, origin-bound background atomic rich-to-Markdown save, file-hash conflict handling, and visible per-workspace history/error status in apps/desktop/src/renderer/editor/useSectionDocument.ts and apps/desktop/src/main/storage/markdownFiles.ts.
- [ ] T028 [US1] Implement per-workspace rebuildable SQLite FTS5 indexing from `.md` files in apps/desktop/src/main/search/textSearch.ts and apps/desktop/src/main/storage/schema.sql.
- [ ] T029 [US1] Add section drag reorder, keyboard navigation, and empty/no-result states in apps/desktop/src/renderer/workspace/SectionTree.tsx and apps/desktop/src/renderer/search/SearchPanel.tsx.
- [ ] T030 [US1] Export one selected workspace's canonical Markdown and linked section-adjacent local media with a manifest, path validation, and missing-file report in apps/desktop/src/main/portability/exportBasicWorkspace.ts and apps/desktop/src/renderer/workspace/ExportWorkspaceAction.tsx.
- [ ] T031 [US1] Verify distinct Physics/Biology subfolders, origin-bound save completion after switching and restart, chat/tab/search/history isolation, YouTube playback/link fallback, local video adjacency and move, readable Markdown/media export with intact relative links, external-file conflicts, and 1,000-section search in apps/desktop/tests/e2e/workspaces.spec.ts, apps/desktop/tests/e2e/local-notes.spec.ts, and tests/integration/media-portability.test.ts.

## Phase 4: User Story 2 — Annotate, edit proposal, and approve (P1)

**Goal**: One complete request-to-approved-revision loop with partial review.

**Independent test**: Ask for three edits, inspect each diff, accept one,
reject two, and confirm only one enters the approved section.

- [ ] T032 [US2] Define provider capability, stream, cancel, and workspace-bound context-manifest interfaces in packages/core/agent/modelGateway.ts.
- [ ] T033 [US2] Implement the first BYOK cloud adapter with redacted errors in apps/desktop/src/main/models/firstProvider.ts.
- [ ] T034 [US2] Add provider configuration and pre-send cloud context disclosure from wireframe 06 in apps/desktop/src/renderer/settings/ModelSettings.tsx and apps/desktop/src/renderer/agent/ContextDisclosure.tsx.
- [ ] T035 [US2] Implement workspace-bound section read/search/propose tools, selection scope enforcement, and untrusted-output parsing in packages/core/agent/tools.ts and packages/core/agent/proposals.ts.
- [ ] T036 [US2] Add workspace-bound agent run state, cancellation, streamed progress, and continued background execution after a workspace switch with origin-workspace status delivery in apps/desktop/src/main/agent/runService.ts.
- [ ] T037 [US2] Keep chat visible while showing a proposed rich projection in an open section tab; add text/block selection, floating Ask AI/Comment actions, and revision-anchored scoped requests in apps/desktop/src/renderer/agent/AgentPane.tsx and apps/desktop/src/renderer/editor/ProposalOverlay.tsx.
- [ ] T038 [US2] Implement a directly editable rich diff with headings, formatting, paste, undo/redo, before/after, move, provenance or persistent `Unsourced` labels, top-right accept/decline/comment icons, locally saved review comments, and explicit Ask AI revision requests in a global `Changes: <section>` tab from wireframe 02 in apps/desktop/src/renderer/review/ReviewPane.tsx.
- [ ] T039 [US2] Write accepted Markdown atomically with source locator or a readable `**Unsourced**:` marker plus durable claim status, queue an internal Git commit, reproject remaining operations, and implement safe Accept all in apps/desktop/src/main/review/reviewService.ts.
- [ ] T040 [US2] Add explicit start/stop dictation, local transcription asset check, transcript preview, and discard in apps/desktop/src/renderer/agent/VoiceRequest.tsx and apps/desktop/src/main/media/transcriptionService.ts.
- [ ] T041 [US2] Test provider outage, invalid tool payloads, cancellation, AI run completion after workspace switch, cloud context scope and rejected cross-workspace context, honest `Unsourced` labeling before/after acceptance, rich proposal edits, stale text selections, and partial approval in tests/integration/agent-review.test.ts.
- [ ] T042 [US2] Demonstrate selection annotation to AI proposal, rich diff edit/comment, unsourced claim badge, workspace switch during AI work, and partial approval in apps/desktop/tests/e2e/agent-review.spec.ts.

## Phase 5: User Story 3 — Provenance and recoverable history (P1)

**Goal**: Every accepted edit is inspectable, attributable, and restorable.

**Independent test**: Cite one edit, manually change it, restart, and restore
an earlier revision as a new revision.

- [ ] T043 [US3] Add pasted-text source cards, store citation refs with accepted blocks, and expose locator opening in apps/desktop/src/main/sources/sourceStore.ts and apps/desktop/src/main/sources/citationService.ts.
- [ ] T044 [US3] Implement workspace-local selected-section Git log, rich comparison, and additive restore commit in apps/desktop/src/main/history/historyService.ts.
- [ ] T045 [US3] Build the selected-section Timeline beneath the section explorer and open read-only revision, comparison, and restore preview as global editor tabs from wireframe 05 in apps/desktop/src/renderer/history/HistoryPane.tsx.
- [ ] T046 [US3] Detect stale Markdown file hashes and external edits, then present safe/overlapping operations from wireframe 07 in apps/desktop/src/renderer/review/ConflictPane.tsx and packages/core/documents/changeEngine.ts.
- [ ] T047 [US3] Add internal Git commit worker, per-section pending status, repair, and metadata backup in apps/desktop/src/main/history/gitHistoryWorker.ts and apps/desktop/src/main/storage/backupService.ts.
- [ ] T048 [US3] Verify workspace-local file/Git crash points, external-edit conflicts, citation locators, and restore ancestry in tests/integration/history-recovery.test.ts and apps/desktop/tests/e2e/history.spec.ts.

## P1 MVP exit gate

- [ ] T049 Build and install the Windows package on a clean test image, smoke first launch, folder selection, local video, save/reopen, export, and uninstall; then traverse workspace switching, section tree, rich editor formatting, Ask AI, per-change review, Timeline, and export using only the keyboard with visible focus and no traps in apps/desktop/tests/e2e/packaged-windows.spec.ts, apps/desktop/tests/e2e/keyboard-smoke.spec.ts, and docs/RELEASE.md.

**P1 release gate**: US1–US3, voice request, offline manual editing, basic
Markdown/media export, honest unsourced labels, origin-bound background work,
Windows packaged install, keyboard smoke, and contract/recovery checks pass
before P2 work. The moderated usability outcomes
in SC-001 and SC-006 are measured before broader product release in T082.

## Phase 6: User Story 4 — Import and consolidate sources (P2)

**Goal**: Each source type produces a durable, reviewable extract and cited
proposal; failed extraction preserves the original.

**Independent test**: Import text, PDF, image, audio, and user-provided video
fixtures, then trace note additions back to the original page or time.

- [ ] T050 [US4] Extend source cards to plain-text/file/media imports, segment locators, original hashes, and duplicate-blob reuse in apps/desktop/src/main/sources/sourceStore.ts.
- [ ] T051 [US4] Add durable import stages, progress, cancellation, and retry in apps/desktop/src/main/ingestion/jobQueue.ts.
- [ ] T052 [US4] Build extracted-source review in its own global editor tab; if analyzed video is placed in a section, reuse the P1 Insert Video action rather than creating a file-tree entry in apps/desktop/src/renderer/sources/ImportPane.tsx.
- [ ] T053 [US4] Parse selectable PDF text and render scanned pages for OCR in apps/desktop/src/main/ingestion/pdfExtractor.ts.
- [ ] T054 [US4] Add image OCR with original/correction layers and confidence labels in apps/desktop/src/main/ingestion/imageExtractor.ts.
- [ ] T055 [US4] Transcribe audio into timestamped segments with local model asset checks in apps/desktop/src/main/ingestion/audioExtractor.ts.
- [ ] T056 [US4] Demux user-provided video, align transcript and sampled frame observations, and preserve uncertainty in apps/desktop/src/main/ingestion/videoExtractor.ts.
- [ ] T057 [US4] Capture a pasted URL with scheme/address/redirect checks, sanitized preview, and manual fallback in apps/desktop/src/main/ingestion/webExtractor.ts.
- [ ] T058 [US4] Add editable sketch originals and separate interpretation overlays in apps/desktop/src/renderer/editor/SketchBlock.tsx.
- [ ] T059 [US4] Test corrupt/scanned/silent/duplicate sources, cancellation/retry, prompt injection, and citation opening in tests/integration/ingestion.test.ts and apps/desktop/tests/e2e/source-review.spec.ts.

## Phase 7: User Story 5 — Browse and learn (P2)

**Goal**: Browse with notes visible; capture remains explicit and isolated.

**Independent test**: Browse with capture off, enable a session, save a passage,
review its card, and ask for a cited proposal.

- [ ] T060 [US5] Create sandboxed research `WebContentsView` and isolated session in apps/desktop/src/main/browser/researchView.ts.
- [ ] T061 [US5] Enforce navigation, popup, permission, download, and external URL policy in apps/desktop/src/main/browser/browserPolicy.ts.
- [ ] T062 [US5] Implement opt-in capture scope, selected-passage provenance, and private-page exclusion in apps/desktop/src/main/browser/captureService.ts.
- [ ] T063 [US5] Build the global Research Browser editor tab and capture preview from wireframe 04, preserving chat at left, in apps/desktop/src/renderer/research/ResearchWorkspace.tsx.
- [ ] T064 [US5] Route reviewed browser captures through source import and agent proposals in apps/desktop/src/main/browser/captureService.ts and apps/desktop/src/main/sources/sourceStore.ts.
- [ ] T065 [US5] Test capture-off behavior, remote-page privilege isolation, redirects, and session reset in tests/integration/browser-boundary.test.ts and apps/desktop/tests/e2e/research.spec.ts.

## Phase 8: User Story 6 — Personalize knowledge (P2)

**Goal**: Related notes and suggested preferences improve proposals without
hidden behavior changes.

**Independent test**: Follow a backlink, review a suggested preference,
disable learning, and see later proposals respect the explicit setting.

- [ ] T066 [US6] Implement knowledge links, backlinks, and related-note retrieval in packages/core/knowledge/links.ts and apps/desktop/src/main/knowledge/knowledgeStore.ts.
- [ ] T067 [US6] Add a local semantic index with model/version metadata and keyword fallback in apps/desktop/src/main/knowledge/semanticSearch.ts.
- [ ] T068 [US6] Store explicit preferences and inferred suggestions separately in packages/core/knowledge/preferences.ts and apps/desktop/src/main/knowledge/preferenceStore.ts.
- [ ] T069 [US6] Build preference acceptance, edit, reset, and disable controls from wireframe 06 in apps/desktop/src/renderer/settings/PreferenceSettings.tsx.
- [ ] T070 [US6] Test search fallback, backlink consistency, preference override, and rejection behavior in tests/integration/knowledge-preferences.test.ts.

## Phase 9: User Story 7 — Offline models and portability (P3)

**Goal**: Truthful offline capability and readable, recoverable exports.

**Independent test**: Disconnect, run an installed local workflow, export a
workspace, and reimport it into a fresh local profile.

- [ ] T071 [US7] Add local model capability/asset registration and explicit download status in apps/desktop/src/main/models/localModelRegistry.ts.
- [ ] T072 [US7] Implement local gateway adapter without silent cloud fallback in apps/desktop/src/main/models/localProvider.ts.
- [ ] T073 [US7] Build offline capability and missing-asset status in apps/desktop/src/renderer/settings/ModelSettings.tsx.
- [ ] T074 [US7] Extend the P1 Markdown/media export with source metadata, provenance, integrity hashes, and optional Git history manifest in apps/desktop/src/main/portability/exportWorkspace.ts.
- [ ] T075 [US7] Validate hashes/schema, preview parent-folder name collisions, and import into a distinct workspace subfolder in apps/desktop/src/main/portability/importWorkspace.ts.
- [ ] T076 [US7] Document optional sync conflict and encryption requirements before any sync implementation in docs/SYNC_DESIGN.md.
- [ ] T077 [US7] Test network-blocked local operation and export/reimport parity in tests/integration/offline-portability.test.ts and apps/desktop/tests/e2e/offline.spec.ts.

## Phase 10: Polish and release validation

- [ ] T078 Confirm keyboard access, focus order, screen reader labels, and state contrast; add reviewed visual baselines for workspace, editable Changes, annotation, and Timeline at both target viewports in apps/desktop/tests/e2e/accessibility.spec.ts and apps/desktop/tests/e2e/visual.spec.ts.
- [ ] T079 Benchmark rich editing, 1,000-section search, and long import responsiveness in tests/performance/desktop-bench.ts.
- [ ] T080 Review packaged binaries, model assets, licenses, and Windows/macOS/Linux behavior in docs/THIRD_PARTY.md and docs/RELEASE.md.
- [ ] T081 Record end-to-end evidence for every delivered release phase in docs/RELEASE.md and reconcile remaining Spec Kit tasks in specs/001-agentic-notes-workspace/tasks.md.
- [ ] T082 Conduct a moderated first-time-user study against SC-001 and SC-006 and record results in docs/USABILITY.md.

## Phase 11: Future rich Markdown rules

**Goal**: Define Confluence-like rich editor features on top of portable Markdown
without changing the source-of-truth rule. This begins only after the basic
rich editor and review flow have proven roundtrip fidelity.

- [ ] T083 Define versioned custom Markdown syntax, safe fallback rendering, and migration fixtures in docs/MARKDOWN_EXTENSIONS.md and packages/core/documents/extensionRegistry.ts.
- [ ] T084 Verify unsupported/custom syntax survives rich edits byte-for-byte where untouched in tests/integration/markdown-extensions.test.ts.

## Phase 12: Optional sync if selected for a later release

**Goal**: Carry the local Markdown workspace across devices without making
network availability a prerequisite or overwriting divergent files.

- [ ] T085 Define the opt-in encrypted sync manifest, file ancestry, and conflict contract in packages/core/sync/contracts.ts and docs/SYNC_DESIGN.md.
- [ ] T086 Implement a provider-neutral sync outbox and remote adapter without changing local file authority in apps/desktop/src/main/sync/syncService.ts and apps/desktop/src/main/sync/remoteAdapter.ts.
- [ ] T087 Build a per-section rich conflict view with explicit keep/merge decisions in apps/desktop/src/renderer/sync/SyncConflictPane.tsx.
- [ ] T088 Verify offline edits, divergent files, attachment integrity, and opt-out behavior in tests/integration/sync.test.ts.

## Dependencies and parallel work

```text
T001–T003 review gate
    -> T004–T010 setup
    -> T011–T021 foundation, including collection/workspace management
    -> US1 -> US2 -> US3 = first release
    -> US4 -> US5 and US6 (can overlap after source contract)
    -> US7 -> polish -> future rich Markdown rules and optional sync
```

Items marked `[P]` can be worked in separate files after their phase starts;
they do not waive contract integration checks. US4 can begin as soon as the
P1 release gate passes. US5 depends on source cards and capture contracts from
US4; US6 can start after the search/knowledge foundation. The vertical slice
is T021–T031, T032–T042, and T043–T049 across two isolated workspaces before
source extraction work; T049 closes the P1 release gate with an installed Windows
package and keyboard-only smoke.

## Implementation strategy

Work in short, demonstrable slices. Keep approved state canonical, validate
contracts at boundaries, and prove storage/recovery before adding media types.
Revisit this task list after wireframe feedback. Never mark a task complete on
source inspection alone; use the independent test or release evidence attached
to its story. From T010 onward, feature tasks also require passing formatting,
lint, types, applicable unit/integration/component tests, coverage floors, and
relevant real-app UI journeys. New visual baselines require review rather than
blind snapshot updates.
