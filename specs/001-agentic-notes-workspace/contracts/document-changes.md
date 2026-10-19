# Document and Review Contract

This contract defines the renderer-to-core boundary; names are illustrative
until implementation. All payloads are schema-validated at the privileged
boundary. Source text and model output have no direct write authority.

## Document operation

```ts
type Operation = {
  id: string;                 // Idempotency key within a change set
  workspaceId: string;        // Must match the active workspace and section owner
  sectionId: string;
  baseFileHash: string;
  kind: 'insert' | 'update' | 'delete' | 'move' | 'split' | 'merge';
  targetBlockId?: string;
  expectedSourceHash?: string;
  afterBlockId?: string;
  secondaryBlockId?: string;    // Required for merge
  expectedSecondaryHash?: string;
  replacementMarkdown?: string; // Parsed and sanitized before projection
  reason: string;
  citationIds: string[];
};

type SelectionAnchor = {
  workspaceId: string;
  sectionId: string;
  baseFileHash: string;
  blockId: string;
  selectedQuoteHash: string;
  relativeRange: { from: number; to: number };
};

type ReviewDecision = {
  workspaceId: string;
  changeSetId: string;
  operationId: string;
  decision: 'accept' | 'reject';
  currentFileHash: string;
};
```

`insert` requires an anchor and valid Markdown fragment;
`update`/`delete`/`move` require target ID and expected source hash;
`split`/`merge` require all affected IDs and hashes. The parser resolves IDs
to verified source spans; raw character offsets from a model are never trusted.
The writer preserves untouched Markdown bytes. The validator rejects duplicate
IDs, unsupported destructive rewrites, false citation references, and
cross-workspace targets. Factual additions with no verified source remain
valid only when marked `Unsourced` in proposal and approved projections. On
acceptance, an unsupported factual block also receives a standard Markdown
`**Unsourced**:` label so external readers and the basic export retain it.
Unknown custom syntax is preserved as an opaque node or untouched
source span. Rich proposal edits create a new user-authored operation version
and rerun validation; they do not write the approved section until acceptance.

## Renderer commands and events

The main process derives the workspace root from a trusted workspace registry,
never from a renderer-supplied path. Every section, agent, review, source,
history, and search command carries a workspace ID and is checked against the
object's owner. On a switch, a dirty draft is durably checkpointed first;
the origin workspace's save, Git commit, and AI run may finish in the
background. Their events update origin state and an activity badge, never the
newly active view. Existing pending state is restored on return.

| Command | Input | Output |
| --- | --- | --- |
| `collection.chooseFolder` | native user-selected parent folder | validated parent path or recoverable error |
| `workspace.create` | display name, active collection ID | stable ID and new immediate subfolder; collision or path error |
| `workspace.list` | collection ID | known workspaces and per-workspace activity state |
| `workspace.rename` | workspace ID, new name | new display name and safely renamed subfolder or collision error |
| `workspace.switch` | target workspace ID, origin draft checkpoint IDs | target snapshot; origin save/run activity continues or switch reports checkpoint failure |
| `section.open` | section ID | file hash, rich document projection, and media references; backing path stays internal |
| `section.saveRich` | section ID, base file hash, validated rich transaction | new file hash, pending/complete Git commit, or conflict |
| `section.insertYoutube` | section ID, supported user-provided HTTPS URL, insertion anchor | ordinary Markdown link and derived isolated inline player or URL fallback |
| `section.insertLocalVideo` | section ID, user-selected file, insertion anchor | verified section-adjacent copy and relative Markdown link; no broken link on copy failure |
| `workspace.exportBasic` | workspace ID, user-selected destination folder | readable Markdown/media tree, manifest, and missing-media report |
| `agent.start` | prompt, destination section, provider, context manifest, optional selection anchor | run ID |
| `agent.cancel` | run ID | cancellation status |
| `annotation.create` | selection anchor, prompt, optional comment thread | anchored request or stale-anchor conflict |
| `review.preview` | change set ID, selected operations | editable rich projection and typed diff |
| `review.edit` | change set ID, operation ID, rich transaction, base proposal hash | revised pending operation or conflict |
| `review.comment` | change set ID, operation ID, comment text | local comment thread |
| `review.requestRevision` | change set ID, operation ID, selected comment IDs, current proposal hash | new pending proposal or conflict |
| `review.decide` | operation decision(s), current file hash | new file hash, commit status, remaining review state |
| `history.list` | selected section ID, cursor | path-scoped Git commits plus pending local save |
| `history.restore` | target commit, current file hash | new file save and restoration commit |

Subscriptions: `agent.progress`, `proposal.updated`, `note.revisionChanged`,
`workspace.activity`, `import.progress`, `file.externalChange`, and
`history.status`. Every event carries workspace ID and a
monotonic sequence to discard stale UI events.

The rich renderer accepts only recognized YouTube video URLs for the online
player; arbitrary remote HTML or iframe markup never gains document or IPC
authority. Store the original URL link. A local video lives under the owning
section's sibling `.assets/<section-id>/` directory and moves with that
section. Background activity cannot approve a proposal.

## Diff presentation contract

- Each operation has a stable visual identifier, target heading, reason,
  before/after rendering, and source badges.
- The preview cannot look identical to approved content: it carries a persistent
  `Proposed` banner and operation highlights, including move origin/destination.
- Factual text without a verified source shows `Unsourced` during review and
  after acceptance until a source is linked or the claim is removed.
- Review opens a `Changes: <section>` editor tab in the right work pane. The
  selected section, section tree, AI chat, and conversation context remain.
- Proposed rich text is directly editable: typing, selection, headings,
  formatting, copy/paste, and undo/redo work in the diff. Each changed region
  has compact top-right accept, decline, and comment controls with accessible
  labels and keyboard access. A review comment remains attached to its region.
- Selecting text or a block in an approved section offers Ask AI and Comment.
  The selected quote, block, relative range, and section revision are captured.
  A stale annotation never falls back to an approximate unreviewed edit.
- Accepting one operation recomputes the remaining proposal projection against
  the new approved file hash. Unsafe rebases become conflicts.
- `Accept all` is available only after all operations validate against the
  current file hash; the file write is atomic or reports conflicts.
- Restoring a prior revision shows a diff before confirmation and creates a new
  Git commit; it never rewrites history. The section `Timeline` is
  scoped to the selected section; its revision or comparison opens in a global
  right editor tab. The normal UI shows section titles, not Markdown filenames.

## Errors

`INVALID_MARKDOWN`, `STALE_FILE`, `BLOCK_CONFLICT`, `MISSING_SOURCE`,
`PROVIDER_UNAVAILABLE`, `CANCELLED`, `STORAGE_UNAVAILABLE`,
`WORKSPACE_UNAVAILABLE`, `WORKSPACE_COLLISION`, and
`HISTORY_PENDING` have user-readable messages. Errors never include API keys
or unredacted private content in diagnostics.
