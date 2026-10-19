<!-- SPECKIT START -->
For the AI Notes workspace, read
`specs/001-agentic-notes-workspace/plan.md` and its linked spec, contracts,
and wireframe review pack before changing application code.

Application implementation starts only after the wireframes are reviewed and
the Phase 0 gate in `tasks.md` is recorded complete. Add code comments that
explain non-obvious intent and safety boundaries. Capture verbose command
output to logs and report only a short summary or useful trailing errors.
<!-- SPECKIT END -->

# Revise developer and agent guide

Revise is a Windows-first, local-first Electron note app. A user chooses a
parent content folder; each workspace is a separate immediate subfolder; each
section is canonical Markdown on disk. The renderer is a rich editor and
workspace UI with no filesystem access. The main process owns all file, database,
Git, model, and secret operations.

## Read first

Before changing application code, read:

- `specs/001-agentic-notes-workspace/plan.md` — architecture, phases, quality gates
- `specs/001-agentic-notes-workspace/spec.md` — product requirements
- `specs/001-agentic-notes-workspace/contracts/` — document and model contracts
- `specs/001-agentic-notes-workspace/wireframes/README.md` — reviewed UX direction
- `specs/001-agentic-notes-workspace/tasks.md` — dependency-ordered work and status

`tasks.md` is the source of truth for completion. Phase 0 is complete and
implementation is authorized. Check boxes before assuming a task is done; the
working tree may contain code that is ahead of the checkboxes. Keep task status
accurate when you finish a listed task. Do not edit specs, contracts, or
wireframes unless the task is a specification change.

## Setup and commands

Requirements: pnpm `11.25.0` (declared in `package.json`), Node 24 (CI), and a
Windows desktop for the Electron UI suite and visual baselines.

```powershell
pnpm install
pnpm start              # build, then launch Electron
pnpm build              # renderer (Vite) + main/preload (esbuild)
pnpm package:win        # build NSIS installer under apps/desktop/release
```

Quality commands (each gate also has its own script):

```powershell
pnpm format             # write formatting
pnpm format:check
pnpm lint               # ESLint, zero warnings allowed
pnpm typecheck          # tsc -b across project references
pnpm test:unit          # vitest tests/unit
pnpm test:integration   # vitest tests/integration
pnpm test:coverage      # all non-e2e tests + V8 coverage + per-file floors
pnpm test:ui            # build, then Playwright against the real Electron app
pnpm verify             # format:check, lint, typecheck, coverage, UI
```

Run the narrowest relevant suite while iterating, then `pnpm verify` before
declaring work complete. If Electron/UI tests cannot run in your environment,
say so explicitly; never claim `pnpm verify` passed without running it.

CI is Windows-only: `.github/workflows/verify.yml` runs `pnpm install
--frozen-lockfile` and `pnpm verify` on Node 24.

## Repository map

```text
apps/desktop/
  src/main/                 Electron main process (privileged)
    index.ts                app bootstrap, window, protocol, IPC handlers
    ipc/router.ts           schema validation + sender/owner checks
    workspaces/             registry (profile JSON) and activity manager
    notes/                  section CRUD backed by Markdown + SQLite
    storage/                atomic files, migrations, outbox, blobs, media
    media/                  YouTube/local video validation and staging
    secrets/                OS-backed provider secrets
    logging.ts              allowlisted diagnostics
  src/preload/index.ts      named window.revise bridge (no raw IPC)
  src/renderer/             React 19 UI, Tiptap editor
  src/types/                preload global types, *.sql module declaration
  tests/e2e/                Playwright Electron journeys + snapshots
packages/core/src/
  contracts/                Zod schemas shared by both processes
  documents/                Markdown parse/rich projection, change engine,
                            video links, renderer-safe text helpers
tests/unit/                 pure/component tests (jsdom opt-in)
tests/integration/          real temp-dir and SQLite tests
tests/fixtures/             deterministic media/model fixtures
docs/                       quality, security, release, third-party notes
specs/                      Spec Kit feature pack
scripts/check-coverage.mjs  critical-module coverage floors
```

`@revise/core` exports TypeScript source (`./src/index.ts`); both processes
consume it directly. Core must not import Electron or Node-only APIs.

Build details: Vite builds only the renderer to `dist/renderer`; esbuild bundles
the main and preload entries to CommonJS with `electron` external and `.sql`
imported as text. `apps/desktop/package.json` is the Electron entry
(`dist/main/index.cjs`). Root `tsc -b` uses project references for core and
desktop.

## Runtime architecture

