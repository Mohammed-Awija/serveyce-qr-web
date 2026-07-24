'use client';

import { QRCodeSVG } from 'qrcode.react';
import {
  formatMoney,
  isSafeUrl,
  readCurrency,
  readEncryption,
  readGuestInfoFields,
  readOptionalNumber,
  readOptionalString,
  readOptions,
  readPricingMode,
  readTiers,
  readUrls,
  selectSubtotal,
  wifiPayload,
  type ComponentConfig,
  type ComponentValue,
  type ComponentValueData,
  type GuestInfoKey,
  type GuestInfoValue,
  type ServiceComponent,
  type ServiceComponentType,
} from '@/lib/components';
import type { translations } from './translations';

// Values widened to string: `translations` is `as const`, so each locale has its
// own literal types and the `en` shape alone wouldn't accept `tr` / `ar`.
type T = { [K in keyof (typeof translations)['en']]: string };

/**
 * Everything the guest has entered, keyed by component id.
 *
 * Deliberately `unknown` per entry: each type owns its own answer shape (selects
 * hold option ids, text/number hold the raw input string, guest-info holds a
 * per-field record) and reads it back through its own guards. A narrower type
 * here would bake in one type's shape, which is what forced this rewrite once.
 */
export type Answers = Record<string, unknown>;

export type GuestTypeDef = {
  /** True if the guest fills this in (and it therefore contributes a componentValue). */
  isInput: boolean;
  Render: (props: RenderProps) => React.ReactNode;
  /** Required-check: is there an answer at all? Only consulted when `required`. */
  isSatisfied?: (component: ServiceComponent, answers: Answers) => boolean;
  /** Format/range check, applied whether or not the component is required. */
  isValid?: (component: ServiceComponent, answers: Answers) => boolean;
  /** Builds the snapshot value; return undefined to omit this component. */
  toValue?: (
    component: ServiceComponent,
    answers: Answers,
  ) => ComponentValueData | undefined;
  /**
   * For setBy: 'ADMIN' components — the value the admin fixed at config time.
   * Read from config, not from guest input, and still recorded on the request so
   * staff see it. Types without one (e.g. IMAGE) contribute no value.
   */
  adminValue?: (component: ServiceComponent) => ComponentValueData | undefined;
  /**
   * What this component contributes to the running order total, for the guest's
   * *preview* only — the server recomputes every figure authoritatively. Types
   * with no money (selects, text, dates…) omit this. Adding a new priced type
   * later means adding this hook, not editing the total bar.
   */
  subtotal?: (component: ServiceComponent, answers: Answers) => Money | null;
};

/** A single amount in one currency. Currency is a plain config string. */
export type Money = { amount: number; currency: string };

export type RenderProps = {
  component: ServiceComponent;
  answers: Answers;
  /** Stores this component's answer, in whatever shape the type uses. */
  setAnswer: (componentId: string, value: unknown) => void;
  t: T;
};

// --- answer readers: answers are `unknown`, so every read is guarded ---

function readSelected(answers: Answers, id: string): string[] {
  const v = answers[id];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

/** Text and number inputs both hold the raw string the guest typed. */
function readRaw(answers: Answers, id: string): string {
  const v = answers[id];
  return typeof v === 'string' ? v : '';
}

function readFields(answers: Answers, id: string): Record<string, string> {
  const v = answers[id];
  if (typeof v !== 'object' || v === null) return {};
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (typeof val === 'string') out[k] = val;
  }
  return out;
}

function FieldHeading({
  component,
  t,
  hint,
}: {
  component: ServiceComponent;
  t: T;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline justify-between mb-2">
      <h2 className="font-medium text-[var(--sq-color-text-primary,#1B3A4B)]">{component.label}</h2>
      <span className="text-xs text-[var(--sq-color-accent,#B08D57)]">
        {component.required ? t.required : ''}
        {hint ? `${component.required ? ' · ' : ''}${hint}` : ''}
      </span>
    </div>
  );
}

