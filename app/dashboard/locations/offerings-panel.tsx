'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { assignOffering, getLocationOfferings, unassignOffering } from './offering-actions';
import type { OfferingAssignment } from './types';

export function OfferingsPanel({ locationId }: { locationId: string }) {
  const [items, setItems] = useState<OfferingAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Refetch after a toggle, so the checkboxes reflect what the server actually stored
  const load = useCallback(async () => {
    const res = await getLocationOfferings(locationId);
    setItems(res.items);
    setError(res.error ?? null);
    setLoading(false);
  }, [locationId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await getLocationOfferings(locationId);
      if (cancelled) return;
      setItems(res.items);
      setError(res.error ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [locationId]);

  function toggle(item: OfferingAssignment) {
    startTransition(async () => {
      const res = item.assigned
        ? await unassignOffering(locationId, item.id)
        : await assignOffering(locationId, item.id);

      if (!res.success) {
        setError(res.error);
        return;
      }
      setError(null);
      await load();
    });
  }

  if (loading) return <p className="text-xs text-gray-400 p-3">Loading services…</p>;

  return (
    <div className="rounded border bg-gray-50 p-3 space-y-2">
      <p className="text-xs font-semibold text-gray-500 uppercase">Services at this location</p>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {!error && items.length === 0 && (
        <p className="text-xs text-gray-400">
          No top-level services exist yet. Create them in the Menu page first.
        </p>
      )}

      {items.map((item) => (
        <label
          key={item.id}
          className="flex items-center gap-2 text-sm bg-white rounded border p-2 cursor-pointer"
        >
          <input
            type="checkbox"
            checked={item.assigned}
            disabled={isPending}
            onChange={() => toggle(item)}
          />
          <span>{item.name}</span>
          <span className="text-xs text-gray-400">
            {item.type === 'CATEGORY' ? 'category' : 'item'}
          </span>
        </label>
      ))}
    </div>
  );
}
