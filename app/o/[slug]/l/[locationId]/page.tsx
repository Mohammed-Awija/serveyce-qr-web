import type { CSSProperties } from 'react';
import { publicFetch } from '@/lib/public-api';
import {
  googleFontsHref,
  sanitizeTokens,
  tokensToCssVars,
  DEFAULT_TOKENS,
  type DesignTokens,
} from '@/lib/design-tokens';
import { GuestFlow } from './guest-flow';

type GuestContext = {
  organization: { name: string; defaultLanguage: string };
  location: { id: string; name: string };
  resolvedTokens?: unknown;
};

export default async function GuestPage({
  params,
}: {
  params: Promise<{ slug: string; locationId: string }>;
}) {
  const { slug, locationId } = await params;

  let data: GuestContext | null = null;
  let error: string | null = null;

  try {
    data = await publicFetch(`/public/o/${slug}/l/${locationId}`);
  } catch {
    error = 'unavailable';
  }

  // The unavailable state has no org, so it renders on the built-in theme.
  const tokens: DesignTokens = data
    ? sanitizeTokens(data.resolvedTokens)
    : DEFAULT_TOKENS;
  const themeStyle = tokensToCssVars(tokens) as CSSProperties;
  const fontsHref = googleFontsHref(tokens);

  if (error || !data) {
    return (
      <main
        style={themeStyle}
        className="min-h-screen flex items-center justify-center p-6 bg-[var(--sq-color-background,#F5F2EC)]"
      >
        <div className="text-center">
          <p className="font-medium text-[var(--sq-color-text-primary,#1B3A4B)]">
            This room page isn&apos;t available.
          </p>
          <p className="text-sm mt-2 text-[var(--sq-color-text-secondary,#6B7280)]">
            Please check with the front desk.
          </p>
        </div>
      </main>
    );
  }

  return (
    <>
      {/*
        A plain <link> rather than next/font: next/font resolves families at
        build time, but the pairing here is per-tenant and chosen at request
        time. Rendered server-side alongside the themed wrapper, so the first
        paint is already correct.
      */}
      {fontsHref && (
        <link rel="stylesheet" href={fontsHref} data-sq-fonts={tokens.fontPair} />
      )}
      <div data-sq-theme style={themeStyle}>
        <GuestFlow
          slug={slug}
          locationId={locationId}
          orgName={data.organization.name}
          locationName={data.location.name}
          defaultLanguage={data.organization.defaultLanguage}
          variants={tokens.variants}
        />
      </div>
    </>
  );
}
