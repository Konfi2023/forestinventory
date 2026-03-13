'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, TreePine, ChevronDown, Pencil, Trash2, X, Check, ClipboardList, User } from 'lucide-react';
import { DatePickerSheet, DateTrigger } from '../DatePickerSheet';
import { db, type PendingTree } from '@/lib/inventory-db';
import { TREE_SPECIES } from '@/lib/tree-species';

interface Forest { id: string; name: string; }
interface Member { id: string; firstName: string | null; lastName: string | null; email: string; }

interface TreeRow {
  id: string;
  lat: number;
  lng: number;
  forestId: string;
  forestName: string;
  createdAt: string;
  species:        string | null;
  diameter:       number | null;
  height:         number | null;
  soilCondition:  string | null;
  soilMoisture:   string | null;
  exposition:     string | null;
  slopeClass:     string | null;
  slopePosition:  string | null;
  standType:      string | null;
  stockingDegree: string | null;
  damageType:     string | null;
  damageSeverity: number | null;
  crownCondition: number | null;
  notes: string | null;
  synced: boolean;
}

const SOIL_LABELS: Record<string, string> = {
  SANDY: 'Sandig', LOAMY: 'Lehmig', CLAY: 'Tonig',
  HUMUS: 'Humos', ROCKY: 'Steinig', MIXED: 'Gemischt',
};
const MOISTURE_LABELS: Record<string, string> = {
  DRY: 'Trocken', FRESH: 'Frisch', MOIST: 'Feucht',
  WET: 'Nass', WATERLOGGED: 'Staunass',
};
const EXPOSITION_LABELS: Record<string, string> = {
  N: 'N', NE: 'NO', E: 'O', SE: 'SO', S: 'S', SW: 'SW', W: 'W', NW: 'NW', FLAT: 'Eben',
};
const SLOPE_LABELS: Record<string, string> = {
  FLAT: 'Flach', MODERATE: 'Mäßig', STEEP: 'Steil', VERY_STEEP: 'Sehr steil',
};
const SLOPE_POS_LABELS: Record<string, string> = {
  SUMMIT: 'Kuppe', UPPER_SLOPE: 'Oberhang', MID_SLOPE: 'Mittelhang',
  LOWER_SLOPE: 'Unterhang', VALLEY: 'Talboden',
};
const STAND_TYPE_LABELS: Record<string, string> = {
  PURE_CONIFER: 'Rein Nadel', PURE_DECIDUOUS: 'Rein Laub', MIXED: 'Mischbestand',
  EDGE: 'Waldrand', CLEARCUT: 'Freifläche', YOUNG_GROWTH: 'Jungwuchs',
};
const STOCKING_LABELS: Record<string, string> = {
  OPEN: 'Locker', SPARSE: 'Licht', MEDIUM: 'Mittel', DENSE: 'Dicht', VERY_DENSE: 'Sehr dicht',
};

const SOIL_CONDITIONS    = Object.entries(SOIL_LABELS).map(([id, label]) => ({ id, label }));
const SOIL_MOISTURE_LIST = Object.entries(MOISTURE_LABELS).map(([id, label]) => ({ id, label }));
const EXPOSITIONS        = Object.entries(EXPOSITION_LABELS).map(([id, label]) => ({ id, label }));
const SLOPE_CLASSES      = [
  { id: 'FLAT', label: 'Flach (<5°)' }, { id: 'MODERATE', label: 'Mäßig (5–15°)' },
  { id: 'STEEP', label: 'Steil (15–30°)' }, { id: 'VERY_STEEP', label: 'Sehr steil' },
];
const SLOPE_POSITIONS = Object.entries(SLOPE_POS_LABELS).map(([id, label]) => ({ id, label }));
const STAND_TYPES     = Object.entries(STAND_TYPE_LABELS).map(([id, label]) => ({ id, label }));
const STOCKING_DEGREES = Object.entries(STOCKING_LABELS).map(([id, label]) => ({ id, label }));

interface Props {
  orgSlug: string;
  forests: Forest[];
  members?: Member[];
}

