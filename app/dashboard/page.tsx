import { auth } from '@clerk/nextjs/server';

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
    <main className="p-8 max-w-2xl mx-auto">
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
    </main>
  );
}
