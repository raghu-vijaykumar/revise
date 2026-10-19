# Wireframe Review Pack

**Status**: Revised for user-selected content folder, separate workspaces,
section navigation, direct rich editing, embedded video, editable review, and
text-anchored AI requests; awaiting review.
**Format**: Ten desktop wireframes at 1760 × 980, each in PNG and SVG.
The dark palette clarifies layout and states; it is not the final visual theme.

## Layout contract

```text
Activity | Workspace switcher + section explorer + Timeline | AI chat | Global editor tabs
                                                        rich sections and work views
```

- On first use, choose a parent content folder. Each named workspace is one
  immediate subfolder, for example `Physics/` and `Biology/`. The active
  workspace appears in a switcher above the section tree. Switching restores
  that workspace's own sections, chat, tabs, search, sources, pending proposals,
  and history. An unavailable parent opens a locate flow instead of an empty
  replacement.
- The far-left pane navigates **sections**, not files. It shows section titles
  and hierarchy, without filenames, extensions, or a separate entry for an
  embedded video. Outline and Timeline belong beneath the section tree.
- AI chat stays visible beside the explorer. The right side retains one global
  tab strip for sections and work views. Switching tabs does not change the
  selected section or conversation context.
- The section surface is directly editable rich content: typing, selecting,
  headings, lists, formatting, copy/paste, undo/redo, links, and inline media.
  There is no Preview/Source switch and no Markdown source mode in the app.
- Each section is backed internally by a readable `.md` file. A local video
  appears as a player inside its section; the Markdown stores a portable link
  to the media asset. Later custom Markdown rules must preserve unknown syntax
  on saves without asking the user to edit source.
- A selected passage or block can receive an annotation asking AI to revise
  that scope. The request retains the section revision and selected quote.
  The result opens as a proposal in Changes or reports a stale-anchor conflict.
- Changes is a **rich editable diff**. A proposed passage accepts typing,
  selection, formatting, paste, and undo. Each changed region has compact
  icons at its top right for accept, decline, and comment. Comments save
  locally and can explicitly be sent to AI to revise the pending proposal. A manual edit to the
  proposal remains pending until explicitly accepted.
- Timeline follows the selected section. An earlier version opens in a
  read-only global editor tab; restore adds a new version.

## Walkthrough

| Screen | Inspect | Requirements |
| --- | --- | --- |
| [01 — Rich section and video](01-workspace.png) | Section tree, persistent chat, rich toolbar, selected text actions, video within section | FR-001–003, FR-022–027 |
| [02 — Editable Changes](02-review.png) | Direct typing/formatting in proposal; small accept/decline/comment icons; comment feedback | FR-005–007, FR-026 |
| [03 — Insert video](03-import.png) | Place imported video into the selected section | FR-011–013, FR-027 |
| [04 — Browser](04-browser.png) | Global research tab and explicit capture | FR-014, FR-025 |
| [05 — Section Timeline](05-history.png) | Per-section history in explorer; revision tab at right | FR-008, FR-010 |
| [06 — Settings](06-settings.png) | Rich editor and privacy defaults | FR-004, FR-017–018 |
| [07 — Conflict](07-conflict.png) | Overlapping approved edit and rich proposal stay separate | FR-007 |
| [08 — Annotate selection](08-annotation.png) | Quote-anchored prompt and scoped AI update request | FR-026 |
| [09 — Content folder](09-content-folder.png) | User-selected parent path; Physics and Biology in separate subfolders | FR-028, FR-030 |
| [10 — Switch workspace](10-switch-workspace.png) | Named workspace switcher above section tree; active context stays scoped | FR-028–029 |

Each PNG has a matching SVG with the same basename for zooming and markup.

## Primary flow

```text
Choose parent folder -> create Physics and Biology subfolders -> switch workspace
Open section -> type, format, paste, embed video -> saved Markdown behind UI
Select passage -> Ask AI with annotation -> editable Changes tab
Edit/format proposal -> comment for AI revision -> accept or decline each edit
Open section Timeline -> inspect version -> compare -> restore as new version
```

## Review decisions

1. Is the parent-folder choice and per-workspace subfolder arrangement clear?
   Is the switcher discoverable while keeping the pane a section explorer?
2. Does the left pane now read as a **section explorer**, with the video
   clearly inside the rich section rather than listed as a file?
3. Are the compact top-right accept, decline, and comment icons discoverable
   enough with hover tooltips and keyboard labels in the future implementation?
4. Is the selection annotation panel's scope clear before the AI request runs?
5. Does the rich diff show enough change context, or should the default also
   expose a side-by-side before/after comparison within the same tab?

This delivery contains wireframes and Spec Kit planning artifacts only.
Application implementation remains behind the review gate.
