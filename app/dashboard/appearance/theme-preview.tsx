'use client';

import { useEffect } from 'react';
import type { CSSProperties } from 'react';
import {
  googleFontsHref,
  tokensToCssVars,
  type DesignTokens,
} from '@/lib/design-tokens';
import {
  resolveMenuVariants,
  type MenuNode,
} from '@/app/o/[slug]/l/[locationId]/menu-variants';

/**
 * Loads the draft font pair client-side.
 *
 * The guest page emits its <link> server-side (see the guest page component);
 * here the pairing changes as the admin clicks, so the tag is swapped at
 * runtime. The href comes from the same closed family list, so no admin-typed
 * string ever reaches it. Tagged with a data attribute so repeated changes
 * replace the tag instead of stacking them up.
 */
function usePreviewFont(tokens: DesignTokens) {
  const href = googleFontsHref(tokens);

  useEffect(() => {
    const marker = 'data-sq-preview-font';
    const existing = document.head.querySelector(`link[${marker}]`);

    if (!href) {
      existing?.remove();
      return;
    }
    if (existing?.getAttribute('href') === href) return;

    existing?.remove();
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute(marker, '');
    document.head.appendChild(link);
  }, [href]);
}

/** Stand-ins for real menu nodes: one priced item, one category. */
const SAMPLE_NODES: MenuNode[] = [
  {
    id: 'sample-1',
    name: 'Continental breakfast',
    type: 'ITEM',
    icon: 'bell',
    price: { amount: 120, currency: 'TRY' },
  },
  { id: 'sample-2', name: 'Housekeeping', type: 'CATEGORY', icon: 'bell', price: null },
];

/**
 * A slice of the real guest UI rendered with the draft tokens.
 *
 * Deliberately mirrors the guest components' markup and uses the *same*
 * `tokensToCssVars` mapper the live page uses, so a preview can't diverge from
 * production. Vars are applied to this container only — `[data-sq-theme]` is
 * scoped, so nothing leaks into the dashboard chrome around it.
 */
export function ThemePreview({
  tokens,
  dir = 'ltr',
}: {
  tokens: DesignTokens;
  dir?: 'ltr' | 'rtl';
}) {
  usePreviewFont(tokens);
  const style = tokensToCssVars(tokens) as CSSProperties;
  const menu = resolveMenuVariants(tokens.variants);

  return (
    <div
      data-sq-theme
      dir={dir}
      style={style}
      className="overflow-hidden rounded-lg border shadow-sm"
    >
      <div className="bg-[var(--sq-color-background)] p-5 space-y-5">
        {/* Header, as the guest sees it */}
        <div>
          <p className="text-xs tracking-wide uppercase font-medium text-[var(--sq-color-accent)]">
            Seaside Hotel
          </p>
          <h1 className="text-xl font-semibold mt-1 text-[var(--sq-color-text-primary)]">
            Welcome to Room 101
          </h1>
        </div>

        {/* Menu cards, rendered through the *real* variant registry — this is
            what proves a variant works, rather than a lookalike mockup. */}
        <div className={menu.containerClass}>
          {SAMPLE_NODES.map((node) => (
            <menu.Card
              key={node.id}
              node={node}
              priceDisplay={menu.priceDisplay}
              onOpen={() => {}}
              exploreLabel="Tap to explore ›"
            />
          ))}
        </div>

        {/* A priced item: selected + unselected option, mirroring SelectRender */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="font-medium text-[var(--sq-color-text-primary)]">Room service</h2>
            <span className="text-xs text-[var(--sq-color-accent)]">Required</span>
          </div>
          <div className="space-y-2">
            <div className="w-full flex items-center justify-between rounded-[var(--sq-radius-control)] p-4 border-2 bg-[var(--sq-color-brand)] border-[var(--sq-color-brand)] text-white">
              <span>Continental</span>
              <span className="flex items-center gap-2">
                <span className="text-white/80">120 TRY</span>
                <span>✓</span>
              </span>
            </div>
            <div className="w-full flex items-center justify-between rounded-[var(--sq-radius-control)] p-4 border-2 bg-[var(--sq-color-surface)] border-transparent text-[var(--sq-color-text-primary)]">
              <span>Full English</span>
              <span className="text-[var(--sq-color-text-secondary)]">180 TRY</span>
            </div>
          </div>
        </div>

        {/* Submit bar with the grand total, mirroring the guest bottom sheet */}
        <div className="rounded-t-3xl bg-[var(--sq-color-surface)] p-5 space-y-3 shadow-[var(--sq-shadow)]">
          <div className="flex items-baseline justify-between border-b pb-3 border-[var(--sq-color-border)]">
            <div className="flex flex-col">
              <span className="text-base font-semibold text-[var(--sq-color-text-primary)]">
                Total
              </span>
              <span className="text-xs text-[var(--sq-color-text-secondary)]">
                Estimated — confirmed by the property
              </span>
            </div>
            <span className="text-lg font-semibold text-[var(--sq-color-text-primary)]">
              120 TRY
            </span>
          </div>
          <div className="w-full rounded-[var(--sq-radius-control)] py-3 text-center font-medium text-lg bg-[var(--sq-color-brand)] text-white">
            Send request
          </div>
        </div>
      </div>
    </div>
  );
}
