import { publicFetch } from '@/lib/public-api';
import { GuestFlow } from './guest-flow';

type GuestContext = {
  organization: { name: string; defaultLanguage: string };
  location: { id: string; name: string };
};

export default async function GuestPage({
  params,
}: {
  params: Promise<{ slug: string; locationId: string }>;
}) {
  const { slug, locationId } = await params;

  let data: GuestContext | null = null;
  let error: string | null = null;

  try {
    data = await publicFetch(`/public/o/${slug}/l/${locationId}`);
  } catch {
    error = 'unavailable';
  }

  if (error || !data) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-[#F5F2EC]">
        <div className="text-center">
          <p className="text-[#1B3A4B] font-medium">This room page isn&apos;t available.</p>
          <p className="text-sm text-[#6B7280] mt-2">
            Please check with the front desk.
          </p>
        </div>
      </main>
    );
  }

  return (
    <GuestFlow
      slug={slug}
      locationId={locationId}
      orgName={data.organization.name}
      locationName={data.location.name}
      defaultLanguage={data.organization.defaultLanguage}
    />
  );
}
