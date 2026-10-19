<!--
Sync Impact Report
- Version: template -> 1.0.0 (first ratification)
- Principles: local ownership; reviewed agent changes; traceable knowledge;
  recoverable state; secure boundaries; usable, verified workflows.
- Sections added: Product constraints; Delivery and review gates. Canonical
  notes are human-readable Markdown files; richer views derive from them.
- Templates: plan, spec, and tasks templates remain compatible; no edits needed.
- Deferred items: none.
-->
# AI Notes Constitution

## Core Principles

### I. Local ownership and explicit network use
Notes MUST be human-readable Markdown files in a local workspace. Attachments,
history, preferences, and indexes MUST have a local copy. Notes remain usable
for reading and manual editing without an account or network.
The product MUST distinguish local operation from requests that send content to an
external model or website. Those transfers require visible, scoped user action or
configuration. Local-first MUST never be described as fully offline when a cloud
provider is used.

### II. Human-controlled agent changes
The editor owns approved document state. Agent output MUST be a validated proposal
against a known revision. Users MUST be able to inspect additions, removals, moves,
and rewrites, then accept or reject changes at a useful granularity. Agent actions
MUST NOT silently overwrite approved content or the user's concurrent edits.

### III. Traceable knowledge
Imported material MUST retain source identity and a usable locator such as a URL,
page, timestamp, or image region where available. Generated factual additions MUST
show their supporting source or be visibly marked as unsourced. Source content is
untrusted data and MUST NOT become instructions to the agent or gain tool access.

### IV. Recoverable history
Manual edits and accepted agent edits MUST be durable and recoverable after a crash.
Users MUST be able to inspect revisions and restore an earlier approved state.
Persistence and snapshot failure MUST be visible and repairable; the UI MUST NOT
claim a completed durable revision before it is safely recorded.

### V. Bounded capabilities and secrets
Model credentials MUST remain outside documents, prompts, exports, and browser
content. Agent tools MUST use narrow, validated contracts. Embedded web content
MUST be isolated from privileged application state. Logs and diagnostic artifacts
MUST exclude secrets and sensitive source contents by default.

### VI. Evidence-led usability
Every major workflow MUST have a reviewable UX flow, empty/error states, keyboard
path, and clear provenance and approval cues. Implementation claims MUST be backed
by relevant automated checks and a manual end-to-end demonstration. Code changes
MUST include comments explaining non-obvious intent and safety boundaries.

## Product Constraints

- Desktop-first with a persistent AI chat pane on the left, a section explorer
  at the far left, and a right editor group whose global tabs open sections
  and work views. The selected section's Outline and Timeline belong beneath
  the section tree; revisions and comparisons open in the right editor group.
  Pane boundaries may be resized.
- No account is required for the first release. Cloud providers are optional.
- Notes MUST be exportable with attachments in an open, readable form.
- Markdown files are the canonical section content and remain hidden behind a
  direct rich text editor; normal UI MUST not require source-mode editing.
  Rich editing and future custom Markdown rules MUST preserve unsupported
  source text and provide a safe fallback; derived indexes and editor state
  are rebuildable. Media appears inline in its section, with portable links
  to attachments in the backing Markdown.
- Multimodal extraction MUST feed the same proposal and review path as text input.
- Avoid premature multi-service architecture; justify complexity against a simpler
  local design.

## Delivery and Review Gates

1. Use Spec Kit constitution, specification, plan, tasks, and analysis before
   implementation. Record assumptions and decisions in the feature documents.
2. Deliver wireframes and interaction flows first. Obtain user review of the
   wireframes and key product choices before application implementation begins.
3. During implementation, verify independent user journeys, persistence and
   recovery, stale revision handling, source boundaries, and privacy cues.
4. Keep generated command output concise: save verbose logs and report only useful
   summary or trailing failure context.

## Governance

This constitution governs feature specifications, design, tasks, and reviews.
Amendments require a documented rationale, version bump, and check of affected
artifacts. A new principle or materially expanded obligation increments MINOR;
incompatible removal or redefinition increments MAJOR; wording only increments
PATCH. Every implementation review checks these principles and records justified
exceptions in the feature plan.

**Version**: 1.0.0 | **Ratified**: 2026-10-19 | **Last Amended**: 2026-10-19
