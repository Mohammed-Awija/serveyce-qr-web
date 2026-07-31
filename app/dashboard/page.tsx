import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';

/** Quick-access cards on the dashboard home — mirror the top nav sections. */
const QUICK_LINKS = [
  {
    href: '/dashboard/menu',
    icon: '🍽️',
    title: 'Menu',
    description: 'Add and edit the services guests can request',
  },
  {
    href: '/dashboard/locations',
    icon: '📍',
    title: 'Locations',
    description: 'Manage rooms and their QR codes',
  },
  {
    href: '/dashboard/requests',
    icon: '🔔',
    title: 'Requests',
    description: 'See and handle incoming guest requests',
  },
  {
    href: '/dashboard/appearance',
    icon: '🎨',
    title: 'Appearance',
    description: 'Theme your guest pages and templates',
  },
] as const;

type Me = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  organization?: {
    name: string;
    slug: string;
    kind: string;
    role: string;
  } | null;
};

async function getMe(token: string): Promise<Me> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`API responded with ${res.status}`);
  }
  return res.json();
}

export default async function DashboardPage() {
  const { getToken } = await auth();
  const token = await getToken();

  let data: Me | null = null;
  let error: string | null = null;

  try {
    if (!token) throw new Error('No session token');
    data = await getMe(token);
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">ServeyceQr Dashboard</h1>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Error loading your account: {error}
        </div>
      )}

      {data && (
        <div className="space-y-4">
          <div className="rounded border bg-white p-4">
            <p className="text-sm text-gray-500">Signed in as</p>
            <p className="font-medium">
              {data.firstName ?? ''} {data.lastName ?? ''}
            </p>
            <p className="text-sm text-gray-600">{data.email}</p>
          </div>

          {data.organization ? (
            <div className="rounded border bg-white p-4">
              <p className="text-sm text-gray-500">Your organization</p>
              <p className="font-medium">{data.organization.name}</p>
              <p className="text-sm text-gray-600">
                {data.organization.kind} · role: {data.organization.role}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                slug: {data.organization.slug}
              </p>
            </div>
          ) : (
            <p className="text-gray-500">No organization yet.</p>
          )}
        </div>
      )}

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Quick access
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group rounded-lg border bg-white p-5 transition-colors hover:border-gray-900"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl" aria-hidden>
                  {link.icon}
                </span>
                <div>
                  <p className="font-medium">{link.title}</p>
                  <p className="text-sm text-gray-500">{link.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
