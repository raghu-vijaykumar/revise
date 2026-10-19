# Review and Future Implementation Quickstart

## Current delivery

1. Open [wireframes/README.md](wireframes/README.md) and the ten linked wireframes.
2. Walk through: choose a parent folder, create and switch Physics and Biology
   workspaces, create a section, format content, embed a video, annotate a
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
   paragraphs, and a list, paste rich text, and embed a video. Confirm the
   backing Markdown stays readable in an external text editor.
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
8. Switch to Biology and back, then restart; confirm no section, source, chat,
   pending proposal, or history appears in the wrong workspace. Rename the
   parent temporarily and confirm the app offers to locate it rather than
   creating empty replacement data.
9. Disconnect the network and verify rich editing, section opening, and exact
   search continue to work.

## Release quality gates

- On a clean checkout, run `pnpm verify`; it must run `format:check`, `lint`,
  `typecheck`, `test:coverage` (unit/component/integration), and `test:ui`
  with no warnings or failures. The underlying suites also run independently.
- Inspect the V8 coverage summary and retained HTML/LCOV/JSON reports against
  QR-003, including the Markdown codec, change engine, review service, and
  history recovery floors. Document any narrow exclusion.
- Run the real Electron UI journey through section creation, formatting,
  parent-folder setup and two-workspace isolation,
  video, annotation, editable Changes, accept/decline/comment, and Timeline.
  Check saved state after reopen; review the focused screenshots at both
  planned viewports and retain traces on failure.
- Require the same static, coverage, and UI gates in Windows pull-request and
  main-branch CI before claiming an implementation milestone complete.
- Run schema/contract, persistence, provider boundary, and end-to-end checks
  matching the phase under review.
- Open saved notes in a standard text editor to confirm they remain ordinary
  Markdown. Unknown extension syntax must survive a save unchanged.
- Review no-network behavior and inspect outgoing cloud context for accidental
  private source or credential transfer.
- Verify native media binary licenses, model asset size, and packaging before
  advertising offline media processing.
- Keep terminal output concise; retain detailed logs for failure diagnosis.
