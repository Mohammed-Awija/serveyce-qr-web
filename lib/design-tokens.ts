/**
 * Guest-page design tokens → CSS custom properties.
 *
 * Mirrors the token schema in `serveyce-qr-api/src/templates/design-tokens.ts`.
 * The two repos are deployed separately with no shared package, so the schema is
 * duplicated deliberately; the API is the authority and always sends a complete,
 * sanitized token set on the guest-context response.
 *
 * This module still re-validates every value. The API sanitizes, but these
 * strings end up inside a `style` attribute on a public page, so treating them
 * as untrusted here too costs nothing and removes any single point of failure.
 */

export const COLOR_KEYS = [
  'brand',
  'accent',
  'background',
  'surface',
  'textPrimary',
  'textSecondary',
] as const;
export type ColorKey = (typeof COLOR_KEYS)[number];

export const FONT_PAIRS = [
  'system',
  'inter',
  'playfair-lato',
  'dm-serif-mulish',
  'nunito',
] as const;
export type FontPair = (typeof FONT_PAIRS)[number];

export const RADII = ['none', 'soft', 'round'] as const;
export type Radius = (typeof RADII)[number];

export const SHADOWS = ['none', 'soft', 'strong'] as const;
export type Shadow = (typeof SHADOWS)[number];

// --- v2: presentation variants for the guest menu ---

export const CARD_STYLES = ['standard', 'compact', 'image-led'] as const;
export type CardStyle = (typeof CARD_STYLES)[number];

export const PRICE_DISPLAYS = ['inline', 'badge', 'bottom'] as const;
export type PriceDisplay = (typeof PRICE_DISPLAYS)[number];

export const SECTION_LAYOUTS = ['list', 'grid'] as const;
export type SectionLayout = (typeof SECTION_LAYOUTS)[number];

export type Variants = {
  cardStyle: CardStyle;
  priceDisplay: PriceDisplay;
  sectionLayout: SectionLayout;
};

export type DesignTokens = {
  colors: Record<ColorKey, string>;
  fontPair: FontPair;
  radius: Radius;
  shadow: Shadow;
  variants: Variants;
};

/** Keep in sync with the API's DEFAULT_TOKENS — the pre-template guest palette. */
export const DEFAULT_TOKENS: DesignTokens = {
  colors: {
    brand: '#1B3A4B',
    accent: '#B08D57',
    background: '#F5F2EC',
    surface: '#FFFFFF',
    textPrimary: '#1B3A4B',
    textSecondary: '#6B7280',
  },
  fontPair: 'system',
  radius: 'soft',
  shadow: 'soft',
  variants: {
    cardStyle: 'standard',
    priceDisplay: 'inline',
    // The guest menu has always rendered `grid grid-cols-2`, so `grid` is the
    // value that preserves existing orgs' appearance.
    sectionLayout: 'grid',
  },
};

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pickEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

/** Defence in depth: coerce anything unexpected back to the default theme. */
export function sanitizeTokens(input: unknown): DesignTokens {
  const raw = asRecord(input);
  if (!raw) return DEFAULT_TOKENS;

  const rawColors = asRecord(raw.colors) ?? {};
  const colors = {} as Record<ColorKey, string>;
  for (const key of COLOR_KEYS) {
    const candidate = rawColors[key];
    colors[key] =
      typeof candidate === 'string' && HEX_RE.test(candidate)
        ? candidate
        : DEFAULT_TOKENS.colors[key];
  }

  // Absent on every v1 row — defaulted like any other missing field, which is
  // how an additive schema bump needs no migration. See the API's copy of this
  // function for the full note on when `schemaVersion` becomes load-bearing.
  const rawVariants = asRecord(raw.variants) ?? {};
  const dv = DEFAULT_TOKENS.variants;

  return {
    colors,
    fontPair: pickEnum(raw.fontPair, FONT_PAIRS, DEFAULT_TOKENS.fontPair),
    radius: pickEnum(raw.radius, RADII, DEFAULT_TOKENS.radius),
    shadow: pickEnum(raw.shadow, SHADOWS, DEFAULT_TOKENS.shadow),
    variants: {
      cardStyle: pickEnum(rawVariants.cardStyle, CARD_STYLES, dv.cardStyle),
      priceDisplay: pickEnum(rawVariants.priceDisplay, PRICE_DISPLAYS, dv.priceDisplay),
      sectionLayout: pickEnum(rawVariants.sectionLayout, SECTION_LAYOUTS, dv.sectionLayout),
    },
  };
}

