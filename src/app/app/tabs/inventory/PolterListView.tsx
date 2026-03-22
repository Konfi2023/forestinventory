'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, PackageOpen, ChevronDown, Pencil, Trash2, X, Check } from 'lucide-react';
import { db, type PendingLogPile } from '@/lib/inventory-db';
import { TREE_SPECIES } from '@/lib/tree-species';

const WOOD_TYPE_LABELS: Record<string, string> = {
  LOG: 'Stammholz', INDUSTRIAL: 'Industrieholz', ENERGY: 'Energieholz', PULP: 'Faserholz',
};

const QUALITY_CLASSES = [
  { id: 'A', label: 'A – Sehr gut' }, { id: 'B', label: 'B – Gut' }, { id: 'C', label: 'C – Mittel' },
  { id: 'D', label: 'D – Gering' }, { id: 'IL', label: 'IL – Industriell' }, { id: 'E', label: 'E – Energie' },
];

interface Forest { id: string; name: string; }

interface LogPileRow {
  id: string;
  lat: number;
  lng: number;
  name: string | null;
  forestId: string;
  forestName: string;
  createdAt: string;
  treeSpecies: string | null;
  woodType: string | null;
  volumeFm: number | null;
  logLength: number | null;
  layerCount: number | null;
  qualityClass: string | null;
  notes: string | null;
  synced: boolean;
}

interface Props {
  orgSlug: string;
  forests: Forest[];
}