export function TreeListView({ orgSlug, forests, members = [] }: Props) {
  const [forestId, setForestId]   = useState(forests[0]?.id ?? '');
  const [trees, setTrees]         = useState<TreeRow[]>([]);
  const [total, setTotal]         = useState<number | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading]     = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing]     = useState<TreeRow | null>(null);
  const [deleting, setDeleting]   = useState<string | null>(null);
  const [taskTarget, setTaskTarget] = useState<TreeRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<TreeRow | null>(null);
  const [deleteError, setDeleteError]     = useState<string | null>(null);

  function mapPending(pending: PendingTree[], fId: string): TreeRow[] {
    return pending
      .filter(p => p.forestId === fId)
      .map(p => ({
        id:             String(p.id),
        lat:            p.lat,
        lng:            p.lng,
        forestId:       p.forestId,
        forestName:     p.forestName,
        createdAt:      p.createdAt,
        species:        p.species,
        diameter:       p.diameter,
        height:         p.height,
        soilCondition:  p.soilCondition  ?? null,
        soilMoisture:   p.soilMoisture   ?? null,
        exposition:     p.exposition     ?? null,
        slopeClass:     p.slopeClass     ?? null,
        slopePosition:  p.slopePosition  ?? null,
        standType:      p.standType      ?? null,
        stockingDegree: p.stockingDegree ?? null,
        damageType:     p.damageType     ?? null,
        damageSeverity: p.damageSeverity ?? null,
        crownCondition: p.crownCondition ?? null,
        notes:          p.notes          ?? null,
        synced:         false,
      }));
  }

  async function load(fId: string) {
    setLoading(true);
    setLoadError(null);
    setNextCursor(null);
    setTotal(null);
    try {
      const [apiRes, pending] = await Promise.all([
        fetch(`/api/app/inventory/trees?orgSlug=${orgSlug}&forestId=${fId}&limit=50`)
          .then(async r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
          }),
        db.pendingTrees.where('synced').equals(0).toArray(),
      ]);

      setNextCursor(apiRes.nextCursor ?? null);
      setTotal(apiRes.total ?? null);
      setTrees([...mapPending(pending, fId), ...(apiRes.trees ?? [])]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unbekannter Fehler';
      console.error('TreeListView load error', msg);
      setLoadError('Bäume konnten nicht geladen werden.');
    }
    setLoading(false);
  }

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/app/inventory/trees?orgSlug=${orgSlug}&forestId=${forestId}&cursor=${nextCursor}&limit=50`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const apiRes = await res.json();
      setNextCursor(apiRes.nextCursor ?? null);
      setTrees(prev => [...prev, ...(apiRes.trees ?? [])]);
    } catch (e) {
      console.error('TreeListView loadMore error', e);
    }
    setLoadingMore(false);
  }

  useEffect(() => { if (forestId) load(forestId); }, [forestId]);

  async function handleDelete(tree: TreeRow) {
    setConfirmDelete(tree);
  }

  async function confirmAndDelete(tree: TreeRow) {
    setConfirmDelete(null);
    setDeleting(tree.id);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/app/inventory/trees/${tree.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTrees(ts => ts.filter(t => t.id !== tree.id));
    } catch (e) {
      setDeleteError('Baum konnte nicht gelöscht werden. Bitte erneut versuchen.');
    }
    setDeleting(null);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Forest-Selektor */}
      <div className="shrink-0 bg-slate-900 border-b border-slate-800 px-3 py-2 flex items-center gap-2">
        <TreePine size={15} className="text-emerald-400 shrink-0" />
        <div className="relative flex-1">
          <select
            value={forestId}
            onChange={e => setForestId(e.target.value)}
            className="w-full appearance-none bg-slate-800 text-sm text-white rounded-lg px-3 py-1.5 pr-7 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {forests.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        <button onClick={() => load(forestId)} disabled={loading} className="shrink-0 text-slate-400 hover:text-white disabled:opacity-40">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {loading && (
          <div className="flex justify-center pt-12">
            <RefreshCw size={20} className="animate-spin text-slate-500" />
          </div>
        )}

        {!loading && loadError && (
          <div className="mx-0 mt-4 px-4 py-3 bg-red-900/50 border border-red-700 rounded-xl flex items-center justify-between gap-3">
            <span className="text-sm text-red-300">{loadError}</span>
            <button
              onClick={() => load(forestId)}
              className="text-xs text-red-400 underline shrink-0"
            >
              Erneut versuchen
            </button>
          </div>
        )}

        {deleteError && (
          <div className="mx-0 mt-2 px-4 py-3 bg-red-900/50 border border-red-700 rounded-xl flex items-center justify-between gap-3">
            <span className="text-sm text-red-300">{deleteError}</span>
            <button onClick={() => setDeleteError(null)} className="text-xs text-red-400 shrink-0"><X size={14} /></button>
          </div>
        )}

        {!loading && !loadError && trees.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-12 gap-2 text-slate-500">
            <TreePine size={32} />
            <p className="text-sm">Noch keine Bäume in diesem Wald.</p>
          </div>
        )}

        {!loading && trees.length > 0 && (
          <p className="text-xs text-slate-500 mb-1">
            {trees.length}{total !== null && total > trees.length ? ` von ${total}` : ''}{' '}
            {trees.length === 1 ? 'Baum' : 'Bäume'}
          </p>
        )}

        {trees.map((tree) => {
          const species = TREE_SPECIES.find(s => s.id === tree.species);
          return (
            <div key={tree.id} className="bg-slate-800 rounded-xl overflow-hidden">
              {/* Baum-Info */}
              <div className="flex items-start gap-3 p-4">
                <span className="w-3 h-3 rounded-full shrink-0 mt-1" style={{ backgroundColor: species?.color ?? '#64748b' }} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-base leading-tight">
                    {species?.label ?? tree.species ?? 'Unbekannte Baumart'}
                    {!tree.synced && <span className="ml-2 text-xs text-amber-400 font-normal">● Offline</span>}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-slate-400 mt-1">
                    {tree.diameter && <span>Ø {tree.diameter} cm</span>}
                    {tree.height   && <span>↕ {tree.height} m</span>}
                    {tree.soilCondition && <span>{SOIL_LABELS[tree.soilCondition] ?? tree.soilCondition}</span>}
                    {tree.soilMoisture  && <span>{MOISTURE_LABELS[tree.soilMoisture] ?? tree.soilMoisture}</span>}
                  </div>
                  {tree.notes && <p className="text-sm text-slate-500 mt-1 truncate">{tree.notes}</p>}
                  <p className="text-xs text-slate-600 font-mono mt-1.5">{tree.lat.toFixed(5)}, {tree.lng.toFixed(5)}</p>
                  <p className="text-xs text-slate-600">{new Date(tree.createdAt).toLocaleDateString('de-DE')}</p>
                </div>
              </div>

              {/* Aktionsleiste – nur für synchronisierte Bäume */}
              {tree.synced && (
                <div className="flex border-t border-slate-700">
                  <button
                    onClick={() => setTaskTarget(tree)}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium text-blue-400 hover:bg-slate-700 active:bg-slate-600 transition-colors"
                  >
                    <ClipboardList size={18} />
                    Aufgabe
                  </button>
                  <div className="w-px bg-slate-700" />
                  <button
                    onClick={() => setEditing(tree)}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium text-emerald-400 hover:bg-slate-700 active:bg-slate-600 transition-colors"
                  >
                    <Pencil size={18} />
                    Bearbeiten
                  </button>
                  <div className="w-px bg-slate-700" />
                  <button
                    onClick={() => handleDelete(tree)}
                    disabled={deleting === tree.id}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium text-red-400 hover:bg-slate-700 active:bg-slate-600 transition-colors disabled:opacity-40"
                  >
                    {deleting === tree.id
                      ? <RefreshCw size={18} className="animate-spin" />
                      : <Trash2 size={18} />
                    }
                    Löschen
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Weitere laden */}
        {nextCursor && !loading && (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="w-full py-3.5 mt-1 rounded-xl bg-slate-800 text-sm font-medium text-slate-300 flex items-center justify-center gap-2 active:bg-slate-700 disabled:opacity-50"
          >
            {loadingMore
              ? <><RefreshCw size={15} className="animate-spin" /> Lade…</>
              : 'Weitere Bäume laden'
            }
          </button>
        )}
      </div>

      {/* Edit-Sheet */}
      {editing && (
        <EditSheet
          tree={editing}
          onClose={() => setEditing(null)}
          onSaved={updated => {
            setTrees(ts => ts.map(t => t.id === updated.id ? { ...t, ...updated } : t));
            setEditing(null);
          }}
        />
      )}

      {/* Task-Sheet */}
      {taskTarget && (
        <TaskSheet
          tree={taskTarget}
          orgSlug={orgSlug}
          members={members}
          onClose={() => setTaskTarget(null)}
        />
      )}

      {/* Confirm Delete Sheet */}
      {confirmDelete && (
        <ConfirmDeleteSheet
          tree={confirmDelete}
          onConfirm={() => confirmAndDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
function TaskSheet({ tree, orgSlug, members, onClose }: {
  tree: TreeRow;
  orgSlug: string;
  members: Member[];
  onClose: () => void;
}) {
  const [title, setTitle]           = useState('');
  const [priority, setPriority]     = useState('MEDIUM');
  const [dueDate, setDueDate]       = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [assigneeId, setAssigneeId] = useState('');
  const [saving, setSaving]         = useState(false);
  const [done, setDone]             = useState(false);
  const [saveError, setSaveError]   = useState<string | null>(null);

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch('/api/app/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgSlug,
          title:      title.trim(),
          forestId:   tree.forestId,
          priority,
          assigneeId: assigneeId || undefined,
          dueDate:    dueDate    || undefined,
          poiId:      tree.id,
          lat:        tree.lat,
          lng:        tree.lng,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDone(true);
    } catch {
      setSaveError('Aufgabe konnte nicht gespeichert werden. Bitte erneut versuchen.');
    }
    setSaving(false);
  }

  const species = TREE_SPECIES.find(s => s.id === tree.species);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-slate-900 rounded-t-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <h2 className="font-bold">Aufgabe erstellen</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>

        {done ? (
          <div className="flex flex-col items-center justify-center p-8 gap-3">
            <div className="w-14 h-14 bg-blue-900/50 rounded-full flex items-center justify-center">
              <Check size={28} className="text-blue-400" />
            </div>
            <p className="font-semibold">Aufgabe gespeichert</p>
            <p className="text-sm text-slate-400">Sie erscheint im Kanban-Board und Kalender.</p>
            <button onClick={onClose} className="mt-2 px-6 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-medium">
              Schließen
            </button>
          </div>
        ) : (
          <div className="px-4 pb-8 pt-4 space-y-4">
            {/* Baum-Kontext */}
            <div className="flex items-center gap-2 bg-slate-800 rounded-xl px-3 py-2.5">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: species?.color ?? '#64748b' }} />
              <span className="text-sm font-medium">{species?.label ?? tree.species ?? 'Baum'}</span>
              {tree.diameter && <span className="text-xs text-slate-400">Ø {tree.diameter} cm</span>}
              <span className="ml-auto text-xs font-mono text-slate-500">{tree.lat.toFixed(4)}, {tree.lng.toFixed(4)}</span>
            </div>

            {/* Titel */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Titel *</label>
              <input
                type="text"
                placeholder="z.B. Schaden kontrollieren"
                value={title}
                onChange={e => setTitle(e.target.value)}
                autoFocus
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Priorität */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Priorität</label>
              <div className="grid grid-cols-3 gap-2">
                {([['LOW', 'Niedrig', 'bg-slate-600'], ['MEDIUM', 'Mittel', 'bg-amber-600'], ['HIGH', 'Hoch', 'bg-red-600']] as [string, string, string][]).map(([val, label, active]) => (
                  <button key={val} onClick={() => setPriority(val)}
                    className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${priority === val ? `${active} text-white` : 'bg-slate-800 text-slate-300'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Fälligkeitsdatum */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Fällig bis (optional)</label>
              <DateTrigger
                value={dueDate}
                placeholder="Kein Datum gewählt"
                onClick={() => setShowDatePicker(true)}
              />
              {showDatePicker && (
                <DatePickerSheet
                  value={dueDate}
                  label="Fälligkeitsdatum"
                  onChange={setDueDate}
                  onClose={() => setShowDatePicker(false)}
                />
              )}
            </div>

            {/* Zuweisung */}
            {members.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1"><User size={12} /> Zuweisen an</label>
                <div className="space-y-1.5">
                  <button onClick={() => setAssigneeId('')}
                    className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors ${assigneeId === '' ? 'bg-blue-700 text-white' : 'bg-slate-800 text-slate-300'}`}>
                    Nicht zugewiesen
                  </button>
                  {members.map(m => (
                    <button key={m.id} onClick={() => setAssigneeId(m.id)}
                      className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors ${assigneeId === m.id ? 'bg-blue-700 text-white' : 'bg-slate-800 text-slate-300'}`}>
                      {m.firstName && m.lastName ? `${m.firstName} ${m.lastName}` : m.email}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {saveError && (
              <div className="px-4 py-3 bg-red-900/50 border border-red-700 rounded-xl flex items-center justify-between gap-3">
                <span className="text-sm text-red-300">{saveError}</span>
                <button onClick={() => setSaveError(null)} className="text-red-400 shrink-0"><X size={14} /></button>
              </div>
            )}

            <button onClick={save} disabled={!title.trim() || saving}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors">
              {saving ? <RefreshCw size={18} className="animate-spin" /> : <><ClipboardList size={18} /> Aufgabe speichern</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function EditSheet({ tree, onClose, onSaved }: {
  tree: TreeRow;
  onClose: () => void;
  onSaved: (t: Partial<TreeRow> & { id: string }) => void;
}) {
  const [species, setSpecies]               = useState(tree.species ?? '');
  const [diameter, setDiameter]             = useState(tree.diameter?.toString() ?? '');
  const [height, setHeight]                 = useState(tree.height?.toString() ?? '');
  const [soilCondition, setSoilCondition]   = useState(tree.soilCondition  ?? '');
  const [soilMoisture,  setSoilMoisture]    = useState(tree.soilMoisture   ?? '');
  const [exposition,    setExposition]      = useState(tree.exposition     ?? '');
  const [slopeClass,    setSlopeClass]      = useState(tree.slopeClass     ?? '');
  const [slopePosition, setSlopePosition]   = useState(tree.slopePosition  ?? '');
  const [standType,     setStandType]       = useState(tree.standType      ?? '');
  const [stockingDegree,setStockingDegree]  = useState(tree.stockingDegree ?? '');
  const [notes, setNotes]                   = useState(tree.notes ?? '');
  const [saving, setSaving]                 = useState(false);
  const [saveError, setSaveError]           = useState<string | null>(null);
  const [search, setSearch]                 = useState('');

  const filteredSpecies = TREE_SPECIES.filter(s =>
    s.label.toLowerCase().includes(search.toLowerCase())
  );

  async function save() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/app/inventory/trees/${tree.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          species, diameter, height,
          soilCondition, soilMoisture,
          exposition, slopeClass, slopePosition,
          standType, stockingDegree,
          notes,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onSaved({
        id: tree.id, species,
        diameter: diameter ? parseFloat(diameter) : null,
        height:   height   ? parseFloat(height)   : null,
        soilCondition, soilMoisture,
        exposition, slopeClass, slopePosition,
        standType, stockingDegree,
        notes,
      });
    } catch {
      setSaveError('Änderungen konnten nicht gespeichert werden. Bitte erneut versuchen.');
    }
    setSaving(false);
  }

  function tog<T extends string>(val: T, current: T, set: (v: T) => void) {
    set(current === val ? '' as T : val);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-slate-900 rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <h2 className="font-bold">Baum bearbeiten</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="px-4 pb-8 pt-4 space-y-5">
          {/* Baumart */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Baumart</label>
            <input type="text" placeholder="Suchen…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 mb-2"
            />
            <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
              {filteredSpecies.map(s => (
                <button key={s.id} onClick={() => setSpecies(s.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors ${species === s.id ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Maße */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">BHD (cm)</label>
              <input type="number" inputMode="decimal" value={diameter} onChange={e => setDiameter(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Höhe (m)</label>
              <input type="number" inputMode="decimal" value={height} onChange={e => setHeight(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500" />
            </div>
          </div>

          {/* Bodenbeschaffenheit */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Bodenbeschaffenheit</label>
            <div className="grid grid-cols-3 gap-1.5">
              {SOIL_CONDITIONS.map(s => (
                <button key={s.id} onClick={() => tog(s.id, soilCondition, setSoilCondition)}
                  className={`py-2 rounded-lg text-xs font-medium transition-colors ${soilCondition === s.id ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bodenfeuchtigkeit */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Bodenfeuchtigkeit</label>
            <div className="grid grid-cols-3 gap-1.5">
              {SOIL_MOISTURE_LIST.map(s => (
                <button key={s.id} onClick={() => tog(s.id, soilMoisture, setSoilMoisture)}
                  className={`py-2 rounded-lg text-xs font-medium transition-colors ${soilMoisture === s.id ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Exposition */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Exposition</label>
            <div className="grid grid-cols-3 gap-1.5">
              {EXPOSITIONS.map(s => (
                <button key={s.id} onClick={() => tog(s.id, exposition, setExposition)}
                  className={`py-2 rounded-lg text-xs font-medium transition-colors ${exposition === s.id ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Hangneigung */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Hangneigung</label>
            <div className="grid grid-cols-2 gap-1.5">
              {SLOPE_CLASSES.map(s => (
                <button key={s.id} onClick={() => tog(s.id, slopeClass, setSlopeClass)}
                  className={`py-2 rounded-lg text-xs font-medium transition-colors ${slopeClass === s.id ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Hangposition */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Hangposition</label>
            <div className="grid grid-cols-2 gap-1.5">
              {SLOPE_POSITIONS.map(s => (
                <button key={s.id} onClick={() => tog(s.id, slopePosition, setSlopePosition)}
                  className={`py-2 rounded-lg text-xs font-medium transition-colors ${slopePosition === s.id ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bestandstyp */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Bestandstyp</label>
            <div className="grid grid-cols-2 gap-1.5">
              {STAND_TYPES.map(s => (
                <button key={s.id} onClick={() => tog(s.id, standType, setStandType)}
                  className={`py-2 rounded-lg text-xs font-medium transition-colors ${standType === s.id ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bestockungsgrad */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Bestockungsgrad</label>
            <div className="grid grid-cols-3 gap-1.5">
              {STOCKING_DEGREES.map(s => (
                <button key={s.id} onClick={() => tog(s.id, stockingDegree, setStockingDegree)}
                  className={`py-2 rounded-lg text-xs font-medium transition-colors ${stockingDegree === s.id ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notizen */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Notizen</label>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none" />
          </div>

          {saveError && (
            <div className="px-4 py-3 bg-red-900/50 border border-red-700 rounded-xl flex items-center justify-between gap-3">
              <span className="text-sm text-red-300">{saveError}</span>
              <button onClick={() => setSaveError(null)} className="text-red-400 shrink-0"><X size={14} /></button>
            </div>
          )}

          <button onClick={save} disabled={saving}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors">
            <Check size={18} /> {saving ? 'Wird gespeichert…' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function ConfirmDeleteSheet({ tree, onConfirm, onCancel }: {
  tree: TreeRow;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const species = TREE_SPECIES.find(s => s.id === tree.species);
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative bg-slate-900 rounded-t-2xl pb-safe">
        {/* Grip */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-700 rounded-full" />
        </div>

        <div className="px-5 pt-3 pb-8">
          <h2 className="text-lg font-bold text-center mb-1">Baum löschen?</h2>
          <p className="text-sm text-slate-400 text-center mb-6">
            {species?.label ?? tree.species ?? 'Dieser Baum'} wird unwiderruflich gelöscht.
          </p>

          <button
            onClick={onConfirm}
            className="w-full py-4 bg-red-600 hover:bg-red-500 active:bg-red-700 rounded-xl font-semibold text-white text-base mb-3 flex items-center justify-center gap-2 transition-colors"
          >
            <Trash2 size={20} />
            Endgültig löschen
          </button>
          <button
            onClick={onCancel}
            className="w-full py-4 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-xl font-semibold text-slate-200 text-base transition-colors"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}