const inputClass =
  'w-full rounded-[var(--sq-radius-control,0.75rem)] border border-[var(--sq-color-border,#E5E0D5)] bg-[var(--sq-color-surface,#FFFFFF)] p-4 text-[var(--sq-color-text-primary,#1B3A4B)] placeholder:text-[var(--sq-color-text-secondary,#9CA3AF)] focus:outline-none focus:border-[var(--sq-color-brand,#1B3A4B)]';

// --- SINGLE_SELECT / MULTI_SELECT ---

function SelectRender({ component, answers, setAnswer, t }: RenderProps) {
  const options = readOptions(component.config);
  const chosen = readSelected(answers, component.id);
  const multi = component.type === 'MULTI_SELECT';
  const mode = readPricingMode(component.config);
  const currency = readCurrency(component.config);
  const priced = mode !== 'NONE';

  function toggle(optionId: string) {
    if (!multi) {
      setAnswer(component.id, [optionId]);
      return;
    }
    setAnswer(
      component.id,
      chosen.includes(optionId)
        ? chosen.filter((id) => id !== optionId)
        : [...chosen, optionId],
    );
  }

  // ADDITIVE shows "+15" (a surcharge on the base); ABSOLUTE shows the full price.
  function priceLabel(price: number | undefined): string | null {
    if (!priced || price === undefined || price === 0) {
      return mode === 'ADDITIVE' && price === 0 ? formatMoney(0, currency) : null;
    }
    const money = formatMoney(price, currency);
    return mode === 'ADDITIVE' ? `+${money}` : money;
  }

  const preview = selectSubtotal(component.config, chosen);

  return (
    <div>
      <FieldHeading component={component} t={t} hint={multi ? t.pickMany : undefined} />
      <div className="space-y-2">
        {options.map((opt) => {
          const picked = chosen.includes(opt.id);
          const price = priceLabel(opt.price);
          return (
            <button
              key={opt.id}
              onClick={() => toggle(opt.id)}
              className={`w-full flex items-center justify-between rounded-[var(--sq-radius-control,0.75rem)] p-4 border-2 ${
                picked
                  ? 'bg-[var(--sq-color-brand,#1B3A4B)] border-[var(--sq-color-brand,#1B3A4B)] text-white'
                  : 'bg-[var(--sq-color-surface,#FFFFFF)] border-transparent text-[var(--sq-color-text-primary,#1B3A4B)]'
              }`}
            >
              <span>{opt.label}</span>
              <span className="flex items-center gap-2">
                {price && (
                  <span className={picked ? 'text-white/80' : 'text-[var(--sq-color-text-secondary,#6B7280)]'}>
                    {price}
                  </span>
                )}
                {picked && <span>✓</span>}
              </span>
            </button>
          );
        })}
      </div>

      {/* Per-component subtotal; the sticky bar carries the "estimated" caveat and grand total. */}
      {priced && preview > 0 && (
        <p className="mt-2 px-1 text-sm text-[var(--sq-color-text-secondary,#6B7280)]">
          {t.total}: <strong className="text-[var(--sq-color-text-primary,#1B3A4B)]">{formatMoney(preview, currency)}</strong>
        </p>
      )}
    </div>
  );
}

/**
 * Submits the selected option id(s) — never labels or prices. The server resolves
 * labels and computes any money from its own config, so the guest controls only
 * *which* option was chosen. Single → a string id; multi → an array of ids.
 */
function selectToValue(component: ServiceComponent, answers: Answers) {
  const validIds = new Set(readOptions(component.config).map((o) => o.id));
  const ids = readSelected(answers, component.id).filter((id) => validIds.has(id));
  if (ids.length === 0) return undefined;
  return component.type === 'MULTI_SELECT' ? ids : ids[0];
}

// --- IMAGE (display-only) ---

function ImageRender({ component }: RenderProps) {
  const urls = readUrls(component.config);
  if (urls.length === 0) return null;

  return (
    <div className="space-y-2">
      {urls.map((url) => (
        // Remote UploadThing URLs; next/image would need host config.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={url}
          src={url}
          alt={component.label}
          className="w-full rounded-[var(--sq-radius-card,1rem)] object-cover max-h-64"
        />
      ))}
    </div>
  );
}

