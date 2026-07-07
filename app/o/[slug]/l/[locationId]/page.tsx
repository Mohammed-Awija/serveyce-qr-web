import { publicFetch } from '@/lib/public-api';
import { GuestServices } from './guest-services';

type GuestContext = {
  organization: { name: string; defaultLanguage: string };
  location: { id: string; name: string };
  offerings: { id: string; name: string; icon: string }[];
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
    error = 'This page could not be found.';
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
    <GuestServices
      slug={slug}
      locationId={locationId}
      orgName={data.organization.name}
      locationName={data.location.name}
      offerings={data.offerings}
      defaultLanguage={data.organization.defaultLanguage}
    />
  );
}
