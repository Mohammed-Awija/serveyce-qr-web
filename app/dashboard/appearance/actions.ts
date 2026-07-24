'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';
import type { DesignTokens } from '@/lib/design-tokens';

export type SavedTemplate = {
  id: string;
  name: string;
  schemaVersion: number;
  tokens: DesignTokens;
  isPublished?: boolean;
};

export type Preset = {
  id: string;
  name: string;
  description: string;
  tokens: DesignTokens;
};

/** A template as it travels between properties: no ids, no org fields. */
export type TemplateExport = {
  name: string;
  schemaVersion: number;
  tokens: DesignTokens;
};

type Result = { success?: true; id?: string; errors?: string[] };

/**
 * The API returns `{ message, errors: string[] }` for token validation
 * failures and a plain `message` for guardrails (409s). apiFetch throws
 * `API <status>: <body>`, so recover the useful part rather than showing an
 * admin a raw HTTP string.
 */
function extractErrors(e: unknown): string[] {
  const message = (e as Error).message ?? '';
  const jsonStart = message.indexOf('{');
  if (jsonStart === -1) return [message];
  try {
    const parsed: unknown = JSON.parse(message.slice(jsonStart));
    const errors = (parsed as { errors?: unknown }).errors;
    if (Array.isArray(errors) && errors.length > 0) {
      return errors.filter((x): x is string => typeof x === 'string');
    }
    const msg = (parsed as { message?: unknown }).message;
    return [typeof msg === 'string' ? msg : message];
  } catch {
    return [message];
  }
}

async function run(fn: () => Promise<{ id?: string }>): Promise<Result> {
  try {
    const res = await fn();
    revalidatePath('/dashboard/appearance');
    return { success: true, id: res?.id };
  } catch (e) {
    return { errors: extractErrors(e) };
  }
}

export async function getTemplates(): Promise<{
  templates: SavedTemplate[];
  error?: string;
}> {
  try {
    const templates: SavedTemplate[] = await apiFetch('/templates');
    return { templates };
  } catch (e) {
    return { templates: [], error: (e as Error).message };
  }
}

export async function getPresets(): Promise<Preset[]> {
  try {
    return await apiFetch('/templates/presets');
  } catch {
    // The gallery degrades to "your templates only" rather than erroring out.
    return [];
  }
}

/**
 * Save tokens onto a template. Editing the published one is live immediately —
 * staged editing is duplicate → edit the copy → publish.
 */
export async function saveTokens(input: {
  templateId: string | null;
  tokens: DesignTokens;
  name?: string;
}): Promise<Result> {
  return run(async () =>
    input.templateId
      ? await apiFetch(`/templates/${input.templateId}`, {
          method: 'PATCH',
          body: JSON.stringify({ tokens: input.tokens }),
        })
      : await apiFetch('/templates', {
          method: 'POST',
          body: JSON.stringify({
            name: input.name || 'Default',
            tokens: input.tokens,
          }),
        }),
  );
}

/** Clone a built-in preset into an org-owned row; the editor then edits the clone. */
export async function createFromPreset(presetId: string): Promise<Result> {
  return run(() =>
    apiFetch('/templates', {
      method: 'POST',
      body: JSON.stringify({ presetId }),
    }),
  );
}

export async function duplicateTemplate(id: string): Promise<Result> {
  return run(() => apiFetch(`/templates/${id}/duplicate`, { method: 'POST' }));
}

export async function publishTemplate(id: string): Promise<Result> {
  return run(() => apiFetch(`/templates/${id}/publish`, { method: 'POST' }));
}

export async function renameTemplate(id: string, name: string): Promise<Result> {
  return run(() =>
    apiFetch(`/templates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),
  );
}

export async function deleteTemplate(id: string): Promise<Result> {
  return run(() => apiFetch(`/templates/${id}`, { method: 'DELETE' }));
}

export async function exportTemplate(
  id: string,
): Promise<{ data?: TemplateExport; errors?: string[] }> {
  try {
    const data: TemplateExport = await apiFetch(`/templates/${id}/export`);
    return { data };
  } catch (e) {
    return { errors: extractErrors(e) };
  }
}

/**
 * Import an uploaded template file.
 *
 * The parsed JSON is untrusted: it goes through the same POST /templates path
 * as any other write, so `validateTokens` rejects it field-by-field on the
 * server. Nothing here tries to pre-clean it — the boundary is the defense.
 */
export async function importTemplate(raw: string): Promise<Result> {
  // Cheap guard so a huge paste doesn't cross the wire at all.
  if (raw.length > 100_000) {
    return { errors: ['That file is too large to be a template.'] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { errors: ["That file isn't valid JSON."] };
  }

  const record =
    typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  if (!record) return { errors: ['A template file must be a JSON object.'] };

  const name = typeof record.name === 'string' ? record.name : 'Imported template';

  return run(() =>
    apiFetch('/templates', {
      method: 'POST',
      body: JSON.stringify({ name, tokens: record.tokens }),
    }),
  );
}