```text
React renderer (workspace switcher, explorer, chat, editor tabs)
        |  window.revise named methods only
isolated preload (contextBridge)
        |  ipcRenderer.invoke('revise:<command>')
main IPC router: sender check -> Zod parse -> persisted workspace ownership
        |
main services: workspace registry/manager, NoteService, MarkdownFileCoordinator,
               SQLite, history outbox, media staging, secrets, future agent/history
        |
user-selected content folder (canonical Markdown + assets + .ai-notes state)
```

Workspace state on disk:

```text
<content-folder>/<Workspace Name>/
  .ai-notes/workspace.json        stable workspace identity
  .ai-notes/index.sqlite          rebuildable metadata/index (WAL)
  sections/<section-id>/index.md  canonical section Markdown (nested children too)
  .assets/<section-id>/<sha256>.mp4|webm   section-local media
  assets/blobs/<sha256>.<ext>     staged source blobs
```

The app profile (Electron `userData`) holds
`workspace-registry.json` (collections, workspace IDs, last active) and must
never hold section content. Provider secrets live in a separate profile file
encrypted with Electron `safeStorage`; they never enter Markdown, SQLite
prompts, exports, or logs. `REVISE_TEST_USER_DATA` redirects the profile for UI
automation.

## How to add an IPC command

The IPC surface is contract-first. Do all five steps:

1. Add the command and a strict Zod input schema in
   `packages/core/src/contracts/ipc.ts`.
2. Add the main-process handler in `apps/desktop/src/main/index.ts`.
   `registerIpcRouter` auto-registers only names present in `commandSchemas`.
3. Add a narrow method to `apps/desktop/src/preload/index.ts` and its global
   declaration in `apps/desktop/src/types/preload.d.ts`.
4. Call it from the renderer. Do not expose `ipcRenderer`, filesystem, shell,
   or credential primitives.
5. Add tests: router validation/ownership in `tests/integration/ipc-router.test.ts`,
   domain behavior in the relevant integration suite, and an Electron journey
   when the behavior is user-visible.

Invariants enforced by `ipc/router.ts`:

- The sender must be the main frame at the expected renderer document URL.
- Input is parsed by the command schema; never accept unvalidated payloads.
- Any command with `workspaceId` is checked against the owner resolved from
  persisted registry state, not from renderer-supplied data.
- The renderer never supplies a filesystem root or arbitrary path for a
  privileged operation. Main resolves the root from the workspace ID and checks
  section ownership and confined relative paths.

## Document and storage rules

- One `.md` file per section. `MarkdownFileCoordinator` is the sole in-app
  writer: queue per path, verify `expectedHash`, write temp file, flush, then
  atomic rename. External edits surface as conflicts, never silent overwrites.
- Resolve every workspace-relative path with `resolveSectionPath` or
  `confinedDirectory`; reject `..`, absolute paths, drive letters, backslashes,
  and existing symlinks/junctions. On Windows, also enforce unique
  case-insensitive folder names and reserved device names.
- Preserve unchanged Markdown bytes. Unknown constructs become opaque protected
  nodes and must survive serialize/save. Never drop source syntax.
- Use SHA-256 lowercase hex for content hashes, UUIDs for IDs, and ISO strings
  for timestamps. Operation edits carry base file hash, target block ID,
  expected text hash, and citation IDs.
- Agent/model and imported-source output is untrusted: validate with Zod, verify
  hashes/spans/ownership, and only write after explicit per-operation review.
  Unsourced factual claims must remain visibly labeled `Unsourced`.
- Database: Node built-in `node:sqlite` (`DatabaseSync`), workspace-local
  `.ai-notes/index.sqlite`, foreign keys on, WAL, `STRICT` tables, and
  `BEGIN IMMEDIATE` for multi-statement writes. Schema changes bump
  `CURRENT_SCHEMA_VERSION` and add an additive migration guarded by
  `PRAGMA user_version`; never mutate a shipped migration in a destructive way.
  Update `schema.sql`, `migrations.ts`, and migration tests together.
- History is a durable outbox, not a best-effort side effect. File write and
  outbox enqueue must stay consistent; recovery replays the file/Git boundary.
  Internal Git data is private and excluded from exports.
- Do not add FFmpeg, decoders, transcription models, or video downloaders.
  MVP media is a YouTube HTTPS link or a verified section-adjacent copy.

## Security boundaries

- Renderer: `contextIsolation: true`, `sandbox: true`,
  `nodeIntegration: false`; deny new windows and navigation; CSP in
  `apps/desktop/index.html` denies remote scripts and allows only
  `revise-media:` media and YouTube nocookie frames.
- Remote pages and embeds must run isolated with no privileged preload,
  constrained navigation/permissions, and a plain-link fallback. Update the CSP
  and `docs/SECURITY.md` before adding a new remote origin.
