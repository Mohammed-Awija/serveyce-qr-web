import { currentUser } from '@clerk/nextjs/server';

export default async function DashboardPage() {
  const user = await currentUser();

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">ServeyceQr Dashboard</h1>
      <p className="mt-4 text-gray-600">
        Welcome, {user?.firstName ?? user?.emailAddresses[0]?.emailAddress ?? 'there'}!
      </p>
      <p className="mt-2 text-sm text-gray-400">
        You are signed in. This is a protected route.
      </p>
    </main>
  );
}