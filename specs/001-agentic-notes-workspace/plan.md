# Implementation Plan: AI Notes Workspace

**Branch**: `001-agentic-notes-workspace` | **Date**: 2026-10-19 | **Spec**: [spec.md](spec.md)
**Input**: Desktop-first local-first AI note app; user requires wireframe review before application code.

## Summary

Build a single-user desktop knowledge app with a user-selected parent folder
and separate workspace subfolders (for example Physics and Biology). Visible
sections are backed by local Markdown files, with persistent AI chat, a section explorer
with the selected section's Outline and Timeline, and global right editor tabs,
structured agent proposals, per-operation review, and per-section Git history.
Ingestion, embedded browsing, knowledge links,
personalization, local models, and optional sync follow through the same source,
proposal, and revision contracts. Deliver [wireframes](wireframes/README.md)
first and wait for their review before implementation.

## Technical Context

| Area | Planned choice |
| --- | --- |
| Language | TypeScript with strict type checking; small native/CLI helpers only for media processing |
| Desktop | Electron, React renderer, isolated preload, `WebContentsView` for later research browser |
| Editor | Tiptap/ProseMirror rich editor for approved sections and editable proposals; source-mapped Markdown import/export with untouched-span preservation and opaque fallback for unknown constructs; no Markdown source mode |
| Storage | A user-selected parent folder contains one subfolder per workspace. Within each, `.md` files are canonical; workspace-local SQLite holds metadata, jobs, source/citation indexes, and FTS5 search; attachments are content addressed |
| History | Internal Git commits for approved/manual section saves, with a durable outbox and a per-section Timeline in the section explorer; revision and comparison views open as global editor tabs |
| Models | Provider-neutral gateway; one cloud BYOK adapter for first vertical slice, other cloud/local adapters later |
| Voice and media | Visible voice capture, local transcription; PDF.js, OCR, FFmpeg, and vision analysis in later ingestion slices |
| Quality tooling | ESLint flat config with TypeScript rules, Prettier format check, strict TypeScript, Vitest V8 coverage for unit/component/integration, React Testing Library for renderer behavior, Playwright Electron for desktop UI and visual checks |
| Tests | Document/change contracts, Markdown roundtrip, DB crash/recovery, rich editor/component interactions, desktop end-to-end journeys, visual baselines, manual wireframe and accessibility reviews |
| Platform | Windows reference machine first; macOS/Linux packaging compatibility before broad release |
| Performance | Local edit feedback <100 ms target; search across 1,000 sections <1 s at p95; long jobs never block the editor |
| Constraints | Accountless; readable offline; cloud calls disclose transmitted context; no silent destructive agent edits |

The SQLite binding, model SDK adapter, and packaging tool will be pinned during
implementation after verifying current Electron ABI, license, and platform build
support. Their interfaces are fixed in the contracts below so that selection does
not alter the user workflow.

## Constitution Check

| Principle | Design gate | Status |
| --- | --- | --- |
| Local ownership | Each workspace remains a distinct readable subfolder beneath the user-selected content folder; all state is local; no account path | Pass |
| Reviewed changes | Agent can only produce validated operations against base revisions | Pass |
| Traceable knowledge | Citation locator and source card travel with proposals and approved blocks | Pass |
| Recoverable history | Atomic Markdown write plus durable outbox and Git commit; restore creates a new commit | Pass |
| Bounded capabilities | No remote page Node access; typed IPC; OS-backed credential storage | Pass |
| Evidence-led usability | Wireframes and review gate precede code; end-to-end acceptance and automated quality gates are defined | Pass |

Recheck these gates after dependency selection and before each release phase.

## Delivery Sequence and Review Gates

### Delivery 1 — wireframes and specification (current)

- Constitution, feature spec, architecture, contracts, task breakdown, and ten
  wireframes covering the primary states.
- Review parent-folder setup and workspace switching, section navigation,
  embedded media, persistent chat, editable rich
  changes, selection annotations, global editor tabs, source capture, cloud
  disclosure, and per-section Timeline behavior against the
  [review guide](wireframes/README.md).
- Exit gate: user feedback is incorporated and the user approves the UX direction.
  No application source work begins before this gate.

### Delivery 2 — first complete vertical slice

