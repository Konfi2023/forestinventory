'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Camera, MapPin, ChevronRight, ChevronLeft,
  Check, CloudOff, RefreshCw, PackageOpen,
} from 'lucide-react';
import { db } from '@/lib/inventory-db';
import { TREE_SPECIES } from '@/lib/tree-species';

const WOOD_TYPES = [
  { id: 'LOG',        label: 'Stammholz' },
  { id: 'INDUSTRIAL', label: 'Industrieholz' },
  { id: 'ENERGY',     label: 'Energieholz' },
  { id: 'PULP',       label: 'Faserholz' },
];

const QUALITY_CLASSES = [
  { id: 'A', label: 'A – Sehr gut' },
  { id: 'B', label: 'B – Gut' },
  { id: 'C', label: 'C – Mittel' },
  { id: 'D', label: 'D – Gering' },
  { id: 'IL', label: 'IL – Industriell' },
  { id: 'E', label: 'E – Energie' },
];

type Step = 'forest' | 'camera' | 'details' | 'saved';
type GpsError = 'denied' | 'unavailable' | 'timeout' | 'insecure' | null;

interface Forest { id: string; name: string; }

interface Props {
  forests: Forest[];
  orgSlug: string;
}

interface FormState {
  forestId: string;
  forestName: string;
  lat: number | null;
  lng: number | null;
  imageFile: File | null;
  imageDataUrl: string | null;
  treeSpecies: string;
  woodType: string;
  volumeFm: string;
  logLength: string;
  layerCount: string;
  qualityClass: string;
  notes: string;
}

