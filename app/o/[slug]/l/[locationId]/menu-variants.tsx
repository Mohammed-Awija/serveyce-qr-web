'use client';

import { formatMoney } from '@/lib/components';
import {
  DEFAULT_TOKENS,
  type CardStyle,
  type PriceDisplay,
  type SectionLayout,
  type Variants,
} from '@/lib/design-tokens';

/**
 * Presentation variants for the guest menu — one registry per axis, mirroring
 * the component-engine pattern.
 *
 * Every variant is purely presentational and consumes only T1 tokens: no
 * variant hard-codes a colour, so any combination works under any theme.
 * Pricing math and the submit path are untouched — the price here is the
 * display-only figure the menu endpoint attaches.
 */

export type MenuNode = {
  id: string;
  name: string;
  type: 'CATEGORY' | 'ITEM';
  icon: string;
  price?: { amount: number; currency: string } | null;
  imageUrl?: string | null;
};

export type CardRenderProps = {
  node: MenuNode;
  priceDisplay: PriceDisplay;
  onOpen: () => void;
  /** "Tap to explore ›" — categories only. */
  exploreLabel: string;
};

/**
 * Resolves a registry entry, falling back visibly rather than rendering blank.
 * An unwired variant is a bug we want to see, not one that silently empties the
 * menu — so it logs and renders the default variant.
 */
function resolve<K extends string, V>(
  registry: Partial<Record<K, V>>,
  key: K,
  fallbackKey: K,
  axis: string,
): V {
  const entry = registry[key];
  if (entry) return entry;
  console.error(
    `[menu-variants] no renderer for ${axis}="${key}"; falling back to "${fallbackKey}"`,
  );
  // The fallback key is a default from DEFAULT_TOKENS, so this is always present.
  return registry[fallbackKey] as V;
}

// --- price fragments, shared by the card styles ---

function priceText(node: MenuNode): string | null {
  if (!node.price) return null;
  return formatMoney(node.price.amount, node.price.currency);
}

/** Corner pill — used by `badge`. Absolute, so the card must be relative. */
function PriceBadge({ node }: { node: MenuNode }) {
  const text = priceText(node);
  if (!text) return null;
  return (
    <span className="absolute top-2 end-2 rounded-full px-2 py-0.5 text-xs font-medium bg-[var(--sq-color-brand)] text-white">
      {text}
    </span>
  );
}

/** Foot row — used by `bottom`. */
function PriceFooter({ node }: { node: MenuNode }) {
  const text = priceText(node);
  if (!text) return null;
  return (
    <span className="mt-2 block border-t pt-2 text-sm font-medium border-[var(--sq-color-border)] text-[var(--sq-color-text-primary)]">
      {text}
    </span>
  );
}

/** Beside the title — used by `inline`. */
function PriceInline({ node }: { node: MenuNode }) {
  const text = priceText(node);
  if (!text) return null;
  return (
    <span className="text-sm shrink-0 text-[var(--sq-color-text-secondary)]">
      {text}
    </span>
  );
}

function PriceSlot({
  node,
  priceDisplay,
  slot,
}: {
  node: MenuNode;
  priceDisplay: PriceDisplay;
  slot: 'inline' | 'badge' | 'bottom';
}) {
  if (priceDisplay !== slot) return null;
  if (slot === 'inline') return <PriceInline node={node} />;
  if (slot === 'badge') return <PriceBadge node={node} />;
  return <PriceFooter node={node} />;
}

const cardBase =
  'relative w-full text-start rounded-[var(--sq-radius-card)] bg-[var(--sq-color-surface)] shadow-[var(--sq-shadow)] border-2 border-transparent hover:border-[var(--sq-color-border)]';

// --- cardStyle registry ---

/** Today's card, extracted unchanged. */
function StandardCard({ node, priceDisplay, onOpen, exploreLabel }: CardRenderProps) {
  return (
    <button onClick={onOpen} className={`${cardBase} p-5`}>
      <PriceSlot node={node} priceDisplay={priceDisplay} slot="badge" />
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-lg font-medium block text-[var(--sq-color-text-primary)]">
          {node.name}
        </span>
        <PriceSlot node={node} priceDisplay={priceDisplay} slot="inline" />
      </span>
      <span className="text-xs mt-1 block text-[var(--sq-color-text-secondary)]">
        {node.type === 'CATEGORY' ? exploreLabel : ''}
      </span>
      <PriceSlot node={node} priceDisplay={priceDisplay} slot="bottom" />
    </button>
  );
}