1. Select a parent folder, create Physics and Biology as separate subfolders,
   switch between them, and verify workspace-scoped navigation and chat.
2. Create and rich-edit a section backed by local `.md`; embed a video and save
   a manual section revision.
3. Configure a cloud provider and disclose context before the first request.
4. Annotate selected text and ask for a scoped change; stream an isolated rich proposal.
5. Edit and format a proposed change in place, comment on another, accept one,
   reject another, and commit a durable revision.
6. View that section's Timeline and restore an earlier revision as a new
   commit; prove crash, external-edit, and stale-revision behavior.

This slice is the architectural proof. Voice requests and the remaining P1
experience follow in the same release after the slice passes.

### Release roadmap

| Phase | Scope | Dependency | Exit evidence | Rough solo estimate* |
| --- | --- | --- | --- | --- |
| 0 | UX review, threat model, dependency spike, project scaffold with lint, coverage, and UI harness | Delivery 1 review | Approved wireframes, buildable shell, passing baseline verification command | 1–2 weeks |
| 1 | P1 editor, agent gateway, structured proposals, partial review, history, search, voice request | Phase 0 | Full vertical slice and P1 acceptance matrix | 6–10 weeks |
| 2 | P2 file/web/audio/video ingestion, source segments and citations, sketch input | Phase 1 | Each source produces reviewable cited edits | 5–9 weeks |
| 3 | P2 knowledge links, semantic retrieval, preference suggestions | Phase 2 | Retrieval quality and preference control trials | 3–5 weeks |
| 4 | P2 embedded browser and opt-in research capture | Phase 2 | Isolated browser security and capture tests | 4–6 weeks |
| 5 | P3 local models, export/reimport hardening, optional sync design and product polish | Prior phases | Offline, recovery, portability and packaging evidence | 5–9 weeks |
| 6 | Future versioned custom Markdown rules and richer editor nodes | Proven rich-edit/Markdown roundtrip | Syntax, fallback, and migration review | Estimate after design |
| 7 | Optional multi-device sync | File/Git conflict model and user opt-in | Offline edits and divergent files resolve visibly | Estimate after product decision |

*Estimates are planning ranges for one experienced developer, not commitments;
media quality, model support, and browser isolation are the largest unknowns.
Phases 3 and 4 can overlap after the source contract is stable. Optional sync is
designed in phase 5 and shipped only after conflict and encryption review.

## Architecture and Data Flow

```text
React renderer (workspace switcher + section tree + Outline/Timeline | persistent chat | global editor tabs)
               (rich section | editable changes | import | browser | revision | settings)
        |
typed, validated preload IPC — commands and read-only subscriptions
        |
Electron main process: Markdown file coordinator, change validator, agent runtime,
model gateway, ingestion jobs, search, Git version and storage services
        |                 |                    |
per-workspace Markdown + SQLite/FTS5/Git       sandboxed WebContentsView
        |
atomic writes + Git outbox; attachment and export services
```

- **Workspace boundary**: A native folder picker chooses the parent collection.
  Each workspace is an immediate, uniquely named subfolder with its own
  `.ai-notes` state, assets, source index, chat, pending proposals, and Git
  history. A small app-profile registry remembers the parent path, stable
  workspace IDs, and last active workspace; it contains no section content.
  Switching flushes or retains pending edits under their origin workspace,
  rebinds file watchers and services, and ignores late events from the old
  workspace. Search and model context default to the active workspace only.
  A missing or read-only parent triggers locate/open flow without creating
  a replacement. Opening a different parent never implicitly moves content.
- **Canonical state**: One `.md` file backs each visible section. Section names,
  hierarchy, and media appear in the UI without filenames or source syntax.
  The document coordinator is the sole in-app writer. The renderer displays
  a rich editable projection; a proposal never mutates the file before acceptance.
- **Document operations**: Parse into a source-mapped AST. Stable block IDs live
  in sidecar metadata with span/content fingerprints; operations carry a base
  file hash, target block ID, expected text hash, idempotency key, reason, and
  citation refs. Preserve unchanged Markdown bytes and unknown constructs.
  External file edits invalidate stale spans; safe rebases are verified and
  overlaps require explicit resolution.
