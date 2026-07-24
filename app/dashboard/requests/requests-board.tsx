'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useApi } from '@/lib/use-api';
import { formatMoney, type ComponentValue } from '@/lib/components';

type RequestItem = {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
  guestName: string | null;
  notes: string | null;
  createdAt: string;
  location: { name: string };
  /** Snapshot of the item name at order time. */
  itemName: string | null;
  componentValues: ComponentValue[] | null;
};

const GUEST_INFO_LABELS: Record<string, string> = {
  fullName: 'Name',
  phone: 'Phone',
  age: 'Age',
};

/** Flattens any component value to something a human can read at a glance. */
function formatValue(entry: ComponentValue): string {
  const { value } = entry;
  if (Array.isArray(value)) return value.join(', ');

  if (value !== null && typeof value === 'object') {
    // TIME_RANGE: "14:00–16:00" rather than "start: 14:00, end: 16:00"
    if ('start' in value && 'end' in value) {
      return `${String(value.start)}–${String(value.end)}`;
    }
    // PRICE: "50 USD"
    if ('amount' in value) {
      return formatMoney(Number(value.amount), String(value.currency ?? ''));
    }
    // QUANTITY_PRICED: "2 Adults, 1 Kid — total 250 USD".
    // `lines` and `computedTotal` are written by the API, not the guest.
    if ('quantities' in value) {
      const currency = String(value.currency ?? '');
      const lines = Array.isArray(value.lines) ? value.lines : [];
      const parts = lines.map((l) => `${l.quantity} × ${l.label}`).join(', ');
      const total =
        entry.computedTotal !== undefined
          ? ` — total ${formatMoney(entry.computedTotal, currency)}`
          : '';
      return `${parts}${total}`;
    }
    // Priced select: "VIP (+15 USD)" additive, "Sunset — 35 USD" absolute.
    // `selected` and `computedTotal` come from the API's config-authoritative snapshot.
    if ('selected' in value && Array.isArray(value.selected)) {
      const currency = String(value.currency ?? '');
      const additive = value.mode === 'ADDITIVE';
      const names = value.selected.map((s) => String(s.label)).join(', ');
      const total =
        entry.computedTotal !== undefined
          ? `${additive ? ' — total ' : ' — '}${formatMoney(entry.computedTotal, currency)}`
          : '';
      return `${names}${total}`;
    }
    // GUEST_INFO: "Name: John, Phone: 555…, Age: 30"
    return Object.entries(value)
      .map(([key, v]) => `${GUEST_INFO_LABELS[key] ?? key}: ${String(v)}`)
      .join(', ');
  }
  return String(value);
}

/** "Size: Large · Toppings: Extra cheese, Olives · Guest: Name: John, Age: 30" */
function summarizeValues(values: RequestItem['componentValues']): string {
  if (!Array.isArray(values) || values.length === 0) return '';
  return values.map((v) => `${v.label}: ${formatValue(v)}`).join(' · ');
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  DONE: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function RequestsBoard() {
  const api = useApi();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const updatingRef = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const data = await api('/requests');
      setRequests(data);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [api]);

  // Initial load + poll every 5s
  useEffect(() => {
    // load() sets state only after an awaited fetch, so this is not the
    // synchronous set-state-in-effect the rule guards against.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  async function setStatus(id: string, status: string) {
    updatingRef.current.add(id);
    // optimistic update
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: status as RequestItem['status'] } : r)),
    );
    try {
      await api(`/requests/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    } catch {
      load(); // revert by refetching on error
    } finally {
      updatingRef.current.delete(id);
    }
  }

  const active = requests.filter((r) => r.status !== 'DONE' && r.status !== 'CANCELLED');
  const completed = requests.filter((r) => r.status === 'DONE' || r.status === 'CANCELLED');

  if (loading) {
    return <p className="text-sm text-gray-400">Loading requests…</p>;
  }

  if (error) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Active ({active.length})
        </h2>
        {active.length === 0 ? (
          <p className="text-sm text-gray-400">No active requests. All caught up.</p>
        ) : (
          <div className="space-y-2">
            {active.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-lg border bg-white p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{r.itemName ?? 'Request'}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[r.status]}`}>
                      {r.status.replace('_', ' ').toLowerCase()}
                    </span>
                  </div>
                  {summarizeValues(r.componentValues) && (
                    <p className="text-sm text-[#1B3A4B] mt-0.5">
                      {summarizeValues(r.componentValues)}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 mt-0.5">
                    {r.location.name}
                    {r.notes ? ` · ${r.notes}` : ''}
                    {' · '}
                    {timeAgo(r.createdAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {r.status === 'PENDING' && (
                    <button
                      onClick={() => setStatus(r.id, 'IN_PROGRESS')}
                      className="text-sm bg-blue-600 text-white rounded px-3 py-1.5 font-medium"
                    >
                      Start
                    </button>
                  )}
                  {(r.status === 'PENDING' || r.status === 'IN_PROGRESS') && (
                    <button
                      onClick={() => setStatus(r.id, 'DONE')}
                      className="text-sm bg-green-600 text-white rounded px-3 py-1.5 font-medium"
                    >
                      Done
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {completed.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Completed ({completed.length})
          </h2>
          <div className="space-y-2">
            {completed.slice(0, 20).map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-lg border bg-gray-50 p-3 opacity-70"
              >
                <div>
                  <span className="font-medium text-gray-600">{r.itemName ?? 'Request'}</span>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {r.location.name} · {timeAgo(r.createdAt)}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[r.status]}`}>
                  {r.status.toLowerCase()}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
