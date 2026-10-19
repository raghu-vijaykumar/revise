# AI Notes Workspace

Desktop-first, local-first note app planned with GitHub Spec Kit. Users choose a
parent content folder; each subject workspace is a separate subfolder of it.
Canonical sections will be stored in human-readable Markdown files. The
interface has a section explorer with a per-section Timeline, persistent AI
chat, and a right editor group with global tabs for rich sections and work
views such as changes, imports, browsing, revision previews, and settings.
Markdown filenames and syntax stay out of the normal editing interface.

## Wireframes, plan, and implementation

- [Review the eleven wireframes](specs/001-agentic-notes-workspace/wireframes/README.md)
- [Product specification](specs/001-agentic-notes-workspace/spec.md)
- [Technical and phased plan](specs/001-agentic-notes-workspace/plan.md)
- [Data model](specs/001-agentic-notes-workspace/data-model.md)
- [Dependency-ordered implementation tasks](specs/001-agentic-notes-workspace/tasks.md)

Application implementation was authorized on 2026-10-19 after the user directed
the wireframe revisions. Phase 0 of the task list records that review gate.

The desktop scaffold builds an Electron app with a persistent section explorer,
AI chat pane, and global editor tab group. It includes strict lint/type/format
gates, V8 coverage with module floors, a versioned workspace SQLite schema,
real Electron UI smoke tests at two Windows desktop sizes, and an NSIS package.
The feature workflows remain tracked in the Spec Kit task list.

Run `pnpm install`, `pnpm verify`, and `pnpm start` for the scaffold. Build the
Windows installer with `pnpm package:win`.