- **History**: Save approved/manual Markdown using a temp file, flush, and
  atomic replacement. A durable outbox then records the file change in an
  workspace-local internal bare Git repository with an explicit work tree. Only
  selected section/assets paths are staged; private `.ai-notes` state is excluded.
  Section Timeline shows commits for the selected section's `.md` file
  and a visible pending state until Git catches up. On restart, reconcile file
  hash, outbox, and Git head before claiming history complete. Restore writes
  the selected section version as a new file save and Git commit.
- **Index**: Each workspace's SQLite store is a rebuildable cache for metadata, source locators,
  review decisions, jobs, and FTS. File watcher scans external edits and
  updates the index; it never overwrites an unsaved draft silently.
- **Ingestion**: User-chosen content enters a durable job queue, type-specific
  extraction, normalized source segments, source review, retrieval, then the same
  agent proposal flow. Originals remain available when extraction fails.
- **Rendering**: Standard Markdown and a selected GFM subset ship first.
  The rich editor supports headings, lists, links, formatting, paste, undo,
  selection, and video player nodes. A local video is stored as an attachment;
  a standard Markdown link in the section points to it and the editor embeds
  that link as a player. Future richer blocks use a versioned, non-executable
  extension registry. Unknown syntax is retained as an opaque protected node
  or unchanged source span, and no save may drop it. Rendered HTML is sanitized.
- **Selection annotations**: A text or block selection captures section ID,
  base revision, block ID, quote hash, and relative range. The agent receives
  that scope and returns operations for review. Stale anchors cause a conflict.
- **Editable review**: Changes renders proposed rich content in an editable
  document with formatting and paste. Edits become user-authored revisions to
  the proposal, not approved section writes. Each changed region has compact
  accept, decline, and comment controls. Save validation runs after every edit.
- **Model use**: The gateway receives an explicit context manifest, estimates
  what will leave the device, enforces provider capability and budget limits,
  supports cancellation, and normalizes streamed responses.
- **Browser**: Remote pages run in separate sandboxed contents with no privileged
  preload. Explicit capture copies sanitized selections into source records;
  normal browsing does not enter the knowledge base.

## Project Structure

### Documentation (this feature)

```text
specs/001-agentic-notes-workspace/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── document-changes.md
│   └── source-and-model.md
├── wireframes/
│   ├── README.md
│   └── *.svg
├── checklists/requirements.md
└── tasks.md
```

### Planned application code (created only after wireframe review)

```text
apps/desktop/
├── src/main/           # shell, IPC, browser, storage setup, secret store
├── src/preload/        # typed, minimal renderer bridge
├── src/renderer/       # section explorer with Timeline, chat, global tabs, rich editor, review
└── tests/e2e/
packages/core/
├── documents/          # Markdown parser, source spans, operations, renderer rules
├── agent/              # tool policy, run state, provider adapter interface
├── sources/            # segments, locators, ingestion jobs
├── knowledge/          # exact/semantic search and links
└── contracts/          # cross-process types and validation
tests/integration/      # file/Git recovery, conflicts, model/source boundaries
```

**Structure Decision**: A modular monolith keeps one local trust boundary.
Extract packages only for contracts and Markdown/domain logic that can run
without Electron; avoid an application server and microservices. The selected
parent folder holds one subfolder per workspace. Each workspace folder holds
human-readable section files and assets; its `.ai-notes/` holds private indexes,
sidecar IDs, outbox state, and internal Git data.

## Verification Plan

### Scaffold and continuous checks

The first implementation setup defines `pnpm format:check`, `pnpm lint`,
`pnpm typecheck`, `pnpm test:unit`, `pnpm test:integration`,
`pnpm test:coverage`, `pnpm test:ui`, and `pnpm verify`. `test:coverage` runs
the unit, component, and integration suites with coverage; `verify` runs
format, lint, types, coverage, and UI once each. Windows CI uses `verify` on
pull requests and the main branch. Scripts capture verbose runner output and
print a short success summary or useful
failure tail, consistent with the repository command-output rule.

- ESLint with TypeScript rules, Prettier, and strict TypeScript cover all
  app-owned source. Warnings and errors fail the static gate.
- Vitest uses V8 coverage for domain, main-process, and renderer unit/component
  tests; React Testing Library exercises visible renderer behavior. Reports
  include text summary, LCOV, JSON, and HTML. The coverage include list names
  production TS/TSX files; exclusions are limited to generated code, tests,
  build output, and pure bootstrap wiring and are documented in the config.
