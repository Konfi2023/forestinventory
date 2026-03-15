import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Activity } from 'lucide-react';
import { HealthDashboard } from './_components/HealthDashboard';

export default async function HealthPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return redirect('/api/auth/signin/keycloak');

  const org = await prisma.organization.findUnique({ where: { slug } });
  if (!org) return notFound();

  const member = await prisma.membership.findFirst({
    where: { userId: session.user.id, organizationId: org.id },
  });
  if (!member) return notFound();

  const history = await prisma.systemHealthCheck.findMany({
    orderBy: { runAt: 'desc' },
    take:    30,
    select: {
      id: true, runAt: true, overall: true,
      dbOk: true, openMeteoOk: true, sentinelOk: true, s3Ok: true,
      testAlertS1Id: true, testAlertWxId: true,
      report: true,
    },
  });

  // Serialisierbar machen
  const data = history.map(h => ({
    ...h,
    runAt: h.runAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="text-emerald-600" size={24} />
            System-Status & Health Monitoring
          </h2>
          <p className="text-muted-foreground mt-1">
            API-Verbindungen, Datenfreshness und tägliche Probe-Alarme
          </p>
        </div>
      </div>

      <HealthDashboard slug={slug} history={data} />
    </div>
  );
}
