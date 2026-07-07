import { apiFetch } from '@/lib/api';
import { LocationForm } from './location-form';
import { DeleteButton } from './delete-button';

type Location = {
  id: string;
  name: string;
  kind: string;
  displayName: string | null;
  notes: string | null;
  createdAt: string;
};

export default async function LocationsPage() {
  let locations: Location[] = [];
  let error: string | null = null;

  try {
    locations = await apiFetch('/locations');
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <main className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Locations</h1>

      <LocationForm />

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700 mt-6">
          {error}
        </div>
      )}

      <div className="mt-8 space-y-2">
        {locations.length === 0 && !error && (
          <p className="text-gray-500 text-sm">
            No locations yet. Add your first room above.
          </p>
        )}
        {locations.map((loc) => (
          <div
            key={loc.id}
            className="flex items-center justify-between rounded border bg-white p-4"
          >
            <div>
              <p className="font-medium">{loc.name}</p>
              <p className="text-xs text-gray-500">
                {loc.kind}
                {loc.notes ? ` · ${loc.notes}` : ''}
              </p>
            </div>
            <DeleteButton id={loc.id} />
          </div>
        ))}
      </div>
    </main>
  );
}
