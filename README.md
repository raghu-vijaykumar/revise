# AI Notes Workspace

Desktop-first, local-first note app planned with GitHub Spec Kit. Users choose a
parent content folder; each subject workspace is a separate subfolder of it.
Canonical sections will be stored in human-readable Markdown files. The
interface has a section explorer with a per-section Timeline, persistent AI
chat, and a right editor group with global tabs for rich sections and work
views such as changes, imports, browsing, revision previews, and settings.
Markdown filenames and syntax stay out of the normal editing interface.

## Current delivery: wireframes and plan

- [Review the ten wireframes](specs/001-agentic-notes-workspace/wireframes/README.md)
- [Product specification](specs/001-agentic-notes-workspace/spec.md)
- [Technical and phased plan](specs/001-agentic-notes-workspace/plan.md)
- [Data model](specs/001-agentic-notes-workspace/data-model.md)
- [Dependency-ordered implementation tasks](specs/001-agentic-notes-workspace/tasks.md)

Application implementation begins after wireframe review is recorded in Phase
0 of the task list. The current repository contains planning and design
artifacts, not application source code.

The planned first code scaffold includes strict lint/type/format gates, V8
coverage with module floors, and real Electron UI tests with reviewed visual
baselines. These checks are specified before feature implementation.