export function PolterCaptureClient({ forests, orgSlug }: Props) {
  const [step, setStep]             = useState<Step>('forest');
  const [form, setForm]             = useState<FormState>({
    forestId: forests[0]?.id ?? '',
    forestName: forests[0]?.name ?? '',
    lat: null, lng: null,
    imageFile: null, imageDataUrl: null,
    treeSpecies: '', woodType: 'LOG',
    volumeFm: '', logLength: '', layerCount: '',
    qualityClass: '', notes: '',
  });
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError]     = useState<GpsError>(null);
  const [saving, setSaving]         = useState(false);
  const [savedPoiId, setSavedPoiId] = useState<string | null>(null);
  const [saveError, setSaveError]   = useState<string | null>(null);
  const fileInputRef                = useRef<HTMLInputElement>(null);
  const [speciesSearch, setSpeciesSearch] = useState('');

  const filteredSpecies = TREE_SPECIES.filter(s =>
    s.label.toLowerCase().includes(speciesSearch.toLowerCase())
  );

  const getGPS = useCallback(() => {
    if (!navigator.geolocation) { setGpsError('unavailable'); return; }
    if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      setGpsError('insecure'); return;
    }
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setForm(f => ({ ...f, lat: pos.coords.latitude, lng: pos.coords.longitude }));
        setGpsLoading(false);
      },
      err => {
        setGpsLoading(false);
        if (err.code === 1) setGpsError('denied');
        else if (err.code === 3) setGpsError('timeout');
        else setGpsError('unavailable');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setForm(f => ({ ...f, imageFile: file, imageDataUrl: ev.target?.result as string }));
    reader.readAsDataURL(file);
    // GPS automatisch beim Foto erfassen
    if (form.lat == null) getGPS();
  };

  const handleSave = async () => {
    if (!form.forestId || form.lat == null || form.lng == null) return;
    setSaving(true);
    setSaveError(null);

    try {
      const res = await fetch('/api/app/inventory/logpiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgSlug,
          forestId:    form.forestId,
          lat:         form.lat,
          lng:         form.lng,
          treeSpecies: form.treeSpecies || null,
          woodType:    form.woodType    || 'LOG',
          volumeFm:    form.volumeFm    || null,
          logLength:   form.logLength   || null,
          layerCount:  form.layerCount  || null,
          qualityClass:form.qualityClass|| null,
          notes:       form.notes       || null,
        }),
      });

      if (!res.ok) {
        // Offline → lokal speichern
        await db.pendingLogPiles.add({
          orgSlug,
          forestId:    form.forestId,
          forestName:  form.forestName,
          lat:         form.lat,
          lng:         form.lng,
          treeSpecies: form.treeSpecies || null,
          woodType:    form.woodType    || 'LOG',
          volumeFm:    form.volumeFm    ? parseFloat(form.volumeFm) : null,
          logLength:   form.logLength   ? parseFloat(form.logLength) : null,
          layerCount:  form.layerCount  ? parseInt(form.layerCount) : null,
          qualityClass:form.qualityClass|| null,
          imageDataUrl:form.imageDataUrl,
          notes:       form.notes       || null,
          createdAt:   new Date().toISOString(),
          synced:      false,
        });
        setSavedPoiId('offline');
        setStep('saved');
        setSaving(false);
        return;
      }

      const data = await res.json();
      const poiId = data.poiId;

      // Foto hochladen falls vorhanden
      if (form.imageFile && poiId) {
        try {
          const fd = new FormData();
          fd.append('file', form.imageFile);
          await fetch(`/api/app/inventory/logpiles/${poiId}/image`, { method: 'POST', body: fd });
        } catch { /* Foto-Upload-Fehler nicht blockierend */ }
      }

      setSavedPoiId(poiId);
      setStep('saved');
    } catch {
      // Netzwerkfehler → offline speichern
      await db.pendingLogPiles.add({
        orgSlug,
        forestId:    form.forestId,
        forestName:  form.forestName,
        lat:         form.lat!,
        lng:         form.lng!,
        treeSpecies: form.treeSpecies || null,
        woodType:    form.woodType    || 'LOG',
        volumeFm:    form.volumeFm    ? parseFloat(form.volumeFm) : null,
        logLength:   form.logLength   ? parseFloat(form.logLength) : null,
        layerCount:  form.layerCount  ? parseInt(form.layerCount) : null,
        qualityClass:form.qualityClass|| null,
        imageDataUrl:form.imageDataUrl,
        notes:       form.notes       || null,
        createdAt:   new Date().toISOString(),
        synced:      false,
      });
      setSavedPoiId('offline');
      setStep('saved');
    }
    setSaving(false);
  };

  const reset = () => {
    setStep('forest');
    setForm({
      forestId: forests[0]?.id ?? '',
      forestName: forests[0]?.name ?? '',
      lat: null, lng: null,
      imageFile: null, imageDataUrl: null,
      treeSpecies: '', woodType: 'LOG',
      volumeFm: '', logLength: '', layerCount: '',
      qualityClass: '', notes: '',
    });
    setGpsError(null);
    setSavedPoiId(null);
    setSaveError(null);
    setSpeciesSearch('');
  };

  const tog = (val: string, current: string, set: (v: string) => void) =>
    set(current === val ? '' : val);

  // ── Schritt: Wald wählen ────────────────────────────────────────────────────
  if (step === 'forest') {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-2 text-emerald-400 mb-2">
          <PackageOpen size={20} />
          <span className="font-semibold">Polter erfassen</span>
        </div>
        <p className="text-sm text-slate-500">Für welchen Wald soll der Polter erfasst werden?</p>
        <div className="space-y-2">
          {forests.map(f => (
            <button
              key={f.id}
              onClick={() => { setForm(fm => ({ ...fm, forestId: f.id, forestName: f.name })); setStep('camera'); }}
              className="w-full text-left px-4 py-3.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-200 rounded-xl text-sm font-medium text-slate-800 transition-colors flex items-center justify-between"
            >
              {f.name}
              <ChevronRight size={16} className="text-slate-400" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Schritt: Foto + GPS ─────────────────────────────────────────────────────
  if (step === 'camera') {
    return (
      <div className="flex flex-col gap-5 p-4">
        {/* Fortschritt */}
        <div className="flex items-center gap-2">
          {(['camera', 'details'] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step === s ? 'bg-emerald-500 text-white' : i < ['camera','details'].indexOf(step) ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-400'
              }`}>{i + 1}</div>
              {i < 1 && <div className="flex-1 h-px bg-slate-200 w-8" />}
            </div>
          ))}
          <span className="text-xs text-slate-400 ml-1">Foto & Position</span>
        </div>

        {/* Foto */}
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">Foto (optional)</p>
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
          {form.imageDataUrl ? (
            <div className="relative rounded-xl overflow-hidden aspect-video bg-slate-100">
              <img src={form.imageDataUrl} alt="Polter" className="w-full h-full object-cover" />
              <button
                onClick={() => { setForm(f => ({ ...f, imageFile: null, imageDataUrl: null })); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 text-xs"
              >✕</button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-video bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-emerald-400 hover:text-emerald-500 transition-colors active:bg-slate-100"
            >
              <Camera size={36} />
              <span className="text-sm font-medium">Foto aufnehmen</span>
            </button>
          )}
        </div>

        {/* GPS */}
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">GPS-Position *</p>
          <button
            onClick={getGPS}
            disabled={gpsLoading}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-200 rounded-xl text-sm font-medium text-slate-700 transition-colors disabled:opacity-50"
          >
            {gpsLoading ? <RefreshCw size={16} className="animate-spin" /> : <MapPin size={16} className="text-emerald-400" />}
            {gpsLoading ? 'Wird ermittelt…' : form.lat ? 'Neu erfassen' : 'Position ermitteln'}
          </button>
          {form.lat != null && (
            <p className="mt-2 text-xs text-emerald-400 font-mono text-center">
              {form.lat.toFixed(5)}, {form.lng!.toFixed(5)}
            </p>
          )}
          {gpsError === 'insecure' && <p className="mt-2 text-xs text-red-400 text-center">GPS erfordert HTTPS.</p>}
          {gpsError === 'denied'   && <p className="mt-2 text-xs text-amber-400 text-center">GPS-Zugriff verweigert. Bitte in den Einstellungen freigeben.</p>}
          {gpsError === 'timeout'  && <p className="mt-2 text-xs text-amber-400 text-center">GPS-Signal zu schwach. Im Freien erneut versuchen.</p>}
          {gpsError === 'unavailable' && <p className="mt-2 text-xs text-amber-400 text-center">GPS nicht verfügbar auf diesem Gerät.</p>}
        </div>

        <button
          onClick={() => setStep('details')}
          disabled={form.lat == null}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          Weiter <ChevronRight size={18} />
        </button>
        <button onClick={reset} className="text-xs text-slate-500 text-center hover:text-slate-300">Abbrechen</button>
      </div>
    );
  }

  // ── Schritt: Details ────────────────────────────────────────────────────────
  if (step === 'details') {
    return (
      <div className="flex flex-col gap-5 p-4 pb-8">
        <button onClick={() => setStep('camera')} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
          <ChevronLeft size={16} /> Zurück
        </button>

        {/* Baumart */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Baumart</label>
          <input
            type="text"
            placeholder="Suchen…"
            value={speciesSearch}
            onChange={e => setSpeciesSearch(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 mb-2"
          />
          <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
            {filteredSpecies.map(s => (
              <button
                key={s.id}
                onClick={() => tog(s.id, form.treeSpecies, v => setForm(f => ({ ...f, treeSpecies: v })))}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors ${
                  form.treeSpecies === s.id ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Holzart */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Holzart</label>
          <div className="grid grid-cols-2 gap-1.5">
            {WOOD_TYPES.map(w => (
              <button
                key={w.id}
                onClick={() => setForm(f => ({ ...f, woodType: w.id }))}
                className={`py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  form.woodType === w.id ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>

        {/* Festmeter + Stammlänge */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Festmeter (fm)</label>
            <input
              type="number" inputMode="decimal"
              placeholder="z.B. 12.5"
              value={form.volumeFm}
              onChange={e => setForm(f => ({ ...f, volumeFm: e.target.value }))}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Stammlänge (m)</label>
            <input
              type="number" inputMode="decimal"
              placeholder="z.B. 4.0"
              value={form.logLength}
              onChange={e => setForm(f => ({ ...f, logLength: e.target.value }))}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Lagenanzahl */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Anzahl der Lagen</label>
          <input
            type="number" inputMode="numeric"
            placeholder="z.B. 3"
            value={form.layerCount}
            onChange={e => setForm(f => ({ ...f, layerCount: e.target.value }))}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Qualitätsklasse */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Qualitätsklasse</label>
          <div className="grid grid-cols-3 gap-1.5">
            {QUALITY_CLASSES.map(q => (
              <button
                key={q.id}
                onClick={() => tog(q.id, form.qualityClass, v => setForm(f => ({ ...f, qualityClass: v })))}
                className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                  form.qualityClass === q.id ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {q.id}
              </button>
            ))}
          </div>
          {form.qualityClass && (
            <p className="text-xs text-slate-400 mt-1">{QUALITY_CLASSES.find(q => q.id === form.qualityClass)?.label}</p>
          )}
        </div>

        {/* Notizen */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Notizen</label>
          <textarea
            rows={2}
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 resize-none"
          />
        </div>

        {saveError && (
          <div className="px-4 py-3 bg-red-50 border border-red-300 rounded-xl text-sm text-red-600">{saveError}</div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          {saving ? <RefreshCw size={18} className="animate-spin" /> : <><Check size={18} /> Polter speichern</>}
        </button>
      </div>
    );
  }

  // ── Schritt: Gespeichert ────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center justify-center p-8 gap-4 h-full">
      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
        {savedPoiId === 'offline'
          ? <CloudOff size={30} className="text-amber-400" />
          : <Check size={30} className="text-emerald-400" />
        }
      </div>
      <h2 className="font-bold text-lg">
        {savedPoiId === 'offline' ? 'Offline gespeichert' : 'Polter erfasst!'}
      </h2>
      <p className="text-sm text-slate-500 text-center">
        {savedPoiId === 'offline'
          ? 'Der Polter wird synchronisiert, sobald du wieder online bist.'
          : 'Der Polter wurde auf der Karte eingetragen und ist im Detailpanel sichtbar.'
        }
      </p>
      <button
        onClick={reset}
        className="mt-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold text-sm transition-colors"
      >
        Weiteren Polter erfassen
      </button>
    </div>
  );
}
