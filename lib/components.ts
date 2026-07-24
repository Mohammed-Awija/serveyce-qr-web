/**
 * Shared vocabulary for the ServiceComponent system.
 *
 * The API enum has 13 types; only the three in BUILT_TYPES are wired into the
 * admin editor and guest renderer so far. Later slices add types by extending
 * the registries (app/dashboard/menu/component-registry.tsx for admin,
 * app/o/[slug]/l/[locationId]/component-registry.tsx for guests) — the shapes
 * here shouldn't need to change.
 */

export type ServiceComponentType =
  | 'SINGLE_SELECT'
  | 'MULTI_SELECT'
  | 'IMAGE'
  | 'INFO_DISPLAY'
  | 'TIME_RANGE'
  | 'DATE'
  | 'TEXT_FIELD'
  | 'NUMBER'
  | 'GUEST_INFO'
  | 'QUANTITY_PRICED'
  | 'PRICE'
  | 'LINK'
  | 'WIFI_QR';

export type ComponentSetBy = 'GUEST' | 'ADMIN' | 'NONE';

/** Free-form per-type settings. Read it through the helpers below, never raw. */
export type ComponentConfig = Record<string, unknown>;

export type ServiceComponent = {
  id: string;
  type: ServiceComponentType;
  label: string;
  config: ComponentConfig;
  setBy: ComponentSetBy;
  required: boolean;
  /** Admin reads include this; the guest projection omits it. */
  displayOrder?: number;
};

/** SINGLE_SELECT / MULTI_SELECT: config.options. `price` is optional (free by default). */
export type SelectOption = { id: string; label: string; price?: number };

/** How a select contributes to the total. NONE = a plain, unpriced select. */
export type PricingMode = 'NONE' | 'ABSOLUTE' | 'ADDITIVE';

/** GUEST_INFO: the identity fields an admin can ask for. */
export const GUEST_INFO_KEYS = ['fullName', 'phone', 'age'] as const;
export type GuestInfoKey = (typeof GUEST_INFO_KEYS)[number];
export type GuestInfoField = { key: GuestInfoKey; required: boolean };

/** GUEST_INFO submits an object; age is numeric, the rest are strings. */
export type GuestInfoValue = Partial<Record<GuestInfoKey, string | number>>;

/** TIME_RANGE submits a start/end pair, each "HH:MM". */
export type TimeRangeValue = { start: string; end: string };

/** PRICE: a fixed amount the admin set. */
export type PriceValue = { amount: number; currency: string };

/** QUANTITY_PRICED: one priced tier, e.g. "Adults" at 100. */
export type PricedTier = { id: string; label: string; unitPrice: number };

/**
 * QUANTITY_PRICED submits only quantities — never a total. The server recomputes
 * the total from its own unit prices and adds `lines` + `computedTotal`, so those
 * are optional here: present on values read back from a request, absent on submit.
 */
