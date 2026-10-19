# Data Model and State Machines

## Workspace layout and source of truth

```text
chosen-content-folder/
├── Physics/                       # One workspace; name shown in switcher
│   ├── Mechanics/
│   │   ├── Newtons Laws.md         # Canonical content of one visible section
│   │   └── .assets/
│   │       └── section-7f3a/
│   │           └── motion.mp4      # Local video beside its section
│   ├── assets/                    # Later imported source originals
│   └── .ai-notes/                 # Private state for Physics only
│       ├── workspace.json         # Stable ID and display name
│       ├── index.sqlite           # Index, chat, jobs, decisions
│       ├── block-map/             # Source-span fingerprints
│       ├── outbox/                # File/Git reconciliation records
│       └── history.git/           # Internal Git store and refs
└── Biology/                       # Separate workspace with the same layout
```

The app profile remembers the selected parent path, workspace IDs, and last
active workspace, but contains no note content. A name maps to one immediate
child directory. Creation rejects collisions, reserved names, path separators,
symlink escapes, and unrelated same-named directories. If the parent is missing
or read-only, writes stop and a locate/open flow appears; no empty replacement
is created. Opening another parent is explicit and never moves data silently.

Markdown files are authoritative. The section explorer presents display
titles and hierarchy, never these paths or extensions. One `.md` file backs
each section; local media is linked in that file and rendered inline. Moving
a section changes its path, while a sidecar ID and Git rename detection
preserve section identity where unambiguous.
External editors may modify `.md` files; the app detects their new hashes,
reparses them, and resolves any pending proposal conflict before writing.
The section stores a relative link such as
`[Motion clip](./.assets/section-7f3a/motion.mp4)`. Its stable ID keeps the media
folder name independent of section renames. Moving the section to another
hierarchy folder moves its companion media folder and rewrites verified
relative links in one recoverable operation. A YouTube video instead remains a
normal `https://www.youtube.com/watch?...` link in Markdown; the rich editor
derives a player from that supported URL without downloading it.

## Entities

| Entity | Key fields | Invariants |
| --- | --- | --- |
| ContentCollection | parentPath, workspaceIds, lastActiveWorkspaceId | Selected folder; registry never stores section content |
| Workspace | id, collectionPath, folderName, displayName, settingsVersion | Owns one Markdown tree, assets, chat, proposals, search, and private `.ai-notes` state; cannot escape parent |
| Section | id, workspaceId, displayTitle, parentId, order, relativeMarkdownPath, fileHash, selectedGitCommit | Rich UI hides backing paths; content loads from owning workspace `.md`, never cached JSON |
| ParsedBlock | sidecarId, type, sourceStart, sourceEnd, textHash, parentId | Rebuilt from Markdown AST; IDs verified against fingerprints |
| GitRevision | workspaceId, commitHash, parentHash, sectionId/path, actor, timestamp, message | Per-section timeline derives from workspace-local path-limited history; restore adds commit |
| ChatConversation | id, workspaceId, selectedSectionId, messages, pendingRunIds | Switching preserves its origin workspace context; no cross-workspace default context |
| AgentRun | id, workspaceId, providerId, contextManifest, status, timestamps | No credentials in stored request data; context stays in its workspace |
| DraftCheckpoint | workspaceId, sectionId, baseFileHash, richTransaction, queuedAt, status | Durable before switching away; background save replays only against its origin section |
| WorkspaceActivity | workspaceId, pendingSaveIds, pendingRunIds, lastError, updatedAt | Switcher badge reflects origin workspace jobs without applying proposals |
| ChangeSet | id, workspaceId, runId, sectionId, baseFileHash, status, createdAt | Editable rich proposal stays in its workspace until approval |
| ChangeOperation | id, changeSetId, kind, targetSidecarId, expectedTextHash, replacementMarkdown, decision, authoredBy | User edits to a proposal create reviewable operations, not direct writes |
| SelectionAnnotation | id, workspaceId, sectionId, baseFileHash, blockId, selectedQuoteHash, relativeRange, prompt, status | AI scope is anchored; stale anchors cause conflict |
| ReviewComment | id, workspaceId, changeSetId, operationId, author, body, createdAt | Comment belongs to a changed region in one workspace |
| Source | id, workspaceId, type, URI/name, contentHash, capturedAt, status | Original artifact and capture identity preserved in its workspace |
| SourceSegment | id, workspaceId, sourceId, text/observation, page/time/region, extractorVersion, confidence | Locator survives note re-rendering; owning workspace matches source |
| Citation | id, noteId, blockId, sourceSegmentId, locator, quoteHash | Sidecar links claim to source without polluting note source |
| ClaimStatus | workspaceId, sectionId, blockId, status, sourceSegmentId?, textHash | An unsourced AI factual block retains a readable `**Unsourced**:` marker in canonical Markdown until sourced or removed; sidecar keeps review identity |
| Attachment | workspaceId, sectionId, contentHash, mediaType, byteLength, relativePath, refCount | MVP local video is copied to the section-adjacent `.assets/<section-id>/` folder before its relative link is saved |
| VideoEmbed | workspaceId, sectionId, kind, originalUrlOrAttachmentId, playbackStatus | YouTube links remain external URLs; local media remains a relative link; player state is derived, not Markdown source |
| ImportJob | id, workspaceId, sourceId, stage, progress, error, checkpoint | Durable cancellation/retry in origin workspace |
| Preference | id, workspaceId, scope, key, value, origin, status | Inferred preferences require approval; workspace defaults remain separate |
| KnowledgeLink | workspaceId, fromNoteId, toNoteId, relation, origin | Rebuildable backlinks within a workspace |
| HistoryOutbox | id, workspaceId, noteId, fileHash, baseCommit, state, attempts, error | Ensures workspace-local Git catches up after atomic file write |

