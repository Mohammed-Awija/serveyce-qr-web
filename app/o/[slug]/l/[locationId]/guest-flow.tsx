'use client';

import { useEffect, useState } from 'react';
import { publicFetch } from '@/lib/public-api';
import type { ServiceComponent } from '@/lib/components';
import { translations, LOCALES, type Locale } from './translations';
import { formatMoney } from '@/lib/components';
import {
  GUEST_REGISTRY,
  buildComponentValues,
  isSubmittable,
  orderTotal,
  type Answers,
} from './component-registry';
import { resolveMenuVariants, type MenuNode } from './menu-variants';
import { DEFAULT_TOKENS, type Variants } from '@/lib/design-tokens';

type Node = MenuNode;

// Language switcher — landing screen only; the choice carries through the rest of the flow
function LanguageSwitcher({
  locale,
  setLocale,
}: {
  locale: Locale;
  setLocale: (l: Locale) => void;
}) {
  return (
    <div className="flex gap-1 justify-center">
      {LOCALES.map((l) => (
        <button
          key={l.code}
          onClick={() => setLocale(l.code)}
          className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
            locale === l.code
              ? 'bg-[var(--sq-color-brand,#1B3A4B)] text-white'
              : 'bg-[var(--sq-color-surface,#FFFFFF)] text-[var(--sq-color-text-secondary,#6B7280)] border border-[var(--sq-color-border,#E5E0D5)]'
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Sticky order total across all priced components. Preview only — the server
 * recomputes authoritatively. Mixed currencies are shown side by side rather
 * than summed, since V1 does no conversion.
 */
function OrderTotalBar({
  total,
  t,
}: {
  total: ReturnType<typeof orderTotal>;
  t: (typeof translations)[Locale];
}) {
  if (total.kind === 'empty') return null;

  const amountText =
    total.kind === 'single'
      ? formatMoney(total.amount, total.currency)
      : total.parts.map((p) => formatMoney(p.amount, p.currency)).join(' + ');

  return (
    <div className="flex items-baseline justify-between border-b border-[var(--sq-color-border,#E5E0D5)] pb-3">
      <div className="flex flex-col">
        <span className="text-base font-semibold text-[var(--sq-color-text-primary,#1B3A4B)]">{t.total}</span>
        <span className="text-xs text-[var(--sq-color-text-secondary,#9CA3AF)]">{t.estimatedTotal}</span>
      </div>
      <span className="text-lg font-semibold text-[var(--sq-color-text-primary,#1B3A4B)] text-right">
        {amountText}
      </span>
    </div>
  );
}

type Props = {
  slug: string;
  locationId: string;
  orgName: string;
  locationName: string;
  defaultLanguage: string;
  /** Presentation variants from the org's published template. */
  variants?: Variants;
};

export function GuestFlow({
  slug,
  locationId,
  orgName,
  locationName,
  defaultLanguage,
  variants = DEFAULT_TOKENS.variants,
}: Props) {
  // Card / price / section markup all come from the variant registry.
  const menu = resolveMenuVariants(variants);
  const initialLocale = (['en', 'tr', 'ar'].includes(defaultLanguage)
    ? defaultLanguage
    : 'en') as Locale;
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const t = translations[locale];
  const dir = LOCALES.find((l) => l.code === locale)?.dir ?? 'ltr';

  // Navigation state: a stack of {id, name} we've descended into
  const [trail, setTrail] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: 'menu' },
  ]);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuError, setMenuError] = useState(false);

  // Item configuration state
  const [configuringItem, setConfiguringItem] = useState<Node | null>(null);
  const [components, setComponents] = useState<ServiceComponent[]>([]);
  const [componentsLoading, setComponentsLoading] = useState(false);
  const [componentsError, setComponentsError] = useState(false);
  const [answers, setAnswers] = useState<Answers>({}); // componentId -> that type's answer
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  const currentParentId = trail[trail.length - 1].id;

  // Load nodes for the current level
  useEffect(() => {
    let cancelled = false;
    const q = currentParentId ? `?parentId=${currentParentId}` : '';
    void (async () => {
      try {
        const data = await publicFetch(`/public/o/${slug}/l/${locationId}/menu${q}`);
        if (cancelled) return;
        setNodes(data);
        setMenuError(false);
      } catch {
        if (cancelled) return;
        setNodes([]);
        setMenuError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, locationId, currentParentId]);

  // Load the configured item's service components
  useEffect(() => {
    if (!configuringItem) return;
    let cancelled = false;
    const itemId = configuringItem.id;
    void (async () => {
      try {
        const data = await publicFetch(`/public/o/${slug}/items/${itemId}/components`);
        if (cancelled) return;
        setComponents(data.components);
        setComponentsError(false);
      } catch {
        if (cancelled) return;
        setComponents([]);
        setComponentsError(true);
      } finally {
        if (!cancelled) setComponentsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, configuringItem]);

  function openNode(node: Node) {
    if (node.type === 'CATEGORY') {
      setLoading(true);
      setTrail((prev) => [...prev, { id: node.id, name: node.name }]);
      return;
    }
    // Item: clear anything left from a previously configured item before the fetch lands
    setComponents([]);
    setAnswers({});
    setNotes('');
    setStatus('idle');
    setComponentsError(false);
    setComponentsLoading(true);
    setConfiguringItem(node);
  }

  function closeItem() {
    setConfiguringItem(null);
    setComponents([]);
    setAnswers({});
    setNotes('');
    setStatus('idle');
  }

  function goToCrumb(index: number) {
    setLoading(true);
    setTrail((prev) => prev.slice(0, index + 1));
    closeItem();
  }

  // Each component type owns its answer shape; the shell just stores it.
  function setAnswer(componentId: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [componentId]: value }));
  }

  const canSubmit =
    !componentsLoading &&
    !componentsError &&
    isSubmittable(components, answers) &&
    status !== 'sending';

  async function submit() {
    if (!configuringItem) return;
    const componentValues = buildComponentValues(components, answers);

    setStatus('sending');
    try {
      await publicFetch(`/public/o/${slug}/l/${locationId}/requests`, {
        method: 'POST',
        body: JSON.stringify({
          offeringNodeId: configuringItem.id,
          componentValues,
          notes: notes.trim() || undefined,
        }),
      });
      setStatus('done');
    } catch {
      setStatus('error');
    }
  }

  function reset() {
    setLoading(true);
    setTrail([{ id: null, name: 'menu' }]);
    closeItem();
  }

  // Confirmation screen
  if (status === 'done') {
    return (
      <main
        dir={dir}
        className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--sq-color-background,#F5F2EC)] text-center"
      >
        <div className="w-16 h-16 rounded-full bg-[var(--sq-color-brand,#1B3A4B)] flex items-center justify-center mb-6">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-[var(--sq-color-text-primary,#1B3A4B)]">{t.requestReceived}</h1>
        <p className="text-[var(--sq-color-text-secondary,#6B7280)] mt-2 max-w-xs">
          {orgName} {t.confirmationBody}
        </p>
        <button
          onClick={reset}
          className="mt-8 text-[var(--sq-color-text-primary,#1B3A4B)] font-medium underline underline-offset-4"
        >
          {t.requestSomethingElse}
        </button>
      </main>
    );
  }

  // Item configuration screen
  if (configuringItem) {
    return (
      <main dir={dir} className="min-h-screen bg-[var(--sq-color-background,#F5F2EC)] pb-40">
        <header className="px-6 pt-8 pb-4">
          <button onClick={closeItem} className="text-sm text-[var(--sq-color-text-secondary,#6B7280)] mb-4">
            ← {t.back}
          </button>
          <h1 className="text-2xl font-semibold text-[var(--sq-color-text-primary,#1B3A4B)]">{configuringItem.name}</h1>
        </header>

        <div className="px-6 space-y-6">
          {componentsLoading && <p className="text-[var(--sq-color-text-secondary,#6B7280)] text-sm">…</p>}
          {componentsError && <p className="text-sm text-red-600">{t.errorTryAgain}</p>}
          {components.map((component) => {
            // Types not yet wired into the registry render nothing.
            const def = GUEST_REGISTRY[component.type];
            if (!def) return null;
            return (
              <div key={component.id}>
                <def.Render
                  component={component}
                  answers={answers}
                  setAnswer={setAnswer}
                  t={t}
                />
              </div>
            );
          })}
        </div>

        {/* Submit bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-[var(--sq-color-surface,#FFFFFF)] rounded-t-3xl shadow-[var(--sq-shadow,0_-4px_24px_rgba(0,0,0,0.08))] p-6 space-y-3">
          <OrderTotalBar total={orderTotal(components, answers)} t={t} />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t.notesPlaceholder}
            rows={2}
            maxLength={500}
            className="w-full rounded-[var(--sq-radius-control,0.75rem)] border border-[var(--sq-color-border,#E5E0D5)] p-3 text-[var(--sq-color-text-primary,#1B3A4B)] placeholder:text-[var(--sq-color-text-secondary,#9CA3AF)] focus:outline-none focus:border-[var(--sq-color-brand,#1B3A4B)] resize-none"
          />
          {status === 'error' && <p className="text-sm text-red-600">{t.errorTryAgain}</p>}
          <button
            onClick={submit}
            disabled={!canSubmit}
            className="w-full bg-[var(--sq-color-brand,#1B3A4B)] text-white rounded-[var(--sq-radius-control,0.75rem)] py-4 font-medium text-lg disabled:opacity-40"
          >
            {status === 'sending' ? t.sending : t.sendRequest}
          </button>
        </div>
      </main>
    );
  }

  // Browsing the tree
  return (
    <main dir={dir} className="min-h-screen bg-[var(--sq-color-background,#F5F2EC)] pb-16">
      <header className="px-6 pt-8 pb-4">
        {trail.length === 1 && (
          <div className="mb-6">
            <LanguageSwitcher locale={locale} setLocale={setLocale} />
          </div>
        )}
        <p className="text-sm tracking-wide uppercase text-[var(--sq-color-accent,#B08D57)] font-medium">{orgName}</p>
        <h1 className="text-2xl font-semibold text-[var(--sq-color-text-primary,#1B3A4B)] mt-2">
          {t.welcomeTo} {locationName}
        </h1>

        {/* Breadcrumb */}
        {trail.length > 1 && (
          <div className="flex items-center gap-1 flex-wrap mt-3 text-sm">
            {trail.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                <button
                  onClick={() => goToCrumb(i)}
                  className={
                    i === trail.length - 1 ? 'text-[var(--sq-color-text-primary,#1B3A4B)] font-medium' : 'text-[var(--sq-color-text-secondary,#6B7280)]'
                  }
                >
                  {i === 0 ? t.menu : crumb.name}
                </button>
                {i < trail.length - 1 && <span className="text-[var(--sq-color-text-secondary,#9CA3AF)]">›</span>}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* Card and layout markup comes from the variant registry, not from here. */}
      <div className={`px-6 ${menu.containerClass}`}>
        {loading && (
          <p className={`${menu.spanClass} text-[var(--sq-color-text-secondary,#6B7280)] text-sm`}>
            …
          </p>
        )}
        {!loading && menuError && (
          <p className={`${menu.spanClass} text-sm text-red-600`}>{t.errorTryAgain}</p>
        )}
        {!loading && !menuError && nodes.length === 0 && (
          <p className={`${menu.spanClass} text-[var(--sq-color-text-secondary,#6B7280)] text-sm`}>
            {t.noServices}
          </p>
        )}
        {!loading &&
          nodes.map((node) => (
            <menu.Card
              key={node.id}
              node={node}
              priceDisplay={menu.priceDisplay}
              onOpen={() => openNode(node)}
              exploreLabel={t.tapToExplore}
            />
          ))}
      </div>
    </main>
  );
}
