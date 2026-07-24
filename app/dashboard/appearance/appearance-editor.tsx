'use client';

import { useState, useTransition } from 'react';
import {
  CARD_STYLES,
  COLOR_KEYS,
  DEFAULT_TOKENS,
  FONT_PAIRS,
  PRICE_DISPLAYS,
  RADII,
  SECTION_LAYOUTS,
  SHADOWS,
  type CardStyle,
  type ColorKey,
  type DesignTokens,
  type FontPair,
  type PriceDisplay,
  type Radius,
  type SectionLayout,
  type Shadow,
  type Variants,
} from '@/lib/design-tokens';
import { saveTokens } from './actions';
import { ThemePreview } from './theme-preview';

const COLOR_LABELS: Record<ColorKey, string> = {
  brand: 'Brand',
  accent: 'Accent',
  background: 'Background',
  surface: 'Surface',
  textPrimary: 'Text',
  textSecondary: 'Muted text',
};

/** Rendered in its own face so the admin sees the pairing, not the name. */
const FONT_PAIR_META: Record<FontPair, { label: string; css: string }> = {
  system: { label: 'System', css: 'ui-sans-serif, system-ui, sans-serif' },
  inter: { label: 'Inter', css: '"Inter", ui-sans-serif, sans-serif' },
  'playfair-lato': { label: 'Playfair / Lato', css: '"Playfair Display", Georgia, serif' },
  'dm-serif-mulish': { label: 'DM Serif / Mulish', css: '"DM Serif Display", Georgia, serif' },
  nunito: { label: 'Nunito', css: '"Nunito", ui-sans-serif, sans-serif' },
};

const RADIUS_SWATCH: Record<Radius, string> = {
  none: '0px',
  soft: '0.75rem',
  round: '1.5rem',
};

const SHADOW_SWATCH: Record<Shadow, string> = {
  none: 'none',
  soft: '0 1px 3px rgba(0,0,0,0.18)',
  strong: '0 8px 24px rgba(0,0,0,0.32)',
};

// --- mini-mockups: each option is shown as a shape, not a word ---

const mockBar = 'block rounded-sm bg-gray-300';
const mockImg = 'block rounded-sm bg-gray-400';

function CardStyleMock({ style }: { style: CardStyle }) {
  if (style === 'compact') {
    return (
      <span className="flex h-10 w-full items-center gap-1.5 rounded border border-gray-300 bg-white p-1.5">
        <span className={`${mockImg} h-full w-5 shrink-0`} />
        <span className={`${mockBar} h-1.5 flex-1`} />
      </span>
    );
  }
  if (style === 'image-led') {
    return (
      <span className="flex h-10 w-full flex-col overflow-hidden rounded border border-gray-300 bg-white">
        <span className={`${mockImg} h-6 w-full rounded-none`} />
        <span className="flex flex-1 items-center px-1.5">
          <span className={`${mockBar} h-1.5 w-2/3`} />
        </span>
      </span>
    );
  }
  return (
    <span className="flex h-10 w-full flex-col justify-center gap-1.5 rounded border border-gray-300 bg-white p-2">
      <span className={`${mockBar} h-2 w-3/4`} />
      <span className={`${mockBar} h-1.5 w-1/2 bg-gray-200`} />
    </span>
  );
}

function PriceDisplayMock({ display }: { display: PriceDisplay }) {
  return (
    <span className="relative flex h-10 w-full flex-col justify-center gap-1.5 rounded border border-gray-300 bg-white p-2">
      {display === 'badge' && (
        <span className="absolute end-1 top-1 h-2 w-5 rounded-full bg-gray-800" />
      )}
      <span className="flex items-center gap-1">
        <span className={`${mockBar} h-2 flex-1`} />
        {display === 'inline' && <span className="h-2 w-4 rounded-sm bg-gray-800" />}
      </span>
      {display === 'bottom' && (
        <span className="mt-auto flex border-t border-gray-200 pt-1">
          <span className="h-1.5 w-4 rounded-sm bg-gray-800" />
        </span>
      )}
    </span>
  );
}

