'use client';

import { useState, useCallback, useEffect } from 'react';
import { ClipboardList, TreePine, PackageOpen, ChevronDown, Check } from 'lucide-react';
import { TasksTab } from './tabs/TasksTab';
import { InventoryTab } from './tabs/InventoryTab';
import { PolterTab } from './tabs/PolterTab';
import { db } from '@/lib/inventory-db';

type Tab = 'tasks' | 'inventory' | 'polter';

interface Org { id: string; name: string; slug: string; role: string; }
interface Compartment { id: string; name: string | null; color: string | null; }
interface Forest { id: string; name: string; compartments?: Compartment[]; }
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
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <svg height="26" viewBox="0 0 285 47" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ height: 26, width: 'auto' }}>
            <g>
              <mask id="mask0_app" style={{ maskType: 'alpha' }} maskUnits="userSpaceOnUse" x="0" y="0" width="47" height="47">
                <rect width="47" height="47" fill="#D9D9D9"/>
              </mask>
              <g mask="url(#mask0_app)">
                <path d="M23.5116 43.4812C20.42 43.0973 17.6472 42.3101 15.1931 41.1194C12.7386 39.9287 10.6533 38.3753 8.93716 36.4591C7.22134 34.5425 5.90322 32.3142 4.9828 29.7743C4.06271 27.2347 3.587 24.4197 3.55566 21.3295C7.20828 21.6653 10.2886 22.2987 12.7965 23.2295C15.3045 24.1604 17.3453 25.4966 18.9188 27.2382C20.4926 28.9799 21.636 31.1753 22.3488 33.8246C23.0616 36.4742 23.4492 39.6931 23.5116 43.4812ZM23.4998 25.9639C22.7256 24.7902 21.6608 23.6485 20.3053 22.5387C18.9498 21.429 17.4078 20.4523 15.6792 19.6086C15.8829 18.2691 16.221 16.8708 16.6936 15.4138C17.1662 13.9568 17.7405 12.5126 18.4165 11.081C19.0928 9.64947 19.8627 8.26134 20.7263 6.91662C21.5896 5.57222 22.5102 4.33407 23.4881 3.20215C24.4738 4.34941 25.3983 5.59344 26.2616 6.93424C27.1252 8.27505 27.8971 9.66122 28.5773 11.0928C29.2572 12.524 29.8334 13.9663 30.306 15.4197C30.7786 16.8728 31.1168 18.2691 31.3204 19.6086C29.6075 20.4197 28.0773 21.3761 26.7296 22.478C25.3816 23.5799 24.305 24.7419 23.4998 25.9639ZM27.885 42.5573C27.7962 40.0852 27.5994 37.847 27.2946 35.8427C26.9897 33.8383 26.5359 31.975 25.9331 30.2526C27.5138 27.5779 29.7012 25.4335 32.4954 23.8195C35.2896 22.2058 38.9352 21.3758 43.4322 21.3295C43.3869 26.5647 41.9883 31.049 39.2365 34.7822C36.485 38.5155 32.7012 41.1072 27.885 42.5573Z" fill="#15803d"/>
              </g>
            </g>
            <text x="58" y="33" fill="#0f172a" fontFamily="sans-serif" fontWeight="bold" fontSize="26" letterSpacing="-0.5">Forest</text>
            <text x="148" y="33" fill="#15803d" fontFamily="sans-serif" fontWeight="bold" fontSize="26" letterSpacing="-0.5">Manager</text>
          </svg>
        </div>

        {/* Org-Switcher */}
        <div className="relative">
          <button
            onClick={() => setOrgPickerOpen(v => !v)}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg text-sm transition-colors"
          >
            <span className="max-w-[160px] truncate">{currentOrg?.name}</span>
            <ChevronDown size={14} className="text-slate-500 shrink-0" />
          </button>

          {orgPickerOpen && (
            <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
              {orgs.map(org => (
                <button
                  key={org.slug}
                  onClick={() => switchOrg(org.slug)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                >
                  <div>
                    <p className="text-sm font-medium">{org.name}</p>
                    <p className="text-xs text-slate-500">{org.role}</p>
                  </div>
                  {org.slug === orgSlug && <Check size={16} className="text-emerald-500" />}
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
      <div className="shrink-0 bg-white border-t border-slate-200 flex">
        <button
          onClick={() => setTab('tasks')}
          className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
            tab === 'tasks' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <ClipboardList size={22} />
          <span className="text-xs font-medium">Aufgaben</span>
        </button>
        <button
          onClick={() => setTab('inventory')}
          className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
            tab === 'inventory' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <TreePine size={22} />
          <span className="text-xs font-medium">Inventur</span>
        </button>
        <button
          onClick={() => setTab('polter')}
          className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
            tab === 'polter' ? 'text-amber-500' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <PackageOpen size={22} />
          <span className="text-xs font-medium">Polter</span>
        </button>
      </div>
    </div>
  );
}