/**
 * `#RRGGBB` → `rgba(r, g, b, a)`. Input is always a validated 6-digit hex
 * (sanitizeTokens guarantees it), so parsing can't fail; the guard is there to
 * keep the function total if it's ever called from somewhere less careful.
 */
function hexToRgba(hex: string, alpha: number): string {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return `rgba(107, 114, 128, ${alpha})`; // default textSecondary
  const int = parseInt(m[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// --- token → CSS value maps (closed sets; no user string reaches CSS) ---

const RADIUS_CSS: Record<Radius, { card: string; control: string }> = {
  none: { card: '0px', control: '0px' },
  soft: { card: '1rem', control: '0.75rem' },
  round: { card: '1.75rem', control: '9999px' },
};

const SHADOW_CSS: Record<Shadow, string> = {
  none: 'none',
  soft: '0 1px 3px rgba(0,0,0,0.06)',
  strong: '0 8px 24px rgba(0,0,0,0.16)',
};

const SYSTEM_STACK =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/**
 * Curated pairings. `googleFamilies` feeds the stylesheet URL; `system` loads
 * nothing so the default theme makes no third-party request.
 */
const FONT_PAIR_CSS: Record<
  FontPair,
  { heading: string; body: string; googleFamilies: string[] }
> = {
  system: {
    heading: SYSTEM_STACK,
    body: SYSTEM_STACK,
    googleFamilies: [],
  },
  inter: {
    heading: `"Inter", ${SYSTEM_STACK}`,
    body: `"Inter", ${SYSTEM_STACK}`,
    googleFamilies: ['Inter:wght@400;500;600;700'],
  },
  'playfair-lato': {
    heading: `"Playfair Display", Georgia, serif`,
    body: `"Lato", ${SYSTEM_STACK}`,
    googleFamilies: ['Playfair+Display:wght@500;600;700', 'Lato:wght@400;700'],
  },
  'dm-serif-mulish': {
    heading: `"DM Serif Display", Georgia, serif`,
    body: `"Mulish", ${SYSTEM_STACK}`,
    googleFamilies: ['DM+Serif+Display', 'Mulish:wght@400;600;700'],
  },
  nunito: {
    heading: `"Nunito", ${SYSTEM_STACK}`,
    body: `"Nunito", ${SYSTEM_STACK}`,
    googleFamilies: ['Nunito:wght@400;600;700'],
  },
};

/**
 * CSS custom properties for the guest page wrapper.
 *
 * Emitted server-side so the themed paint is the first paint — no flash of the
 * default theme. Values come from closed maps above, never from raw token text.
 */
export function tokensToCssVars(tokens: DesignTokens): Record<string, string> {
  const radius = RADIUS_CSS[tokens.radius];
  const fonts = FONT_PAIR_CSS[tokens.fontPair];

  return {
    '--sq-color-brand': tokens.colors.brand,
    '--sq-color-accent': tokens.colors.accent,
    '--sq-color-background': tokens.colors.background,
    '--sq-color-surface': tokens.colors.surface,
    '--sq-color-text-primary': tokens.colors.textPrimary,
    '--sq-color-text-secondary': tokens.colors.textSecondary,
    // Borders aren't a token. A faint tint of the secondary text colour keeps
    // hairlines legible on light and dark themes without widening the schema.
    //
    // Computed here as plain rgba() rather than emitted as `color-mix(...)`:
    // a var() fallback only applies when the property is *undefined*, so a
    // browser without color-mix support (Safari < 16.2, Chrome < 111) would
    // substitute the literal function, fail at computed-value time, and drop
    // border-color back to `currentColor` — hairlines in the text colour.
    // rgba() is universally supported and needs no fallback at all.
    '--sq-color-border': hexToRgba(tokens.colors.textSecondary, 0.3),
    '--sq-radius-card': radius.card,
    '--sq-radius-control': radius.control,
    '--sq-shadow': SHADOW_CSS[tokens.shadow],
    '--sq-font-heading': fonts.heading,
    '--sq-font-body': fonts.body,
  };
}

/**
 * Google Fonts stylesheet URL for the resolved pairing, or null for `system`.
 *
 * Why a plain <link> rather than `next/font`: `next/font` resolves at *build*
 * time, so it can't pick a family per request. Fonts here are chosen per tenant
 * at request time, which is inherently runtime — a link tag is the correct tool.
 * The URL is assembled from the closed `googleFamilies` list above, so no
 * tenant-supplied string ever reaches it.
 */
export function googleFontsHref(tokens: DesignTokens): string | null {
  const { googleFamilies } = FONT_PAIR_CSS[tokens.fontPair];
  if (googleFamilies.length === 0) return null;
  const families = googleFamilies.map((f) => `family=${f}`).join('&');
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}
