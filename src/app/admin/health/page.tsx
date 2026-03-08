import { prisma } from '@/lib/prisma';
import { Activity } from 'lucide-react';
import { HealthDashboard } from './_components/HealthDashboard';
import { AlertAckLog } from './_components/AlertAckLog';

export default async function AdminHealthPage() {
  const ackLog = await prisma.alertAcknowledgement.findMany({
    orderBy: { dismissedAt: 'desc' },
    take:    50,
  });

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

  const data = history.map(h => ({
    ...h,
    runAt: h.runAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Activity className="text-emerald-600" size={28} />
          Health Monitor
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          API-Verbindungen · Datenfreshness pro Wald · Tägliche Probe-Alarme
        </p>
      </div>

      <HealthDashboard history={data} />

      <AlertAckLog entries={ackLog.map(a => ({ ...a, dismissedAt: a.dismissedAt.toISOString() }))} />
    </div>
  );
}
