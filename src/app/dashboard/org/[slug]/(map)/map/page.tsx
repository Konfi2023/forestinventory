import MapPageClient from "@/app/dashboard/map/MapPageClient";

export default async function OrgMapPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="w-full h-full bg-black relative">
       <MapPageClient orgSlug={slug} />
    </div>
  );
}