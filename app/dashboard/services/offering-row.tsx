'use client';

import { useTransition } from 'react';
import { toggleOffering, deleteOffering } from './actions';

type Offering = {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
};

export function OfferingRow({ offering }: { offering: Offering }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between rounded border bg-white p-4">
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400 w-16">{offering.icon}</span>
        <p className={`font-medium ${offering.enabled ? '' : 'text-gray-400 line-through'}`}>
          {offering.name}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={() =>
            startTransition(async () => {
              await toggleOffering(offering.id, !offering.enabled);
            })
          }
          disabled={isPending}
          className={`text-sm ${offering.enabled ? 'text-green-600' : 'text-gray-400'} disabled:opacity-50`}
        >
          {offering.enabled ? 'Enabled' : 'Disabled'}
        </button>
        <button
          onClick={() =>
            startTransition(async () => {
              await deleteOffering(offering.id);
            })
          }
          disabled={isPending}
          className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
