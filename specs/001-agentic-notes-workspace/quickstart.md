# Review and Future Implementation Quickstart

## Current delivery

1. Open [wireframes/README.md](wireframes/README.md) and the linked wireframes.
2. Walk through: choose a parent folder, create and switch Physics and Biology
   workspaces, create a section, format content, embed a YouTube URL and a
   section-local video, annotate a
   selected passage for AI, edit and comment on its rich proposal, import a
   source, capture a web passage, inspect history, and configure a provider.
3. Record changes to layout, approval granularity, capture defaults, provider
   disclosure, and scope in the review guide. Those decisions update `spec.md`,
   `plan.md`, and `tasks.md` before application code starts.

## First implementation demonstration after review

On a Windows reference machine:

1. Select a parent folder and create Physics and Biology as separate
   subfolders. Switch between them and confirm the section explorer, chat,
   tabs, search, and Timeline show only the active workspace.
2. Create a `Why forces change motion` section in Physics; type and format headings,
   paragraphs, and a list, paste rich text, and embed a YouTube URL and a local
   video. Confirm the local video was copied beside the section and both links
   remain readable in an external Markdown editor.
3. Configure a provider; inspect the cloud context summary, including the
   active workspace, before sending.
4. Select one passage and annotate it with a request for an example tied to
   the embedded video; confirm the AI scopes the proposal to that selection.
5. Keep chat visible, open `Changes: Why forces change motion`, type and format inside
   the proposal, comment on one change, accept another, and decline a rewrite.
6. Edit the `.md` file in an external editor, return to the app, then expand
   its Timeline beneath the section tree; open an earlier revision in an
   editor tab and restore it as a new revision.
7. Repeat with a stale proposal and a forced shutdown between atomic file
   replacement and Git commit; confirm explicit conflict/history repair status.
8. Start an AI proposal and leave an unsaved draft in Physics, then switch to
   Biology. Confirm the Physics save and AI run continue in the background,
   show origin-labeled status, and are present after returning or restarting.
   An unsupported AI factual claim must show `Unsourced` in the proposal and
   after acceptance until backed by a verified source.
9. Export Physics and open its Markdown and linked local video on another
   machine. The export manifest and any missing-media report must be readable.
10. Switch to Biology and back, then restart; confirm no section, source, chat,
   pending proposal, or history appears in the wrong workspace. Rename the
   parent temporarily and confirm the app offers to locate it rather than
   creating empty replacement data.
11. Disconnect the network and verify rich editing, section opening, exact
   search, and the local-video player continue to work; a YouTube player retains
   its original link when playback is unavailable.

## Release quality gates

- On a clean checkout, run `pnpm verify`; it must run `format:check`, `lint`,
  `typecheck`, `test:coverage` (unit/component/integration), and `test:ui`
  with no warnings or failures. The underlying suites also run independently.
- Inspect the V8 coverage summary and retained HTML/LCOV/JSON reports against
  QR-003, including the Markdown codec, change engine, review service, and
  history recovery floors. Document any narrow exclusion.
- Run the real Electron UI journey through section creation, formatting,
  parent-folder setup and two-workspace isolation,
  both video insertions, background switching, basic export, Unsourced labels,
  annotation, editable Changes, accept/decline/comment, and Timeline.
  Check saved state after reopen; review the focused screenshots at both
  planned viewports and retain traces on failure.
- Require the same static, coverage, and UI gates in Windows pull-request and
  main-branch CI before claiming an implementation milestone complete.
- Build and install the packaged Windows app on a clean image. Smoke first
  launch, folder selection, local media, save/reopen, export, and uninstall.
  Run a keyboard-only path through workspace switching, section tree, editor,
  Ask AI, per-change review, Timeline, and export with visible focus and no trap.
- Run schema/contract, persistence, provider boundary, and end-to-end checks
  matching the phase under review.
- Open saved notes in a standard text editor to confirm they remain ordinary
  Markdown. Unknown extension syntax must survive a save unchanged.
- Review no-network behavior and inspect outgoing cloud context for accidental
  private source or credential transfer.
- Verify native media binary licenses, model asset size, and packaging before
  advertising offline media processing.
- Keep terminal output concise; retain detailed logs for failure diagnosis.
