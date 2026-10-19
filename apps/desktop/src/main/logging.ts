export type Diagnostic = {
  event: 'app_started' | 'workspace_error' | 'save_failed' | 'agent_failed' | 'history_failed';
  workspaceId?: string;
  code?: 'provider_unavailable' | 'path_unavailable' | 'conflict' | 'io_error' | 'invalid_payload';
  durationMs?: number;
};

export function formatDiagnostic(input: Diagnostic): string {
  // Build a fresh allowlisted record so accidental source text and credentials are dropped.
  const safe: Record<string, string | number> = { event: input.event };
  if (input.workspaceId && /^[a-f0-9-]{36}$/i.test(input.workspaceId))
    safe.workspaceId = input.workspaceId;
  if (
    input.code &&
    [
      'provider_unavailable',
      'path_unavailable',
      'conflict',
      'io_error',
      'invalid_payload',
    ].includes(input.code)
  ) {
    safe.code = input.code;
  }
  if (Number.isFinite(input.durationMs) && input.durationMs! >= 0)
    safe.durationMs = input.durationMs!;
  return JSON.stringify(safe);
}
