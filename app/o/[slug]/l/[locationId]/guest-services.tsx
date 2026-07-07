'use client';

import { useState } from 'react';
import { publicFetch } from '@/lib/public-api';
import { translations, LOCALES, type Locale } from './translations';

type Offering = { id: string; name: string; icon: string };

// Language switcher — shown on every screen
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
  offerings: Offering[];
  defaultLanguage: string;
};

export function GuestServices({
  slug,
  locationId,
  orgName,
  locationName,
  offerings,
  defaultLanguage,
}: Props) {
  const initialLocale = (['en', 'tr', 'ar'].includes(defaultLanguage)
    ? defaultLanguage
    : 'en') as Locale;

  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [selected, setSelected] = useState<Offering | null>(null);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  const t = translations[locale];
  const dir = LOCALES.find((l) => l.code === locale)?.dir ?? 'ltr';

  async function submit() {
    if (!selected) return;
    setStatus('sending');
    try {
      await publicFetch(`/public/o/${slug}/l/${locationId}/requests`, {
        method: 'POST',
        body: JSON.stringify({ offeringTypeId: selected.id, notes: notes.trim() || undefined }),
      });
      setStatus('done');
    } catch {
      setStatus('error');
    }
  }

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
          onClick={() => {
            setSelected(null);
            setNotes('');
            setStatus('idle');
          }}
          className="mt-8 text-[#1B3A4B] font-medium underline underline-offset-4"
        >
          {t.requestSomethingElse}
        </button>
        <div className="mt-10">
          <LanguageSwitcher locale={locale} setLocale={setLocale} />
        </div>
      </main>
    );
  }

  return (
    <main dir={dir} className="min-h-screen bg-[#F5F2EC] pb-32">
      <header className="px-6 pt-8 pb-6">
        <div className="mb-6">
          <LanguageSwitcher locale={locale} setLocale={setLocale} />
        </div>
        <p className="text-sm tracking-wide uppercase text-[#B08D57] font-medium">
          {orgName}
        </p>
        <h1 className="text-3xl font-semibold text-[#1B3A4B] mt-2 leading-tight">
          {t.welcomeTo} {locationName}
        </h1>
        <p className="text-[#6B7280] mt-2">{t.tapWhatYouNeed}</p>
      </header>

      <div className="px-6 grid grid-cols-2 gap-3">
        {offerings.length === 0 && (
          <p className="col-span-2 text-[#6B7280] text-sm">{t.noServices}</p>
        )}
        {offerings.map((o) => {
          const isSelected = selected?.id === o.id;
          return (
            <button
              key={o.id}
              onClick={() => setSelected(o)}
              className={`rounded-2xl p-5 transition-all border-2 ${
                dir === 'rtl' ? 'text-right' : 'text-left'
              } ${
                isSelected
                  ? 'bg-[#1B3A4B] border-[#1B3A4B] text-white'
                  : 'bg-white border-transparent text-[#1B3A4B] hover:border-[#E5E0D5]'
              }`}
            >
              <span className="text-lg font-medium leading-snug block">{o.name}</span>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-[0_-4px_24px_rgba(0,0,0,0.08)] p-6 space-y-4">
          <div>
            <p className="text-sm text-[#6B7280]">{t.youreRequesting}</p>
            <p className="text-lg font-semibold text-[#1B3A4B]">{selected.name}</p>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t.notesPlaceholder}
            rows={2}
            className="w-full rounded-xl border border-[#E5E0D5] p-3 text-[#1B3A4B] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#1B3A4B] resize-none"
          />
          {status === 'error' && (
            <p className="text-sm text-red-600">{t.errorTryAgain}</p>
          )}
          <button
            onClick={submit}
            disabled={status === 'sending'}
            className="w-full bg-[#1B3A4B] text-white rounded-xl py-4 font-medium text-lg disabled:opacity-60"
          >
            {status === 'sending' ? t.sending : t.sendRequest}
          </button>
        </div>
      )}
    </main>
  );
}
