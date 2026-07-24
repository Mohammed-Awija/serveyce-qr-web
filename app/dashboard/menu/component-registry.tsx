'use client';

import { useState } from 'react';
import { UploadDropzone } from '@/lib/uploadthing';
import {
  GUEST_INFO_KEYS,
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
  type ComponentConfig,
  type ComponentSetBy,
  type GuestInfoKey,
  type ServiceComponent,
  type ServiceComponentType,
} from '@/lib/components';

/**
 * Admin-side type registry. To wire up one of the remaining API types, add an
 * entry here — the editor UI reads everything it needs off this map.
 */
export type AdminTypeDef = {
  /** Shown in the type picker. */
  name: string;
  /** Default for who fills this in. IMAGE is admin-set; selects are answered by the guest. */
  setBy: ComponentSetBy;
  /** Config a freshly created component starts with. */
  defaultConfig: ComponentConfig;
  /** Whether a "required" toggle makes sense (display-only types can't be required). */
  supportsRequired: boolean;
  /**
   * Whether the admin can flip this component between guest-set and admin-set.
   * Temporal types support both: a guest picks their checkout date, but the hotel
   * fixes breakfast hours. Types without it stay on their default `setBy`.
   */
  supportsSetBy?: boolean;
  ConfigEditor: (props: ConfigEditorProps) => React.ReactNode;
};

export type ConfigEditorProps = {
  component: ServiceComponent;
  /** Persists a new config for this component (PATCH). */
  onChange: (config: ComponentConfig) => void;
  busy: boolean;
};