## Markdown parsing and extension rules

- The first release supports a specified CommonMark/GFM subset. The rich
  editor edits a parsed projection and serializes only validated changes back
  to the backing Markdown file; the app has no source editing mode.
- Parsed blocks carry byte spans and content hashes. Unchanged ranges are
  preserved byte-for-byte when the agent applies a targeted operation.
- Sidecar block IDs are hints, not authority. After an external edit, remap by
  path, structure, and fingerprint; ambiguous matches cause a review conflict.
- A local video is linked as a normal Markdown attachment link and displayed
  as an inline player in its section. An external Markdown reader keeps a
  usable link even when it cannot embed playback.
- A validated YouTube watch or short URL is stored as a normal HTTPS Markdown
  link. The rich view recognizes it and renders a sandboxed player only online;
  blocked, private, or offline video retains the original link. Video content
  is not downloaded or analyzed for MVP.
- Unknown Markdown or future custom directives remain in the `.md` file and
  appear as a protected opaque node or safe fallback, never discarded on save.
- Custom rich rules later declare syntax version, parser, serializer, preview,
  fallback, and migration behavior. Arbitrary executable Markdown is excluded.

## State transitions

```text
AgentRun: queued -> running -> proposed | failed | cancelled
ChangeSet: draft -> ready_for_review -> partially_accepted | accepted | rejected
Operation: pending -> edited_pending | accepted | rejected | conflict
SelectionAnnotation: draft -> requested -> proposed | conflict | cancelled
ReviewComment: draft -> posted -> resolved
ImportJob: queued -> extracting -> needs_review -> ready | failed | cancelled
HistoryOutbox: pending -> committing -> complete | retryable_failure
Preference: suggested -> accepted | rejected | disabled
Workspace: created -> active -> inactive | unavailable
DraftCheckpoint: queued -> saving -> saved | conflict | retryable_failure
```

## Save and recovery sequence

1. Resolve the workspace ID and confined root before any section read or write.
   On switch, durably checkpoint a dirty rich draft first. Keep saves, Git
   outbox work, and started AI runs under their origin workspace. Persist late
   events there and show only an activity badge in the newly active workspace.
2. Validate the current section's `.md` hash and target source spans. An external edit
   invalidates stale edits; rebase only when exact, non-overlapping matches hold.
3. Write replacement Markdown to a temp file within the same directory, flush,
   and atomically replace the note. Keep a recovery record with old/new hashes.
4. Update source index, review decision, and `HistoryOutbox` in SQLite. Git
   commits the changed file using the outbox item. The UI shows `History
   pending` until the commit succeeds.
5. At startup reconcile `.md` hashes, SQLite indexes, and Git head. If a crash
   occurred between stages, complete or repair the pending step without
   duplicating an operation. Never claim a durable timeline entry prematurely.
6. Restore reads a selected Git file version, previews a rich diff, then
   writes it as a new file version and new Git commit. Prior commits remain.
7. Insert local video by staging and verifying the copy in the adjacent media
   folder, then writing its relative link. On copy failure, preserve the draft
   and do not commit a broken link. Export validates linked media presence.
8. On approval, write a standard Markdown `**Unsourced**:` label before an
   unsupported factual AI block and retain its claim status in the sidecar.
   External edits cannot silently turn that block into a sourced claim.

## Retention and portability

Each workspace can be opened or exported separately. MVP export copies all
canonical Markdown and linked local media with a manifest and reports missing
media. A standard reader can follow the relative links and see `Unsourced`
labels without this app. Its notes and assets remain readable if `.ai-notes` is removed. In that
case, indexes and sidecar IDs can be rebuilt, but approval metadata and Git
history require backup. The later extended export bundles source metadata,
preferences, and optional history; reimport verifies hashes and path safety.