export function PolterListView({ orgSlug, forests }: Props) {
  const [forestId, setForestId]     = useState(forests[0]?.id ?? '');
  const [piles, setPiles]           = useState<LogPileRow[]>([]);
  const [total, setTotal]           = useState<number | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading]       = useState(true);
  const [loadError, setLoadError]   = useState<string | null>(null);
  const [editing, setEditing]       = useState<LogPileRow | null>(null);
  const [deleting, setDeleting]     = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<LogPileRow | null>(null);
  const [deleteError, setDeleteError]     = useState<string | null>(null);

  function mapPending(pending: PendingLogPile[], fId: string): LogPileRow[] {
    return pending
      .filter(p => p.forestId === fId)
      .map(p => ({
        id: String(p.id),
        lat: p.lat, lng: p.lng,
        name: null,
        forestId: p.forestId,
        forestName: p.forestName,
        createdAt: p.createdAt,
        treeSpecies: p.treeSpecies,
        woodType: p.woodType,
        volumeFm: p.volumeFm,
        logLength: p.logLength,
        layerCount: p.layerCount,
        qualityClass: p.qualityClass,
        notes: p.notes,
        synced: false,
      }));
  }

  async function load(fId: string) {
    setLoading(true);
    setLoadError(null);
    setNextCursor(null);
    setTotal(null);
    try {
      const [apiRes, pending] = await Promise.all([
        fetch(`/api/app/inventory/logpiles?orgSlug=${orgSlug}&forestId=${fId}&limit=50`)
          .then(async r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }),
        db.pendingLogPiles.where('synced').equals(0).toArray(),
      ]);
      setNextCursor(apiRes.nextCursor ?? null);
      setTotal(apiRes.total ?? null);
      setPiles([...mapPending(pending, fId), ...(apiRes.logpiles ?? [])]);
    } catch (e) {
      setLoadError('Polter konnten nicht geladen werden.');
    }
    setLoading(false);
  }

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/app/inventory/logpiles?orgSlug=${orgSlug}&forestId=${forestId}&cursor=${nextCursor}&limit=50`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const apiRes = await res.json();
      setNextCursor(apiRes.nextCursor ?? null);
      setPiles(prev => [...prev, ...(apiRes.logpiles ?? [])]);
    } catch {}
    setLoadingMore(false);
  }

  useEffect(() => { if (forestId) load(forestId); }, [forestId]);

  async function confirmAndDelete(pile: LogPileRow) {
    setConfirmDelete(null);
    setDeleting(pile.id);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/app/inventory/logpiles/${pile.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setPiles(ps => ps.filter(p => p.id !== pile.id));
    } catch {
      setDeleteError('Polter konnte nicht gelöscht werden.');
    }
    setDeleting(null);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Forest-Selektor */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-3 py-2 flex items-center gap-2">
        <PackageOpen size={15} className="text-amber-500 shrink-0" />
        <div className="relative flex-1">
          <select
            value={forestId}
            onChange={e => setForestId(e.target.value)}
            className="w-full appearance-none bg-slate-50 text-sm text-slate-800 rounded-lg px-3 py-1.5 pr-7 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            {forests.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        <button onClick={() => load(forestId)} disabled={loading} className="shrink-0 text-slate-400 hover:text-slate-700 disabled:opacity-40">
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
          <div className="mt-4 px-4 py-3 bg-red-50 border border-red-300 rounded-xl flex items-center justify-between gap-3">
            <span className="text-sm text-red-600">{loadError}</span>
            <button onClick={() => load(forestId)} className="text-xs text-red-500 underline">Erneut</button>
          </div>
        )}

        {deleteError && (
          <div className="mt-2 px-4 py-3 bg-red-50 border border-red-300 rounded-xl flex items-center justify-between gap-3">
            <span className="text-sm text-red-600">{deleteError}</span>
            <button onClick={() => setDeleteError(null)} className="text-red-500"><X size={14} /></button>
          </div>
        )}

        {!loading && !loadError && piles.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-12 gap-2 text-slate-400">
            <PackageOpen size={32} />
            <p className="text-sm">Noch keine Polter in diesem Wald.</p>
          </div>
        )}

        {!loading && piles.length > 0 && (
          <p className="text-xs text-slate-500 mb-1">
            {piles.length}{total !== null && total > piles.length ? ` von ${total}` : ''}{' '}
            {piles.length === 1 ? 'Polter' : 'Polter'}
          </p>
        )}

        {piles.map(pile => {
          const species = TREE_SPECIES.find(s => s.id === pile.treeSpecies);
          return (
            <div key={pile.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="flex items-start gap-3 p-4">
                <PackageOpen size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-base leading-tight text-slate-900">
                    {species?.label ?? pile.treeSpecies ?? 'Unbekannte Baumart'}
                    {!pile.synced && <span className="ml-2 text-xs text-amber-500 font-normal">● Offline</span>}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-slate-500 mt-1">
                    {pile.volumeFm  != null && <span>{pile.volumeFm} fm</span>}
                    {pile.logLength != null && <span>{pile.logLength} m</span>}
                    {pile.layerCount != null && <span>{pile.layerCount} Lagen</span>}
                    {pile.woodType  && <span>{WOOD_TYPE_LABELS[pile.woodType] ?? pile.woodType}</span>}
                    {pile.qualityClass && <span>Kl. {pile.qualityClass}</span>}
                  </div>
                  {pile.notes && <p className="text-sm text-slate-400 mt-1 truncate">{pile.notes}</p>}
                  <p className="text-xs text-slate-400 font-mono mt-1.5">{pile.lat.toFixed(5)}, {pile.lng.toFixed(5)}</p>
                  <p className="text-xs text-slate-400">{new Date(pile.createdAt).toLocaleDateString('de-DE')}</p>
                </div>
              </div>

              {pile.synced && (
                <div className="flex border-t border-slate-200">
                  <button
                    onClick={() => setEditing(pile)}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium text-emerald-600 hover:bg-slate-50 active:bg-slate-100 transition-colors"
                  >
                    <Pencil size={18} /> Bearbeiten
                  </button>
                  <div className="w-px bg-slate-200" />
                  <button
                    onClick={() => setConfirmDelete(pile)}
                    disabled={deleting === pile.id}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium text-red-500 hover:bg-slate-50 active:bg-slate-100 transition-colors disabled:opacity-40"
                  >
                    {deleting === pile.id
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

        {nextCursor && !loading && (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="w-full py-3.5 mt-1 rounded-xl bg-slate-100 text-sm font-medium text-slate-600 flex items-center justify-center gap-2 active:bg-slate-200 disabled:opacity-50"
          >
            {loadingMore ? <><RefreshCw size={15} className="animate-spin" /> Lade…</> : 'Weitere Polter laden'}
          </button>
        )}
      </div>

      {editing && (
        <EditSheet
          pile={editing}
          onClose={() => setEditing(null)}
          onSaved={updated => {
            setPiles(ps => ps.map(p => p.id === updated.id ? { ...p, ...updated } : p));
            setEditing(null);
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmDeleteSheet
          pile={confirmDelete}
          onConfirm={() => confirmAndDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

// ── EditSheet ──────────────────────────────────────────────────────────────────
function EditSheet({ pile, onClose, onSaved }: {
  pile: LogPileRow;
  onClose: () => void;
  onSaved: (p: Partial<LogPileRow> & { id: string }) => void;
}) {
  const [treeSpecies, setTreeSpecies] = useState(pile.treeSpecies ?? '');
  const [woodType,    setWoodType]    = useState(pile.woodType    ?? 'LOG');
  const [volumeFm,    setVolumeFm]    = useState(pile.volumeFm?.toString()    ?? '');
  const [logLength,   setLogLength]   = useState(pile.logLength?.toString()   ?? '');
  const [layerCount,  setLayerCount]  = useState(pile.layerCount?.toString()  ?? '');
  const [qualityClass,setQualityClass]= useState(pile.qualityClass ?? '');
  const [notes,       setNotes]       = useState(pile.notes ?? '');
  const [saving,      setSaving]      = useState(false);
  const [saveError,   setSaveError]   = useState<string | null>(null);
  const [search,      setSearch]      = useState('');

  const filteredSpecies = TREE_SPECIES.filter(s => s.label.toLowerCase().includes(search.toLowerCase()));
  const tog = (val: string, current: string, set: (v: string) => void) => set(current === val ? '' : val);

  async function save() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/app/inventory/logpiles/${pile.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ treeSpecies, woodType, volumeFm, logLength, layerCount, qualityClass, notes }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onSaved({
        id: pile.id, treeSpecies, woodType,
        volumeFm:    volumeFm    ? parseFloat(volumeFm)    : null,
        logLength:   logLength   ? parseFloat(logLength)   : null,
        layerCount:  layerCount  ? parseInt(layerCount)    : null,
        qualityClass, notes,
      });
    } catch {
      setSaveError('Änderungen konnten nicht gespeichert werden.');
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h2 className="font-bold text-slate-900">Polter bearbeiten</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-800"><X size={20} /></button>
        </div>
        <div className="px-4 pb-8 pt-4 space-y-5">

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Baumart</label>
            <input type="text" placeholder="Suchen…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 mb-2" />
            <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
              {filteredSpecies.map(s => (
                <button key={s.id} onClick={() => tog(s.id, treeSpecies, setTreeSpecies)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors ${treeSpecies === s.id ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />{s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Holzart</label>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(WOOD_TYPE_LABELS).map(([id, label]) => (
                <button key={id} onClick={() => setWoodType(id)}
                  className={`py-2.5 rounded-lg text-xs font-medium transition-colors ${woodType === id ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Festmeter (fm)</label>
              <input type="number" inputMode="decimal" value={volumeFm} onChange={e => setVolumeFm(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Stammlänge (m)</label>
              <input type="number" inputMode="decimal" value={logLength} onChange={e => setLogLength(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Anzahl der Lagen</label>
            <input type="number" inputMode="numeric" value={layerCount} onChange={e => setLayerCount(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Qualitätsklasse</label>
            <div className="grid grid-cols-3 gap-1.5">
              {QUALITY_CLASSES.map(q => (
                <button key={q.id} onClick={() => tog(q.id, qualityClass, setQualityClass)}
                  className={`py-2 rounded-lg text-xs font-medium transition-colors ${qualityClass === q.id ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  {q.id}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Notizen</label>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 resize-none" />
          </div>

          {saveError && (
            <div className="px-4 py-3 bg-red-50 border border-red-300 rounded-xl flex items-center justify-between gap-3">
              <span className="text-sm text-red-600">{saveError}</span>
              <button onClick={() => setSaveError(null)} className="text-red-500"><X size={14} /></button>
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

// ── ConfirmDeleteSheet ─────────────────────────────────────────────────────────
function ConfirmDeleteSheet({ pile, onConfirm, onCancel }: {
  pile: LogPileRow; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative bg-white rounded-t-2xl pb-safe">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>
        <div className="px-5 pt-3 pb-8">
          <h2 className="text-lg font-bold text-center mb-1 text-slate-900">Polter löschen?</h2>
          <p className="text-sm text-slate-500 text-center mb-6">
            Dieser Polter-Eintrag wird unwiderruflich gelöscht.
          </p>
          <button onClick={onConfirm}
            className="w-full py-4 bg-red-600 hover:bg-red-500 rounded-xl font-semibold text-white mb-3 flex items-center justify-center gap-2">
            <Trash2 size={20} /> Endgültig löschen
          </button>
          <button onClick={onCancel}
            className="w-full py-4 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-slate-700">
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}