/** Dense row + small thumbnail — for menus with many items. */
function CompactCard({ node, priceDisplay, onOpen }: CardRenderProps) {
  return (
    <button onClick={onOpen} className={`${cardBase} flex items-center gap-3 p-3`}>
      <span className="h-10 w-10 shrink-0 overflow-hidden rounded-[var(--sq-radius-control)] bg-[var(--sq-color-background)]">
        {node.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={node.imageUrl} alt="" className="h-full w-full object-cover" />
        )}
      </span>
      <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
        {/* Single line: truncation is what keeps a 50-item menu scannable. */}
        <span className="truncate text-sm font-medium text-[var(--sq-color-text-primary)]">
          {node.name}
        </span>
        <PriceSlot node={node} priceDisplay={priceDisplay} slot="inline" />
      </span>
      <PriceSlot node={node} priceDisplay={priceDisplay} slot="badge" />
    </button>
  );
}

/** Large image on top, text beneath — boutique / experience menus. */
function ImageLedCard({ node, priceDisplay, onOpen, exploreLabel }: CardRenderProps) {
  return (
    <button onClick={onOpen} className={`${cardBase} overflow-hidden`}>
      <PriceSlot node={node} priceDisplay={priceDisplay} slot="badge" />
      <span className="block aspect-[4/3] w-full bg-[var(--sq-color-background)]">
        {node.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={node.imageUrl} alt="" className="h-full w-full object-cover" />
        )}
      </span>
      <span className="block p-4">
        <span className="flex items-baseline justify-between gap-2">
          <span className="font-medium text-[var(--sq-color-text-primary)]">
            {node.name}
          </span>
          <PriceSlot node={node} priceDisplay={priceDisplay} slot="inline" />
        </span>
        <span className="text-xs mt-1 block text-[var(--sq-color-text-secondary)]">
          {node.type === 'CATEGORY' ? exploreLabel : ''}
        </span>
        <PriceSlot node={node} priceDisplay={priceDisplay} slot="bottom" />
      </span>
    </button>
  );
}

export const CARD_REGISTRY: Partial<
  Record<CardStyle, (props: CardRenderProps) => React.ReactNode>
> = {
  standard: StandardCard,
  compact: CompactCard,
  'image-led': ImageLedCard,
};

// --- sectionLayout registry ---

/**
 * Container classes per layout.
 *
 * `grid` + `compact` is the one combination that degrades badly: a dense row
 * with a thumbnail and a truncated title has no room in a ~170px column at
 * 360px width. Rule: **compact forces a single column**, so `grid` behaves as
 * `list` for that card style. Chosen over shrinking the card because a
 * scannable full-width row is the entire point of compact.
 */
export function sectionClasses(
  layout: SectionLayout,
  cardStyle: CardStyle,
): string {
  const resolved: SectionLayout =
    cardStyle === 'compact' ? 'list' : layout;
  const registry: Partial<Record<SectionLayout, string>> = {
    list: 'flex flex-col gap-3',
    grid: 'grid grid-cols-2 gap-3',
  };
  return resolve(registry, resolved, 'grid', 'sectionLayout');
}

/** Full-width children need the span when the container is a 2-col grid. */
export function sectionSpanClass(
  layout: SectionLayout,
  cardStyle: CardStyle,
): string {
  return cardStyle !== 'compact' && layout === 'grid' ? 'col-span-2' : '';
}

export function resolveCard(cardStyle: CardStyle) {
  return resolve(
    CARD_REGISTRY,
    cardStyle,
    DEFAULT_TOKENS.variants.cardStyle,
    'cardStyle',
  );
}

/** Everything the menu needs, resolved once per render. */
export function resolveMenuVariants(variants: Variants) {
  return {
    Card: resolveCard(variants.cardStyle),
    priceDisplay: variants.priceDisplay,
    containerClass: sectionClasses(variants.sectionLayout, variants.cardStyle),
    spanClass: sectionSpanClass(variants.sectionLayout, variants.cardStyle),
  };
}
