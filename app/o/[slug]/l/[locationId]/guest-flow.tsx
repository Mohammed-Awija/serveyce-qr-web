'use client';

import { useEffect, useState } from 'react';
import { publicFetch } from '@/lib/public-api';
import { translations, LOCALES, type Locale } from './translations';

type Node = { id: string; name: string; type: 'CATEGORY' | 'ITEM'; icon: string };
type Option = { id: string; name: string };
type Group = {
  id: string;
  name: string;
  selectionType: 'SINGLE' | 'MULTIPLE';
  required: boolean;
  options: Option[];
};

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
              ? 'bg-[#1B3A4B] text-white'
              : 'bg-white text-[#6B7280] border border-[#E5E0D5]'
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

type Props = {
  slug: string;
  locationId: string;
  orgName: string;
  locationName: string;
  defaultLanguage: string;
};

export function GuestFlow({ slug, locationId, orgName, locationName, defaultLanguage }: Props) {
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
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState(false);
  const [picks, setPicks] = useState<Record<string, string[]>>({}); // groupId -> optionIds
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

  // Load the configured item's modifier groups
  useEffect(() => {
    if (!configuringItem) return;
    let cancelled = false;
    const itemId = configuringItem.id;
    void (async () => {
      try {
        const data = await publicFetch(`/public/o/${slug}/items/${itemId}/modifiers`);
        if (cancelled) return;
        setGroups(data.groups);
        setGroupsError(false);
      } catch {
        if (cancelled) return;
        setGroups([]);
        setGroupsError(true);
      } finally {
        if (!cancelled) setGroupsLoading(false);
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
    setGroups([]);
    setPicks({});
    setNotes('');
    setStatus('idle');
    setGroupsError(false);
    setGroupsLoading(true);
    setConfiguringItem(node);
  }

  function closeItem() {
    setConfiguringItem(null);
    setGroups([]);
    setPicks({});
    setNotes('');
    setStatus('idle');
  }

  function goToCrumb(index: number) {
    setLoading(true);
    setTrail((prev) => prev.slice(0, index + 1));
    closeItem();
  }

  function togglePick(group: Group, optionId: string) {
    setPicks((prev) => {
      const current = prev[group.id] ?? [];
      if (group.selectionType === 'SINGLE') {
        return { ...prev, [group.id]: [optionId] };
      }
      // MULTIPLE: toggle
      return {
        ...prev,
        [group.id]: current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId],
      };
    });
  }

  const allRequiredMet = groups
    .filter((g) => g.required)
    .every((g) => (picks[g.id]?.length ?? 0) > 0);
  const canSubmit = !groupsLoading && !groupsError && allRequiredMet && status !== 'sending';

  async function submit() {
    if (!configuringItem) return;
    // Build human-readable selections snapshot
    const selections = groups
      .map((g) => ({
        groupName: g.name,
        optionNames: (picks[g.id] ?? [])
          .map((oid) => g.options.find((o) => o.id === oid)?.name)
          .filter(Boolean) as string[],
      }))
      .filter((s) => s.optionNames.length > 0);

    setStatus('sending');
    try {
      await publicFetch(`/public/o/${slug}/l/${locationId}/requests`, {
        method: 'POST',
        body: JSON.stringify({
          offeringNodeId: configuringItem.id,
          selections,
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
        className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#F5F2EC] text-center"
      >
        <div className="w-16 h-16 rounded-full bg-[#1B3A4B] flex items-center justify-center mb-6">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-[#1B3A4B]">{t.requestReceived}</h1>
        <p className="text-[#6B7280] mt-2 max-w-xs">
          {orgName} {t.confirmationBody}
        </p>
        <button
          onClick={reset}
          className="mt-8 text-[#1B3A4B] font-medium underline underline-offset-4"
        >
          {t.requestSomethingElse}
        </button>
      </main>
    );
  }

  // Item configuration screen
  if (configuringItem) {
    return (
      <main dir={dir} className="min-h-screen bg-[#F5F2EC] pb-40">
        <header className="px-6 pt-8 pb-4">
          <button onClick={closeItem} className="text-sm text-[#6B7280] mb-4">
            ← {t.back}
          </button>
          <h1 className="text-2xl font-semibold text-[#1B3A4B]">{configuringItem.name}</h1>
        </header>

        <div className="px-6 space-y-6">
          {groupsLoading && <p className="text-[#6B7280] text-sm">…</p>}
          {groupsError && <p className="text-sm text-red-600">{t.errorTryAgain}</p>}
          {groups.map((group) => (
            <div key={group.id}>
              <div className="flex items-baseline justify-between mb-2">
                <h2 className="font-medium text-[#1B3A4B]">{group.name}</h2>
                <span className="text-xs text-[#B08D57]">
                  {group.required ? t.required : ''}
                  {group.selectionType === 'MULTIPLE' ? ` · ${t.pickMany}` : ''}
                </span>
              </div>
              <div className="space-y-2">
                {group.options.map((opt) => {
                  const chosen = (picks[group.id] ?? []).includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => togglePick(group, opt.id)}
                      className={`w-full flex items-center justify-between rounded-xl p-4 border-2 ${
                        chosen
                          ? 'bg-[#1B3A4B] border-[#1B3A4B] text-white'
                          : 'bg-white border-transparent text-[#1B3A4B]'
                      }`}
                    >
                      <span>{opt.name}</span>
                      {chosen && <span>✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Submit bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-[0_-4px_24px_rgba(0,0,0,0.08)] p-6 space-y-3">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t.notesPlaceholder}
            rows={2}
            maxLength={500}
            className="w-full rounded-xl border border-[#E5E0D5] p-3 text-[#1B3A4B] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#1B3A4B] resize-none"
          />
          {status === 'error' && <p className="text-sm text-red-600">{t.errorTryAgain}</p>}
          <button
            onClick={submit}
            disabled={!canSubmit}
            className="w-full bg-[#1B3A4B] text-white rounded-xl py-4 font-medium text-lg disabled:opacity-40"
          >
            {status === 'sending' ? t.sending : t.sendRequest}
          </button>
        </div>
      </main>
    );
  }

  // Browsing the tree
  return (
    <main dir={dir} className="min-h-screen bg-[#F5F2EC] pb-16">
      <header className="px-6 pt-8 pb-4">
        {trail.length === 1 && (
          <div className="mb-6">
            <LanguageSwitcher locale={locale} setLocale={setLocale} />
          </div>
        )}
        <p className="text-sm tracking-wide uppercase text-[#B08D57] font-medium">{orgName}</p>
        <h1 className="text-2xl font-semibold text-[#1B3A4B] mt-2">
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
                    i === trail.length - 1 ? 'text-[#1B3A4B] font-medium' : 'text-[#6B7280]'
                  }
                >
                  {i === 0 ? t.menu : crumb.name}
                </button>
                {i < trail.length - 1 && <span className="text-[#9CA3AF]">›</span>}
              </span>
            ))}
          </div>
        )}
      </header>

      <div className="px-6 grid grid-cols-2 gap-3">
        {loading && <p className="col-span-2 text-[#6B7280] text-sm">…</p>}
        {!loading && menuError && (
          <p className="col-span-2 text-sm text-red-600">{t.errorTryAgain}</p>
        )}
        {!loading && !menuError && nodes.length === 0 && (
          <p className="col-span-2 text-[#6B7280] text-sm">{t.noServices}</p>
        )}
        {!loading &&
          nodes.map((node) => (
            <button
              key={node.id}
              onClick={() => openNode(node)}
              className={`rounded-2xl p-5 bg-white text-[#1B3A4B] border-2 border-transparent hover:border-[#E5E0D5] ${
                dir === 'rtl' ? 'text-right' : 'text-left'
              }`}
            >
              <span className="text-lg font-medium block">{node.name}</span>
              <span className="text-xs text-[#9CA3AF] mt-1 block">
                {node.type === 'CATEGORY' ? t.tapToExplore : ''}
              </span>
            </button>
          ))}
      </div>
    </main>
  );
}