// --- TEXT_FIELD ---

function TextRender({ component, answers, setAnswer, t }: RenderProps) {
  return (
    <div>
      <FieldHeading component={component} t={t} />
      <input
        type="text"
        value={readRaw(answers, component.id)}
        onChange={(e) => setAnswer(component.id, e.target.value)}
        placeholder={readOptionalString(component.config, 'placeholder')}
        maxLength={500}
        className={inputClass}
      />
    </div>
  );
}

// --- NUMBER ---

function NumberRender({ component, answers, setAnswer, t }: RenderProps) {
  const min = readOptionalNumber(component.config, 'min');
  const max = readOptionalNumber(component.config, 'max');
  const raw = readRaw(answers, component.id);
  const outOfRange = raw !== '' && !numberInRange(raw, min, max);

  const range =
    min !== undefined && max !== undefined
      ? `${min}–${max}`
      : min !== undefined
        ? `≥ ${min}`
        : max !== undefined
          ? `≤ ${max}`
          : undefined;

  return (
    <div>
      <FieldHeading component={component} t={t} hint={range} />
      <input
        type="number"
        inputMode="numeric"
        value={raw}
        min={min}
        max={max}
        onChange={(e) => setAnswer(component.id, e.target.value)}
        placeholder={readOptionalString(component.config, 'placeholder')}
        className={`${inputClass} ${outOfRange ? 'border-red-500' : ''}`}
      />
    </div>
  );
}

/** A blank entry is "no answer" (handled by required), not an invalid one. */
function numberInRange(raw: string, min?: number, max?: number): boolean {
  const n = Number(raw);
  if (raw.trim() === '' || !Number.isFinite(n)) return false;
  if (min !== undefined && n < min) return false;
  if (max !== undefined && n > max) return false;
  return true;
}

// --- GUEST_INFO ---

