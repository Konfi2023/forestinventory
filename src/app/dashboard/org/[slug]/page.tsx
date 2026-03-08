import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getAccessibleForests } from '@/lib/forest-access';
import { getActiveAlerts } from '@/lib/active-alerts';
import { AlertBanner } from '@/components/alerts/AlertBanner';
import {
  Trees, Users, ClipboardList, History, AlertTriangle, Wind,
  FlaskConical, CalendarClock, ChevronRight, CircleDot,
  Map, PackageOpen, CalendarDays, Leaf, ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

const STATUS_LABEL: Record<string, string> = {
  OPEN:        'Offen',
  IN_PROGRESS: 'In Bearbeitung',
  REVIEW:      'Zur Prüfung',
  BLOCKED:     'Blockiert',
};

const PRIORITY_COLOR: Record<string, string> = {
  URGENT: 'text-red-600 bg-red-50 border-red-200',
  HIGH:   'text-orange-600 bg-orange-50 border-orange-200',
  MEDIUM: 'text-slate-600 bg-slate-50 border-slate-200',
  LOW:    'text-slate-400 bg-slate-50 border-slate-100',
};

export default async function OrgDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return redirect('/api/auth/signin');

  const org = await prisma.organization.findUnique({ where: { slug } });
  if (!org) return redirect('/dashboard');

  const accessible    = await getAccessibleForests(org.id, session.user.id);
  const accessibleIds = accessible.map(f => f.id);
  const userId        = session.user.id;

  const [memberCount, openTaskCount, alerts, ackHistory, myTasks] = await Promise.all([
    prisma.membership.count({ where: { organizationId: org.id } }),
    prisma.task.count({
      where: { forestId: { in: accessibleIds }, status: { in: ['OPEN', 'IN_PROGRESS'] } },
    }),
    getActiveAlerts(accessibleIds, userId),
    prisma.alertAcknowledgement.findMany({
      where:   { forestId: { in: accessibleIds } },
      orderBy: { dismissedAt: 'desc' },
      take:    20,
    }),
    prisma.task.findMany({
      where: {
        assigneeId: userId,
        forestId:   { in: accessibleIds },
        status:     { in: ['OPEN', 'IN_PROGRESS', 'REVIEW', 'BLOCKED'] },
      },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
      take: 10,
      select: {
        id: true, title: true, status: true, priority: true,
        dueDate: true, scheduledDate: true,
        forest: { select: { name: true } },
      },
    }),
  ]);

  const totalHa = accessible.reduce((s, f) => s + (f.areaHa ?? 0), 0);

  return (
    <div className="overflow-y-auto h-full bg-slate-50">
      <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6">

        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Willkommen zurück</h2>
          <p className="text-slate-500 mt-1">{org.name}</p>
        </div>

        {/* Aktive Alarme */}
        {alerts.length > 0 && (
          <AlertBanner alerts={alerts} orgSlug={slug} />
        )}

        {/* KPI-Karten */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Gesamtfläche</p>
              <Trees size={16} className="text-green-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{totalHa > 0 ? `${totalHa.toFixed(0)} ha` : '—'}</p>
            <p className="text-xs text-slate-400 mt-1">{accessible.length} Waldflächen</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Team</p>
              <Users size={16} className="text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{memberCount}</p>
            <p className="text-xs text-slate-400 mt-1">Aktive Mitglieder</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Offene Aufgaben</p>
              <ClipboardList size={16} className="text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{openTaskCount}</p>
            <Link href={`/dashboard/org/${slug}/tasks`} className="text-xs text-emerald-600 hover:underline mt-1 inline-block">
              Zur Aufgabenliste →
            </Link>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Meine Aufgaben</p>
              <CalendarClock size={16} className="text-violet-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{myTasks.length}</p>
            <p className="text-xs text-slate-400 mt-1">mir zugewiesen</p>
          </div>
        </div>

        {/* Hauptbereich: 2 Spalten */}
        <div className="grid gap-6 lg:grid-cols-3">

          {/* Meine Aufgaben – nimmt 2/3 der Breite */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CalendarClock size={16} className="text-emerald-600" />
                <h3 className="font-semibold text-slate-800 text-sm">Meine Aufgaben</h3>
                {myTasks.length > 0 && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                    {myTasks.length}
                  </span>
                )}
              </div>
              <Link href={`/dashboard/org/${slug}/tasks`}
                className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1 transition">
                Alle anzeigen <ChevronRight size={13} />
              </Link>
            </div>

            {myTasks.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-400">
                Keine offenen Aufgaben — alles erledigt.
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {myTasks.map(task => {
                  const overdue = task.dueDate && new Date(task.dueDate) < new Date();
                  return (
                    <Link key={task.id}
                      href={`/dashboard/org/${slug}/tasks?task=${task.id}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition group">
                      <CircleDot size={14} className={
                        task.status === 'IN_PROGRESS' ? 'text-blue-500 shrink-0' :
                        task.status === 'BLOCKED'     ? 'text-red-500 shrink-0' :
                        task.status === 'REVIEW'      ? 'text-amber-500 shrink-0' :
                        'text-slate-300 shrink-0'
                      } />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate group-hover:text-emerald-700 transition">
                          {task.title}
                        </p>
                        <p className="text-xs text-slate-400">
                          {task.forest.name}
                          {' · '}
                          {STATUS_LABEL[task.status] ?? task.status}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${PRIORITY_COLOR[task.priority] ?? PRIORITY_COLOR.MEDIUM}`}>
                          {task.priority === 'URGENT' ? 'Dringend' :
                           task.priority === 'HIGH'   ? 'Hoch' :
                           task.priority === 'LOW'    ? 'Niedrig' : 'Normal'}
                        </span>
                        {task.dueDate && (
                          <span className={`text-xs ${overdue ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>
                            {overdue ? 'Überfällig · ' : ''}
                            {new Date(task.dueDate).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Schnellzugriff – 1/3 der Breite */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800 text-sm">Schnellzugriff</h3>
            </div>
            <div className="p-3 space-y-1">
              {[
                { href: `/dashboard/org/${slug}/map`,        icon: Map,          label: 'Karte öffnen',            color: 'text-blue-600 bg-blue-50' },
                { href: `/dashboard/org/${slug}/tasks`,      icon: ClipboardList, label: 'Aufgaben & Planung',      color: 'text-amber-600 bg-amber-50' },
                { href: `/dashboard/org/${slug}/operations`, icon: PackageOpen,   label: 'Maßnahmen & Holzverkauf', color: 'text-orange-600 bg-orange-50' },
                { href: `/dashboard/org/${slug}/calendar`,   icon: CalendarDays,  label: 'Kalender',                color: 'text-violet-600 bg-violet-50' },
                { href: `/dashboard/org/${slug}/biomass`,    icon: Leaf,          label: 'Waldüberwachung',         color: 'text-green-600 bg-green-50' },
                { href: `/dashboard/org/${slug}/forest`,     icon: Trees,         label: 'Waldbestände',            color: 'text-emerald-600 bg-emerald-50' },
              ].map(item => (
                <Link key={item.href} href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition group">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.color}`}>
                    <item.icon size={16} />
                  </div>
                  <span className="text-sm text-slate-700 group-hover:text-slate-900 flex-1">{item.label}</span>
                  <ArrowRight size={14} className="text-slate-300 group-hover:text-slate-500 transition" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Warnungshistorie */}
        {ackHistory.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100">
              <History size={16} className="text-slate-400" />
              <h3 className="font-semibold text-slate-800 text-sm">Warnungshistorie</h3>
              <span className="text-xs text-slate-400 ml-1">(quittierte Alarme)</span>
            </div>
            <div className="divide-y divide-slate-50">
              {ackHistory.map(ack => (
                <div key={ack.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50">
                  {ack.alertType === 'STORM'
                    ? <Wind size={14} className="text-amber-500 shrink-0" />
                    : <AlertTriangle size={14} className="text-red-500 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-slate-700">
                      {ack.alertType === 'STORM' ? 'Sturmwarnung' : 'Waldschaden-Warnung'}
                    </span>
                    <span className="text-slate-400 mx-1.5">·</span>
                    <span className="text-sm text-slate-600">{ack.forestName}</span>
                    {ack.isTest && (
                      <span className="ml-2 inline-flex items-center gap-0.5 text-xs text-violet-600">
                        <FlaskConical size={10} /> Probe
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-400">
                      {ack.dismissedAt.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                    <p className="text-xs text-slate-300">{ack.userEmail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
