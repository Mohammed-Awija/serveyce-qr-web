import { apiFetch } from '@/lib/api';
import { OfferingForm } from './offering-form';
import { OfferingRow } from './offering-row';

type Offering = {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
  displayOrder: number;
};

export default async function ServicesPage() {
  let offerings: Offering[] = [];
  let error: string | null = null;

  try {
    offerings = await apiFetch('/offering-types');
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <main className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Services</h1>
      <p className="text-sm text-gray-500 mb-6">
        These are the services guests can request. Toggle to enable or disable.
      </p>

      <OfferingForm />

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700 mt-6">
          {error}
        </div>
      )}

      <div className="mt-8 space-y-2">
        {offerings.length === 0 && !error && (
          <p className="text-gray-500 text-sm">No services yet. Add one above.</p>
        )}
        {offerings.map((o) => (
          <OfferingRow key={o.id} offering={o} />
        ))}
      </div>
    </main>
  );
}
