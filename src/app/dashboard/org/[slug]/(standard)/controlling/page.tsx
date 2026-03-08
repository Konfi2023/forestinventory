import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getAccessibleForests } from '@/lib/forest-access';
import { Clock, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

function fmtMins(mins: number): string {
  if (mins === 0) return '0h';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function Delta({ estimated, actual }: { estimated: number; actual: number }) {
  if (estimated === 0 && actual === 0) return <span className="text-slate-400">—</span>;
  if (estimated === 0) return <span className="text-slate-400">{fmtMins(actual)} gebucht</span>;
  const delta = actual - estimated;
  const pct   = Math.round((actual / estimated) * 100);
  if (delta === 0) return <span className="text-emerald-600 font-medium">genau</span>;
  return (
    <span className={`font-medium flex items-center gap-1 ${delta > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
      {delta > 0
        ? <TrendingUp size={13} />
        : <TrendingDown size={13} />}
      {delta > 0 ? '+' : ''}{fmtMins(Math.abs(delta))} ({pct}%)
    </span>
  );
}

export default async function ControllingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return redirect('/api/auth/signin');

  const org = await prisma.organization.findUnique({ where: { slug } });
  if (!org) return notFound();

  const accessible    = await getAccessibleForests(org.id, session.user.id);
  const accessibleIds = accessible.map(f => f.id);

  const tasks = await prisma.task.findMany({
    where: { forestId: { in: accessibleIds } },
    select: {
      id: true, title: true, status: true, estimatedTime: true,
      forest:    { select: { name: true } },
      operation: { select: { id: true, title: true } },
      assignee:  { select: { id: true, firstName: true, lastName: true, email: true } },
      timeEntries: {
        select: {
          id: true, durationMinutes: true, category: true, startTime: true,
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // ── KPI-Berechnung ───────────────────────────────────────────────────────
  const totalEstimated  = tasks.reduce((s, t) => s + (t.estimatedTime ?? 0), 0);
  const totalActual     = tasks.reduce((s, t) => s + t.timeEntries.reduce((ss, e) => ss + (e.durationMinutes ?? 0), 0), 0);
  const tasksNoEstimate = tasks.filter(t => !t.estimatedTime).length;
  const delta           = totalActual - totalEstimated;

  // ── Pro Mitglied ─────────────────────────────────────────────────────────
  const memberMap = new Map<string, { name: string; estimated: number; actual: number; taskCount: number }>();
  for (const task of tasks) {
    const key  = task.assignee?.id ?? '__unassigned__';
    const name = task.assignee
      ? (task.assignee.firstName && task.assignee.lastName
          ? `${task.assignee.firstName} ${task.assignee.lastName}`
          : task.assignee.email)
      : 'Nicht zugewiesen';
    if (!memberMap.has(key)) memberMap.set(key, { name, estimated: 0, actual: 0, taskCount: 0 });
    const row = memberMap.get(key)!;
    row.estimated  += task.estimatedTime ?? 0;
    row.actual     += task.timeEntries.reduce((s, e) => s + (e.durationMinutes ?? 0), 0);
    row.taskCount  += 1;
  }
  const memberRows = [...memberMap.values()].sort((a, b) => b.actual - a.actual);

  const CATEGORY_LABELS: Record<string, string> = {
    MANUAL_WORK:  'Handarbeit',
    MACHINE_WORK: 'Maschine',
    PLANNING:     'Planung',
    TRAVEL:       'Anfahrt',
    INSPECTION:   'Begehung',
  };

  return (
    <div className="overflow-y-auto h-full bg-slate-50">
      <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-6">

        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Zeitcontrolling</h2>
          <p className="text-slate-500 mt-1">Schätzung vs. tatsächlicher Aufwand</p>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Gesamtschätzung</p>
            <p className="text-2xl font-bold text-slate-900">{fmtMins(totalEstimated)}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Gebucht</p>
            <p className="text-2xl font-bold text-slate-900">{fmtMins(totalActual)}</p>
          </div>
          <div className={`border rounded-xl p-5 ${delta > 0 ? 'bg-red-50 border-red-200' : delta < 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Abweichung</p>
            <p className={`text-2xl font-bold ${delta > 0 ? 'text-red-700' : delta < 0 ? 'text-emerald-700' : 'text-slate-900'}`}>
              {delta === 0 ? '0h' : (delta > 0 ? '+' : '') + fmtMins(Math.abs(delta))}
            </p>
          </div>
          <div className={`border rounded-xl p-5 ${tasksNoEstimate > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center gap-2 mb-3">
              {tasksNoEstimate > 0 && <AlertCircle size={14} className="text-amber-500" />}
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Ohne Schätzung</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">{tasksNoEstimate}</p>
          </div>
        </div>

        {/* Nach Mitglied */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100">
            <Clock size={16} className="text-slate-400" />
            <h3 className="font-semibold text-slate-800 text-sm">Nach Teammitglied</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {memberRows.map((row, i) => {
              const pct = row.estimated > 0 ? Math.min((row.actual / row.estimated) * 100, 100) : 0;
              const over = row.actual > row.estimated && row.estimated > 0;
              return (
                <div key={i} className="px-5 py-3 flex items-center gap-4">
                  <div className="w-40 shrink-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{row.name}</p>
                    <p className="text-xs text-slate-400">{row.taskCount} Aufgaben</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${over ? 'bg-red-400' : 'bg-emerald-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0 space-y-0.5">
                    <p className="text-xs text-slate-500">Geschätzt: <span className="font-mono">{row.estimated > 0 ? fmtMins(row.estimated) : '—'}</span></p>
                    <p className="text-xs text-slate-700 font-medium">Gebucht: <span className="font-mono">{fmtMins(row.actual)}</span></p>
                  </div>
                  <div className="w-28 text-right shrink-0">
                    <Delta estimated={row.estimated} actual={row.actual} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Aufgabentabelle */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100">
            <Clock size={16} className="text-slate-400" />
            <h3 className="font-semibold text-slate-800 text-sm">Alle Aufgaben</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                  <th className="text-left px-5 py-2.5 font-medium">Aufgabe</th>
                  <th className="text-left px-3 py-2.5 font-medium">Wald</th>
                  <th className="text-left px-3 py-2.5 font-medium">Zugewiesen</th>
                  <th className="text-right px-3 py-2.5 font-medium">Geschätzt</th>
                  <th className="text-right px-3 py-2.5 font-medium">Gebucht</th>
                  <th className="text-right px-3 py-2.5 font-medium">Abweichung</th>
                  <th className="text-left px-5 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {tasks.map(task => {
                  const actual = task.timeEntries.reduce((s, e) => s + (e.durationMinutes ?? 0), 0);
                  const assigneeName = task.assignee
                    ? (task.assignee.firstName ?? task.assignee.email.split('@')[0])
                    : '—';
                  const STATUS_LABEL: Record<string, string> = {
                    OPEN: 'Offen', IN_PROGRESS: 'In Arbeit', REVIEW: 'Prüfung',
                    BLOCKED: 'Blockiert', DONE: 'Erledigt',
                  };
                  const STATUS_COLOR: Record<string, string> = {
                    OPEN: 'bg-slate-100 text-slate-600',
                    IN_PROGRESS: 'bg-blue-100 text-blue-700',
                    REVIEW: 'bg-amber-100 text-amber-700',
                    BLOCKED: 'bg-red-100 text-red-700',
                    DONE: 'bg-emerald-100 text-emerald-700',
                  };
                  return (
                    <tr key={task.id} className="hover:bg-slate-50 transition">
                      <td className="px-5 py-2.5">
                        <p className="font-medium text-slate-800 truncate max-w-[200px]">{task.title}</p>
                        {task.operation && (
                          <p className="text-xs text-slate-400 truncate">{task.operation.title}</p>
                        )}
                        {/* Zeiteinträge aufklappbar */}
                        {task.timeEntries.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {task.timeEntries.map(e => (
                              <p key={e.id} className="text-[11px] text-slate-400">
                                {new Date(e.startTime).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
                                {' · '}{fmtMins(e.durationMinutes ?? 0)}
                                {' · '}{CATEGORY_LABELS[e.category] ?? e.category}
                                {' · '}{e.user?.firstName ?? e.user?.email?.split('@')[0] ?? '?'}
                              </p>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{task.forest.name}</td>
                      <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{assigneeName}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-700 whitespace-nowrap">
                        {task.estimatedTime ? fmtMins(task.estimatedTime) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-medium whitespace-nowrap">
                        {actual > 0 ? fmtMins(actual) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <Delta estimated={task.estimatedTime ?? 0} actual={actual} />
                      </td>
                      <td className="px-5 py-2.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[task.status] ?? STATUS_COLOR.OPEN}`}>
                          {STATUS_LABEL[task.status] ?? task.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
