import React from 'react';
import type { Section } from '@revise/core';
import { SectionEditor } from '../editor/SectionEditor';
import { useSectionDocument } from '../editor/useSectionDocument';

type Props = { workspaceId: string; section: Section };

export function WorkspaceDocument({ workspaceId, section }: Props) {
  const { opened, status, error, onChange } = useSectionDocument(workspaceId, section.id);
  if (!opened)
    return (
      <section className="welcome">
        <h1>{section.displayTitle}</h1>
        <p>{error ?? 'Opening section…'}</p>
      </section>
    );
  return (
    <section className="workspace-document" aria-label={section.displayTitle}>
      <div className="document-heading">
        <span>{section.displayTitle}</span>
        <span role="status">
          {status === 'saving'
            ? 'Saving…'
            : status === 'saved'
              ? 'Saved'
              : status === 'error'
                ? 'Save failed'
                : 'Opening…'}
        </span>
      </div>
      {error && (
        <p className="editor-error" role="alert">
          {error}
        </p>
      )}
      <SectionEditor
        workspaceId={workspaceId}
        sectionId={section.id}
        markdown={opened.markdown}
        onChange={onChange}
      />
    </section>
  );
}
