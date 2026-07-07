'use client';

import { useState, useTransition } from 'react';
import { createOffering } from './actions';

const ICONS = ['bell', 'sparkles', 'car', 'wifi', 'coffee', 'utensils', 'key', 'map-pin'];

export function OfferingForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createOffering(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        const form = document.getElementById('offering-form') as HTMLFormElement;
        form?.reset();
      }
    });
  }

  return (
    <form
      id="offering-form"
      action={handleSubmit}
      className="rounded border bg-gray-50 p-4 space-y-3"
    >
      <div className="flex gap-3">
        <input
          name="name"
          placeholder="Service name (e.g. Extra towels)"
          className="flex-1 rounded border px-3 py-2 text-sm"
          required
        />
        <select name="icon" className="rounded border px-3 py-2 text-sm">
          {ICONS.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="bg-gray-900 text-white rounded px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {isPending ? 'Adding…' : 'Add Service'}
      </button>
    </form>
  );
}