- Aggregate floors: 80% lines/statements/functions and 75% branches.
  Nontrivial production files have a 60% line floor. Markdown conversion,
  change validation, review decisions, and history recovery have 90% line and
  85% branch floors. The initial real modules establish the baseline; broad
  excludes or automatic threshold lowering are prohibited.
- Playwright launches the actual Electron app with a temporary parent folder
  containing at least two workspaces,
  deterministic model/media fixtures, and controlled native dialogs. UI
  assertions cover folder selection, workspace switching/isolation, section
  navigation, tab state, rich editing/paste, video,
  selected-text annotation, editable review, comments, Timeline, offline use,
  and empty/error paths. Tests verify saved state after reopen where relevant.
- Visual baselines cover folder selection, workspace switcher, rich workspace,
  Changes, annotation, and Timeline at
  1760×980 and 1280×800 on the pinned Windows environment. Dynamic video
  frames and timestamps are stabilized for screenshots; playback behavior is
  checked separately. CI retains failed screenshots and traces; baseline
  updates are reviewed as UI changes.

Vitest's [coverage configuration](https://vitest.dev/config/coverage.html)
supports V8 reports and thresholds; [Playwright's Electron automation](https://playwright.dev/docs/api/class-electron)
and [visual comparisons](https://playwright.dev/docs/test-snapshots) support
the desktop harness. The plan uses [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
for interaction-focused component checks and the official
[typescript-eslint setup](https://typescript-eslint.io/getting-started/)
for linting. Dependency versions are pinned during implementation.

| Layer | Evidence required |
| --- | --- |
| Static | Prettier, ESLint, and strict TypeScript pass with no warnings |
| Coverage | Included production paths, threshold report, critical-module floors, and reviewed exclusions |
| UI automation | Real Electron journeys, disposable parent with two isolated workspaces, persisted outcomes after reopen |
| Visual | Reviewed desktop and narrow-viewport baselines for core screens |
| UX | Review each wireframe, keyboard path, empty/error state, provenance and network disclosure |
| Contract | Reject malformed, duplicate, stale, unauthorized, and conflicting change operations |
| Storage | Markdown roundtrip, external edits, atomic replacement, forced shutdown, Git outbox repair, backup, restore |
| Agent | Invalid model output, cancellation, provider outage, context manifest disclosure, source prompt injection |
| Media | Typed fixtures for clean/poor audio, scanned PDF, silent video, failed URL, duplicate imports |
| Browser | Sandbox, navigation, permission, popup and capture-off checks |
| Product | Complete P1 journey, offline rich editing, 1,000-section search, export/reimport |

Release claims require automated results plus a recorded manual run of the
relevant journey. Native media tool binaries and model assets require license,
download-size, and offline-package review before shipping.

## Decisions for Wireframe Review

1. Put a named workspace switcher above the section tree; first use asks for a
   parent content folder and creates each workspace as a separate subfolder.
   Keep the section tree and AI chat visible. The right editor group uses one
   global tab strip for multiple sections and work views (Changes, Import,
   Research Browser, revision, Settings). Switching a tab does not change the
   section selection or chat context. Outline and per-section Timeline live
   beneath the section tree. No extension or filename appears in this UI.
2. Keep proposal state visually separate from approved state; users can edit
   proposed rich content and approve, decline, or comment on each change using
   compact controls at its top-right. Accept all remains optional.
3. Use explicit session capture for browsing; imported source text can be edited
   for interpretation without changing the preserved original.
4. Show a cloud context disclosure near Send and a persistent provider badge.
5. Timeline is scoped to the selected section in the left explorer, similar to
   VS Code's file history. A revision or comparison opens in the editor group.
   Restore makes a new Git commit, preserving the complete audit trail.
6. Each section is directly editable as rich content, including inline video.
   There is no source mode. Future custom Markdown blocks extend rich rendering
   via versioned rules; unsupported source syntax remains intact.
7. Selected text and blocks offer an anchored Ask AI/comment action. The agent
   may revise only the captured scope unless the user explicitly expands it.

## Complexity Tracking

No constitution exceptions. Git enters the first release because the approved
review direction requires a per-section timeline over canonical Markdown files.
The durable outbox and recovery tests explicitly cover the file/Git dual write.
