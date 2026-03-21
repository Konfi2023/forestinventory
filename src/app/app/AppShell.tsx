'use client';

import { useState, useCallback, useEffect } from 'react';
import { ClipboardList, TreePine, PackageOpen, ChevronDown, Check } from 'lucide-react';
import { TasksTab } from './tabs/TasksTab';
import { InventoryTab } from './tabs/InventoryTab';
import { PolterTab } from './tabs/PolterTab';
import { db } from '@/lib/inventory-db';

type Tab = 'tasks' | 'inventory' | 'polter';

interface Org { id: string; name: string; slug: string; role: string; }
interface Forest { id: string; name: string; }
interface Member { id: string; firstName: string | null; lastName: string | null; email: string; }
interface Task {
  id: string; title: string; status: string; priority: string;
  dueDate: string | null; assignee: Member | null; forest: { id: string; name: string };
}

interface AppShellProps {
  orgs: Org[];
  currentUserId: string;
  initialOrgSlug: string;
  initialTasks: Task[];
  initialForests: Forest[];
  initialMembers: Member[];
}

export function AppShell({
  orgs, currentUserId, initialOrgSlug, initialTasks, initialForests, initialMembers,
}: AppShellProps) {
  const [tab, setTab] = useState<Tab>('tasks');
  const [orgSlug, setOrgSlug] = useState(initialOrgSlug);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [forests, setForests] = useState<Forest[]>(initialForests);
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [loading, setLoading] = useState(false);
  const [orgPickerOpen, setOrgPickerOpen] = useState(false);

  const currentOrg = orgs.find(o => o.slug === orgSlug) ?? orgs[0];

  const switchOrg = useCallback(async (slug: string) => {
    setOrgPickerOpen(false);
    if (slug === orgSlug) return;
    setLoading(true);
    setOrgSlug(slug);
    try {
      const res = await fetch(`/api/app/data?orgSlug=${slug}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks);
        setForests(data.forests);
        setMembers(data.members);
      }
    } catch { /* Offline – alte Daten behalten */ }
    setLoading(false);
  }, [orgSlug]);

  const refreshTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/app/data?orgSlug=${orgSlug}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks);
      }
    } catch { /* Offline */ }
  }, [orgSlug]);

  // Hintergrund-Sync: offline erfasste Polter hochladen wenn Netz wiederkommt
  const syncPending = useCallback(async () => {
    try {
      const pendingPiles = await db.pendingLogPiles
        .filter(p => !p.synced)
        .toArray();

      for (const pile of pendingPiles) {
        const slug = pile.orgSlug ?? orgSlug;
        try {
          const res = await fetch('/api/app/inventory/logpiles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orgSlug: slug,
              forestId: pile.forestId,
              lat: pile.lat,
              lng: pile.lng,
              treeSpecies: pile.treeSpecies,
              woodType: pile.woodType,
              volumeFm: pile.volumeFm,
              logLength: pile.logLength,
              layerCount: pile.layerCount,
              qualityClass: pile.qualityClass,
              notes: pile.notes,
            }),
          });
          if (res.ok && pile.id != null) {
            await db.pendingLogPiles.delete(pile.id);
          }
        } catch { /* immer noch offline – beim nächsten Mal */ }
      }
    } catch { /* DB-Fehler ignorieren */ }
  }, [orgSlug]);

  useEffect(() => {
    const handleOnline = () => syncPending();
    window.addEventListener('online', handleOnline);
    // Beim Start prüfen falls direkt online
    if (typeof navigator !== 'undefined' && navigator.onLine) syncPending();
    return () => window.removeEventListener('online', handleOnline);
  }, [syncPending]);

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-white overflow-hidden">
      {/* Header */}
      <div className="shrink-0 bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TreePine size={18} className="text-emerald-400" />
          <span className="font-semibold text-sm">Forstapp</span>
        </div>

        {/* Org-Switcher */}
        <div className="relative">
          <button
            onClick={() => setOrgPickerOpen(v => !v)}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-sm transition-colors"
          >
            <span className="max-w-[160px] truncate">{currentOrg?.name}</span>
            <ChevronDown size={14} className="text-slate-400 shrink-0" />
          </button>

          {orgPickerOpen && (
            <div className="absolute right-0 top-full mt-1 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
              {orgs.map(org => (
                <button
                  key={org.slug}
                  onClick={() => switchOrg(org.slug)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700 transition-colors text-left"
                >
                  <div>
                    <p className="text-sm font-medium">{org.name}</p>
                    <p className="text-xs text-slate-400">{org.role}</p>
                  </div>
                  {org.slug === orgSlug && <Check size={16} className="text-emerald-400" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Loading bar */}
      {loading && (
        <div className="h-0.5 bg-emerald-500 animate-pulse shrink-0" />
      )}

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {tab === 'tasks' && (
          <TasksTab
            tasks={tasks}
            forests={forests}
            members={members}
            orgSlug={orgSlug}
            currentUserId={currentUserId}
            onTasksChange={refreshTasks}
          />
        )}
        {tab === 'inventory' && (
          <InventoryTab forests={forests} orgSlug={orgSlug} members={members} />
        )}
        {tab === 'polter' && (
          <PolterTab forests={forests} orgSlug={orgSlug} />
        )}
      </div>

      {/* Bottom Tab Bar */}
      <div className="shrink-0 bg-slate-900 border-t border-slate-800 flex">
        <button
          onClick={() => setTab('tasks')}
          className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
            tab === 'tasks' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <ClipboardList size={22} />
          <span className="text-xs font-medium">Aufgaben</span>
        </button>
        <button
          onClick={() => setTab('inventory')}
          className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
            tab === 'inventory' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <TreePine size={22} />
          <span className="text-xs font-medium">Inventur</span>
        </button>
        <button
          onClick={() => setTab('polter')}
          className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
            tab === 'polter' ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <PackageOpen size={22} />
          <span className="text-xs font-medium">Polter</span>
        </button>
      </div>
    </div>
  );
}
