# Source, Ingestion, and Model Contract

## Source artifact and locator

```ts
type Locator =
  | { kind: 'web'; url: string; selector?: string; quote?: string }
  | { kind: 'pdf'; page: number; rect?: [number, number, number, number] }
  | { kind: 'media'; startMs: number; endMs?: number; frameMs?: number }
  | { kind: 'image'; rect?: [number, number, number, number] }
  | { kind: 'text'; start: number; end: number };

type SourceSegment = {
  workspaceId: string;
  sourceId: string;
  segmentId: string;
  locator: Locator;
  content: string;
  method: 'original' | 'parse' | 'ocr' | 'transcript' | 'vision';
  extractorVersion?: string;
  confidence?: number;
  reviewed: boolean;
};
```

The original is immutable. Users may correct a derived transcript/OCR segment;
the correction is stored separately with attribution. Duplicate bytes may share
storage, but captures retain separate locations and times. A citation opens the
exact page or playback time when possible, otherwise the source card explains
why the locator is unavailable.

## Import commands

| Command | Required behavior |
| --- | --- |
| `source.importFile` | User-selected local path only; copy into managed staging; validate type/size/hash |
| `source.captureUrl` | Explicit user action; validate scheme, address and redirects; present extract preview |
| `source.captureSelection` | Explicit session capture; preserve title, URL, quote, capture time |
| `source.reviewExtract` | Approve or correct machine-derived text before using it for cited edits |
| `source.cancel/retry` | Durable job state, no partial approved note mutation |

No URL importer may access private/link-local addresses or privileged desktop
resources. Remote HTML is sanitized for preview and treated as source data.
Browser content cannot call privileged source/model commands directly.
Every import resolves its destination workspace from the trusted active
workspace context; source IDs and attachment paths cannot cross that boundary.

## Model request and disclosure

```ts
type ContextManifest = {
  workspaceId: string;
  destination: 'local' | 'cloud';
  providerId: string;
  noteIds: string[];
  sourceSegmentIds: string[];
  includesAttachments: boolean;
  estimatedBytes: number;
  userApprovedScope: boolean;
};
```

The gateway rejects a request whose notes or sources do not belong to the
manifest workspace. Cross-workspace content requires an explicit user-selected
copy/import action before it can be included. The gateway rejects a cloud
request without a valid, visible approval scope.
The UI shows provider, note/source count, attachment inclusion, and whether data
leaves the device. A recurring provider/workspace permission may be offered, but
its scope is inspectable and revocable. No model receives a raw filesystem path,
database handle, credential, or browser privilege. Model outputs are untrusted
proposals that pass the document contract validator.

Provider adapters declare text, vision, audio, streaming, context limit, and
offline capabilities. The runtime routes only supported operations; fallback to
a cloud service requires an explicit new disclosure. Cancellation must stop the
request where possible and discard any unapproved projection.