function SectionLayoutMock({ layout }: { layout: SectionLayout }) {
  if (layout === 'grid') {
    return (
      <span className="grid h-10 w-full grid-cols-2 gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="rounded-sm border border-gray-300 bg-white" />
        ))}
      </span>
    );
  }
  return (
    <span className="flex h-10 w-full flex-col gap-1">
      {[0, 1, 2].map((i) => (
        <span key={i} className="flex-1 rounded-sm border border-gray-300 bg-white" />
      ))}
    </span>
  );
}

export function AppearanceEditor({
  initialTokens,
  templateId,
  templateName,
  isPublished,
  guestUrl,
}: {
  initialTokens: DesignTokens;
  templateId: string | null;
  templateName?: string;
  isPublished?: boolean;
  guestUrl: string | null;
}) {
  const [tokens, setTokens] = useState<DesignTokens>(initialTokens);
  const [savedId, setSavedId] = useState<string | null>(templateId);
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [previewRtl, setPreviewRtl] = useState(false);
  const [isPending, startTransition] = useTransition();

  function update(patch: Partial<DesignTokens>) {
    setTokens((prev) => ({ ...prev, ...patch }));
    setSaved(false);
  }

  function setVariant(patch: Partial<Variants>) {
    setTokens((prev) => ({ ...prev, variants: { ...prev.variants, ...patch } }));
    setSaved(false);
  }

  function setColor(key: ColorKey, value: string) {
    setTokens((prev) => ({ ...prev, colors: { ...prev.colors, [key]: value } }));
    setSaved(false);
  }

  function save() {
    setErrors([]);
    startTransition(async () => {
      const result = await saveTokens({
        templateId: savedId,
        tokens,
        name: templateName,
      });
      if (result.errors) {
        setErrors(result.errors);
        return;
      }
      if (result.id) setSavedId(result.id);
      setSaved(true);
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
      {/* ---------------- form ---------------- */}
      <div className="space-y-6">
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Colours
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {COLOR_KEYS.map((key) => (
              <label
                key={key}
                className="flex items-center gap-3 rounded border bg-white p-3"
              >
                {/* Native colour input: no picker dependency for six swatches. */}
                <input
                  type="color"
                  value={tokens.colors[key]}
                  onChange={(e) => setColor(key, e.target.value.toUpperCase())}
                  className="h-8 w-8 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
                  aria-label={COLOR_LABELS[key]}
                />
                <span className="min-w-0">
                  <span className="block text-sm">{COLOR_LABELS[key]}</span>
                  <span className="block font-mono text-xs text-gray-400">
                    {tokens.colors[key]}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Typography
          </h2>
          <div className="space-y-2">
            {FONT_PAIRS.map((pair) => (
              <button
                key={pair}
                type="button"
                onClick={() => update({ fontPair: pair })}
                className={`w-full rounded border p-3 text-left ${
                  tokens.fontPair === pair
                    ? 'border-gray-900 ring-1 ring-gray-900 bg-white'
                    : 'border-gray-200 bg-white hover:border-gray-400'
                }`}
              >
                {/* Each pairing previews in its own face. */}
                <span
                  className="text-lg"
                  style={{ fontFamily: FONT_PAIR_META[pair].css }}
                >
                  {FONT_PAIR_META[pair].label}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Corners
          </h2>
          <div className="flex gap-3">
            {RADII.map((radius) => (
              <button
                key={radius}
                type="button"
                onClick={() => update({ radius })}
                aria-label={radius}
                className={`flex-1 rounded border p-3 ${
                  tokens.radius === radius
                    ? 'border-gray-900 ring-1 ring-gray-900'
                    : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                {/* Shown as a shape, not a word. */}
                <span
                  className="mx-auto block h-10 w-full border-2 border-gray-800 bg-gray-100"
                  style={{ borderRadius: RADIUS_SWATCH[radius] }}
                />
                <span className="mt-2 block text-xs text-gray-500 capitalize">
                  {radius}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Depth
          </h2>
          <div className="flex gap-3">
            {SHADOWS.map((shadow) => (
              <button
                key={shadow}
                type="button"
                onClick={() => update({ shadow })}
                aria-label={shadow}
                className={`flex-1 rounded border p-4 ${
                  tokens.shadow === shadow
                    ? 'border-gray-900 ring-1 ring-gray-900'
                    : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                <span
                  className="mx-auto block h-10 w-full rounded bg-white"
                  style={{ boxShadow: SHADOW_SWATCH[shadow] }}
                />
                <span className="mt-2 block text-xs text-gray-500 capitalize">
                  {shadow}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Layout
          </h2>

          <p className="mb-2 text-xs text-gray-500">Card style</p>
          <div className="flex gap-3">
            {CARD_STYLES.map((style) => (
              <button
                key={style}
                type="button"
                onClick={() => setVariant({ cardStyle: style })}
                aria-label={style}
                className={`flex-1 rounded border p-3 ${
                  tokens.variants.cardStyle === style
                    ? 'border-gray-900 ring-1 ring-gray-900'
                    : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                <CardStyleMock style={style} />
                <span className="mt-2 block text-xs text-gray-500 capitalize">
                  {style.replace('-', ' ')}
                </span>
              </button>
            ))}
          </div>

          <p className="mb-2 mt-4 text-xs text-gray-500">Price position</p>
          <div className="flex gap-3">
            {PRICE_DISPLAYS.map((pd) => (
              <button
                key={pd}
                type="button"
                onClick={() => setVariant({ priceDisplay: pd })}
                aria-label={pd}
                className={`flex-1 rounded border p-3 ${
                  tokens.variants.priceDisplay === pd
                    ? 'border-gray-900 ring-1 ring-gray-900'
                    : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                <PriceDisplayMock display={pd} />
                <span className="mt-2 block text-xs text-gray-500 capitalize">{pd}</span>
              </button>
            ))}
          </div>

          <p className="mb-2 mt-4 text-xs text-gray-500">Section layout</p>
          <div className="flex gap-3">
            {SECTION_LAYOUTS.map((sl) => (
              <button
                key={sl}
                type="button"
                onClick={() => setVariant({ sectionLayout: sl })}
                aria-label={sl}
                className={`flex-1 rounded border p-3 ${
                  tokens.variants.sectionLayout === sl
                    ? 'border-gray-900 ring-1 ring-gray-900'
                    : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                <SectionLayoutMock layout={sl} />
                <span className="mt-2 block text-xs text-gray-500 capitalize">{sl}</span>
              </button>
            ))}
          </div>

          {tokens.variants.sectionLayout === 'grid' &&
            tokens.variants.cardStyle === 'compact' && (
              <p className="mt-3 text-xs text-amber-700">
                Compact cards always use a single column — a dense row has no room
                in a half-width column on a phone.
              </p>
            )}
        </section>

        {/* ---------------- save ---------------- */}
        <div className="space-y-3 border-t pt-4">
          {errors.length > 0 && (
            <ul className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 space-y-1">
              {errors.map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={save}
              disabled={isPending}
              className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {isPending ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => {
                setTokens(DEFAULT_TOKENS);
                setSaved(false);
              }}
              disabled={isPending}
              className="text-sm text-gray-500 hover:text-gray-800 disabled:opacity-50"
            >
              Reset to default
            </button>
          </div>

          {saved && (
            <p className="text-sm text-green-700">
              {isPublished
                ? 'Saved — applied to your live guest page. '
                : 'Saved. Publish this template to put it in front of guests. '}
              {isPublished && guestUrl && (
                <a
                  href={guestUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                >
                  View guest page ↗
                </a>
              )}
            </p>
          )}
        </div>
      </div>

      {/* ---------------- preview ---------------- */}
      <div className="space-y-3 lg:sticky lg:top-6 lg:self-start">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Preview
          </h2>
          <label className="flex items-center gap-2 text-xs text-gray-500">
            <input
              type="checkbox"
              checked={previewRtl}
              onChange={(e) => setPreviewRtl(e.target.checked)}
            />
            RTL
          </label>
        </div>

        <ThemePreview tokens={tokens} dir={previewRtl ? 'rtl' : 'ltr'} />

        <p className="text-xs text-gray-400">
          Live preview of your guest page. Changes here aren&apos;t saved until you
          press Save.
        </p>
      </div>
    </div>
  );
}
