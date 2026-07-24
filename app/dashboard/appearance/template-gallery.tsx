'use client';

import { useRef, useState, useTransition } from 'react';
import type { CSSProperties } from 'react';
import { tokensToCssVars, type DesignTokens } from '@/lib/design-tokens';
import {
  deleteTemplate,
  duplicateTemplate,
  exportTemplate,
  importTemplate,
  publishTemplate,
  renameTemplate,
  createFromPreset,
  type Preset,
  type SavedTemplate,
} from './actions';

/**
 * A miniature of a theme: background, surface card, brand button, accent.
 *
 * Deliberately a *static swatch* rather than the real `ThemePreview` scaled
 * down. A gallery can hold 5 presets + up to 20 templates; rendering 25 live
 * previews would mount 25 themed subtrees and pull a Google font per distinct
 * pairing, and at thumbnail scale the text is illegible anyway. The swatch is
 * driven by the same `tokensToCssVars` output, so colour/radius/shadow stay
 * truthful — only the layout is simplified. The full-fidelity preview still
 * sits next to the editor, where it's actually readable.
 */
function TemplateSwatch({ tokens }: { tokens: DesignTokens }) {
  const style = tokensToCssVars(tokens) as CSSProperties;
  return (
    <div
      data-sq-theme
      style={style}
      className="h-16 w-full overflow-hidden rounded border bg-[var(--sq-color-background)] p-2"
    >
      <div className="flex h-full gap-1.5">
        <div className="flex-1 rounded-[var(--sq-radius-card)] bg-[var(--sq-color-surface)] shadow-[var(--sq-shadow)] p-1.5">
          <div className="h-1.5 w-3/4 rounded-sm bg-[var(--sq-color-text-primary)] opacity-80" />
          <div className="mt-1 h-1 w-1/2 rounded-sm bg-[var(--sq-color-text-secondary)] opacity-70" />
        </div>
        <div className="flex w-8 flex-col gap-1">
          <div className="flex-1 rounded-[var(--sq-radius-control)] bg-[var(--sq-color-brand)]" />
          <div className="h-2 rounded-full bg-[var(--sq-color-accent)]" />
        </div>
      </div>
    </div>
  );
}

function Card({
  title,
  subtitle,
  tokens,
  badge,
  children,
}: {
  title: string;
  subtitle?: string;
  tokens: DesignTokens;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-white p-3">
      <TemplateSwatch tokens={tokens} />
      <div className="mt-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{title}</p>
          {subtitle && (
            <p className="truncate text-xs text-gray-400">{subtitle}</p>
          )}
        </div>
        {badge && (
          <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-800">
            {badge}
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">{children}</div>
    </div>
  );
}

const actionClass = 'text-blue-600 hover:text-blue-800 disabled:opacity-40';

export function TemplateGallery({
  templates,
  presets,
  selectedId,
  onSelect,
}: {
  templates: SavedTemplate[];
  presets: Preset[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [errors, setErrors] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function act(fn: () => Promise<{ errors?: string[] }>) {
    setErrors([]);
    startTransition(async () => {
      const result = await fn();
      if (result.errors) setErrors(result.errors);
    });
  }

  function onExport(template: SavedTemplate) {
    setErrors([]);
    startTransition(async () => {
      const result = await exportTemplate(template.id);
      if (result.errors) {
        setErrors(result.errors);
        return;
      }
      // Client-side download; nothing hits the filesystem server-side.
      const blob = new Blob([JSON.stringify(result.data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  function onImportFile(file: File) {
    setErrors([]);
    startTransition(async () => {
      const text = await file.text();
      const result = await importTemplate(text);
      if (result.errors) setErrors(result.errors);
      if (fileRef.current) fileRef.current.value = '';
    });
  }

  return (
    <div className="space-y-4">
      {errors.length > 0 && (
        <ul className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 space-y-1">
          {errors.map((msg) => (
            <li key={msg}>{msg}</li>
          ))}
        </ul>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Your templates ({templates.length})
          </h2>
          <div className="flex items-center gap-3 text-xs">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={isPending}
              className={actionClass}
            >
              Import JSON
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImportFile(file);
              }}
            />
          </div>
        </div>

        {templates.length === 0 ? (
          <p className="text-sm text-gray-400">
            No templates yet — start from a preset below.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <div
                key={template.id}
                className={`rounded-lg ${
                  selectedId === template.id ? 'ring-2 ring-gray-900' : ''
                }`}
              >
                <Card
                  title={template.name}
                  tokens={template.tokens}
                  badge={template.isPublished ? 'Live' : undefined}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(template.id)}
                    disabled={isPending}
                    className={actionClass}
                  >
                    Edit
                  </button>
                  {!template.isPublished && (
                    <button
                      type="button"
                      onClick={() => act(() => publishTemplate(template.id))}
                      disabled={isPending}
                      className={actionClass}
                    >
                      Publish
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => act(() => duplicateTemplate(template.id))}
                    disabled={isPending}
                    className={actionClass}
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const name = prompt('Template name', template.name);
                      if (name?.trim()) act(() => renameTemplate(template.id, name));
                    }}
                    disabled={isPending}
                    className={actionClass}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => onExport(template)}
                    disabled={isPending}
                    className={actionClass}
                  >
                    Export
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Delete "${template.name}"?`)) {
                        act(() => deleteTemplate(template.id));
                      }
                    }}
                    disabled={isPending}
                    className="text-red-600 hover:text-red-800 disabled:opacity-40"
                  >
                    Delete
                  </button>
                </Card>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Start from a preset
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {presets.map((preset) => (
            <Card
              key={preset.id}
              title={preset.name}
              subtitle={preset.description}
              tokens={preset.tokens}
            >
              <button
                type="button"
                onClick={() => act(() => createFromPreset(preset.id))}
                disabled={isPending}
                className={actionClass}
              >
                Use this template
              </button>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