- Secrets only through `safeStorage`; never log, store in SQLite/Markdown,
  include in exports, or send to the renderer. `formatDiagnostic` uses an
  allowlist; activity events expose generic errors, not content.
- Treat logs, error messages, traces, and screenshots as user-data risks. Never
  log section content, absolute content paths, prompts, or credentials.
- The app is accountless and offline-capable. Cloud calls require explicit
  provider configuration and a pre-send context disclosure. No silent
  destructive agent edits.

## Testing and quality

- Vitest default environment is `node`. Component tests opt in with
  `// @vitest-environment jsdom` and use React Testing Library.
- Unit tests: pure contracts, Markdown codec, change engine, video links,
  logging, components. Integration tests: real temp directories and SQLite
  (`mkdtemp`), covering atomic writes, migrations, recovery, outbox, media,
  workspace registry, router ownership, and secrets. Always clean up temp roots
  and close databases.
- E2E tests launch the actual Electron app with a disposable profile and
  content folder; native dialogs are replaced for one call in the main process.
  Two viewports are pinned: 1760x980 and 1280x800. Snapshots are win32-specific.
  Do not update visual baselines blindly; a baseline change is a reviewed UI
  change.
- Coverage thresholds: 80% lines/statements/functions, 75% branches aggregate;
  60% lines for nontrivial production files; 90% lines / 85% branches for
  `parseMarkdown.ts`, `changeEngine.ts`, `reviewService.ts`, and
  `historyService.ts`. The last two are planned modules; the checker enforces
  them once they exist. Never lower thresholds or broaden excludes.
- Keep tests deterministic: no real network, no personal folders, no developer
  secrets, no timing flakiness. Use fixtures and controllable hooks.
- Before finishing: run formatting, lint, typecheck, relevant tests, and (when
  possible) `pnpm verify`. Report the exact commands run and any skipped gates.

## Conventions

- Prettier: 2 spaces, single quotes, semicolons, trailing commas, 100 columns.
- TypeScript is strict with `noUncheckedIndexedAccess` and
  `exactOptionalPropertyTypes`. Avoid `any`; parse at boundaries with Zod and
  derive types using `z.infer`.
- Use `randomUUID()` for IDs; do not invent sequential IDs. Use ISO timestamps.
- React function components and hooks; follow existing CSS class naming. Keep
  e2e-visible labels and ARIA roles stable (`aria-label`, `role`, headings).
- Errors shown to users must be safe and actionable. Put technical detail only
  in redacted diagnostics. Private content and paths never cross into renderer
  error strings.
- Comments: only for non-obvious intent or a safety boundary (for example why a
  check exists), never for restating code.
- Imports: keep `packages/core` free of Electron/Node APIs; put privileged work
  in `apps/desktop/src/main`. Prefer existing utilities over new dependencies.
- Versions are pinned exactly. Do not add or upgrade dependencies without a
  clear need and without updating the lockfile with pnpm.
- Do not edit `node_modules/`, `dist/`, `release/`, `coverage/`,
  `test-results/`, `playwright-report/`, or `*.tsbuildinfo`; do not hand-edit
  `pnpm-lock.yaml`. Do not commit generated build/package output.
- Do not commit unless explicitly asked. Preserve unrelated working-tree
  changes; stage only intended files when a commit is requested.

## Delivery workflow

1. Confirm the relevant task and read the linked spec/contract sections.
2. Make the smallest coherent change across core contract, main service,
   preload, renderer, and tests as needed.
3. Add or update tests for behavior and boundary rejection; keep coverage floors.
4. Run focused suites, then static gates and broader tests.
5. Mark the task complete only when its exit evidence exists.
6. Summarize: what changed, commands run/results, and any remaining risks or
   unrun gates. Keep terminal output concise; save verbose logs if needed.

## Known scope and gotchas

- Implemented scaffold: workspace registry/switching, section CRUD with Markdown
  files, rich projection/editor foundation, video link validation and local
  staging, SQLite schema, atomic writes, history outbox, secrets, diagnostics,
  and shell UI automation. Agent gateway, review service, full history UI,
  search, export, ingestion, and packaged-gate evidence remain planned in
  `tasks.md`.
- `.sql` imports depend on the esbuild `--loader:.sql=text` flag and the Vitest
  SQL plugin; keep both in sync with the type declaration in
  `apps/desktop/src/types/sql.d.ts`.
- SQLite in main is `node:sqlite`, not a browser database and not
  `better-sqlite3`. Close every database in `finally` to release WAL handles,
  especially on Windows.
- Windows path handling and case-insensitive collisions are first-class
  concerns; tests run on Windows, and UI image snapshots are platform-specific.
- Do not infer that a checkbox is open/closed from the presence of a file; run
  the suite and inspect `tasks.md`.