function SelectConfigEditor({ component, onChange, busy }: ConfigEditorProps) {
  const [label, setLabel] = useState('');
  const [price, setPrice] = useState('');
  const options = readOptions(component.config);
  const mode = readPricingMode(component.config);
  const priced = mode !== 'NONE';

  function addOption() {
    const trimmed = label.trim();
    if (!trimmed) return;
    const parsed = Number(price.trim());
    const hasPrice = priced && price.trim() !== '' && Number.isFinite(parsed) && parsed >= 0;
    onChange({
      ...component.config,
      options: [
        ...options,
        {
          id: crypto.randomUUID(),
          label: trimmed,
          ...(hasPrice ? { price: parsed } : {}),
        },
      ],
    });
    setLabel('');
    setPrice('');
  }

  function setOptionPrice(id: string, raw: string) {
    const parsed = Number(raw.trim());
    const hasPrice = raw.trim() !== '' && Number.isFinite(parsed) && parsed >= 0;
    onChange({
      ...component.config,
      options: options.map((o) =>
        o.id === id
          ? { id: o.id, label: o.label, ...(hasPrice ? { price: parsed } : {}) }
          : o,
      ),
    });
  }

  return (
    <div className="space-y-2">
      {/* Pricing mode — None keeps this a plain select, unchanged from before. */}
      <div className="flex items-center gap-2 text-xs text-gray-600">
        Pricing
        <select
          value={mode}
          disabled={busy}
          onChange={(e) => onChange({ ...component.config, pricingMode: e.target.value })}
          className="rounded border px-2 py-1 text-xs"
        >
          <option value="NONE">None</option>
          <option value="ABSOLUTE">Absolute (option = price)</option>
          <option value="ADDITIVE">Additive (base + surcharge)</option>
        </select>
      </div>

      {mode === 'ADDITIVE' && (
        <label className="flex items-center gap-2 text-xs text-gray-600">
          Base price
          <CommitInput
            busy={busy}
            type="number"
            value={readOptionalNumber(component.config, 'basePrice')?.toString() ?? ''}
            onCommit={(raw) => {
              const parsed = Number(raw.trim());
              onChange({
                ...component.config,
                basePrice:
                  raw.trim() !== '' && Number.isFinite(parsed) && parsed >= 0
                    ? parsed
                    : undefined,
              });
            }}
            placeholder="0"
            className="w-20"
          />
        </label>
      )}

      <div className="space-y-1">
        {options.length === 0 && (
          <span className="text-xs text-gray-400">No options yet.</span>
        )}
        {options.map((o) => (
          <div key={o.id} className="flex items-center gap-2 text-xs">
            <span className="flex-1">{o.label}</span>
            {priced && (
              <CommitInput
                busy={busy}
                type="number"
                value={o.price?.toString() ?? ''}
                onCommit={(raw) => setOptionPrice(o.id, raw)}
                placeholder={mode === 'ADDITIVE' ? '+0' : '0'}
                className="w-20"
              />
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                onChange({
                  ...component.config,
                  options: options.filter((x) => x.id !== o.id),
                })
              }
              className="text-gray-400 hover:text-red-600 disabled:opacity-50"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addOption();
            }
          }}
          placeholder="Add option (e.g. Large)"
          className="flex-1 rounded border px-2 py-1 text-xs"
        />
        {priced && (
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder={mode === 'ADDITIVE' ? '+price' : 'price'}
            className="w-20 rounded border px-2 py-1 text-xs"
          />
        )}
        <button
          type="button"
          onClick={addOption}
          disabled={busy || !label.trim()}
          className="bg-gray-700 text-white rounded px-2 py-1 text-xs disabled:opacity-50"
        >
          Add
        </button>
      </div>

      {priced && <CurrencyInput component={component} onChange={onChange} busy={busy} />}
    </div>
  );
}

function ImageConfigEditor({ component, onChange, busy }: ConfigEditorProps) {
  const [error, setError] = useState<string | null>(null);
  const urls = readUrls(component.config);

  return (
    <div className="space-y-2">
      {urls.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {urls.map((url) => (
            <li key={url} className="relative">
              {/* Remote UploadThing URLs; next/image would need host config. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                className="h-16 w-16 rounded object-cover border"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  onChange({
                    ...component.config,
                    urls: urls.filter((u) => u !== url),
                  })
                }
                className="absolute -top-1 -right-1 bg-white border rounded-full w-5 h-5 text-xs leading-none text-gray-500 hover:text-red-600 disabled:opacity-50"
                aria-label="Remove image"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <UploadDropzone
        endpoint="serviceImage"
        onClientUploadComplete={(files) => {
          setError(null);
          onChange({
            ...component.config,
            urls: [...urls, ...files.map((f) => f.serverData.url)],
          });
        }}
        onUploadError={(e: Error) => setError(e.message)}
        className="ut-label:text-xs ut-allowed-content:text-[10px] ut-button:text-xs ut-button:h-8 border-gray-300 bg-white py-3"
      />

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

/**
 * Text-ish config input that commits on blur (or Enter) rather than on every
 * keystroke — each commit is a PATCH.
 */
function CommitInput({
  value,
  onCommit,
  placeholder,
  type = 'text',
  busy,
  className = '',
}: {
  value: string;
  onCommit: (value: string) => void;
  placeholder: string;
  type?: 'text' | 'number' | 'date' | 'time';
  busy: boolean;
  className?: string;
}) {
  const [draft, setDraft] = useState(value);

  // Re-sync when the persisted value changes underneath us (e.g. after a reload).
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setDraft(value);
  }

  function commit() {
    if (draft !== value) onCommit(draft);
  }

  return (
    <input
      type={type}
      value={draft}
      disabled={busy}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      placeholder={placeholder}
      className={`rounded border px-2 py-1 text-xs disabled:opacity-50 ${className}`}
    />
  );
}

function TextFieldConfigEditor({ component, onChange, busy }: ConfigEditorProps) {
  return (
    <CommitInput
      busy={busy}
      value={readOptionalString(component.config, 'placeholder') ?? ''}
      onCommit={(placeholder) =>
        onChange({ ...component.config, placeholder: placeholder.trim() })
      }
      placeholder="Placeholder (optional)"
      className="w-full"
    />
  );
}

function NumberConfigEditor({ component, onChange, busy }: ConfigEditorProps) {
  const min = readOptionalNumber(component.config, 'min');
  const max = readOptionalNumber(component.config, 'max');

  // A blank bound means "no bound" — store undefined rather than NaN.
  function commitBound(key: 'min' | 'max', raw: string) {
    const trimmed = raw.trim();
    const parsed = trimmed === '' ? undefined : Number(trimmed);
    onChange({
      ...component.config,
      [key]: parsed !== undefined && Number.isFinite(parsed) ? parsed : undefined,
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <CommitInput
          busy={busy}
          type="number"
          value={min?.toString() ?? ''}
          onCommit={(v) => commitBound('min', v)}
          placeholder="Min"
          className="w-20"
        />
        <CommitInput
          busy={busy}
          type="number"
          value={max?.toString() ?? ''}
          onCommit={(v) => commitBound('max', v)}
          placeholder="Max"
          className="w-20"
        />
      </div>
      <CommitInput
        busy={busy}
        value={readOptionalString(component.config, 'placeholder') ?? ''}
        onCommit={(placeholder) =>
          onChange({ ...component.config, placeholder: placeholder.trim() })
        }
        placeholder="Placeholder (optional)"
        className="w-full"
      />
      {min !== undefined && max !== undefined && min > max && (
        <p className="text-xs text-red-600">Min is greater than max.</p>
      )}
    </div>
  );
}

const GUEST_INFO_LABELS: Record<GuestInfoKey, string> = {
  fullName: 'Full name',
  phone: 'Phone',
  age: 'Age',
};

function GuestInfoConfigEditor({ component, onChange, busy }: ConfigEditorProps) {
  const fields = readGuestInfoFields(component.config);

  function toggleField(key: GuestInfoKey, include: boolean) {
    const next = include
      ? [...fields, { key, required: false }]
      : fields.filter((f) => f.key !== key);
    // Keep a stable order regardless of the click order.
    next.sort((a, b) => GUEST_INFO_KEYS.indexOf(a.key) - GUEST_INFO_KEYS.indexOf(b.key));
    onChange({ ...component.config, fields: next });
  }

  function setFieldRequired(key: GuestInfoKey, required: boolean) {
    onChange({
      ...component.config,
      fields: fields.map((f) => (f.key === key ? { ...f, required } : f)),
    });
  }

  return (
    <div className="space-y-1">
      {GUEST_INFO_KEYS.map((key) => {
        const field = fields.find((f) => f.key === key);
        const included = field !== undefined;
        return (
          <div key={key} className="flex items-center gap-3 text-xs">
            <label className="flex items-center gap-1.5 text-gray-700 w-28">
              <input
                type="checkbox"
                checked={included}
                disabled={busy}
                onChange={(e) => toggleField(key, e.target.checked)}
              />
              {GUEST_INFO_LABELS[key]}
            </label>
            {included && (
              <label className="flex items-center gap-1.5 text-gray-500">
                <input
                  type="checkbox"
                  checked={field.required}
                  disabled={busy}
                  onChange={(e) => setFieldRequired(key, e.target.checked)}
                />
                required
              </label>
            )}
          </div>
        );
      })}
      {fields.length === 0 && (
        <p className="text-xs text-gray-400">Pick at least one field to collect.</p>
      )}
    </div>
  );
}

function DateConfigEditor({ component, onChange, busy }: ConfigEditorProps) {
  // Admin-set: capture the one date the guest will see.
  if (component.setBy === 'ADMIN') {
    return (
      <label className="block text-xs text-gray-600">
        <span className="block mb-1">Date shown to guests</span>
        <CommitInput
          busy={busy}
          type="date"
          value={readOptionalString(component.config, 'adminDate') ?? ''}
          onCommit={(adminDate) => onChange({ ...component.config, adminDate })}
          placeholder=""
        />
      </label>
    );
  }

  // Guest-set: bound the range the guest may pick from.
  const min = readOptionalString(component.config, 'min');
  const max = readOptionalString(component.config, 'max');

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <label className="text-xs text-gray-600">
          <span className="block mb-1">Earliest</span>
          <CommitInput
            busy={busy}
            type="date"
            value={min ?? ''}
            onCommit={(v) => onChange({ ...component.config, min: v || undefined })}
            placeholder=""
          />
        </label>
        <label className="text-xs text-gray-600">
          <span className="block mb-1">Latest</span>
          <CommitInput
            busy={busy}
            type="date"
            value={max ?? ''}
            onCommit={(v) => onChange({ ...component.config, max: v || undefined })}
            placeholder=""
          />
        </label>
      </div>
      {min && max && min > max && (
        <p className="text-xs text-red-600">Earliest date is after the latest date.</p>
      )}
    </div>
  );
}

function TimeRangeConfigEditor({ component, onChange, busy }: ConfigEditorProps) {
  const start = readOptionalString(component.config, 'adminStart');
  const end = readOptionalString(component.config, 'adminEnd');

  // Guest-set: the guest picks both ends, so there is nothing to configure.
  if (component.setBy !== 'ADMIN') {
    return (
      <p className="text-xs text-gray-400">
        The guest picks a start and end time. End must be after start.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <label className="text-xs text-gray-600">
          <span className="block mb-1">From</span>
          <CommitInput
            busy={busy}
            type="time"
            value={start ?? ''}
            onCommit={(v) => onChange({ ...component.config, adminStart: v })}
            placeholder=""
          />
        </label>
        <label className="text-xs text-gray-600">
          <span className="block mb-1">Until</span>
          <CommitInput
            busy={busy}
            type="time"
            value={end ?? ''}
            onCommit={(v) => onChange({ ...component.config, adminEnd: v })}
            placeholder=""
          />
        </label>
      </div>
      {start && end && end <= start && (
        <p className="text-xs text-red-600">End time must be after the start time.</p>
      )}
    </div>
  );
}

function CurrencyInput({ component, onChange, busy }: ConfigEditorProps) {
  return (
    <label className="text-xs text-gray-600">
      <span className="block mb-1">Currency</span>
      <CommitInput
        busy={busy}
        value={readCurrency(component.config)}
        onCommit={(currency) =>
          onChange({ ...component.config, currency: currency.trim().toUpperCase() })
        }
        placeholder="USD"
        className="w-24"
      />
    </label>
  );
}

function PriceConfigEditor(props: ConfigEditorProps) {
  const { component, onChange, busy } = props;
  const amount = readOptionalNumber(component.config, 'amount');

  return (
    <div className="flex gap-2 items-end">
      <label className="text-xs text-gray-600">
        <span className="block mb-1">Amount</span>
        <CommitInput
          busy={busy}
          type="number"
          value={amount?.toString() ?? ''}
          onCommit={(raw) => {
            const parsed = Number(raw.trim());
            onChange({
              ...component.config,
              amount:
                raw.trim() !== '' && Number.isFinite(parsed) && parsed >= 0
                  ? parsed
                  : undefined,
            });
          }}
          placeholder="0"
          className="w-24"
        />
      </label>
      <CurrencyInput {...props} />
    </div>
  );
}

function QuantityPricedConfigEditor(props: ConfigEditorProps) {
  const { component, onChange, busy } = props;
  const tiers = readTiers(component.config);
  const [label, setLabel] = useState('');
  const [price, setPrice] = useState('');

  function addTier() {
    const name = label.trim();
    const unitPrice = Number(price.trim());
    if (!name || !Number.isFinite(unitPrice) || unitPrice < 0) return;
    onChange({
      ...component.config,
      tiers: [...tiers, { id: crypto.randomUUID(), label: name, unitPrice }],
    });
    setLabel('');
    setPrice('');
  }

  return (
    <div className="space-y-2">
      {tiers.length === 0 && (
        <p className="text-xs text-gray-400">No tiers yet (e.g. Adults, Kids).</p>
      )}
      {tiers.map((tier) => (
        <div key={tier.id} className="flex items-center justify-between text-xs">
          <span>
            {tier.label}
            <span className="text-gray-400 ml-2">
              {formatMoney(tier.unitPrice, readCurrency(component.config))}
            </span>
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              onChange({
                ...component.config,
                tiers: tiers.filter((x) => x.id !== tier.id),
              })
            }
            className="text-gray-400 hover:text-red-600 disabled:opacity-50"
          >
            ×
          </button>
        </div>
      ))}

      <div className="flex gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Tier (e.g. Adults)"
          className="flex-1 rounded border px-2 py-1 text-xs"
        />
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Price"
          className="w-20 rounded border px-2 py-1 text-xs"
        />
        <button
          type="button"
          onClick={addTier}
          disabled={busy || !label.trim() || price.trim() === ''}
          className="bg-gray-700 text-white rounded px-2 py-1 text-xs disabled:opacity-50"
        >
          Add
        </button>
      </div>

      <CurrencyInput {...props} />
    </div>
  );
}

/** Multi-line sibling of CommitInput — commits on blur, not per keystroke. */
function CommitTextarea({
  value,
  onCommit,
  placeholder,
  busy,
}: {
  value: string;
  onCommit: (value: string) => void;
  placeholder: string;
  busy: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setDraft(value);
  }

  return (
    <textarea
      value={draft}
      disabled={busy}
      rows={3}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== value) onCommit(draft);
      }}
      placeholder={placeholder}
      className="w-full rounded border px-2 py-1 text-xs disabled:opacity-50"
    />
  );
}

function InfoDisplayConfigEditor({ component, onChange, busy }: ConfigEditorProps) {
  return (
    <div className="space-y-2">
      <CommitInput
        busy={busy}
        value={readOptionalString(component.config, 'title') ?? ''}
        onCommit={(title) => onChange({ ...component.config, title: title.trim() })}
        placeholder="Title (optional)"
        className="w-full"
      />
      <CommitTextarea
        busy={busy}
        value={readOptionalString(component.config, 'body') ?? ''}
        onCommit={(body) => onChange({ ...component.config, body })}
        placeholder="Text shown to guests"
      />
    </div>
  );
}

function LinkConfigEditor({ component, onChange, busy }: ConfigEditorProps) {
  const url = readOptionalString(component.config, 'url');
  const badUrl = url !== undefined && !isSafeUrl(url);

  return (
    <div className="space-y-2">
      <CommitInput
        busy={busy}
        value={readOptionalString(component.config, 'label') ?? ''}
        onCommit={(label) => onChange({ ...component.config, label: label.trim() })}
        placeholder="Link text (e.g. Hotel website)"
        className="w-full"
      />
      <CommitInput
        busy={busy}
        value={url ?? ''}
        onCommit={(next) => onChange({ ...component.config, url: next.trim() })}
        placeholder="https://example.com"
        className="w-full"
      />
      {badUrl && (
        <p className="text-xs text-red-600">
          Must be a full http:// or https:// URL — guests won&apos;t see it otherwise.
        </p>
      )}
    </div>
  );
}

function WifiQrConfigEditor({ component, onChange, busy }: ConfigEditorProps) {
  const encryption = readEncryption(component.config);

  return (
    <div className="space-y-2">
      <CommitInput
        busy={busy}
        value={readOptionalString(component.config, 'ssid') ?? ''}
        onCommit={(ssid) => onChange({ ...component.config, ssid: ssid.trim() })}
        placeholder="Network name (SSID)"
        className="w-full"
      />
      <div className="flex gap-2">
        <select
          value={encryption}
          disabled={busy}
          onChange={(e) => onChange({ ...component.config, encryption: e.target.value })}
          className="rounded border px-2 py-1 text-xs"
        >
          <option value="WPA">WPA/WPA2</option>
          <option value="WEP">WEP</option>
          <option value="nopass">Open (no password)</option>
        </select>
        {encryption !== 'nopass' && (
          <CommitInput
            busy={busy}
            value={readOptionalString(component.config, 'password') ?? ''}
            onCommit={(password) => onChange({ ...component.config, password })}
            placeholder="Password"
            className="flex-1"
          />
        )}
      </div>
      <p className="text-xs text-gray-400">
        Guests scan this to join. The network name and password are also shown as text.
      </p>
    </div>
  );
}

// Partial: the API enum has 13 types, only these are wired. Lookups return
// undefined for the rest, so callers must handle un-wired types explicitly.
export const ADMIN_REGISTRY: Partial<Record<ServiceComponentType, AdminTypeDef>> = {
  SINGLE_SELECT: {
    name: 'Pick one',
    setBy: 'GUEST',
    defaultConfig: { options: [] },
    supportsRequired: true,
    ConfigEditor: SelectConfigEditor,
  },
  MULTI_SELECT: {
    name: 'Pick many',
    setBy: 'GUEST',
    defaultConfig: { options: [] },
    supportsRequired: true,
    ConfigEditor: SelectConfigEditor,
  },
  IMAGE: {
    name: 'Photos',
    setBy: 'ADMIN',
    defaultConfig: { urls: [] },
    supportsRequired: false,
    ConfigEditor: ImageConfigEditor,
  },
  TEXT_FIELD: {
    name: 'Text',
    setBy: 'GUEST',
    defaultConfig: {},
    supportsRequired: true,
    ConfigEditor: TextFieldConfigEditor,
  },
  NUMBER: {
    name: 'Number',
    setBy: 'GUEST',
    defaultConfig: {},
    supportsRequired: true,
    ConfigEditor: NumberConfigEditor,
  },
  GUEST_INFO: {
    name: 'Guest info',
    setBy: 'GUEST',
    defaultConfig: { fields: [] },
    // Required is per-field here, set inside the config editor.
    supportsRequired: false,
    ConfigEditor: GuestInfoConfigEditor,
  },
  DATE: {
    name: 'Date',
    setBy: 'GUEST',
    defaultConfig: {},
    supportsRequired: true,
    supportsSetBy: true,
    ConfigEditor: DateConfigEditor,
  },
  TIME_RANGE: {
    name: 'Time range',
    setBy: 'GUEST',
    defaultConfig: {},
    supportsRequired: true,
    supportsSetBy: true,
    ConfigEditor: TimeRangeConfigEditor,
  },
  PRICE: {
    name: 'Price',
    // A fixed price the property sets; the guest only sees it.
    setBy: 'ADMIN',
    defaultConfig: { currency: 'USD' },
    supportsRequired: false,
    ConfigEditor: PriceConfigEditor,
  },
  QUANTITY_PRICED: {
    name: 'Priced quantities',
    setBy: 'GUEST',
    defaultConfig: { tiers: [], currency: 'USD' },
    supportsRequired: true,
    ConfigEditor: QuantityPricedConfigEditor,
  },
  // Presentational: NONE means the guest neither fills these in nor submits them.
  INFO_DISPLAY: {
    name: 'Info text',
    setBy: 'NONE',
    defaultConfig: { body: '' },
    supportsRequired: false,
    ConfigEditor: InfoDisplayConfigEditor,
  },
  LINK: {
    name: 'Link',
    setBy: 'NONE',
    defaultConfig: {},
    supportsRequired: false,
    ConfigEditor: LinkConfigEditor,
  },
  WIFI_QR: {
    name: 'WiFi QR',
    setBy: 'NONE',
    defaultConfig: { encryption: 'WPA' },
    supportsRequired: false,
    ConfigEditor: WifiQrConfigEditor,
  },
};
