import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getAccessibleForests } from '@/lib/forest-access';
import { getActiveAlerts } from '@/lib/active-alerts';
import { MapAlertOverlay } from '@/components/alerts/MapAlertOverlay';
import MapPageClient from "@/app/dashboard/map/MapPageClient";

export default async function OrgMapPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return redirect('/api/auth/signin/keycloak');

  const org = await prisma.organization.findUnique({ where: { slug } });
  const accessible = org ? await getAccessibleForests(org.id, session.user.id) : [];
  const alerts = await getActiveAlerts(accessible.map(f => f.id), session.user.id);

  return (
    <div className="w-full h-full bg-black relative">
      <MapPageClient orgSlug={slug} />
      <MapAlertOverlay alerts={alerts} orgSlug={slug} />
    </div>
  );
}