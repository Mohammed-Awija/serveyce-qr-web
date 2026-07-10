import { apiFetch } from '@/lib/api';
import { LocationForm } from './location-form';
import { LocationRow } from './location-row';

type Location = {
  id: string;
  name: string;
  kind: string;
  displayName: string | null;
  notes: string | null;
  createdAt: string;
};

type Me = {
  organization: { slug: string; name: string } | null;
};

export default async function LocationsPage() {
  let locations: Location[] = [];
  let orgSlug: string | null = null;
  let error: string | null = null;

  try {
    const [locs, me] = await Promise.all([
      apiFetch('/locations') as Promise<Location[]>,
      apiFetch('/me') as Promise<Me>,
    ]);
    locations = locs;
    orgSlug = me.organization?.slug ?? null;
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
          <LocationRow key={loc.id} loc={loc} orgSlug={orgSlug} />
        ))}
      </div>
    </main>
  );
}
