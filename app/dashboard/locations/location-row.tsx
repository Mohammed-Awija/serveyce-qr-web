'use client';

import { useState } from 'react';
import { OfferingsPanel } from './offerings-panel';
import { DeleteButton } from './delete-button';
import { QrButton } from './qr-button';

type Location = { id: string; name: string; kind: string; notes: string | null };

export function LocationRow({ loc, orgSlug }: { loc: Location; orgSlug: string | null }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded border bg-white">
      <div className="flex items-center justify-between p-4">
        <div>
          <p className="font-medium">{loc.name}</p>
          <p className="text-xs text-gray-500">
            {loc.kind}
            {loc.notes ? ` · ${loc.notes}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setOpen((o) => !o)}
            className="text-sm text-purple-600 hover:text-purple-800"
          >
            {open ? 'Close' : 'Services'}
          </button>
          {orgSlug && (
            <QrButton orgSlug={orgSlug} locationId={loc.id} locationName={loc.name} />
          )}
          <DeleteButton id={loc.id} />
        </div>
      </div>
      {open && (
        <div className="p-4 pt-0">
          <OfferingsPanel locationId={loc.id} />
        </div>
      )}
    </div>
  );
}
