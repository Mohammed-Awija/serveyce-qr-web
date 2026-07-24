import { apiFetch } from '@/lib/api';
import { getPresets, getTemplates } from './actions';
import { AppearanceWorkspace } from './appearance-workspace';

type Me = { organization: { slug: string; name: string } | null };
type Location = { id: string; name: string };

export default async function AppearancePage() {
  const [{ templates, error }, presets] = await Promise.all([
    getTemplates(),
    getPresets(),
  ]);

  // A real guest URL so the admin can check the result on an actual room.
  let guestUrl: string | null = null;
  try {
    const [me, locations] = await Promise.all([
      apiFetch('/me') as Promise<Me>,
      apiFetch('/locations') as Promise<Location[]>,
    ]);
    const slug = me.organization?.slug;
    const location = locations[0];
    if (slug && location) guestUrl = `/o/${slug}/l/${location.id}`;
  } catch {
    // A missing guest link shouldn't block editing themes.
    guestUrl = null;
  }

  return (
    <main className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold">Appearance</h1>
      <p className="mt-1 text-sm text-gray-500">
        Themes for the page your guests see when they scan a room QR code. The one
        marked <span className="font-medium">Live</span> is what they get today.
      </p>

      {error && (
        <div className="mt-6 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Could not load your themes: {error}
        </div>
      )}

      <AppearanceWorkspace
        templates={templates}
        presets={presets}
        guestUrl={guestUrl}
      />
    </main>
  );
}