function GuestInfoRender({ component, answers, setAnswer, t }: RenderProps) {
  const fields = readGuestInfoFields(component.config);
  const current = readFields(answers, component.id);
  if (fields.length === 0) return null;

  const labels: Record<GuestInfoKey, string> = {
    fullName: t.fullName,
    phone: t.phone,
    age: t.age,
  };

  return (
    <div>
      <FieldHeading component={component} t={t} />
      <div className="space-y-2">
        {fields.map((field) => (
          <div key={field.key}>
            <label className="block text-xs text-[var(--sq-color-text-secondary,#6B7280)] mb-1">
              {labels[field.key]}
              {field.required && <span className="text-[var(--sq-color-accent,#B08D57)]"> *</span>}
            </label>
            <input
              type={field.key === 'age' ? 'number' : field.key === 'phone' ? 'tel' : 'text'}
              inputMode={field.key === 'age' ? 'numeric' : undefined}
              value={current[field.key] ?? ''}
              onChange={(e) =>
                setAnswer(component.id, { ...current, [field.key]: e.target.value })
              }
              className={inputClass}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function guestInfoToValue(
  component: ServiceComponent,
  answers: Answers,
): GuestInfoValue | undefined {
  const fields = readGuestInfoFields(component.config);
  const current = readFields(answers, component.id);

  const value: GuestInfoValue = {};
  for (const field of fields) {
    const raw = (current[field.key] ?? '').trim();
    if (raw === '') continue;
    // age is the only numeric field; keep it a number so staff sorting/reads are sane
    if (field.key === 'age') {
      const n = Number(raw);
      if (Number.isFinite(n)) value.age = n;
    } else {
      value[field.key] = raw;
    }
  }
  return Object.keys(value).length > 0 ? value : undefined;
}

/** Used only if the whole component is marked required: has anything been filled? */
function guestInfoSatisfied(component: ServiceComponent, answers: Answers): boolean {
  const current = readFields(answers, component.id);
  return readGuestInfoFields(component.config).some(
    (f) => (current[f.key] ?? '').trim() !== '',
  );
}

/**
 * GUEST_INFO's requiredness is per-field, not on the component, so it lives here
 * in isValid — which runs on every input — rather than in isSatisfied, which the
 * submit gate only consults when `component.required` is set.
 */
function guestInfoValid(component: ServiceComponent, answers: Answers): boolean {
  const fields = readGuestInfoFields(component.config);
  const current = readFields(answers, component.id);

  const requiredFilled = fields
    .filter((f) => f.required)
    .every((f) => (current[f.key] ?? '').trim() !== '');
  if (!requiredFilled) return false;

  // Age must be a sane number if the guest typed one.
  if (!fields.some((f) => f.key === 'age')) return true;
  const raw = (current.age ?? '').trim();
  if (raw === '') return true;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 && n < 130;
}

// --- DATE ---

/** Read-only presentation of a value the admin fixed at config time. */
function ReadOnlyValue({ text }: { text: string }) {
  return (
    <div className="rounded-[var(--sq-radius-control,0.75rem)] bg-[var(--sq-color-surface,#FFFFFF)] border border-[var(--sq-color-border,#E5E0D5)] p-4 text-[var(--sq-color-text-primary,#1B3A4B)]">
      {text}
    </div>
  );
}

function DateRender({ component, answers, setAnswer, t }: RenderProps) {
  // Admin-set: the guest sees the date but can't change it.
  if (component.setBy === 'ADMIN') {
    const fixed = readOptionalString(component.config, 'adminDate');
    if (!fixed) return null;
    return (
      <div>
        <FieldHeading component={component} t={t} />
        <ReadOnlyValue text={fixed} />
      </div>
    );
  }

  const min = readOptionalString(component.config, 'min');
  const max = readOptionalString(component.config, 'max');
  const raw = readRaw(answers, component.id);
  const outOfRange = raw !== '' && !dateInRange(raw, min, max);

  return (
    <div>
      <FieldHeading component={component} t={t} />
      <input
        type="date"
        value={raw}
        min={min}
        max={max}
        onChange={(e) => setAnswer(component.id, e.target.value)}
        className={`${inputClass} ${outOfRange ? 'border-red-500' : ''}`}
      />
    </div>
  );
}

/** ISO "YYYY-MM-DD" compares correctly as a plain string, so no date library. */
function dateInRange(raw: string, min?: string, max?: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false;
  if (min && raw < min) return false;
  if (max && raw > max) return false;
  return true;
}

// --- TIME_RANGE ---

function TimeRangeRender({ component, answers, setAnswer, t }: RenderProps) {
  if (component.setBy === 'ADMIN') {
    const start = readOptionalString(component.config, 'adminStart');
    const end = readOptionalString(component.config, 'adminEnd');
    if (!start || !end) return null;
    return (
      <div>
        <FieldHeading component={component} t={t} />
        <ReadOnlyValue text={`${start} – ${end}`} />
      </div>
    );
  }

  const current = readFields(answers, component.id);
  const start = current.start ?? '';
  const end = current.end ?? '';
  const bothFilled = start !== '' && end !== '';
  const badOrder = bothFilled && end <= start;

  return (
    <div>
      <FieldHeading component={component} t={t} />
      <div className="flex gap-2">
        <label className="flex-1">
          <span className="block text-xs text-[var(--sq-color-text-secondary,#6B7280)] mb-1">{t.startTime}</span>
          <input
            type="time"
            value={start}
            onChange={(e) => setAnswer(component.id, { ...current, start: e.target.value })}
            className={`${inputClass} ${badOrder ? 'border-red-500' : ''}`}
          />
        </label>
        <label className="flex-1">
          <span className="block text-xs text-[var(--sq-color-text-secondary,#6B7280)] mb-1">{t.endTime}</span>
          <input
            type="time"
            value={end}
            onChange={(e) => setAnswer(component.id, { ...current, end: e.target.value })}
            className={`${inputClass} ${badOrder ? 'border-red-500' : ''}`}
          />
        </label>
      </div>
      {badOrder && <p className="text-xs text-red-600 mt-1">{t.endAfterStart}</p>}
    </div>
  );
}

/**
 * Valid when: nothing entered, or both ends entered with end after start.
 * A half-filled range is invalid — "from 14:00 until ???" is not a usable slot.
 * "HH:MM" is zero-padded, so string comparison is chronological.
 */
function timeRangeValid(component: ServiceComponent, answers: Answers): boolean {
  const { start = '', end = '' } = readFields(answers, component.id);
  if (start === '' && end === '') return true;
  if (start === '' || end === '') return false;
  return end > start;
}

// --- PRICE (admin-set, display only) ---

function PriceRender({ component, t }: RenderProps) {
  const amount = readOptionalNumber(component.config, 'amount');
  if (amount === undefined) return null;
  return (
    <div>
      <FieldHeading component={component} t={t} />
      <ReadOnlyValue text={formatMoney(amount, readCurrency(component.config))} />
    </div>
  );
}

// --- QUANTITY_PRICED ---

/** Quantities per tier, keyed by tier id. */
function readQuantities(answers: Answers, id: string): Record<string, number> {
  const v = answers[id];
  if (typeof v !== 'object' || v === null) return {};
  const out: Record<string, number> = {};
  for (const [k, raw] of Object.entries(v as Record<string, unknown>)) {
    if (typeof raw === 'number' && Number.isInteger(raw) && raw >= 0) out[k] = raw;
  }
  return out;
}

/** Sum of tier unit price × quantity — shared by the renderer and the total bar. */
function quantityPricedPreview(
  config: ComponentConfig,
  quantities: Record<string, number>,
): number {
  const sum = readTiers(config).reduce(
    (acc, tier) => acc + tier.unitPrice * (quantities[tier.id] ?? 0),
    0,
  );
  return Math.round(sum * 100) / 100;
}

function QuantityPricedRender({ component, answers, setAnswer, t }: RenderProps) {
  const tiers = readTiers(component.config);
  const currency = readCurrency(component.config);
  const quantities = readQuantities(answers, component.id);
  if (tiers.length === 0) return null;

  const preview = quantityPricedPreview(component.config, quantities);

  function setQuantity(tierId: string, next: number) {
    setAnswer(component.id, {
      ...quantities,
      [tierId]: Math.max(0, Math.min(999, Math.trunc(next))),
    });
  }

  return (
    <div>
      <FieldHeading component={component} t={t} />
      <div className="space-y-2">
        {tiers.map((tier) => {
          const qty = quantities[tier.id] ?? 0;
          return (
            <div
              key={tier.id}
              className="flex items-center justify-between rounded-[var(--sq-radius-control,0.75rem)] bg-[var(--sq-color-surface,#FFFFFF)] p-4"
            >
              <div>
                <span className="text-[var(--sq-color-text-primary,#1B3A4B)]">{tier.label}</span>
                <span className="block text-xs text-[var(--sq-color-text-secondary,#6B7280)]">
                  {formatMoney(tier.unitPrice, currency)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQuantity(tier.id, qty - 1)}
                  disabled={qty === 0}
                  className="w-9 h-9 rounded-full border border-[var(--sq-color-border,#E5E0D5)] text-[var(--sq-color-text-primary,#1B3A4B)] disabled:opacity-30"
                  aria-label={`Fewer ${tier.label}`}
                >
                  −
                </button>
                <span className="w-6 text-center tabular-nums text-[var(--sq-color-text-primary,#1B3A4B)]">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(tier.id, qty + 1)}
                  className="w-9 h-9 rounded-full border border-[var(--sq-color-border,#E5E0D5)] text-[var(--sq-color-text-primary,#1B3A4B)]"
                  aria-label={`More ${tier.label}`}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Per-component subtotal; the sticky bar carries the "estimated" caveat and grand total. */}
      {preview > 0 && (
        <p className="mt-2 px-1 text-sm text-[var(--sq-color-text-secondary,#6B7280)]">
          {t.total}: <strong className="text-[var(--sq-color-text-primary,#1B3A4B)]">{formatMoney(preview, currency)}</strong>
        </p>
      )}
    </div>
  );
}

// --- INFO_DISPLAY / LINK / WIFI_QR (setBy: NONE — presentational, never submitted) ---

function InfoDisplayRender({ component }: RenderProps) {
  const title = readOptionalString(component.config, 'title');
  const body = readOptionalString(component.config, 'body');
  if (!body && !title) return null;

  return (
    <div className="rounded-[var(--sq-radius-card,1rem)] bg-[var(--sq-color-surface,#FFFFFF)] p-4">
      {title && <h2 className="font-medium text-[var(--sq-color-text-primary,#1B3A4B)] mb-1">{title}</h2>}
      {/* Admin-authored copy; preserve their line breaks. */}
      {body && <p className="text-sm text-[var(--sq-color-text-secondary,#6B7280)] whitespace-pre-line">{body}</p>}
    </div>
  );
}

function LinkRender({ component }: RenderProps) {
  const url = readOptionalString(component.config, 'url');
  const label = readOptionalString(component.config, 'label') ?? component.label;
  // Never render a link we haven't vetted — blocks javascript:/data: URLs.
  if (!url || !isSafeUrl(url)) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between rounded-[var(--sq-radius-card,1rem)] bg-[var(--sq-color-surface,#FFFFFF)] p-4 text-[var(--sq-color-text-primary,#1B3A4B)]"
    >
      <span className="font-medium">{label}</span>
      <span aria-hidden className="text-[var(--sq-color-text-secondary,#9CA3AF)]">
        ↗
      </span>
    </a>
  );
}

function WifiQrRender({ component, t }: RenderProps) {
  const payload = wifiPayload(component.config);
  if (!payload) return null;

  const ssid = readOptionalString(component.config, 'ssid');
  const password = readOptionalString(component.config, 'password');
  const open = readEncryption(component.config) === 'nopass';

  return (
    <div>
      <FieldHeading component={component} t={t} />
      <div className="rounded-[var(--sq-radius-card,1rem)] bg-[var(--sq-color-surface,#FFFFFF)] p-4 flex flex-col items-center gap-3">
        {/* dir="ltr": the QR and the credentials are machine values, not prose,
            so they must not mirror under RTL. */}
        <div dir="ltr" className="bg-[var(--sq-color-surface,#FFFFFF)] p-2 rounded-lg">
          <QRCodeSVG value={payload} size={168} level="M" />
        </div>
        <p className="text-xs text-[var(--sq-color-text-secondary,#9CA3AF)]">{t.wifiScan}</p>
        {/* Shown as text so a guest can still connect if scanning fails. */}
        <dl className="text-sm text-[var(--sq-color-text-primary,#1B3A4B)] text-center space-y-0.5">
          <div>
            <dt className="inline text-[var(--sq-color-text-secondary,#6B7280)]">{t.wifiNetwork}: </dt>
            <dd dir="ltr" className="inline font-medium">
              {ssid}
            </dd>
          </div>
          {!open && password && (
            <div>
              <dt className="inline text-[var(--sq-color-text-secondary,#6B7280)]">{t.wifiPassword}: </dt>
              <dd dir="ltr" className="inline font-medium tracking-wide">
                {password}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}

/**
 * Guest-side type registry — mirrors ADMIN_REGISTRY. Adding one of the
 * remaining API types means adding an entry here, not editing guest-flow.
 * Partial: un-wired types simply don't render.
 */
export const GUEST_REGISTRY: Partial<Record<ServiceComponentType, GuestTypeDef>> = {
  SINGLE_SELECT: {
    isInput: true,
    Render: SelectRender,
    isSatisfied: (c, a) => readSelected(a, c.id).length > 0,
    toValue: selectToValue,
    subtotal: selectMoney,
  },
  MULTI_SELECT: {
    isInput: true,
    Render: SelectRender,
    isSatisfied: (c, a) => readSelected(a, c.id).length > 0,
    toValue: selectToValue,
    subtotal: selectMoney,
  },
  IMAGE: {
    isInput: false,
    Render: ImageRender,
  },
  TEXT_FIELD: {
    isInput: true,
    Render: TextRender,
    isSatisfied: (c, a) => readRaw(a, c.id).trim() !== '',
    toValue: (c, a) => {
      const raw = readRaw(a, c.id).trim();
      return raw === '' ? undefined : raw;
    },
  },
  NUMBER: {
    isInput: true,
    Render: NumberRender,
    isSatisfied: (c, a) => readRaw(a, c.id).trim() !== '',
    // An out-of-range number blocks submit even when the component is optional.
    isValid: (c, a) => {
      const raw = readRaw(a, c.id);
      if (raw.trim() === '') return true;
      return numberInRange(
        raw,
        readOptionalNumber(c.config, 'min'),
        readOptionalNumber(c.config, 'max'),
      );
    },
    toValue: (c, a) => {
      const raw = readRaw(a, c.id).trim();
      if (raw === '') return undefined;
      const n = Number(raw);
      return Number.isFinite(n) ? n : undefined;
    },
  },
  GUEST_INFO: {
    isInput: true,
    Render: GuestInfoRender,
    isSatisfied: guestInfoSatisfied,
    isValid: guestInfoValid,
    toValue: guestInfoToValue,
  },
  DATE: {
    isInput: true,
    Render: DateRender,
    isSatisfied: (c, a) => readRaw(a, c.id).trim() !== '',
    isValid: (c, a) => {
      const raw = readRaw(a, c.id);
      if (raw.trim() === '') return true;
      return dateInRange(
        raw,
        readOptionalString(c.config, 'min'),
        readOptionalString(c.config, 'max'),
      );
    },
    toValue: (c, a) => {
      const raw = readRaw(a, c.id).trim();
      return raw === '' ? undefined : raw;
    },
    adminValue: (c) => readOptionalString(c.config, 'adminDate'),
  },
  TIME_RANGE: {
    isInput: true,
    Render: TimeRangeRender,
    // Both ends needed to count as answered.
    isSatisfied: (c, a) => {
      const { start = '', end = '' } = readFields(a, c.id);
      return start !== '' && end !== '';
    },
    isValid: timeRangeValid,
    toValue: (c, a) => {
      const { start = '', end = '' } = readFields(a, c.id);
      return start !== '' && end !== '' ? { start, end } : undefined;
    },
    adminValue: (c) => {
      const start = readOptionalString(c.config, 'adminStart');
      const end = readOptionalString(c.config, 'adminEnd');
      return start && end ? { start, end } : undefined;
    },
  },
  PRICE: {
    isInput: false,
    Render: PriceRender,
    adminValue: (c) => {
      const amount = readOptionalNumber(c.config, 'amount');
      return amount === undefined
        ? undefined
        : { amount, currency: readCurrency(c.config) };
    },
    subtotal: (c) => {
      const amount = readOptionalNumber(c.config, 'amount');
      return amount === undefined ? null : { amount, currency: readCurrency(c.config) };
    },
  },
  QUANTITY_PRICED: {
    isInput: true,
    Render: QuantityPricedRender,
    // Required means "order at least one of something".
    isSatisfied: (c, a) =>
      Object.values(readQuantities(a, c.id)).some((q) => q > 0),
    isValid: (c, a) => {
      const v = a[c.id];
      if (v === undefined) return true;
      if (typeof v !== 'object' || v === null) return false;
      // Defence in depth — the API validates this too, and it is authoritative.
      return Object.values(v as Record<string, unknown>).every(
        (q) => typeof q === 'number' && Number.isInteger(q) && q >= 0 && q <= 999,
      );
    },
    /**
     * Submits quantities only. The total the guest saw is a preview; the API
     * recomputes the real one from its own unit prices, so sending a total here
     * would be at best redundant and at worst a tampering vector.
     */
    toValue: (c, a) => {
      const quantities = readQuantities(a, c.id);
      const ordered = Object.fromEntries(
        Object.entries(quantities).filter(([, q]) => q > 0),
      );
      if (Object.keys(ordered).length === 0) return undefined;
      return { quantities: ordered, currency: readCurrency(c.config) };
    },
    subtotal: (c, a) => {
      const amount = quantityPricedPreview(c.config, readQuantities(a, c.id));
      return amount > 0 ? { amount, currency: readCurrency(c.config) } : null;
    },
  },
  // The three below are purely presentational: no input, and no `adminValue`, so
  // buildComponentValues contributes nothing for them and they never block submit.
  INFO_DISPLAY: {
    isInput: false,
    Render: InfoDisplayRender,
  },
  LINK: {
    isInput: false,
    Render: LinkRender,
  },
  WIFI_QR: {
    isInput: false,
    Render: WifiQrRender,
  },
};

/** A component only produces a value if the guest fills it in. */
function isGuestInput(component: ServiceComponent): boolean {
  return (
    component.setBy === 'GUEST' && (GUEST_REGISTRY[component.type]?.isInput ?? false)
  );
}

/** A priced select's contribution to the order preview (NONE-mode selects add nothing). */
function selectMoney(component: ServiceComponent, answers: Answers): Money | null {
  if (readPricingMode(component.config) === 'NONE') return null;
  const amount = selectSubtotal(component.config, readSelected(answers, component.id));
  return amount > 0 ? { amount, currency: readCurrency(component.config) } : null;
}

/**
 * The guest-facing order total, aggregated across every priced component.
 *
 * Preview only — the server recomputes each figure authoritatively. Currencies
 * are kept separate: a single currency yields one total; more than one is
 * surfaced as a per-currency breakdown rather than summed blind (we don't do
 * conversion in V1).
 */
export type OrderTotal =
  | { kind: 'empty' }
  | { kind: 'single'; amount: number; currency: string }
  | { kind: 'mixed'; parts: Money[] };

export function orderTotal(
  components: ServiceComponent[],
  answers: Answers,
): OrderTotal {
  const byCurrency = new Map<string, number>();
  for (const component of components) {
    const money = GUEST_REGISTRY[component.type]?.subtotal?.(component, answers);
    if (!money || money.amount === 0) continue;
    const next = (byCurrency.get(money.currency) ?? 0) + money.amount;
    byCurrency.set(money.currency, Math.round(next * 100) / 100);
  }

  if (byCurrency.size === 0) return { kind: 'empty' };
  if (byCurrency.size === 1) {
    const [[currency, amount]] = [...byCurrency];
    return { kind: 'single', amount, currency };
  }
  return {
    kind: 'mixed',
    parts: [...byCurrency].map(([currency, amount]) => ({ currency, amount })),
  };
}

/**
 * Submit gate: every required component answered, and nothing entered is invalid.
 * Validity is checked on all inputs, not just required ones — an out-of-range
 * number in an optional field is still wrong.
 */
export function isSubmittable(
  components: ServiceComponent[],
  answers: Answers,
): boolean {
  const inputs = components.filter(isGuestInput);
  const requiredMet = inputs
    .filter((c) => c.required)
    .every((c) => GUEST_REGISTRY[c.type]?.isSatisfied?.(c, answers) ?? true);
  const allValid = inputs.every(
    (c) => GUEST_REGISTRY[c.type]?.isValid?.(c, answers) ?? true,
  );
  return requiredMet && allValid;
}

/**
 * Builds the componentValues snapshot POSTed with the request.
 *
 * Two sources: components the guest filled in, and admin-set components whose
 * value was fixed in config (an admin-set DATE still belongs on the request so
 * staff can read it). Order follows the components list either way.
 */
export function buildComponentValues(
  components: ServiceComponent[],
  answers: Answers,
): ComponentValue[] {
  return components.flatMap((component) => {
    const def = GUEST_REGISTRY[component.type];
    if (!def) return [];

    const value =
      component.setBy === 'ADMIN'
        ? def.adminValue?.(component)
        : isGuestInput(component)
          ? def.toValue?.(component, answers)
          : undefined;

    if (value === undefined) return [];
    return [
      {
        componentId: component.id,
        type: component.type,
        label: component.label,
        value,
      },
    ];
  });
}
