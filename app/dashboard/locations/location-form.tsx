'use client';

import { useState, useTransition } from 'react';
import { createLocation } from './actions';

export function LocationForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createLocation(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        // reset the form
        const form = document.getElementById('location-form') as HTMLFormElement;
        form?.reset();
      }
    });
  }

  return (
    <form
      id="location-form"
      action={handleSubmit}
      className="rounded border bg-gray-50 p-4 space-y-3"
    >
      <div className="flex gap-3">
        <input
          name="name"
          placeholder="Room name (e.g. 201, Suite 3)"
          className="flex-1 rounded border px-3 py-2 text-sm"
          required
        />
        <select name="kind" className="rounded border px-3 py-2 text-sm">
          <option value="ROOM">Room</option>
          <option value="AREA">Area</option>
          <option value="OTHER">Other</option>
        </select>
      </div>
      <input
        name="notes"
        placeholder="Notes (e.g. Wifi password, floor)"
        className="w-full rounded border px-3 py-2 text-sm"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="bg-gray-900 text-white rounded px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {isPending ? 'Adding…' : 'Add Location'}
      </button>
    </form>
  );
}
