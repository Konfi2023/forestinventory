import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getAccessibleForests } from '@/lib/forest-access';
import { Clock, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { ControllingFilters } from './_components/ControllingFilters';
import { ControllingExport } from './_components/ControllingExport';
import { ControllingCharts } from './_components/ControllingCharts';
import { Suspense } from 'react';

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
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ forest?: string; owner?: string; member?: string; showAll?: string; from?: string; to?: string }>;
}) {
  const { slug } = await params;
  const { forest: forestFilter, owner: ownerFilter, member: memberFilter, showAll, from: fromParam, to: toParam } = await searchParams;
  const showAllTasks = showAll === '1';
  const dateFrom = fromParam ? new Date(fromParam) : undefined;
  const dateTo   = toParam   ? new Date(toParam + 'T23:59:59') : undefined;

  const session = await getServerSession(authOptions);
  if (!session?.user) return redirect('/api/auth/signin/keycloak');

  const org = await prisma.organization.findUnique({ where: { slug } });
  if (!org) return notFound();

  const accessible    = await getAccessibleForests(org.id, session.user.id);
  const accessibleIds = accessible.map(f => f.id);

  // Teammitglieder für Filter laden
  const memberships = await prisma.membership.findMany({
    where: { organizationId: org.id },
    include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    orderBy: { user: { email: 'asc' } },
  });
  const members = memberships.map(m => ({
    id: m.user.id,
    name: m.user.firstName && m.user.lastName
      ? `${m.user.firstName} ${m.user.lastName}`
      : m.user.email,
  }));

  // Waldbesitzer für Filter laden
  const owners = await prisma.forestOwner.findMany({
    where: { organizationId: org.id },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  // Wenn nach Waldbesitzer gefiltert: nur dessen Wälder
  let filteredForestIds = accessibleIds;
  if (ownerFilter) {
    const ownerForests = await prisma.forest.findMany({
      where: { organizationId: org.id, ownerId: ownerFilter },
      select: { id: true },
    });
    const ownerForestIds = ownerForests.map(f => f.id);
    filteredForestIds = accessibleIds.filter(id => ownerForestIds.includes(id));
  } else if (forestFilter) {
    filteredForestIds = accessibleIds.filter(id => id === forestFilter);
  }

  // Date filter for timeEntries
  const dateFilter = (dateFrom || dateTo) ? {
    ...(dateFrom && { gte: dateFrom }),
    ...(dateTo   && { lte: dateTo }),
  } : undefined;

  const tasks = await prisma.task.findMany({
    where: {
      forestId: { in: filteredForestIds },
      ...(!showAllTasks && { status: 'DONE' }),
      ...(memberFilter && { assigneeId: memberFilter }),
      // If date filter: only tasks with at least one entry in range
      ...(dateFilter && { timeEntries: { some: { startTime: dateFilter } } }),
    },
    select: {
      id: true, title: true, status: true, estimatedTime: true,
      forest:    { select: { id: true, name: true } },
      operation: { select: { id: true, title: true } },
      assignee:  { select: { id: true, firstName: true, lastName: true, email: true } },
      timeEntries: {
        where: dateFilter ? { startTime: dateFilter } : undefined,
        select: {
          id: true, durationMinutes: true, category: true, startTime: true,
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const serializedTasks = tasks;

  // ── KPI-Berechnung ───────────────────────────────────────────────────────
  const totalEstimated  = serializedTasks.reduce((s, t) => s + (t.estimatedTime ?? 0), 0);
  const totalActual     = serializedTasks.reduce((s, t) => s + t.timeEntries.reduce((ss, e) => ss + (e.durationMinutes ?? 0), 0), 0);
  const tasksNoEstimate = serializedTasks.filter(t => !t.estimatedTime).length;
  const delta           = totalActual - totalEstimated;

  // ── Pro Mitglied ─────────────────────────────────────────────────────────
  const memberMap = new Map<string, { name: string; estimated: number; actual: number; taskCount: number }>();
  for (const task of serializedTasks) {
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

  // ── Chart-Daten ──────────────────────────────────────────────────────────

  // 1. Nach Kategorie
  const categoryMap = new Map<string, number>();
  for (const task of serializedTasks)
    for (const e of task.timeEntries) {
      const label = CATEGORY_LABELS[e.category] ?? e.category;
      categoryMap.set(label, (categoryMap.get(label) ?? 0) + (e.durationMinutes ?? 0));
    }
  const categoryData = [...categoryMap.entries()]
    .map(([name, minutes]) => ({ name, minutes }))
    .sort((a, b) => b.minutes - a.minutes);

  // 2. Nach Wald
  const forestMap = new Map<string, number>();
  for (const task of serializedTasks)
    for (const e of task.timeEntries)
      forestMap.set(task.forest.name, (forestMap.get(task.forest.name) ?? 0) + (e.durationMinutes ?? 0));
  const forestData = [...forestMap.entries()]
    .map(([name, minutes]) => ({ name, minutes }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 10);

  // 3. Monatlicher Verlauf (letzte 12 Monate)
  const monthlyMap = new Map<string, number>();
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthlyMap.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, 0);
  }
  for (const task of serializedTasks)
    for (const e of task.timeEntries) {
      const d = new Date(e.startTime);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyMap.has(key)) monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + (e.durationMinutes ?? 0));
    }
  const monthlyData = [...monthlyMap.entries()].map(([key, minutes]) => ({
    month: new Date(key + '-01').toLocaleDateString('de-DE', { month: 'short', year: '2-digit' }),
    stunden: Math.round(minutes / 60 * 10) / 10,
  }));

  return (
    <div className="overflow-y-auto h-full bg-slate-50">
      <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Zeitcontrolling</h2>
            <p className="text-slate-500 mt-1 text-sm">Schätzung vs. tatsächlicher Aufwand · {serializedTasks.length} Aufgaben</p>
          </div>
          <ControllingExport tasks={serializedTasks} />
        </div>

        {/* Filter-Leiste */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <Suspense>
            <ControllingFilters
              forests={accessible.map(f => ({ id: f.id, name: f.name }))}
              owners={owners}
              members={members}
              selectedForestId={forestFilter ?? ""}
              selectedOwnerId={ownerFilter ?? ""}
              selectedMemberId={memberFilter ?? ""}
              showAll={showAllTasks}
              from={fromParam ?? ""}
              to={toParam ?? ""}
            />
          </Suspense>
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

        {/* Charts */}
        <ControllingCharts
          categoryData={categoryData}
          forestData={forestData}
          monthlyData={monthlyData}
        />

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
                {serializedTasks.map(task => {
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
                        {/* Zeiteinträge */}
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
