'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Camera, MapPin, ChevronRight, ChevronLeft,
  Check, CloudOff, RefreshCw, PackageOpen, Search,
} from 'lucide-react';
import { db } from '@/lib/inventory-db';
import { useTranslations, useLocale } from 'next-intl';
import { RotaryTuner } from '@/components/RotaryTuner';

const WOOD_TYPE_KEYS: { id: string; tKey: string }[] = [
  { id: 'LOG',        tKey: 'woodLog' },
  { id: 'INDUSTRIAL', tKey: 'woodIndustrial' },
  { id: 'ENERGY',     tKey: 'woodEnergy' },
  { id: 'PULP',       tKey: 'woodPulp' },
];

const QUALITY_CLASS_KEYS: { id: string; tKey: string }[] = [
  { id: 'A',  tKey: 'qualityA' },
  { id: 'B',  tKey: 'qualityB' },
  { id: 'C',  tKey: 'qualityC' },
  { id: 'D',  tKey: 'qualityD' },
  { id: 'IL', tKey: 'qualityIL' },
  { id: 'E',  tKey: 'qualityE' },
];

type Step = 'forest' | 'camera' | 'species' | 'woodType' | 'volume' | 'length' | 'quality' | 'notes' | 'saved';
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
  const t = useTranslations('MobileApp');
  const locale = useLocale();
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

  // ── Species from API ────────────────────────────────────────────────────────
  const [speciesList, setSpeciesList] = useState<{ id: string; label: string; color?: string }[]>([]);
  const CACHE_KEY = `polter_species_${orgSlug}_${locale}`;

  useEffect(() => {
    // Load from cache first
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) setSpeciesList(JSON.parse(cached));
    } catch { /* ignore */ }

    fetch(`/api/tree-species/search?orgSlug=${orgSlug}&limit=100&lang=${locale}`)
      .then(r => r.json())
      .then(data => {
        const results = data.results ?? [];
        setSpeciesList(results);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(results)); } catch { /* ignore */ }
      })
      .catch(() => {});
  }, [orgSlug, locale, CACHE_KEY]);

  const filteredSpecies = speciesList.filter(s =>
    s.label.toLowerCase().includes(speciesSearch.toLowerCase())
  );

  // Volume / length as numbers for RotaryTuner
  const [volumeNum, setVolumeNum] = useState(5.0);
  const [lengthNum, setLengthNum] = useState(4.0);

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
    getGPS();
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
    setVolumeNum(5.0);
    setLengthNum(4.0);
  };

  const tog = (val: string, current: string, set: (v: string) => void) =>
    set(current === val ? '' : val);

  // ── Schritt: Wald wählen ────────────────────────────────────────────────────
  if (step === 'forest') {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-2 text-emerald-400 mb-2">
          <PackageOpen size={20} />
          <span className="font-semibold">{t('polterCapture')}</span>
        </div>
        <p className="text-sm text-slate-500">{t('polterForWhichForest')}</p>
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
        {/* Titel */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{t('photoAndPosition')}</span>
        </div>

        {/* Foto */}
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">{t('photoOptional')}</p>
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
              <span className="text-sm font-medium">{t('takePhoto')}</span>
            </button>
          )}
        </div>

        {/* GPS Status (automatisch beim Foto) */}
        {gpsLoading && (
          <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
            <RefreshCw size={14} className="animate-spin" /> {t('detectingGps')}
          </div>
        )}
        {form.lat != null && (
          <p className="text-xs text-emerald-400 font-mono text-center">
            <MapPin size={12} className="inline mr-1" />{form.lat.toFixed(5)}, {form.lng!.toFixed(5)}
          </p>
        )}
        {gpsError && (
          <p className="text-xs text-amber-400 text-center">
            {gpsError === 'insecure' ? t('gpsRequiresHttps') : gpsError === 'denied' ? t('gpsDenied') : gpsError === 'timeout' ? t('gpsTimeout') : t('gpsUnavailable')}
          </p>
        )}

        <button
          onClick={() => setStep('species')}
          disabled={form.lat == null && !gpsLoading}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          {t('continue')} <ChevronRight size={18} />
        </button>
        <button onClick={reset} className="text-xs text-slate-500 text-center hover:text-slate-300">{t('cancel')}</button>
      </div>
    );
  }

  // ── Schritt: Baumart ─────────────────────────────────────────────────────
  if (step === 'species') {
    return (
      <div className="flex flex-col gap-4 p-4 pb-8">
        <button onClick={() => setStep('camera')} className="flex items-center gap-1 text-sm text-slate-500 mb-4">
          <ChevronLeft size={16} /> {t('back')}
        </button>

        <h2 className="text-lg font-semibold text-slate-800">{t('treeSpecies')}</h2>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t('search')}
            value={speciesSearch}
            onChange={e => setSpeciesSearch(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Favorites (first 6) */}
        {!speciesSearch && speciesList.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-400 mb-2">{t('favorites') ?? 'Favoriten'}</p>
            <div className="grid grid-cols-2 gap-2">
              {speciesList.slice(0, 6).map(s => (
                <button
                  key={s.id}
                  onClick={() => {
                    setForm(f => ({ ...f, treeSpecies: f.treeSpecies === s.id ? '' : s.id }));
                  }}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-left transition-colors ${
                    form.treeSpecies === s.id ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {s.color && <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />}
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search results */}
        {speciesSearch && (
          <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto">
            {filteredSpecies.map(s => (
              <button
                key={s.id}
                onClick={() => {
                  setForm(f => ({ ...f, treeSpecies: f.treeSpecies === s.id ? '' : s.id }));
                }}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium text-left transition-colors ${
                  form.treeSpecies === s.id ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {s.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />}
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* All species when not searching */}
        {!speciesSearch && speciesList.length > 6 && (
          <div>
            <p className="text-xs font-medium text-slate-400 mb-2">{t('allSpecies') ?? 'Alle Baumarten'}</p>
            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
              {speciesList.slice(6).map(s => (
                <button
                  key={s.id}
                  onClick={() => {
                    setForm(f => ({ ...f, treeSpecies: f.treeSpecies === s.id ? '' : s.id }));
                  }}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium text-left transition-colors ${
                    form.treeSpecies === s.id ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {s.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />}
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => setStep('woodType')}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors mt-2"
        >
          {t('continue')} <ChevronRight size={18} />
        </button>
      </div>
    );
  }

  // ── Schritt: Holzart ────────────────────────────────────────────────────────
  if (step === 'woodType') {
    return (
      <div className="flex flex-col gap-5 p-4 pb-8">
        <button onClick={() => setStep('species')} className="flex items-center gap-1 text-sm text-slate-500 mb-4">
          <ChevronLeft size={16} /> {t('back')}
        </button>

        <h2 className="text-lg font-semibold text-slate-800">{t('woodType')}</h2>

        <div className="grid grid-cols-2 gap-3">
          {WOOD_TYPE_KEYS.map(w => (
            <button
              key={w.id}
              onClick={() => setForm(f => ({ ...f, woodType: w.id }))}
              className={`py-4 rounded-xl text-sm font-semibold transition-colors ${
                form.woodType === w.id ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {t(w.tKey)}
            </button>
          ))}
        </div>

        <button
          onClick={() => setStep('volume')}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors mt-2"
        >
          {t('continue')} <ChevronRight size={18} />
        </button>
      </div>
    );
  }

  // ── Schritt: Volumen ────────────────────────────────────────────────────────
  if (step === 'volume') {
    return (
      <div className="flex flex-col gap-4 p-4 pb-8">
        <button onClick={() => setStep('woodType')} className="flex items-center gap-1 text-sm text-slate-500 mb-4">
          <ChevronLeft size={16} /> {t('back')}
        </button>

        <RotaryTuner
          value={volumeNum}
          onChange={setVolumeNum}
          onConfirm={() => {
            setForm(f => ({ ...f, volumeFm: String(volumeNum) }));
            setStep('length');
          }}
          min={0.5}
          max={100}
          step={0.5}
          unit={locale === 'de' ? 'fm' : 'm³'}
          label={t('volume')}
          decimals={1}
        />

        <button
          onClick={() => {
            setForm(f => ({ ...f, volumeFm: '' }));
            setStep('length');
          }}
          className="text-sm text-slate-400 text-center hover:text-slate-600 mt-2"
        >
          Weiter ohne Angabe
        </button>
      </div>
    );
  }

  // ── Schritt: Stammlänge ─────────────────────────────────────────────────────
  if (step === 'length') {
    return (
      <div className="flex flex-col gap-4 p-4 pb-8">
        <button onClick={() => setStep('volume')} className="flex items-center gap-1 text-sm text-slate-500 mb-4">
          <ChevronLeft size={16} /> {t('back')}
        </button>

        <RotaryTuner
          value={lengthNum}
          onChange={setLengthNum}
          onConfirm={() => {
            setForm(f => ({ ...f, logLength: String(lengthNum) }));
            setStep('quality');
          }}
          min={1}
          max={20}
          step={0.5}
          unit="m"
          label={t('logLength')}
          decimals={1}
        />

        <button
          onClick={() => {
            setForm(f => ({ ...f, logLength: '' }));
            setStep('quality');
          }}
          className="text-sm text-slate-400 text-center hover:text-slate-600 mt-2"
        >
          Weiter ohne Angabe
        </button>
      </div>
    );
  }

  // ── Schritt: Qualitätsklasse ────────────────────────────────────────────────
  if (step === 'quality') {
    return (
      <div className="flex flex-col gap-5 p-4 pb-8">
        <button onClick={() => setStep('length')} className="flex items-center gap-1 text-sm text-slate-500 mb-4">
          <ChevronLeft size={16} /> {t('back')}
        </button>

        <h2 className="text-lg font-semibold text-slate-800">{t('qualityClass')}</h2>

        <div className="grid grid-cols-3 gap-2">
          {QUALITY_CLASS_KEYS.map(q => (
            <button
              key={q.id}
              onClick={() => tog(q.id, form.qualityClass, v => setForm(f => ({ ...f, qualityClass: v })))}
              className={`py-4 rounded-xl text-sm font-semibold transition-colors ${
                form.qualityClass === q.id ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              <span className="text-base">{q.id}</span>
              <br />
              <span className="text-xs font-normal opacity-75">{t(q.tKey)}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => setStep('notes')}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors mt-2"
        >
          {t('continue')} <ChevronRight size={18} />
        </button>
      </div>
    );
  }

  // ── Schritt: Notizen ────────────────────────────────────────────────────────
  if (step === 'notes') {
    return (
      <div className="flex flex-col gap-5 p-4 pb-8">
        <button onClick={() => setStep('quality')} className="flex items-center gap-1 text-sm text-slate-500 mb-4">
          <ChevronLeft size={16} /> {t('back')}
        </button>

        <h2 className="text-lg font-semibold text-slate-800">{t('notes')}</h2>

        {/* Notizen */}
        <div>
          <textarea
            rows={4}
            placeholder={t('notes')}
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 resize-none"
          />
        </div>

        {/* Lagenanzahl */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">{t('layerCount')}</label>
          <input
            type="number" inputMode="numeric"
            placeholder="z.B. 3"
            value={form.layerCount}
            onChange={e => setForm(f => ({ ...f, layerCount: e.target.value }))}
            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {saveError && (
          <div className="px-4 py-3 bg-red-50 border border-red-300 rounded-xl text-sm text-red-600">{saveError}</div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors mt-2"
        >
          {saving ? <RefreshCw size={18} className="animate-spin" /> : <><Check size={18} /> {t('savePolter')}</>}
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
        {savedPoiId === 'offline' ? t('offlineSaved') : t('polterCaptured')}
      </h2>
      <p className="text-sm text-slate-500 text-center">
        {savedPoiId === 'offline'
          ? t('polterSyncNote')
          : t('polterSavedNote')
        }
      </p>
      <button
        onClick={reset}
        className="mt-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold text-sm transition-colors"
      >
        {t('captureAnother')}
      </button>
    </div>
  );
}
