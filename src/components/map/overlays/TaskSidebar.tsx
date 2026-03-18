'use client';

import { useState, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  AlertCircle, Calendar, User, ClipboardList, Layers, Leaf,
} from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn, getUserColor, getInitials } from '@/lib/utils';
import { useMapStore } from '@/components/map/stores/useMapStores';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getBoundsFromGeoJson } from '@/lib/map-helpers';
import { FeatureList } from './FeatureList';

type SidebarTab = 'TASKS' | 'FEATURES' | 'BIOMASS';

const PRIORITY_COLOR: Record<string, string> = {
  URGENT: 'border-l-red-500',
  HIGH:   'border-l-orange-500',
  MEDIUM: 'border-l-blue-500',
  LOW:    'border-l-gray-600',
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  OPEN:        { label: 'Offen',       color: 'text-gray-400'   },
  IN_PROGRESS: { label: 'In Arbeit',   color: 'text-blue-400'   },
  BLOCKED:     { label: 'Blockiert',   color: 'text-red-400'    },
  REVIEW:      { label: 'Review',      color: 'text-purple-400' },
};

interface Props {
  tasks: any[];
  forests: any[];
  orgSlug?: string;
  onRefresh?: () => void;
}

export function TaskSidebar({ tasks, forests, orgSlug = '', onRefresh }: Props) {
  const isOpen          = useMapStore(s => s.taskSidebarOpen);
  const setOpen         = useMapStore(s => s.setTaskSidebarOpen);
  const setHoveredTask  = useMapStore(s => s.setHoveredTaskId);
  const setHovered      = useMapStore(s => s.setHoveredFeature);
  const selectFeature   = useMapStore(s => s.selectFeature);
  const flyTo           = useMapStore(s => s.flyTo);
  const fitBounds       = useMapStore(s => s.fitBounds);
  const invalidateSize  = useMapStore(s => s.invalidateSize);

  const [activeTab, setActiveTab] = useState<SidebarTab>('FEATURES');

  // Welche Forest-Gruppen sind aufgeklappt
  const [expandedForests, setExpandedForests] = useState<Set<string>>(new Set());

  const toggleForest = (id: string) =>
    setExpandedForests(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleToggleSidebar = () => {
    setOpen(!isOpen);
    // Karte nach CSS-Transition neu berechnen lassen
    setTimeout(() => invalidateSize(), 320);
  };

  // Tasks nach Wald gruppieren, Wälder alphabetisch sortieren
  const grouped = useMemo(() => {
    const map = new Map<string, { forest: any; tasks: any[] }>();

    tasks.forEach(task => {
      const forest = forests.find(f => f.id === task.forestId);
      if (!forest) return;
      if (!map.has(task.forestId)) {
        map.set(task.forestId, { forest, tasks: [] });
      }
      map.get(task.forestId)!.tasks.push(task);
    });

    // Innerhalb jedes Waldes: URGENT → HIGH → MEDIUM → LOW, dann nach Fälligkeitsdatum
    const PRIO_ORDER: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    map.forEach(group => {
      group.tasks.sort((a, b) => {
        const pd = (PRIO_ORDER[a.priority] ?? 4) - (PRIO_ORDER[b.priority] ?? 4);
        if (pd !== 0) return pd;
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    });

    return Array.from(map.values()).sort((a, b) =>
      a.forest.name.localeCompare(b.forest.name, 'de')
    );
  }, [tasks, forests]);

  const handleTaskMouseEnter = (task: any) => {
    setHoveredTask(task.id);
    // POI-Hover oder Wald-Hover
    setHovered(task.poiId ?? task.forestId);
  };

  const handleTaskMouseLeave = () => {
    setHoveredTask(null);
    setHovered(null);
  };

  const handleTaskClick = (task: any) => {
    // Zur Feature fliegen
    if (task.poiId) {
      const allPois = forests.flatMap((f: any) => f.pois ?? []);
      const poi = allPois.find((p: any) => p.id === task.poiId);
      if (poi) flyTo([poi.lat, poi.lng], 19);
    } else if (task.lat && task.lng) {
      flyTo([task.lat, task.lng], 19);
    } else {
      const forest = forests.find(f => f.id === task.forestId);
      if (forest?.geoJson) {
        const bounds = getBoundsFromGeoJson(forest.geoJson);
        if (bounds) fitBounds(bounds);
      }
    }
    // Task-Detail öffnen (Sidebar bleibt offen)
    selectFeature(task.id, 'TASK');
  };

  return (
    <div className="no-print relative flex h-full shrink-0 z-[450]">
      {/* ── Panel ── */}
      <div
        className={cn(
          'h-full bg-[#111111]/98 backdrop-blur-md border-r border-white/8 flex flex-col',
          'transition-[width] duration-300 ease-in-out overflow-hidden',
          isOpen ? 'w-72' : 'w-0',
        )}
      >
        {/* Tabs */}
        <div className="flex border-b border-white/8 shrink-0">
          <button
            onClick={() => setActiveTab('FEATURES')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors',
              activeTab === 'FEATURES'
                ? 'text-white border-b-2 border-emerald-500'
                : 'text-gray-500 hover:text-gray-300',
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            Objekte
          </button>
          <button
            onClick={() => setActiveTab('TASKS')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors',
              activeTab === 'TASKS'
                ? 'text-white border-b-2 border-emerald-500'
                : 'text-gray-500 hover:text-gray-300',
            )}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            Aufgaben
            <span className={cn(
              'text-[10px] px-1.5 py-0.5 rounded-full',
              activeTab === 'TASKS' ? 'bg-emerald-600/40 text-emerald-300' : 'bg-white/8 text-gray-500',
            )}>
              {tasks.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('BIOMASS')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors',
              activeTab === 'BIOMASS'
                ? 'text-white border-b-2 border-emerald-500'
                : 'text-gray-500 hover:text-gray-300',
            )}
          >
            <Leaf className="w-3.5 h-3.5" />
            Biomasse
          </button>
        </div>

        {/* Inhalt */}
        {activeTab === 'FEATURES' ? (
          <div className="flex-1 overflow-hidden min-w-[288px]">
            <FeatureList forests={forests} orgSlug={orgSlug} onRefresh={onRefresh} />
          </div>
        ) : activeTab === 'BIOMASS' ? (
          <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 min-w-[288px] space-y-4">
            {/* Info-Box */}
            <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <Leaf className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-xs font-semibold text-emerald-300">Biomasse-Monitoring</span>
              </div>
              <p className="text-[10px] text-gray-400 leading-relaxed">
                NDVI-basiertes Vegetationsmonitoring via Sentinel-2 L2A.
                Snapshots werden über die Sentinel Hub Statistical API erfasst und pro Wald gespeichert.
              </p>
            </div>

            {/* Pro Wald */}
            {forests.map((forest: any) => {
              const snapshots: any[] = forest.biomassSnapshots ?? [];
              const latest = snapshots[0] ?? null;
              const ndvi = latest?.meanNdvi;
              const ndviPct = ndvi != null ? Math.round(((ndvi + 1) / 2) * 100) : null;
              const ndviColor = ndvi == null ? '#6b7280'
                : ndvi > 0.5 ? '#22c55e'
                : ndvi > 0.2 ? '#eab308'
                : '#ef4444';

              return (
                <div key={forest.id} className="bg-white/3 border border-white/8 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: forest.color ?? '#10b981' }} />
                    <span className="text-xs font-semibold text-gray-200 truncate">{forest.name}</span>
                  </div>

                  {latest && ndvi != null ? (
                    <>
                      {/* NDVI-Balken */}
                      <div>
                        <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                          <span>Ø NDVI</span>
                          <span style={{ color: ndviColor }} className="font-semibold">
                            {ndvi!.toFixed(3)}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${ndviPct}%`, backgroundColor: ndviColor }}
                          />
                        </div>
                        <div className="flex justify-between text-[9px] text-gray-600 mt-0.5">
                          <span>−1</span><span>0</span><span>+1</span>
                        </div>
                      </div>
                      {/* Min/Max */}
                      {(latest.minNdvi != null || latest.maxNdvi != null) && (
                        <div className="flex gap-3 text-[10px] text-gray-500">
                          {latest.minNdvi != null && <span>Min: <span className="text-red-400">{latest.minNdvi.toFixed(3)}</span></span>}
                          {latest.maxNdvi != null && <span>Max: <span className="text-emerald-400">{latest.maxNdvi.toFixed(3)}</span></span>}
                          {latest.cloudPct != null && <span>Wolken: {Math.round(latest.cloudPct)}%</span>}
                        </div>
                      )}
                      <p className="text-[9px] text-gray-600">
                        {new Date(latest.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {' · '}{latest.source}
                      </p>
                    </>
                  ) : (
                    <p className="text-[10px] text-gray-600 italic">
                      {latest ? 'Keine auswertbaren Satellitendaten (Wolken).' : 'Noch keine Snapshots vorhanden.'}
                    </p>
                  )}
                </div>
              );
            })}

            {/* Hinweis auf zukünftige Funktion */}
            <div className="bg-white/3 border border-white/8 rounded-lg p-3">
              <p className="text-[10px] text-gray-500 leading-relaxed">
                Zeitreihenchart (NDVI-Verlauf, Abholzung, Aufforstung) wird in einem zukünftigen Update ergänzt.
                Daten werden via Sentinel Hub Statistical API automatisch erfasst.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 min-w-[288px]">
            {grouped.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-600 text-xs gap-2">
                <ClipboardList className="w-6 h-6 opacity-40" />
                Keine offenen Aufgaben
              </div>
            ) : (
              grouped.map(({ forest, tasks: forestTasks }) => {
                const isExpanded = expandedForests.has(forest.id);
                const urgentCount = forestTasks.filter(t => t.priority === 'URGENT').length;

                return (
                  <div key={forest.id} className="mb-1">
                    {/* Wald-Header */}
                    <button
                      onClick={() => toggleForest(forest.id)}
                      className="w-full flex items-center justify-between px-4 py-2 hover:bg-white/5 transition-colors group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: forest.color ?? '#10b981' }}
                        />
                        <span className="text-xs font-semibold text-gray-300 truncate group-hover:text-white transition-colors">
                          {forest.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {urgentCount > 0 && (
                          <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full font-bold">
                            {urgentCount} dringend
                          </span>
                        )}
                        <span className="text-[10px] text-gray-500">{forestTasks.length}</span>
                        {isExpanded
                          ? <ChevronUp className="w-3 h-3 text-gray-500" />
                          : <ChevronDown className="w-3 h-3 text-gray-500" />
                        }
                      </div>
                    </button>

                    {/* Task-Karten */}
                    {isExpanded && (
                      <div className="px-2 pb-1 space-y-1">
                        {forestTasks.map(task => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            onMouseEnter={() => handleTaskMouseEnter(task)}
                            onMouseLeave={handleTaskMouseLeave}
                            onClick={() => handleTaskClick(task)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ── Toggle-Tab ── */}
      <button
        onClick={handleToggleSidebar}
        className={cn(
          'absolute top-1/2 -translate-y-1/2 z-10',
          'flex items-center justify-center',
          'w-5 h-12 rounded-r-lg',
          'bg-[#1a1a1a] border border-l-0 border-white/10',
          'text-gray-400 hover:text-white hover:bg-[#222]',
          'transition-all duration-200 shadow-lg',
          isOpen ? 'right-0 translate-x-full' : 'right-0 translate-x-full',
        )}
        title={isOpen ? 'Aufgabenliste schließen' : 'Aufgabenliste öffnen'}
      >
        {isOpen ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Task-Karte
// ---------------------------------------------------------------------------

function TaskCard({
  task,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: {
  task: any;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
}) {
  const dueDate  = task.dueDate ? new Date(task.dueDate) : null;
  const overdue  = dueDate && isPast(dueDate) && !isToday(dueDate);
  const dueToday = dueDate && isToday(dueDate);
  const statusCfg = STATUS_LABEL[task.status] ?? { label: task.status, color: 'text-gray-400' };

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      className={cn(
        'border-l-2 bg-white/4 hover:bg-white/8 rounded-r-lg rounded-bl-lg px-3 py-2',
        'cursor-pointer transition-all duration-150 group',
        'border border-l-[3px] border-white/5',
        PRIORITY_COLOR[task.priority] ?? 'border-l-gray-600',
      )}
    >
      {/* Titel */}
      <div className="flex items-start gap-1.5 mb-1">
        {task.priority === 'URGENT' && (
          <AlertCircle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
        )}
        <span className="text-xs font-medium text-gray-200 group-hover:text-white leading-tight line-clamp-2 transition-colors">
          {task.title}
        </span>
      </div>

      {/* Meta */}
      <div className="flex items-center justify-between gap-2 mt-1.5">
        <div className="flex items-center gap-2">
          {dueDate && (
            <span className={cn(
              'text-[10px] flex items-center gap-1',
              overdue  ? 'text-red-400 font-semibold' :
              dueToday ? 'text-yellow-400 font-semibold' :
                         'text-gray-500',
            )}>
              <Calendar className="w-2.5 h-2.5" />
              {format(dueDate, 'dd. MMM', { locale: de })}
            </span>
          )}
          <span className={cn('text-[10px]', statusCfg.color)}>{statusCfg.label}</span>
        </div>

        {task.assignee ? (
          <Avatar className="h-5 w-5 border border-white/15 shrink-0">
            <AvatarFallback className={cn(
              'text-[8px] font-bold',
              getUserColor(task.assignee.firstName || task.assignee.email),
            )}>
              {getInitials(task.assignee.firstName, task.assignee.lastName)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="h-5 w-5 rounded-full bg-white/8 flex items-center justify-center border border-white/10 shrink-0">
            <User className="w-2.5 h-2.5 text-gray-600" />
          </div>
        )}
      </div>
    </div>
  );
}
