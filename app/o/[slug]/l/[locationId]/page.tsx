export default async function GuestPage({
  params,
}: {
  params: Promise<{ slug: string; locationId: string }>;
}) {
  const { slug, locationId } = await params;

  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-8 text-center space-y-3">
        <h1 className="text-xl font-bold">Guest Services</h1>
        <p className="text-gray-600 text-sm">
          Coming soon — this is where guests will request services.
        </p>
        <div className="text-xs text-gray-400 pt-4 border-t">
          <p>Organization: {slug}</p>
          <p>Location: {locationId}</p>
        </div>
      </div>
    </main>
  );
}
