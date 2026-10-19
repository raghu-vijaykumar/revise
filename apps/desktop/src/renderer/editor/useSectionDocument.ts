import React from 'react';
import type { RichDocument } from '@revise/core';

type OpenDocument = Awaited<ReturnType<typeof window.revise.openSection>>;

export function useSectionDocument(workspaceId: string, sectionId: string) {
  const [opened, setOpened] = React.useState<OpenDocument | null>(null);
  const [status, setStatus] = React.useState<'loading' | 'saved' | 'saving' | 'error'>('loading');
  const [error, setError] = React.useState<string | null>(null);
  const latest = React.useRef<RichDocument | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const queue = React.useRef<Promise<void>>(Promise.resolve());
  const hash = React.useRef('');

  React.useEffect(() => {
    let active = true;
    void window.revise
      .openSection(workspaceId, sectionId)
      .then((document) => {
        if (!active) return;
        hash.current = document.fileHash;
        setOpened(document);
        setStatus('saved');
      })
      .catch(() => {
        if (active) {
          setStatus('error');
          setError('Section could not be opened.');
        }
      });
    return () => {
      active = false;
    };
  }, [workspaceId, sectionId]);

  const flush = React.useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const transaction = latest.current;
    latest.current = null;
    if (!transaction || !opened) return;
    queue.current = queue.current
      .then(async () => {
        const result = await window.revise.saveRichSection(
          workspaceId,
          sectionId,
          opened.sessionId,
          hash.current,
          transaction,
        );
        hash.current = result.fileHash;
        if (!latest.current) setStatus('saved');
      })
      .catch(() => {
        setStatus('error');
        setError(
          'This section changed or could not be saved. Copy your changes and reopen the section.',
        );
      });
  }, [opened, sectionId, workspaceId]);

  React.useEffect(() => () => flush(), [flush]);

  const onChange = React.useCallback(
    (_markdown: string, transaction: RichDocument) => {
      latest.current = transaction;
      setStatus('saving');
      setError(null);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, 200);
    },
    [flush],
  );

  return { opened, status, error, onChange };
}
