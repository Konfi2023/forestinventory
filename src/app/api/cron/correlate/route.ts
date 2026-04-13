import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { evaluateAllRules, expiresAt } from '@/lib/correlation-engine';

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const forests = await prisma.forest.findMany({
    select: { id: true, name: true, organizationId: true, geoJson: true },
  });

  // Org-Admin-Map für Task-Erstellung bei HIGH-Alerts
  const orgIds = [...new Set(forests.map(f => f.organizationId))];
  const orgMembers = await prisma.membership.findMany({
    where: { organizationId: { in: orgIds } },
    select: { organizationId: true, userId: true },
    distinct: ['organizationId'],
  });
  const orgAdminMap = new Map(orgMembers.map(m => [m.organizationId, m.userId]));

  // Abgelaufene Alerts aufräumen
  await prisma.forestCorrelationAlert.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });

  const today = new Date();
  const todayStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

  const results: { forest: string; alerts: string[]; tasks: number; error?: string }[] = [];

  for (const forest of forests) {
    if (!forest.geoJson) continue;

    try {
      const pendingAlerts = await evaluateAllRules(forest.id, forest.name);

      const savedAlerts: string[] = [];
      let tasksCreated = 0;

      for (const alert of pendingAlerts) {
        // Duplikat-Check: Gleiche Regel am gleichen Tag?
        const existing = await prisma.forestCorrelationAlert.findFirst({
          where: {
            forestId: forest.id,
            ruleId: alert.ruleId,
            triggeredAt: { gte: todayStart },
          },
        });
        if (existing) continue;

        // Alert speichern
        await prisma.forestCorrelationAlert.create({
          data: {
            forestId: forest.id,
            ruleId: alert.ruleId,
            severity: alert.severity,
            title: alert.title,
            description: alert.description,
            suggestion: alert.suggestion,
            sources: alert.sources,
            expiresAt: expiresAt(),
          },
        });
        savedAlerts.push(`${alert.ruleId} (${alert.severity})`);

        // Task bei HIGH-Alerts
        if (alert.severity === 'HIGH') {
          const creatorId = orgAdminMap.get(forest.organizationId);
          if (creatorId) {
            await prisma.task.create({
              data: {
                title: alert.title,
                description: `${alert.description}\n\n**Empfehlung:** ${alert.suggestion}`,
                status: 'OPEN',
                priority: 'HIGH',
                forestId: forest.id,
                creatorId,
              },
            });
            tasksCreated++;
          }
        }
      }

      if (savedAlerts.length > 0 || pendingAlerts.length > 0) {
        results.push({ forest: forest.name, alerts: savedAlerts, tasks: tasksCreated });
      }
    } catch (err: any) {
      results.push({ forest: forest.name, alerts: [], tasks: 0, error: err.message });
    }
  }

  const totalAlerts = results.reduce((s, r) => s + r.alerts.length, 0);
  const totalTasks = results.reduce((s, r) => s + r.tasks, 0);
  const errors = results.filter(r => r.error).length;

  return NextResponse.json({
    success: true,
    message: `${totalAlerts} Korrelations-Alerts, ${totalTasks} Aufgaben, ${errors} Fehler`,
    details: results,
  });
}
