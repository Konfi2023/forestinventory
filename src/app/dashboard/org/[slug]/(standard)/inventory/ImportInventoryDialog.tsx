'use client';

import { useState, useRef } from 'react';
import { Upload, X, Loader2, CheckCircle2, AlertTriangle, FileText, Image as ImageIcon, CircleDot, TreePine } from 'lucide-react';
import { getSpeciesLabel, getSpeciesColor } from '@/lib/tree-species';
import { importInventoryPlots, importInventoryTrees } from '@/actions/inventory-import';

interface Forest { id: string; name: string; }

interface ImportTreeRow {
  species: string | null;
  diameter: number | null;
  height: number | null;
  age: number | null;
  lat: number | null;
  lng: number | null;
}

interface ImportPlotRow {
  name: string;
  lat: number | null;
  lng: number | null;
  radiusM: number;
  trees: ImportTreeRow[];
}

interface ImportResult {
  mode: 'plot' | 'tree';
  plots: ImportPlotRow[];
  trees: ImportTreeRow[];
  tokensUsed: number;
  source: 'csv' | 'vision';
}

interface Props {
  forests: Forest[];
  orgSlug: string;
  userId: string;
  onClose: () => void;
  onImported: () => void;
}

export function ImportInventoryDialog({ forests, orgSlug, userId, onClose, onImported }: Props) {
  const [step, setStep]         = useState<'upload' | 'review' | 'done'>('upload');
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult]     = useState<ImportResult | null>(null);
  const [forestId, setForestId] = useState(forests[0]?.id ?? '');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [summary, setSummary]   = useState<{ plots?: number; trees: number } | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('orgSlug', orgSlug);
      const res = await fetch('/api/inventory/import', { method: 'POST', body: fd });
      const json: ImportResult = await res.json();
      if (!res.ok) throw new Error((json as any).error ?? 'Fehler');
      setResult(json);
      const count = json.mode === 'plot' ? json.plots.length : json.trees.length;
      setSelected(new Set(Array.from({ length: count }, (_, i) => i)));
      setStep('review');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const toggle = (i: number) => setSelected(prev => {
    const next = new Set(prev);
    next.has(i) ? next.delete(i) : next.add(i);
    return next;
  });

  const handleImport = async () => {
    if (!result || !forestId) return;
    setImporting(true);
    try {
      if (result.mode === 'plot') {
        const toImport = result.plots.filter((_, i) => selected.has(i));
        const res = await importInventoryPlots(forestId, orgSlug, userId, toImport);
        if (!res.success) throw new Error((res as any).error);
        setSummary({ plots: res.plotsCreated, trees: res.treesCreated });
      } else {
        const toImport = result.trees.filter((_, i) => selected.has(i));
        const res = await importInventoryTrees(forestId, orgSlug, userId, toImport);
        if (!res.success) throw new Error((res as any).error);
        setSummary({ trees: res.treesCreated });
      }
      setStep('done');
      onImported();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setImporting(false);
    }
  };

  const totalSelected = selected.size;
  const totalTrees = result?.mode === 'plot'
    ? result.plots.filter((_, i) => selected.has(i)).reduce((s, p) => s + p.trees.length, 0)
    : totalSelected;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 shrink-0">
          <Upload size={16} className="text-emerald-600" />
          <div>
            <h3 className="font-bold text-slate-900 text-base">Inventurdaten importieren</h3>
            <p className="text-xs text-slate-400">CSV-Datei oder Foto von Notizen / Feldbuch</p>
          </div>
          <button onClick={onClose} className="ml-auto text-slate-400 hover:text-slate-600 p-1">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">

          {/* ── Upload ── */}
          {step === 'upload' && (
            <>
              <div className="grid grid-cols-2 gap-3 text-xs text-slate-500">
                <div className="flex items-start gap-2 bg-slate-50 rounded-xl p-3">
                  <FileText size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-700 mb-0.5">CSV / Tabelle</div>
                    Spalten: Baumart, BHD, Höhe, Alter, Plot, Lat, Lng. Trennzeichen: Komma, Semikolon oder Tab.
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-slate-50 rounded-xl p-3">
                  <ImageIcon size={14} className="text-violet-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-700 mb-0.5">Foto / Scan</div>
                    Feldbuch, handgeschriebene Tabelle oder Ausdruck — GPT-4o liest die Werte automatisch aus.
                  </div>
                </div>
              </div>

              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors"
              >
                {uploading
                  ? <><Loader2 size={28} className="animate-spin text-emerald-600" /><span className="text-sm text-slate-500">Analysiere …</span></>
                  : <><Upload size={28} className="text-slate-400" /><span className="text-sm text-slate-500">CSV, JPEG, PNG oder WebP auswählen</span></>
                }
              </div>
              <input ref={fileRef} type="file" accept=".csv,.txt,image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
                  <AlertTriangle size={14} className="shrink-0" /> {error}
                </div>
              )}
            </>
          )}

          {/* ── Review ── */}
          {step === 'review' && result && (
            <>
              {/* Info-Banner */}
              <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-xl px-4 py-3">
                <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                <span>
                  {result.source === 'vision' ? 'GPT-4o hat' : 'CSV-Import:'}{' '}
                  <strong>
                    {result.mode === 'plot'
                      ? `${result.plots.length} Probekreis${result.plots.length !== 1 ? 'e' : ''} mit ${result.plots.reduce((s, p) => s + p.trees.length, 0)} Bäumen`
                      : `${result.trees.length} Bäum${result.trees.length !== 1 ? 'e' : ''}`}
                  </strong> erkannt.
                  {result.tokensUsed > 0 && <span className="text-slate-400 ml-1">({result.tokensUsed} Tokens)</span>}
                </span>
              </div>

              {/* Keine Daten */}
              {((result.mode === 'plot' && result.plots.length === 0) || (result.mode === 'tree' && result.trees.length === 0)) && (
                <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-xl px-4 py-3">
                  <AlertTriangle size={14} /> Keine Daten erkannt. Bitte ein deutlicheres Bild oder eine korrekte CSV-Datei hochladen.
                </div>
              )}

              {/* Plot-Tabelle */}
              {result.mode === 'plot' && result.plots.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200">
                    <CircleDot size={13} className="text-violet-600" />
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Probekreise</span>
                    <label className="ml-auto flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                      <input type="checkbox" checked={selected.size === result.plots.length}
                        onChange={e => setSelected(e.target.checked ? new Set(result.plots.map((_, i) => i)) : new Set())} />
                      Alle
                    </label>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {result.plots.map((plot, i) => (
                      <div key={i} onClick={() => toggle(i)}
                        className={`flex items-start gap-3 px-3 py-2.5 cursor-pointer transition-colors ${selected.has(i) ? 'bg-violet-50' : 'hover:bg-slate-50'}`}>
                        <input type="checkbox" checked={selected.has(i)} onChange={() => toggle(i)}
                          onClick={e => e.stopPropagation()} className="mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-700">{plot.name}</span>
                            <span className="text-xs text-violet-600">r = {plot.radiusM} m</span>
                            {plot.lat != null && <span className="text-xs text-emerald-600">GPS ✓</span>}
                            {plot.lat == null && <span className="text-xs text-amber-500">kein GPS</span>}
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                            {plot.trees.map((t, j) => (
                              <span key={j} className="text-xs text-slate-500 flex items-center gap-1">
                                {t.species && <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: getSpeciesColor(t.species) }} />}
                                {t.species ? getSpeciesLabel(t.species) : '?'}
                                {t.diameter != null && <span className="text-slate-400">Ø{t.diameter}cm</span>}
                                {t.height   != null && <span className="text-slate-400">{t.height}m</span>}
                              </span>
                            ))}
                          </div>
                        </div>
                        <span className="text-xs text-slate-400 shrink-0">{plot.trees.length} Bäume</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Einzelbaum-Tabelle */}
              {result.mode === 'tree' && result.trees.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200">
                    <TreePine size={13} className="text-emerald-600" />
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Einzelbäume</span>
                    <label className="ml-auto flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                      <input type="checkbox" checked={selected.size === result.trees.length}
                        onChange={e => setSelected(e.target.checked ? new Set(result.trees.map((_, i) => i)) : new Set())} />
                      Alle
                    </label>
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50">
                        <th className="px-2 py-1.5 w-8" />
                        <th className="px-3 py-1.5 text-left font-semibold text-slate-500">Baumart</th>
                        <th className="px-3 py-1.5 text-right font-semibold text-slate-500">BHD cm</th>
                        <th className="px-3 py-1.5 text-right font-semibold text-slate-500">Höhe m</th>
                        <th className="px-3 py-1.5 text-right font-semibold text-slate-500">Alter</th>
                        <th className="px-3 py-1.5 text-center font-semibold text-slate-500">GPS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.trees.map((t, i) => (
                        <tr key={i} onClick={() => toggle(i)}
                          className={`border-b border-slate-50 cursor-pointer ${selected.has(i) ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}>
                          <td className="px-2 py-1.5 text-center">
                            <input type="checkbox" checked={selected.has(i)} onChange={() => toggle(i)} onClick={e => e.stopPropagation()} />
                          </td>
                          <td className="px-3 py-1.5">
                            <span className="flex items-center gap-1.5">
                              {t.species && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getSpeciesColor(t.species) }} />}
                              <span className="text-slate-700">{t.species ? getSpeciesLabel(t.species) : <span className="text-slate-400">–</span>}</span>
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-right text-slate-600">{t.diameter ?? '–'}</td>
                          <td className="px-3 py-1.5 text-right text-slate-600">{t.height ?? '–'}</td>
                          <td className="px-3 py-1.5 text-right text-slate-600">{t.age ?? '–'}</td>
                          <td className="px-3 py-1.5 text-center">
                            {t.lat != null ? <span className="text-emerald-600">✓</span> : <span className="text-slate-300">–</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Zielwald */}
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide shrink-0">Importieren in:</label>
                <select value={forestId} onChange={e => setForestId(e.target.value)}
                  className="flex-1 border border-slate-200 rounded-lg text-sm px-3 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  {forests.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>

              {result.mode === 'plot' && selected.size > 0 && (
                <p className="text-xs text-slate-400">
                  {totalSelected} Probekreis{totalSelected !== 1 ? 'e' : ''} mit {totalTrees} Bäumen werden importiert.
                  {result.plots.some((p, i) => selected.has(i) && p.lat == null) && ' Probekreise ohne GPS werden bei Koordinate 0/0 platziert — bitte danach auf der Karte verschieben.'}
                </p>
              )}
              {result.mode === 'tree' && result.trees.some((t, i) => selected.has(i) && t.lat == null) && (
                <p className="text-xs text-slate-400">Bäume ohne GPS-Koordinaten werden bei 0/0 angelegt — bitte danach auf der Karte platzieren.</p>
              )}

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
                  <AlertTriangle size={14} /> {error}
                </div>
              )}
            </>
          )}

          {/* ── Done ── */}
          {step === 'done' && summary && (
            <div className="flex flex-col items-center gap-4 py-8">
              <CheckCircle2 size={44} className="text-emerald-500" />
              <div className="text-center">
                <p className="font-bold text-slate-900 text-lg">Import abgeschlossen</p>
                {summary.plots != null && (
                  <p className="text-sm text-slate-500 mt-1">{summary.plots} Probekreis{summary.plots !== 1 ? 'e' : ''} · {summary.trees} Bäume angelegt</p>
                )}
                {summary.plots == null && (
                  <p className="text-sm text-slate-500 mt-1">{summary.trees} Baum{summary.trees !== 1 ? '' : ''} angelegt</p>
                )}
                <p className="text-xs text-slate-400 mt-2">Die Daten sind jetzt in der Forsteinrichtung und auf der Karte sichtbar.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-slate-200 shrink-0">
          <div>
            {step === 'review' && (
              <button onClick={() => { setStep('upload'); setResult(null); setError(null); }}
                className="text-sm text-slate-500 hover:text-slate-700 underline underline-offset-2">
                Neue Datei
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {step !== 'done' && (
              <button onClick={onClose}
                className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                Abbrechen
              </button>
            )}
            {step === 'review' && totalSelected > 0 && (
              <button onClick={handleImport} disabled={importing}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-colors disabled:opacity-60">
                {importing && <Loader2 size={13} className="animate-spin" />}
                {result?.mode === 'plot'
                  ? `${totalSelected} Probekreis${totalSelected !== 1 ? 'e' : ''} importieren`
                  : `${totalSelected} Baum${totalSelected !== 1 ? '' : ''} importieren`}
              </button>
            )}
            {step === 'done' && (
              <button onClick={onClose}
                className="px-4 py-2 text-sm bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-colors">
                Schließen
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
