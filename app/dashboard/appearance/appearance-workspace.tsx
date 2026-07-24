'use client';

import { useState } from 'react';
import { DEFAULT_TOKENS } from '@/lib/design-tokens';
import { AppearanceEditor } from './appearance-editor';
import { TemplateGallery } from './template-gallery';
import type { Preset, SavedTemplate } from './actions';

/**
 * Holds which template is being edited. The gallery selects, the editor edits.
 *
 * Editing semantics are deliberate: the editor always writes to the selected
 * row. Editing the published one is live-on-save; staging is duplicate → edit
 * the copy → publish. The org pointer already expresses "which is live", so
 * there is no separate draft state to keep in sync.
 */
export function AppearanceWorkspace({
  templates,
  presets,
  guestUrl,
}: {
  templates: SavedTemplate[];
  presets: Preset[];
  guestUrl: string | null;
}) {
  const published = templates.find((t) => t.isPublished) ?? templates[0] ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(
    published?.id ?? null,
  );

  // Server actions revalidate this page, so `templates` can change underneath a
  // stale selection (e.g. the selected row was deleted).
  const selected =
    templates.find((t) => t.id === selectedId) ?? published ?? null;

  return (
    <div className="mt-8 space-y-10">
      <TemplateGallery
        templates={templates}
        presets={presets}
        selectedId={selected?.id ?? null}
        onSelect={setSelectedId}
      />

      {templates.length > 0 && selected && (
        <section className="border-t pt-8">
          <div className="mb-6 flex items-baseline gap-2">
            <h2 className="text-lg font-semibold">Editing: {selected.name}</h2>
            {selected.isPublished ? (
              <span className="text-xs text-green-700">
                live — changes apply to your guest pages on save
              </span>
            ) : (
              <span className="text-xs text-gray-500">
                not live — publish it when you&apos;re happy
              </span>
            )}
          </div>

          <AppearanceEditor
            /* Remount when the selection changes so the form resets to that
               template's tokens instead of carrying over unsaved edits. */
            key={selected.id}
            initialTokens={selected.tokens ?? DEFAULT_TOKENS}
            templateId={selected.id}
            templateName={selected.name}
            isPublished={selected.isPublished ?? false}
            guestUrl={guestUrl}
          />
        </section>
      )}
    </div>
  );
}
