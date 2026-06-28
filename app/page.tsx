async function getHealth() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/health`, {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`API responded with ${res.status}`);
    return await res.json();
  } catch (error) {
    return { status: 'error', message: (error as Error).message };
  }
}

export default async function Home() {
  const health = await getHealth();

  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-8 space-y-4">
        <h1 className="text-2xl font-bold">ServeyceQr</h1>
        <p className="text-gray-600 text-sm">Frontend ↔ Backend health check</p>
        <div className="rounded border bg-gray-50 p-4">
          <pre className="text-xs overflow-auto">
            {JSON.stringify(health, null, 2)}
          </pre>
        </div>
        <p className="text-xs text-gray-400">
          Status:{' '}
          <span className={health.status === 'ok' ? 'text-green-600' : 'text-red-600'}>
            {health.status}
          </span>
        </p>
      </div>
    </main>
  );
}