export type QuantityPricedValue = {
  quantities: Record<string, number>;
  currency: string;
  lines?: {
    tierId: string;
    label: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
};

/**
 * A priced select's stored value (ABSOLUTE/ADDITIVE). Written by the server from
 * config; the client never produces this shape (it submits option ids).
 */
export type PricedSelectValue = {
  mode: 'ABSOLUTE' | 'ADDITIVE';
  currency: string;
  basePrice?: number;
  selected: { optionId: string; label: string; price: number }[];
};

/**
 * Everything a component can submit. SINGLE_SELECT is a string, MULTI_SELECT a
 * string[], NUMBER a number, DATE an ISO "YYYY-MM-DD" string, GUEST_INFO and
 * TIME_RANGE objects.
 */
export type ComponentValueData =
  | string
  | string[]
  | number
  | GuestInfoValue
  | TimeRangeValue
  | PriceValue
  | QuantityPricedValue
  | PricedSelectValue;

/** One guest-filled answer, snapshotted onto the request so staff can read it without joins. */
export type ComponentValue = {
  componentId: string;
  type: ServiceComponentType;
  label: string;
  value: ComponentValueData;
  /**
   * Authoritative total for QUANTITY_PRICED, computed by the API from its own
   * unit prices. The client never sends this — it only ever reads it back.
   */
  computedTotal?: number;
};

/** Types the admin type-picker offers today. */
export const BUILT_TYPES = [
  'SINGLE_SELECT',
  'MULTI_SELECT',
  'IMAGE',
  'TEXT_FIELD',
  'NUMBER',
  'GUEST_INFO',
  'DATE',
  'TIME_RANGE',
  'PRICE',
  'QUANTITY_PRICED',
  'INFO_DISPLAY',
  'LINK',
  'WIFI_QR',
] as const;

// config arrives as untrusted JSON, so both readers tolerate junk rather than throw.

export function readOptions(config: ComponentConfig): SelectOption[] {
  const raw = config?.options;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((o) => {
    if (typeof o !== 'object' || o === null) return [];
    const { id, label, price } = o as Record<string, unknown>;
    if (typeof id !== 'string' || typeof label !== 'string') return [];
    // Negative prices are treated as free — mirrors the server, which never lets
    // a stored price pull a total below the honest sum.
    const hasPrice = typeof price === 'number' && Number.isFinite(price) && price >= 0;
    return [{ id, label, ...(hasPrice ? { price } : {}) }];
  });
}

/** A select's pricing mode; anything unrecognised is a plain, unpriced select. */
export function readPricingMode(config: ComponentConfig): PricingMode {
  const raw = readOptionalString(config, 'pricingMode');
  return raw === 'ABSOLUTE' || raw === 'ADDITIVE' ? raw : 'NONE';
}

/**
 * The subtotal a select contributes, for the guest's *preview* only — the server
 * recomputes the authoritative figure from its own config.
 */
export function selectSubtotal(
  config: ComponentConfig,
  selectedIds: string[],
): number {
  const mode = readPricingMode(config);
  if (mode === 'NONE' || selectedIds.length === 0) return 0;
  const options = readOptions(config);
  const base = mode === 'ADDITIVE' ? (readOptionalNumber(config, 'basePrice') ?? 0) : 0;
  const sum = selectedIds.reduce((acc, id) => {
    return acc + (options.find((o) => o.id === id)?.price ?? 0);
  }, 0);
  return Math.round((base + sum) * 100) / 100;
}

export function readUrls(config: ComponentConfig): string[] {
  const raw = config?.urls;
  if (!Array.isArray(raw)) return [];
  return raw.filter((u): u is string => typeof u === 'string');
}

/** TEXT_FIELD / NUMBER: config.placeholder, and NUMBER's config.min / config.max. */
export function readOptionalString(
  config: ComponentConfig,
  key: string,
): string | undefined {
  const raw = config?.[key];
  return typeof raw === 'string' && raw !== '' ? raw : undefined;
}

export function readOptionalNumber(
  config: ComponentConfig,
  key: string,
): number | undefined {
  const raw = config?.[key];
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined;
}

/** QUANTITY_PRICED: config.tiers */
export function readTiers(config: ComponentConfig): PricedTier[] {
  const raw = config?.tiers;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((t) => {
    if (typeof t !== 'object' || t === null) return [];
    const { id, label, unitPrice } = t as Record<string, unknown>;
    if (typeof id !== 'string' || typeof label !== 'string') return [];
    if (typeof unitPrice !== 'number' || !Number.isFinite(unitPrice)) return [];
    return [{ id, label, unitPrice }];
  });
}

/** Currency is a plain config string (e.g. "USD", "TRY") — never translated. */
export function readCurrency(config: ComponentConfig): string {
  return readOptionalString(config, 'currency') ?? '';
}

/** "250 USD" — deliberately naive; V1 has no money-formatting library. */
export function formatMoney(amount: number, currency: string): string {
  const rounded = Math.round(amount * 100) / 100;
  return currency ? `${rounded} ${currency}` : String(rounded);
}

/** LINK: only http(s) — a `javascript:` or `data:` URL must never be rendered. */
export function isSafeUrl(raw: string): boolean {
  try {
    const { protocol } = new URL(raw);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

/** WIFI_QR: config.encryption */
export type WifiEncryption = 'WPA' | 'WEP' | 'nopass';

export function readEncryption(config: ComponentConfig): WifiEncryption {
  const raw = readOptionalString(config, 'encryption');
  return raw === 'WEP' || raw === 'nopass' ? raw : 'WPA';
}

/** In a WIFI: payload these are separators, so they must be backslash-escaped. */
function escapeWifi(value: string): string {
  return value.replace(/([\\;,:"])/g, '\\$1');
}

/**
 * Standard WiFi QR payload: `WIFI:T:WPA;S:ssid;P:password;;`
 * An open network carries no password field.
 */
export function wifiPayload(config: ComponentConfig): string | null {
  const ssid = readOptionalString(config, 'ssid');
  if (!ssid) return null;

  const encryption = readEncryption(config);
  const password = readOptionalString(config, 'password');

  const parts = [`T:${encryption}`, `S:${escapeWifi(ssid)}`];
  if (encryption !== 'nopass' && password) {
    parts.push(`P:${escapeWifi(password)}`);
  }
  return `WIFI:${parts.join(';')};;`;
}

/** GUEST_INFO: config.fields */
export function readGuestInfoFields(config: ComponentConfig): GuestInfoField[] {
  const raw = config?.fields;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((f) => {
    if (typeof f !== 'object' || f === null) return [];
    const { key, required } = f as Record<string, unknown>;
    if (!GUEST_INFO_KEYS.includes(key as GuestInfoKey)) return [];
    return [{ key: key as GuestInfoKey, required: required === true }];
  });
}
