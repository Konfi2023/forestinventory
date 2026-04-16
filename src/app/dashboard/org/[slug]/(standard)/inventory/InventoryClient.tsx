'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { TREE_SPECIES, getSpeciesLabel, getSpeciesColor } from '@/lib/tree-species';
import { db, type PendingTree, type PendingPlot } from '@/lib/inventory-db';
import { validateTreeMeasurement, estimateHeight, getTargetSampleSize, calcCo2Storage } from '@/lib/forest-mensuration';
import { RotaryTuner } from '@/components/RotaryTuner';
import {
  Camera, MapPin, Trees, ChevronRight, ChevronLeft, X,
  Check, CloudOff, RefreshCw, Leaf, Droplets, TreePine,
  ClipboardList, User, Loader2, CircleDot, Upload, Sparkles,
} from 'lucide-react';
import { DatePickerSheet, DateTrigger } from '@/app/app/tabs/DatePickerSheet';
import { ImportInventoryDialog } from './ImportInventoryDialog';
import { BhdMeasurement } from '@/components/BhdMeasurement';
import { useTranslations, useLocale } from 'next-intl';

const SOIL_CONDITIONS = [
  { id: 'SANDY', tKey: 'soilSandy' },
  { id: 'LOAMY', tKey: 'soilLoamy' },
  { id: 'CLAY', tKey: 'soilClay' },
  { id: 'HUMUS', tKey: 'soilHumus' },
  { id: 'ROCKY', tKey: 'soilRocky' },
  { id: 'MIXED', tKey: 'soilMixed' },
];

const SOIL_MOISTURE = [
  { id: 'DRY', tKey: 'moistDry' },
  { id: 'FRESH', tKey: 'moistFresh' },
  { id: 'MOIST', tKey: 'moistMoist' },
  { id: 'WET', tKey: 'moistWet' },
  { id: 'WATERLOGGED', tKey: 'moistWaterlogged' },
];

const EXPOSITIONS = [
  { id: 'N', tKey: 'expN' }, { id: 'NE', tKey: 'expNE' }, { id: 'E', tKey: 'expE' },
  { id: 'SE', tKey: 'expSE' }, { id: 'S', tKey: 'expS' }, { id: 'SW', tKey: 'expSW' },
  { id: 'W', tKey: 'expW' }, { id: 'NW', tKey: 'expNW' }, { id: 'FLAT', tKey: 'expFlat' },
];

const SLOPE_CLASSES = [
  { id: 'FLAT', tKey: 'slopeFlat' },
  { id: 'MODERATE', tKey: 'slopeModerate' },
  { id: 'STEEP', tKey: 'slopeSteep' },
  { id: 'VERY_STEEP', tKey: 'slopeVerySteep' },
];

const SLOPE_POSITIONS = [
  { id: 'SUMMIT', tKey: 'positionSummit' },
  { id: 'UPPER_SLOPE', tKey: 'positionUpperSlope' },
  { id: 'MID_SLOPE', tKey: 'positionMidSlope' },
  { id: 'LOWER_SLOPE', tKey: 'positionLowerSlope' },
  { id: 'VALLEY', tKey: 'positionValley' },
];

const STAND_TYPES = [
  { id: 'PURE_CONIFER',   tKey: 'standPureConifer' },
  { id: 'PURE_DECIDUOUS', tKey: 'standPureDeciduous' },
  { id: 'MIXED',          tKey: 'standMixed' },
  { id: 'EDGE',           tKey: 'standEdge' },
  { id: 'CLEARCUT',       tKey: 'standClearcut' },
  { id: 'YOUNG_GROWTH',   tKey: 'standYoungGrowth' },
];

const STOCKING_DEGREES = [
  { id: 'OPEN',       tKey: 'stockingOpen' },
  { id: 'SPARSE',     tKey: 'stockingSparse' },
  { id: 'MEDIUM',     tKey: 'stockingMedium' },
  { id: 'DENSE',      tKey: 'stockingDense' },
  { id: 'VERY_DENSE', tKey: 'stockingVeryDense' },
];

const DAMAGE_TYPES = [
  { id: 'BARK_BEETLE', tKey: 'damageBarkBeetle' },
  { id: 'DROUGHT', tKey: 'damageDrought' },
  { id: 'STORM', tKey: 'damageStorm' },
  { id: 'FUNGAL', tKey: 'damageFungal' },
  { id: 'BROWSING', tKey: 'damageBrowsing' },
  { id: 'SNOW_BREAK', tKey: 'damageSnowBreak' },
  { id: 'OTHER', tKey: 'damageOther' },
];

type Step = 'mode' | 'plot-setup' | 'camera' | 'bhd' | 'species' | 'height' | 'age' | 'crown' | 'crown-vitality' | 'health' | 'damage' | 'stand' | 'soil' | 'exposition' | 'notes' | 'review' | 'saved' | 'task' | 'plot-done' | 'summary';

const SINGLE_STEPS: Step[] = ['camera', 'bhd', 'species', 'height', 'age', 'crown', 'crown-vitality', 'health', 'stand', 'soil', 'exposition', 'notes', 'review'];
const PLOT_STEPS: Step[] = ['camera', 'bhd', 'species', 'height', 'age', 'crown', 'crown-vitality', 'health', 'stand', 'soil', 'exposition', 'notes', 'review'];

interface SessionTree {
  species: string;
  diameter: string;
  height: string;
  soilCondition:  string;
  soilMoisture:   string;
  exposition:     string;
  slopeClass:     string;
  slopePosition:  string;
  standType:      string;
  stockingDegree: string;
  lat: number | null;
  lng: number | null;
  forestName: string;
  synced: boolean;
}

interface Compartment { id: string; name: string | null; number: string | null; color: string | null; }
interface Forest { id: string; name: string; compartments?: Compartment[]; }

interface Member { id: string; firstName: string | null; lastName: string | null; email: string; }

interface InventoryClientProps {
  forests: Forest[];
  orgSlug: string;
  members?: Member[];
  userId?: string;
}

interface TreeForm {
  forestId: string;
  forestName: string;
  compartmentId: string;
  compartmentName: string;
  lat: number | null;
  lng: number | null;
  species: string;
  diameter: string;
  height: string;
  age: string;
  soilCondition:  string;
  soilMoisture:   string;
  exposition:     string;
  slopeClass:     string;
  slopePosition:  string;
  standType:      string;
  stockingDegree: string;
  notes: string;
}

const EMPTY_FORM: TreeForm = {
  forestId: '', forestName: '', compartmentId: '', compartmentName: '',
  lat: null, lng: null,
  species: '', diameter: '', height: '', age: '',
  soilCondition: '', soilMoisture: '',
  exposition: '', slopeClass: '', slopePosition: '',
  standType: '', stockingDegree: '',
  notes: '',
};

export function InventoryClient({ forests, orgSlug, members = [], userId = '' }: InventoryClientProps) {
  const t = useTranslations('Inventory');
  const m = useTranslations('MobileApp');
  const locale = useLocale();
  const [step, setStep] = useState<Step>('mode');
  const [showImport, setShowImport] = useState(false);
  const [mode, setMode] = useState<'single' | 'plot' | null>(null);
  const [form, setForm] = useState<TreeForm>(EMPTY_FORM);
  const [speciesSearch, setSpeciesSearch] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [crownPhotoPreview, setCrownPhotoPreview] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ ok: number; fail: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<'denied' | 'unavailable' | 'timeout' | 'insecure' | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [sessionTrees, setSessionTrees] = useState<SessionTree[]>([]);
  const [savedPoiId, setSavedPoiId] = useState<string | null>(null);
  // Task-Formular
  const [taskTitle, setTaskTitle]       = useState('');
  const [taskPriority, setTaskPriority] = useState('MEDIUM');
  const [taskDueDate, setTaskDueDate]   = useState('');
  const [taskShowDatePicker, setTaskShowDatePicker] = useState(false);
  const [taskAssigneeId, setTaskAssigneeId] = useState('');
  const [taskSaving, setTaskSaving]     = useState(false);
  const [taskSaveError, setTaskSaveError] = useState<string | null>(null);
  const [photoUploadStatus, setPhotoUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [locating, setLocating] = useState(false);
  const [isSavingTree, setIsSavingTree] = useState(false);
  // KI-Baumanalyse
  const [aiStatus, setAiStatus] = useState<'idle' | 'analyzing' | 'done' | 'error'>('idle');
  const [aiResult, setAiResult] = useState<{
    species?: string; speciesId?: string | null; speciesLabel?: string; speciesConfidence?: number;
    scientificName?: string;
    diameterCm?: number | null; heightM?: number | null;
    health?: string; damageType?: string | null; reasoning?: string;
  } | null>(null);
  // Species DB
  type SpeciesDTO = { id: string; scientificName: string; label: string; color: string; legacyId: string | null; isFavorite: boolean; usageCount: number; };
  const [speciesFavorites, setSpeciesFavorites] = useState<SpeciesDTO[]>([]);
  const [speciesResults, setSpeciesResults] = useState<SpeciesDTO[]>([]);
  const [speciesSearchLoading, setSpeciesSearchLoading] = useState(false);
  const speciesSearchTimeout = useRef<ReturnType<typeof setTimeout>>();
  const [selectedSpeciesLabel, setSelectedSpeciesLabel] = useState('');
  // BHD measurement
  const [bhdMeasureOpen, setBhdMeasureOpen] = useState(false);
  const [bhdMethod, setBhdMethod] = useState<'CARD' | 'ESTIMATE' | null>(null);
  // Crown AI analysis
  const [crownAiStatus, setCrownAiStatus] = useState<'idle' | 'analyzing' | 'done' | 'error'>('idle');
  const [crownAiResult, setCrownAiResult] = useState<{
    crownCondition?: number; crownDefoliation?: number; health?: string;
    damageType?: string | null; damageSeverity?: number | null;
    speciesConfirmation?: string | null; crownForm?: string; reasoning?: string;
  } | null>(null);
  const [formCrownCondition, setFormCrownCondition] = useState('');
  const [formDamageSeverity, setFormDamageSeverity] = useState('');
  const [formDamageType, setFormDamageType] = useState('');
  const [formHealth, setFormHealth] = useState('HEALTHY');
  const savingTreeRef = useRef(false);
  // Plot-Session (Probekreis)
  const [plotSession, setPlotSession] = useState<{ id: string; radiusM: number; name: string } | null>(null);
  const [plotRadius, setPlotRadius] = useState('10');
  const [plotName, setPlotName] = useState('');
  const [isCreatingPlot, setIsCreatingPlot] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoFileRef = useRef<File | null>(null);
  const crownFileInputRef = useRef<HTMLInputElement>(null);
  const crownPhotoFileRef = useRef<File | null>(null);

  // Load species on mount + cache for offline
  useEffect(() => {
    const CACHE_KEY = 'species_cache';

    // 1. Sofort aus localStorage laden (offline-fähig)
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw);
        if (Array.isArray(cached) && cached.length > 0) {
          setSpeciesFavorites(cached.filter((s: any) => s.isFavorite).sort((a: any, b: any) => (b.usageCount ?? 0) - (a.usageCount ?? 0)));
          setSpeciesResults(cached);
        }
      }
    } catch {}

    // 2. Vom Server laden
    fetch(`/api/tree-species/search?orgSlug=${orgSlug}&limit=100&lang=${locale}`)
      .then(r => r.json())
      .then(data => {
        const favorites = data.favorites ?? [];
        const results = data.results ?? [];
        setSpeciesFavorites(favorites);
        setSpeciesResults(results);

        // Cache aktualisieren
        const all = [...results];
        for (const fav of favorites) {
          if (!all.find((s: any) => s.id === fav.id)) all.push(fav);
        }
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(all)); } catch {}
      })
      .catch(() => {});
  }, [orgSlug]);

  // Search species — online vom Server, offline aus localStorage
  function getSpeciesCache(): any[] {
    try {
      const raw = localStorage.getItem('species_cache');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  function searchSpeciesDb(query: string) {
    clearTimeout(speciesSearchTimeout.current);
    if (query.length < 1) {
      fetch(`/api/tree-species/search?orgSlug=${orgSlug}&limit=100&lang=${locale}`)
        .then(r => r.json())
        .then(data => { setSpeciesResults(data.results ?? []); setSpeciesSearchLoading(false); })
        .catch(() => {
          setSpeciesResults(getSpeciesCache());
          setSpeciesSearchLoading(false);
        });
      return;
    }
    setSpeciesSearchLoading(true);
    speciesSearchTimeout.current = setTimeout(() => {
      fetch(`/api/tree-species/search?q=${encodeURIComponent(query)}&orgSlug=${orgSlug}&lang=${locale}`)
        .then(r => r.json())
        .then(data => { setSpeciesResults(data.results ?? []); setSpeciesSearchLoading(false); })
        .catch(() => {
          const q = query.toLowerCase();
          const filtered = getSpeciesCache().filter((s: any) =>
            (s.label ?? '').toLowerCase().includes(q) ||
            (s.scientificName ?? '').toLowerCase().includes(q)
          );
          setSpeciesResults(filtered);
          setSpeciesSearchLoading(false);
        });
    }, 250);
  }

  // KI-Ergebnis in Formularfelder übernehmen (eigener Effect, nach GPS-Updates)
  useEffect(() => {
    if (!aiResult) return;
    // Use speciesId from AI (DB-matched), fallback to legacy species
    const newSpecies = aiResult.speciesId ?? (aiResult.species && aiResult.species !== 'OTHER' ? aiResult.species : null);
    setForm(f => ({
      ...f,
      species:  newSpecies ?? f.species,
      // AI never overwrites BHD — measurement comes from card or manual input only
      diameter: f.diameter,
      height:   aiResult.heightM != null ? String(aiResult.heightM) : f.height,
    }));
    if (aiResult.speciesLabel) setSelectedSpeciesLabel(aiResult.speciesLabel);
  }, [aiResult]);

  // Crown AI result → fill crown health fields
  useEffect(() => {
    if (!crownAiResult) return;
    if (crownAiResult.crownCondition != null) setFormCrownCondition(String(crownAiResult.crownCondition));
    if (crownAiResult.damageSeverity != null) setFormDamageSeverity(String(crownAiResult.damageSeverity));
    if (crownAiResult.damageType) setFormDamageType(crownAiResult.damageType);
    if (crownAiResult.health) setFormHealth(crownAiResult.health);
    // If crown confirms/changes species with higher confidence
    if (crownAiResult.speciesConfirmation && aiResult?.speciesConfidence && aiResult.speciesConfidence < 0.7) {
      // Crown photo may give better species ID — but don't override user selection
    }
  }, [crownAiResult]);

  // Online-Status und Pending-Count
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const onOnline = () => { setIsOnline(true); syncPending(); };
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    loadPendingCount();
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  async function loadPendingCount() {
    const count = await db.pendingTrees.where('synced').equals(0).count();
    setPendingCount(count);
  }

  const syncPending = useCallback(async () => {
    setIsSyncing(true);
    setSyncResult(null);
    const pending = await db.pendingTrees.where('synced').equals(0).toArray();

    if (pending.length === 0) {
      setIsSyncing(false);
      return 0;
    }

    // Alle ausstehenden Bäume parallel hochladen (statt sequentiell)
    const results = await Promise.allSettled(
      pending.map(async (tree) => {
        const res = await fetch('/api/inventory/tree', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            forestId:       tree.forestId,
            compartmentId:  tree.compartmentId ?? undefined,
            lat:            tree.lat,
            lng:            tree.lng,
            species:        tree.species,
            diameter:       tree.diameter,
            height:         tree.height,
            age:            tree.age,
            soilCondition:  tree.soilCondition,
            soilMoisture:   tree.soilMoisture,
            exposition:     tree.exposition,
            slopeClass:     tree.slopeClass,
            slopePosition:  tree.slopePosition,
            standType:      tree.standType,
            stockingDegree: tree.stockingDegree,
            damageType:     tree.damageType,
            damageSeverity: tree.damageSeverity,
            crownCondition: tree.crownCondition,
            notes:          tree.notes,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        await db.pendingTrees.update(tree.id!, { synced: true });
      })
    );

    const ok   = results.filter(r => r.status === 'fulfilled').length;
    const fail = results.filter(r => r.status === 'rejected').length;

    setIsSyncing(false);
    setSyncResult({ ok, fail });
    // Meldung nach 4 Sekunden ausblenden
    setTimeout(() => setSyncResult(null), 4000);

    await loadPendingCount();
    return ok;
  }, []);

  function captureGpsPromise(): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && !window.isSecureContext) { reject(new Error('insecure')); return; }
      if (!navigator.geolocation) { reject(new Error('unavailable')); return; }
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        err => {
          if (err.code === 3) {
            navigator.geolocation.getCurrentPosition(
              pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
              err2 => reject(err2),
              { enableHighAccuracy: false, timeout: 10000 }
            );
          } else reject(err);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  function captureGps() {
    if (typeof window !== 'undefined' && !window.isSecureContext) { setGpsError('insecure'); return; }
    if (!navigator.geolocation) { setGpsError('unavailable'); return; }
    setGpsLoading(true);
    setGpsError(null);
    setLocating(true);
    captureGpsPromise()
      .then(coords => {
        setForm(f => ({ ...f, lat: coords.lat, lng: coords.lng }));
        setGpsLoading(false);
        return fetch(`/api/app/locate?lat=${coords.lat}&lng=${coords.lng}&orgSlug=${orgSlug}`);
      })
      .then(res => res.json())
      .then(data => {
        if (data.forestId) {
          setForm(f => ({
            ...f,
            forestId:        data.forestId,
            forestName:      data.forestName,
            compartmentId:   data.compartmentId   ?? '',
            compartmentName: data.compartmentName ?? '',
          }));
        }
      })
      .catch(err => {
        setGpsLoading(false);
        const code = err?.code;
        if (err?.message === 'insecure') setGpsError('insecure');
        else if (err?.message === 'unavailable') setGpsError('unavailable');
        else if (code === 1) setGpsError('denied');
        else if (code === 3) setGpsError('timeout');
        else setGpsError('unavailable');
      })
      .finally(() => setLocating(false));
  }

  async function analyzeTreePhoto(file: File) {
    setAiStatus('analyzing');
    setAiResult(null);
    try {
      // Compress before sending to AI (smaller payload)
      const compressed = await compressImage(file);
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => {
          const dataUrl = reader.result as string;
          resolve(dataUrl.split(',')[1]); // strip data:...;base64, prefix
        };
        reader.readAsDataURL(compressed);
      });

      const res = await fetch('/api/ai/tree-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType: 'image/jpeg', lang: locale }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      setAiResult(result);
      setAiStatus('done');
    } catch {
      setAiStatus('error');
    }
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    photoFileRef.current = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
      // Beide Updates zusammen — React batycht sie in einem Render
      // Das BHD-Overlay oeffnet sich sofort mit dem Bild
      const dataUrl = ev.target?.result as string;
      setPhotoPreview(dataUrl);
      setBhdMeasureOpen(true);
    };
    reader.readAsDataURL(file);
    // Trigger GPS + locate silently in background
    captureGps();
    // Trigger AI analysis in background
    if (navigator.onLine) analyzeTreePhoto(file);
  }

  async function analyzeCrownPhoto(file: File) {
    setCrownAiStatus('analyzing');
    setCrownAiResult(null);
    try {
      const compressed = await compressImage(file);
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(compressed);
      });
      const res = await fetch('/api/ai/crown-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType: 'image/jpeg', lang: locale }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      setCrownAiResult(result);
      setCrownAiStatus('done');
    } catch {
      setCrownAiStatus('error');
    }
  }

  function handleCrownPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    crownPhotoFileRef.current = file;
    const reader = new FileReader();
    reader.onload = (ev) => setCrownPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    if (navigator.onLine) analyzeCrownPhoto(file);
  }

  // Komprimiert ein Bild auf max. 1200px und JPEG-Qualität 0.75
  function compressImage(file: File): Promise<Blob> {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const MAX = 1200;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
          else { width = Math.round(width * MAX / height); height = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => resolve(blob ?? file), 'image/jpeg', 0.75);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  async function saveTree() {
    if (savingTreeRef.current) return;
    savingTreeRef.current = true;
    setIsSavingTree(true);
    const treeData: Omit<PendingTree, 'id'> = {
      forestId:          form.forestId,
      forestName:        form.forestName,
      compartmentId:     form.compartmentId || undefined,
      plotId:            plotSession?.id && !plotSession.id.startsWith('local-') ? plotSession.id : undefined,
      lat:               form.lat ?? 0,
      lng:               form.lng ?? 0,
      species:           form.species || 'OTHER',
      diameter:          form.diameter ? parseFloat(form.diameter) : null,
      height:            form.height   ? parseFloat(form.height)   : null,
      age:               form.age      ? parseInt(form.age)        : null,
      soilCondition:     form.soilCondition  || null,
      soilMoisture:      form.soilMoisture   || null,
      exposition:        form.exposition     || null,
      slopeClass:        form.slopeClass     || null,
      slopePosition:     form.slopePosition  || null,
      standType:         form.standType      || null,
      stockingDegree:    form.stockingDegree || null,
      damageType:        formDamageType || null,
      damageSeverity:    formDamageSeverity ? parseInt(formDamageSeverity) : null,
      crownCondition:    formCrownCondition ? parseInt(formCrownCondition) : null,
      imageDataUrl:      photoPreview,
      crownImageDataUrl: crownPhotoPreview,
      notes:             form.notes || null,
      createdAt:         new Date().toISOString(),
      synced:            false,
    };

    // Offline-First: IMMER zuerst lokal in IndexedDB sichern
    const localId = await db.pendingTrees.add(treeData);
    await loadPendingCount();

    // Dann im Hintergrund versuchen, zum Server zu syncen
    if (isOnline) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000); // 15s Timeout
        const res = await fetch('/api/inventory/tree', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...treeData, speciesId: form.species, orgSlug }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (res.ok) {
          treeData.synced = true;
          await db.pendingTrees.update(localId, { synced: true });
          await loadPendingCount();
          const { poiId } = await res.json();
          setSavedPoiId(poiId ?? null);
          if (poiId) {
            setPhotoUploadStatus('uploading');
            try {
              // Stammfoto hochladen
              if (photoFileRef.current) {
                const compressed = await compressImage(photoFileRef.current);
                const fd = new FormData();
                fd.append('file', new File([compressed], 'tree.jpg', { type: 'image/jpeg' }));
                await fetch(`/api/app/inventory/trees/${poiId}/image?type=trunk`, { method: 'POST', body: fd });
              }
              // Kronenfoto hochladen
              if (crownPhotoFileRef.current) {
                const compressed = await compressImage(crownPhotoFileRef.current);
                const fd = new FormData();
                fd.append('file', new File([compressed], 'crown.jpg', { type: 'image/jpeg' }));
                await fetch(`/api/app/inventory/trees/${poiId}/image?type=crown`, { method: 'POST', body: fd });
              }
              setPhotoUploadStatus('success');
            } catch {
              setPhotoUploadStatus('error');
            }

            // AI-Ergebnisse persistieren (non-blocking)
            try {
              if (aiResult) {
                fetch(`/api/app/inventory/trees/${poiId}/ai-analysis`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ analysisType: 'TREE_PHOTO', data: aiResult }),
                }).catch(() => {});
              }
              if (crownAiResult) {
                fetch(`/api/app/inventory/trees/${poiId}/ai-analysis`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ analysisType: 'CROWN_PHOTO', data: crownAiResult }),
                }).catch(() => {});
              }
            } catch { /* non-fatal */ }
          }
        }
      } catch {
        // Server nicht erreichbar — Baum ist bereits lokal gesichert
      }
    }

    setSessionTrees(prev => [...prev, {
      species:        form.species || 'OTHER',
      diameter:       form.diameter,
      height:         form.height,
      soilCondition:  form.soilCondition,
      soilMoisture:   form.soilMoisture,
      exposition:     form.exposition,
      slopeClass:     form.slopeClass,
      slopePosition:  form.slopePosition,
      standType:      form.standType,
      stockingDegree: form.stockingDegree,
      lat:            form.lat,
      lng:            form.lng,
      forestName:     form.forestName,
      synced:         treeData.synced,
    }]);
    setSavedCount(c => c + 1);
    setIsSavingTree(false);
    savingTreeRef.current = false;
    setStep('saved');
  }

  function nextTree() {
    const forestId        = form.forestId;
    const forestName      = form.forestName;
    const compartmentId   = form.compartmentId;
    const compartmentName = form.compartmentName;
    setForm({ ...EMPTY_FORM, forestId, forestName, compartmentId, compartmentName });
    setPhotoPreview(null);
    setAiStatus('idle');
    setAiResult(null);
    setSelectedSpeciesLabel('');
    setBhdMethod(null);
    setBhdMeasureOpen(false);
    setCrownAiStatus('idle');
    setCrownAiResult(null);
    setFormCrownCondition('');
    setFormDamageSeverity('');
    setFormDamageType('');
    setFormHealth('HEALTHY');
    photoFileRef.current = null;
    setCrownPhotoPreview(null);
    crownPhotoFileRef.current = null;
    setSpeciesSearch('');
    setGpsError(null);
    setSavedPoiId(null);
    setTaskTitle(''); setTaskPriority('MEDIUM'); setTaskDueDate(''); setTaskAssigneeId(''); setTaskShowDatePicker(false);
    setPhotoUploadStatus('idle');
    setStep('camera');
  }

  function finish() {
    setStep('summary');
  }

  function startNew() {
    setForm(EMPTY_FORM);
    setPhotoPreview(null);
    photoFileRef.current = null;
    setCrownPhotoPreview(null);
    crownPhotoFileRef.current = null;
    setSpeciesSearch('');
    setSavedCount(0);
    setSessionTrees([]);
    setGpsError(null);
    setSavedPoiId(null);
    setTaskTitle(''); setTaskPriority('MEDIUM'); setTaskDueDate(''); setTaskAssigneeId(''); setTaskShowDatePicker(false);
    setPhotoUploadStatus('idle');
    setPlotSession(null);
    setPlotRadius('10');
    setPlotName('');
    setMode(null);
    setStep('mode');
  }

  async function saveTask() {
    if (!taskTitle.trim()) return;
    setTaskSaving(true);
    setTaskSaveError(null);
    try {
      const res = await fetch('/api/app/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgSlug,
          title:      taskTitle.trim(),
          forestId:   form.forestId,
          priority:   taskPriority,
          assigneeId: taskAssigneeId || undefined,
          dueDate:    taskDueDate    || undefined,
          poiId:      savedPoiId     || undefined,
          lat:        form.lat       ?? undefined,
          lng:        form.lng       ?? undefined,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStep('saved');
    } catch {
      setTaskSaveError(m('taskSaveError'));
    }
    setTaskSaving(false);
  }

  async function createPlot(): Promise<boolean> {
    if (!form.forestId || !form.lat) return false;
    setIsCreatingPlot(true);
    const radiusM = parseFloat(plotRadius) || 10;
    const autoName = plotName || `Plot ${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
    const pendingPlot: Omit<PendingPlot, 'id'> = {
      forestId:      form.forestId,
      compartmentId: form.compartmentId || undefined,
      lat:           form.lat,
      lng:           form.lng ?? 0,
      radiusM,
      name:          plotName || undefined,
      createdAt:     new Date().toISOString(),
      synced:        false,
    };
    if (isOnline) {
      try {
        const res = await fetch('/api/inventory/plot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...pendingPlot }),
        });
        if (res.ok) {
          const { plotId } = await res.json();
          setPlotSession({ id: plotId, radiusM, name: autoName });
          setIsCreatingPlot(false);
          return true;
        }
      } catch {}
    }
    const localId = await db.pendingPlots.add(pendingPlot);
    setPlotSession({ id: `local-${localId}`, radiusM, name: autoName });
    setIsCreatingPlot(false);
    return true;
  }

  function finishPlot() {
    setStep('plot-done');
  }

  function startNewPlot() {
    setPlotSession(null);
    setPlotRadius('10');
    setPlotName('');
    setForm(EMPTY_FORM);
    setPhotoPreview(null);
    photoFileRef.current = null;
    setCrownPhotoPreview(null);
    crownPhotoFileRef.current = null;
    setSpeciesSearch('');
    setGpsError(null);
    setSavedPoiId(null);
    setPhotoUploadStatus('idle');
    setStep('plot-setup');
  }

  const filteredSpecies = TREE_SPECIES.filter(s =>
    s.label.toLowerCase().includes(speciesSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {bhdMeasureOpen && photoPreview && (
        <BhdMeasurement
          photoSrc={photoPreview}
          t={m}
          onMeasured={(bhdCm) => {
            setForm(f => ({ ...f, diameter: String(bhdCm) }));
            setBhdMethod('CARD');
            setBhdMeasureOpen(false);
          }}
          onSkip={() => setBhdMeasureOpen(false)}
        />
      )}
      {/* Abbrechen-Bestätigung */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-[9998] bg-black/50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 mb-2">{m('cancelConfirmTitle')}</h3>
            <p className="text-sm text-slate-500 mb-6">{m('cancelConfirmDesc')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-colors"
              >
                {m('continueCapture')}
              </button>
              <button
                onClick={() => { setShowCancelConfirm(false); startNew(); }}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition-colors"
              >
                {m('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
      {showImport && (
        <ImportInventoryDialog
          forests={forests}
          orgSlug={orgSlug}
          userId={userId}
          onClose={() => setShowImport(false)}
          onImported={() => setShowImport(false)}
        />
      )}
      {/* Header — versteckt auf Tuner-Screens */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shrink-0" style={{ display: ['bhd', 'height', 'age', 'crown-vitality'].includes(step) ? 'none' : undefined }}
        <div className="flex items-center gap-2">
          <TreePine size={20} className="text-emerald-600" />
          <span className="font-semibold text-sm">{m('forestInventory')}</span>
          {form.forestName && (
            <span className="text-xs text-slate-400 hidden sm:block">· {form.forestName}</span>
          )}
          {/* Abbrechen-Button: nur sichtbar während aktiver Erfassung */}
          {step !== 'mode' && step !== 'saved' && step !== 'summary' && step !== 'plot-done' && step !== 'task' && (
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="ml-2 flex items-center gap-1 text-xs text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-lg transition-colors"
            >
              <X size={12} /> {m('cancel')}
            </button>
          )}
          {plotSession && (
            <span className="flex items-center gap-1 text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">
              <CircleDot size={10} /> {plotSession.name} · r={plotSession.radiusM}m
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Offline-Badge */}
          {!isOnline && (
            <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
              <CloudOff size={12} /> {m('offline')}
            </span>
          )}
          {/* Sync-Ergebnis-Badge */}
          {syncResult && (
            <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
              syncResult.fail > 0
                ? 'bg-amber-100 text-amber-700'
                : 'bg-emerald-100 text-emerald-700'
            }`}>
              {syncResult.fail > 0
                ? `✓ ${syncResult.ok} sync · ${syncResult.fail} ${m('failed')}`
                : `✓ ${m('synced', { count: syncResult.ok })}`
              }
            </span>
          )}
          {/* Pending-Sync-Badge */}
          {pendingCount > 0 && !syncResult && (
            <button
              onClick={syncPending}
              disabled={!isOnline || isSyncing}
              className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full hover:bg-blue-100 hover:bg-blue-200 disabled:opacity-50"
            >
              <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? 'Sync…' : `${pendingCount} ${m('pending')}`}
            </button>
          )}
        </div>
      </div>

      {/* Aktiver Plot-Banner */}
      {mode === 'plot' && plotSession && step !== 'mode' && step !== 'plot-setup' && step !== 'plot-done' && step !== 'summary' && (
        <div className="flex items-center gap-2 px-4 py-2 bg-violet-100 border-b border-violet-200 shrink-0">
          <CircleDot size={13} className="text-violet-700 shrink-0" />
          <span className="text-xs font-semibold text-violet-800">{plotSession.name}</span>
          <span className="text-xs text-violet-600">· Radius {plotSession.radiusM} m · {savedCount} {savedCount === 1 ? m('tree') : m('trees')} {m('captured')}</span>
          <button onClick={finishPlot} className="ml-auto text-xs text-violet-700 hover:text-violet-900 underline shrink-0">
            {m('finishPlot')}
          </button>
        </div>
      )}

      {/* Steps Indicator */}
      {step !== 'mode' && step !== 'plot-setup' && step !== 'plot-done' && step !== 'saved' && step !== 'summary' && step !== 'task' && step !== 'bhd' && step !== 'height' && step !== 'age' && step !== 'crown-vitality' && (() => {
        const steps = mode === 'plot' ? PLOT_STEPS : SINGLE_STEPS;
        const idx = steps.indexOf(step);
        if (idx < 0) return null;
        return (
          <div className="flex px-4 pt-3 gap-1 shrink-0">
            {steps.map((s, i) => (
              <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${i <= idx ? 'bg-emerald-500' : 'bg-slate-200'}`} />
            ))}
          </div>
        );
      })()}

      {/* Content — kein Scroll auf Tuner-Screens */}
      <div className={`flex-1 ${['bhd', 'height', 'age', 'crown-vitality'].includes(step) ? 'overflow-hidden' : 'overflow-y-auto'}`}>

        {/* MODE: Auswahl */}
        {step === 'mode' && (
          <div className="p-6 flex flex-col gap-4 pt-10">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold mb-1">{m('startCapture')}</h2>
              <p className="text-slate-400 text-sm">{m('howToMeasure')}</p>
            </div>
            <button
              onClick={() => { setMode('single'); setStep('camera'); }}
              className="w-full flex flex-col items-start gap-1.5 px-5 py-5 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-400 rounded-2xl transition-colors text-left shadow-sm"
            >
              <div className="flex items-center gap-2 mb-1">
                <TreePine size={22} className="text-emerald-600" />
                <span className="text-lg font-bold">{m('singleTree')}</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                {m('singleTreeDesc')}
              </p>
            </button>
            <button
              onClick={() => { setMode('plot'); setStep('plot-setup'); captureGps(); }}
              className="w-full flex flex-col items-start gap-1.5 px-5 py-5 bg-white hover:bg-violet-50 border border-slate-200 hover:border-violet-400 rounded-2xl transition-colors text-left shadow-sm"
            >
              <div className="flex items-center gap-2 mb-1">
                <CircleDot size={22} className="text-violet-600" />
                <span className="text-lg font-bold">{m('plotSample')}</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                {m('plotSampleDesc')}
              </p>
            </button>
            <button
              onClick={() => setShowImport(true)}
              className="w-full flex flex-col items-start gap-1.5 px-5 py-5 bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-400 rounded-2xl transition-colors text-left shadow-sm"
            >
              <div className="flex items-center gap-2 mb-1">
                <Upload size={22} className="text-amber-600" />
                <span className="text-lg font-bold">{m('dataImport')}</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                {m('dataImportDesc')}
              </p>
            </button>
            {(pendingCount > 0 || sessionTrees.length > 0) && (
              <button onClick={() => setStep('summary')}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm text-slate-700 transition-colors">
                {m('lastSession')} ({savedCount} {m('trees')})
              </button>
            )}
          </div>
        )}

        {/* PLOT-SETUP */}
        {step === 'plot-setup' && (
          <div className="p-4">
            <h2 className="text-xl font-bold mb-1">{m('setupPlot')}</h2>
            <p className="text-slate-400 text-sm mb-5">{m('setupPlotDesc')}</p>

            {/* GPS Status */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 mb-4 flex items-center gap-3">
              <MapPin size={16} className={locating || gpsLoading ? 'text-amber-600 animate-pulse' : form.lat ? 'text-emerald-600' : 'text-slate-500'} />
              <div className="flex-1 min-w-0">
                {locating || gpsLoading ? (
                  <p className="text-sm text-amber-600">{m('detectingGps')}</p>
                ) : form.lat ? (
                  <p className="text-sm text-emerald-600 font-mono">{form.lat.toFixed(5)}, {form.lng?.toFixed(5)}</p>
                ) : (
                  <p className="text-sm text-slate-500">{m('gpsNoSignal')}</p>
                )}
              </div>
              <button onClick={captureGps} disabled={gpsLoading || locating}
                className="text-xs text-slate-400 hover:text-emerald-600 disabled:opacity-40 shrink-0">
                {m('new')}
              </button>
            </div>

            {/* Wald */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                <Trees size={14} className="text-emerald-600" /> {m('forest')}
              </label>
              <select
                value={form.forestId}
                onChange={e => {
                  const f = forests.find(f => f.id === e.target.value);
                  setForm(prev => ({ ...prev, forestId: e.target.value, forestName: f?.name ?? '', compartmentId: '', compartmentName: '' }));
                }}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-violet-500"
              >
                <option value="">{m('selectForestPlaceholder')}</option>
                {forests.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>

            {/* Abteilung */}
            {form.forestId && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">{m('compartment')}</label>
                <div className="space-y-2">
                  {(forests.find(f => f.id === form.forestId)?.compartments ?? []).map(c => (
                    <button key={c.id}
                      onClick={() => setForm(f => ({ ...f, compartmentId: c.id, compartmentName: c.name ?? '' }))}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-colors border ${
                        form.compartmentId === c.id
                          ? 'bg-violet-600/20 border-violet-500 text-white'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: c.color ?? '#3b82f6' }} />
                        <span className="font-medium">{c.number ? `[${c.number}]` : ''}{c.name ? ` ${c.name}` : ''}{!c.number && !c.name ? m('compartment') : ''}</span>
                      </div>
                      {form.compartmentId === c.id && <Check size={16} className="text-violet-600" />}
                    </button>
                  ))}
                  <button
                    onClick={() => setForm(f => ({ ...f, compartmentId: '', compartmentName: '' }))}
                    className={`w-full px-4 py-3 rounded-xl text-left text-sm border transition-colors ${
                      form.compartmentId === ''
                        ? 'bg-slate-200 border-slate-400 text-slate-700'
                        : 'bg-slate-50 border-dashed border-slate-300 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {m('noCompartment')}
                  </button>
                </div>
              </div>
            )}

            {/* Radius + Name */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">{m('plotRadius')}</label>
                <input
                  type="number" inputMode="decimal"
                  value={plotRadius}
                  onChange={e => setPlotRadius(e.target.value)}
                  placeholder="10"
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">{m('plotLabel')}</label>
                <input
                  type="text"
                  value={plotName}
                  onChange={e => setPlotName(e.target.value)}
                  placeholder="z.B. Plot 1"
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            <button
              onClick={async () => { const ok = await createPlot(); if (ok) setStep('camera'); }}
              disabled={!form.forestId || !form.lat || isCreatingPlot}
              className="w-full py-4 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              {isCreatingPlot ? <Loader2 size={18} className="animate-spin" /> : <CircleDot size={18} />}
              {m('startPlot')}
            </button>
            {!form.lat && (
              <p className="text-xs text-amber-600 mt-2 text-center">{m('waitingGps')}</p>
            )}
            {!form.forestId && form.lat && (
              <p className="text-xs text-amber-600 mt-2 text-center">{m('selectForestFirst')}</p>
            )}
          </div>
        )}

        {/* SCHRITT 1: Kamera (versteckt wenn BHD-Overlay aktiv) */}
        {step === 'camera' && !bhdMeasureOpen && (
          <div className="p-4">
            <h2 className="text-xl font-bold mb-1">{m('photographTree')}</h2>
            <p className="text-slate-400 text-sm mb-3">{m('photographTreeDesc')}</p>
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 mb-4">
              <span className="text-blue-500 text-base mt-0.5">💳</span>
              <p className="text-xs text-blue-700 leading-relaxed">
                {m('bhdMeasureHint')}
              </p>
            </div>

            {/* Foto */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`relative w-full aspect-video rounded-xl flex items-center justify-center cursor-pointer transition-colors mb-4 overflow-hidden ${
                photoPreview ? '' : 'bg-slate-100 hover:bg-slate-200 border-2 border-dashed border-slate-300'
              }`}
            >
              {photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoPreview} alt={m('tree')} className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <Camera size={40} />
                  <span className="text-sm">{m('takePhoto')}</span>
                </div>
              )}
              {photoPreview && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <Camera size={32} className="text-white" />
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhoto}
            />


            {/* GPS-Status (mini, im Hintergrund) */}
            {(gpsLoading || form.lat) && (
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                <MapPin size={12} className={gpsLoading ? 'animate-pulse text-emerald-500' : 'text-emerald-600'} />
                {gpsLoading ? m('detectingGps') : `${form.lat?.toFixed(5)}, ${form.lng?.toFixed(5)}`}
              </div>
            )}

            {/* KI-Analyse-Ergebnis */}
            {aiStatus === 'analyzing' && (
              <div className="flex items-center gap-2 text-xs text-violet-600 mb-4 bg-violet-50 rounded-xl px-3 py-2.5">
                <Loader2 size={14} className="animate-spin" />
                {m('aiAnalyzing')}
              </div>
            )}
            {aiStatus === 'done' && aiResult && (
              <div className="mb-4 bg-violet-50 border border-violet-100 rounded-xl px-3 py-2.5 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-violet-700">
                  <Sparkles size={12} />
                  {m('aiSuggestion')}
                </div>
                <p className="text-sm text-slate-700">
                  <span className="font-medium">{aiResult.speciesLabel || aiResult.species}</span>
                  {aiResult.speciesConfidence != null && (
                    <span className="text-slate-400 ml-1">({Math.round(aiResult.speciesConfidence * 100)} %)</span>
                  )}
                  {aiResult.heightM != null && (
                    <span className="text-slate-500"> · {m('heightLabel')} {aiResult.heightM} m</span>
                  )}
                </p>
                {aiResult.reasoning && (
                  <p className="text-[11px] text-slate-400 leading-relaxed">{aiResult.reasoning}</p>
                )}
                {aiResult.health && aiResult.health !== 'HEALTHY' && (
                  <p className="text-[11px] text-amber-600">
                    {aiResult.health === 'DAMAGED' ? m('damaged') : m('dead')}
                    {aiResult.damageType && ` (${aiResult.damageType})`}
                  </p>
                )}
              </div>
            )}
            {aiStatus === 'error' && (
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
                <Sparkles size={12} />
                {m('aiUnavailable')}
              </div>
            )}

            {false && gpsError === 'insecure' ? (
                <div className="mt-1 space-y-2">
                  <p className="text-sm text-red-600 font-medium">{m('gpsRequiresHttps')}</p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {m('gpsHttpsDesc')}
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {m('gpsHttpsTunnel')}
                  </p>
                  <p className="text-xs font-mono bg-slate-100 rounded px-2 py-1.5 text-emerald-700 font-mono">
                    npx ngrok http 3000
                  </p>
                  <p className="text-xs text-slate-500">
                    {m('gpsNgrokHint')}
                  </p>
                </div>
              ) : gpsError === 'denied' ? (
                <div className="mt-1 space-y-2">
                  <p className="text-sm text-amber-600 font-medium">{m('locationDisabled')}</p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {m('gpsDeniedDesc')}
                  </p>
                  <ul className="text-xs text-slate-400 list-disc list-inside space-y-0.5">
                    <li>{m('gpsDeniedIos')}</li>
                    <li>{m('gpsDeniedAndroid')}</li>
                  </ul>
                  <button
                    onClick={captureGps}
                    className="mt-1 text-xs text-emerald-600 underline hover:text-emerald-700"
                  >
                    {m('retry')}
                  </button>
                </div>
              ) : gpsError === 'timeout' ? (
                <div className="mt-1">
                  <p className="text-sm text-amber-600">{m('gpsTimeout')}</p>
                  <button onClick={captureGps} className="mt-1 text-xs text-emerald-600 underline hover:text-emerald-700">
                    {m('retry')}
                  </button>
                </div>
              ) : gpsError === 'unavailable' ? (
                <div className="mt-1">
                  <p className="text-sm text-amber-600">{m('gpsUnavailable')}</p>
                </div>
              ) : null}

            {/* BHD-Messergebnis anzeigen */}
            {bhdMethod === 'CARD' && form.diameter && (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 mb-3">
                <div className="flex items-center gap-2 text-sm text-emerald-700">
                  <Check size={14} />
                  <span>{m('bhd')} <span className="font-semibold">{form.diameter} cm</span> {m('measured')}</span>
                </div>
                <button onClick={() => setBhdMeasureOpen(true)} className="text-xs text-emerald-600 hover:text-emerald-800">
                  {m('remeasure')}
                </button>
              </div>
            )}

            <button
              onClick={() => setStep('bhd')}
              disabled={!photoPreview}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              {m('continue')} <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* BHD (Brusthöhendurchmesser) */}
        {step === 'bhd' && (
          <div className="p-4 flex flex-col items-center justify-center h-full">
            <button onClick={() => setStep('camera')} className="self-start flex items-center gap-1 text-sm text-slate-500 mb-4 hover:text-slate-900">
              <ChevronLeft size={16} /> {m('back')}
            </button>
            <h2 className="text-xl font-bold mb-2">{m('bhdScreen')}</h2>
            <RotaryTuner
              value={form.diameter ? parseFloat(form.diameter) : 25}
              onChange={(v) => setForm(f => ({ ...f, diameter: String(v) }))}
              onConfirm={() => setStep('species')}
              min={1}
              max={300}
              step={1}
              unit="cm"
              label={m('bhdTunerLabel')}
              color="#10b981"
            />
          </div>
        )}

        {/* Kronenfoto */}
        {step === 'crown' && (
          <div className="p-4">
            <button onClick={() => setStep('age')} className="flex items-center gap-1 text-sm text-slate-500 mb-4 hover:text-slate-900">
              <ChevronLeft size={16} /> {m('back')}
            </button>
            <h2 className="text-xl font-bold mb-1">{m('photographCrown')}</h2>
            <p className="text-slate-400 text-sm mb-5">{m('photographCrownDesc')}</p>

            <input
              id="crown-photo-input"
              ref={crownFileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleCrownPhoto}
            />
            <label
              htmlFor="crown-photo-input"
              className={`relative w-full aspect-square rounded-xl flex items-center justify-center cursor-pointer transition-colors mb-4 overflow-hidden ${
                crownPhotoPreview ? '' : 'bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border-2 border-dashed border-slate-300'
              }`}
            >
              {crownPhotoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={crownPhotoPreview} alt={m('crownHealth')} className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <Camera size={40} />
                  <span className="text-sm">{m('takeCrownPhoto')}</span>
                </div>
              )}
              {crownPhotoPreview && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <Camera size={32} className="text-white" />
                </div>
              )}
            </label>

            {/* Crown AI status */}
            {crownAiStatus === 'analyzing' && (
              <div className="flex items-center gap-2 text-xs text-violet-600 mb-4 bg-violet-50 rounded-xl px-3 py-2.5">
                <Loader2 size={14} className="animate-spin" />
                {m('aiAnalyzingCrown')}
              </div>
            )}
            {crownAiStatus === 'done' && crownAiResult && (
              <div className="mb-4 bg-violet-50 border border-violet-100 rounded-xl px-3 py-2.5 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-violet-700">
                  <Sparkles size={12} /> {m('crownAnalysis')}
                </div>
                <p className="text-sm text-slate-700">
                  {m('vitality')} <span className="font-semibold">{crownAiResult.crownCondition}%</span>
                  <span className="text-slate-400 mx-1">·</span>
                  {m('defoliation')} <span className="font-semibold">{crownAiResult.crownDefoliation}%</span>
                  {crownAiResult.health && crownAiResult.health !== 'HEALTHY' && (
                    <span className="text-amber-600 ml-1">
                      · {crownAiResult.health === 'DAMAGED' ? m('damaged') : m('dead')}
                    </span>
                  )}
                </p>
                {crownAiResult.damageType && (
                  <p className="text-[11px] text-amber-600">{m('damageType')}: {crownAiResult.damageType}</p>
                )}
                {crownAiResult.reasoning && (
                  <p className="text-[11px] text-slate-400 leading-relaxed">{crownAiResult.reasoning}</p>
                )}
              </div>
            )}

            <button
              onClick={() => setStep('crown-vitality')}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              {crownPhotoPreview ? m('continue') : m('withoutCrownPhoto')} <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* Crown Vitality */}
        {step === 'crown-vitality' && (
          <div className="p-4 flex flex-col items-center justify-center h-full">
            <button onClick={() => setStep('crown')} className="self-start flex items-center gap-1 text-sm text-slate-500 mb-4 hover:text-slate-900">
              <ChevronLeft size={16} /> {m('back')}
            </button>
            <h2 className="text-xl font-bold mb-2">{m('crownVitalityScreen')}</h2>
            <RotaryTuner
              value={formCrownCondition ? parseInt(formCrownCondition) : (crownAiResult?.crownCondition ?? 85)}
              onChange={(v) => setFormCrownCondition(String(v))}
              onConfirm={() => setStep('health')}
              min={0}
              max={100}
              step={1}
              unit="%"
              label={m('crownVitalityTunerLabel')}
              color={(() => {
                const v = formCrownCondition ? parseInt(formCrownCondition) : 85;
                return v >= 75 ? '#10b981' : v >= 40 ? '#f59e0b' : '#ef4444';
              })()}
            />
          </div>
        )}

        {/* Baumart */}
        {step === 'species' && (
          <div className="p-4">
            <button onClick={() => setStep('bhd')} className="flex items-center gap-1 text-sm text-slate-500 mb-4 hover:text-slate-900">
              <ChevronLeft size={16} /> {m('back')}
            </button>
            <h2 className="text-xl font-bold mb-1">{m('speciesAndMeasure')}</h2>
            <p className="text-slate-400 text-sm mb-5">{m('speciesConfirm')}</p>

            {/* KI-Vorschlag Banner */}
            {aiResult && !form.species && aiResult.speciesLabel && (
              <button
                onClick={() => {
                  const id = aiResult.speciesId ?? aiResult.species ?? '';
                  setForm(f => ({ ...f, species: id }));
                  if (aiResult.speciesLabel) setSelectedSpeciesLabel(aiResult.speciesLabel);
                }}
                className="w-full mb-4 flex items-center gap-3 bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 text-left hover:bg-violet-100 transition-colors"
              >
                <Sparkles size={16} className="text-violet-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-violet-800">
                    {m('aiSuggestion')}: {aiResult.speciesLabel}
                  </p>
                  <p className="text-xs text-violet-500">
                    {aiResult.speciesConfidence != null && `${Math.round(aiResult.speciesConfidence * 100)}% ${m('confidence')}`}
                    {aiResult.reasoning && ` · ${aiResult.reasoning.substring(0, 80)}…`}
                  </p>
                </div>
                <span className="text-xs font-semibold text-violet-600 shrink-0">{m('apply')}</span>
              </button>
            )}
            {aiStatus === 'analyzing' && !form.species && (
              <div className="mb-4 flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-xl px-4 py-3 text-xs text-violet-600">
                <Loader2 size={14} className="animate-spin" /> {m('aiAnalyzing')}
              </div>
            )}

            {/* Baumartensuche — DB-basiert mit Favoriten */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-slate-700 mb-2">{m('speciesLabel')}</label>

              {/* Ausgewählte Baumart */}
              {form.species && (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: (() => {
                      const fav = speciesFavorites.find(s => s.id === form.species);
                      const res = speciesResults.find(s => s.id === form.species);
                      const legacy = TREE_SPECIES.find(s => s.id === form.species);
                      return fav?.color ?? res?.color ?? legacy?.color ?? '#22c55e';
                    })() }} />
                    <span className="text-sm font-medium text-emerald-800">{selectedSpeciesLabel || getSpeciesLabel(form.species)}</span>
                  </div>
                  <button onClick={() => { setForm(f => ({ ...f, species: '' })); setSelectedSpeciesLabel(''); }}
                    className="text-xs text-emerald-600 hover:text-emerald-800">{m('change')}</button>
                </div>
              )}

              {/* Suchfeld */}
              {!form.species && (
                <>
                  <input
                    type="text"
                    placeholder={m('searchSpecies')}
                    value={speciesSearch}
                    onChange={e => { setSpeciesSearch(e.target.value); searchSpeciesDb(e.target.value); }}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 mb-3"
                  />

                  {/* Favoriten (häufig verwendet) */}
                  {!speciesSearch && speciesFavorites.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">{m('frequentlyUsed')}</p>
                      <div className="flex flex-wrap gap-2">
                        {speciesFavorites.map(s => (
                          <button key={s.id}
                            onClick={() => { setForm(f => ({ ...f, species: s.id })); setSelectedSpeciesLabel(s.label); }}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 transition-colors">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suchergebnisse */}
                  {speciesSearchLoading && (
                    <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                      <Loader2 size={12} className="animate-spin" /> Suche…
                    </div>
                  )}
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {speciesResults.map(s => (
                      <button key={s.id}
                        onClick={() => { setForm(f => ({ ...f, species: s.id })); setSelectedSpeciesLabel(s.label); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-slate-50 transition-colors">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-800 truncate">{s.label}</p>
                          <p className="text-[11px] text-slate-400 italic truncate">{s.scientificName}</p>
                        </div>
                      </button>
                    ))}
                    {!speciesSearchLoading && speciesSearch && speciesResults.length === 0 && (
                      <p className="text-xs text-slate-400 py-3 text-center">{m('noSpeciesFound')}</p>
                    )}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setStep('height')}
              disabled={!form.species}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors mt-4"
            >
              {m('continue')} <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* Height */}
        {step === 'height' && (
          <div className="p-4 flex flex-col items-center justify-center h-full">
            <button onClick={() => setStep('species')} className="self-start flex items-center gap-1 text-sm text-slate-500 mb-4 hover:text-slate-900">
              <ChevronLeft size={16} /> {m('back')}
            </button>
            <h2 className="text-xl font-bold mb-2">{m('heightScreen')}</h2>
            <RotaryTuner
              value={form.height ? parseFloat(form.height) : (() => {
                const est = form.species && form.diameter ? estimateHeight(form.species, parseFloat(form.diameter)) : null;
                return est ?? 20;
              })()}
              onChange={(v) => setForm(f => ({ ...f, height: String(v) }))}
              onConfirm={() => setStep('age')}
              min={1}
              max={50}
              step={0.5}
              unit="m"
              label={m('heightTunerLabel')}
              color="#3b82f6"
              decimals={1}
            />
            <button onClick={() => { setForm(f => ({ ...f, height: '' })); setStep('age'); }}
              className="mt-4 text-sm text-slate-400 hover:text-slate-600">
              {m('skipHeight')}
            </button>
          </div>
        )}

        {/* Age */}
        {step === 'age' && (
          <div className="p-4 flex flex-col items-center justify-center h-full">
            <button onClick={() => setStep('height')} className="self-start flex items-center gap-1 text-sm text-slate-500 mb-4 hover:text-slate-900">
              <ChevronLeft size={16} /> {m('back')}
            </button>
            <h2 className="text-xl font-bold mb-2">{m('ageScreen')}</h2>
            <RotaryTuner
              value={form.age ? parseInt(form.age) : 50}
              onChange={(v) => setForm(f => ({ ...f, age: String(v) }))}
              onConfirm={() => setStep('crown')}
              min={5}
              max={300}
              step={5}
              unit=""
              label={m('ageTunerLabel')}
              color="#8b5cf6"
            />
            <button onClick={() => { setForm(f => ({ ...f, age: '' })); setStep('crown'); }}
              className="mt-4 text-sm text-slate-400 hover:text-slate-600">
              {m('skipAge')}
            </button>
          </div>
        )}

        {/* Health */}
        {step === 'health' && (
          <div className="p-4">
            <button onClick={() => setStep('crown-vitality')} className="flex items-center gap-1 text-sm text-slate-500 mb-4 hover:text-slate-900">
              <ChevronLeft size={16} /> {m('back')}
            </button>
            <h2 className="text-xl font-bold mb-1">{m('crownHealth')}</h2>
            <p className="text-slate-400 text-sm mb-4">
              {crownAiResult ? m('crownHealthAiDesc') : m('crownHealthDesc')}
            </p>

            {/* KI-Vorschlag Banner */}
            {crownAiResult && (
              <div className="mb-4 bg-violet-50 border border-violet-200 rounded-xl px-4 py-3">
                <div className="flex items-center gap-1.5 text-xs font-medium text-violet-700 mb-1">
                  <Sparkles size={12} /> {m('aiResultApplied')}
                </div>
                <p className="text-sm text-violet-800">
                  {crownAiResult.health === 'HEALTHY' ? m('healthy') : crownAiResult.health === 'DAMAGED' ? m('damaged') : m('dead')}
                  {crownAiResult.damageType && <span className="text-violet-400"> · {crownAiResult.damageType}</span>}
                </p>
                {crownAiResult.reasoning && (
                  <p className="text-[11px] text-violet-500 mt-1">{crownAiResult.reasoning}</p>
                )}
              </div>
            )}
            {crownAiStatus === 'analyzing' && (
              <div className="mb-4 flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-xl px-4 py-3 text-xs text-violet-600">
                <Loader2 size={14} className="animate-spin" /> {m('aiAnalyzingCrown')}
              </div>
            )}

            {/* Health status */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-700 mb-2">{m('healthGrade')}</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'HEALTHY', label: m('healthy'), color: 'bg-emerald-600' },
                  { id: 'DAMAGED', label: m('damaged'), color: 'bg-amber-600' },
                  { id: 'DEAD', label: m('dead'), color: 'bg-red-600' },
                  { id: 'MARKED_FOR_FELLING', label: m('markedForFelling'), color: 'bg-slate-600' },
                ].map(h => (
                  <button key={h.id} onClick={() => setFormHealth(h.id)}
                    className={`px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                      formHealth === h.id ? `${h.color} text-white` : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}>
                    {h.label}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => setStep(formHealth !== 'HEALTHY' ? 'damage' : 'stand')}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors">
              {m('continue')} <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* DAMAGE: Schadursache + Schadausmass (nur bei Damaged/Dead/Felling) */}
        {step === 'damage' && (
          <div className="p-4">
            <button onClick={() => setStep('health')} className="flex items-center gap-1 text-sm text-slate-500 mb-4 hover:text-slate-900">
              <ChevronLeft size={16} /> {m('back')}
            </button>
            <h2 className="text-xl font-bold mb-1">{m('damageType')}</h2>
            <p className="text-slate-400 text-sm mb-5">{m('selectDamageType')}</p>

            {/* Damage type as buttons */}
            <div className="grid grid-cols-2 gap-2 mb-6">
              {DAMAGE_TYPES.map(d => (
                <button key={d.id} onClick={() => setFormDamageType(d.id)}
                  className={`px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                    formDamageType === d.id ? 'bg-amber-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}>
                  {m(d.tKey)}
                </button>
              ))}
            </div>

            {/* Damage severity tuner */}
            <div className="mb-5">
              <RotaryTuner
                value={formDamageSeverity ? parseInt(formDamageSeverity) : 30}
                onChange={(v) => setFormDamageSeverity(String(v))}
                onConfirm={() => setStep('stand')}
                min={0}
                max={100}
                step={5}
                unit="%"
                label={m('damageSeverity')}
                color="#f59e0b"
              />
            </div>
          </div>
        )}

        {/* Bestandstyp & Bestockungsgrad */}
        {step === 'stand' && (
          <div className="p-4">
            <button onClick={() => setStep('health')} className="flex items-center gap-1 text-sm text-slate-500 mb-4 hover:text-slate-900">
              <ChevronLeft size={16} /> {m('back')}
            </button>
            <h2 className="text-xl font-bold mb-1">{m('standSection')}</h2>
            <p className="text-slate-400 text-sm mb-5">{m('standDesc')}</p>

            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-700 mb-2">{m('standType')}</label>
              <div className="grid grid-cols-2 gap-2">
                {STAND_TYPES.map(s => (
                  <button key={s.id} onClick={() => setForm(f => ({ ...f, standType: f.standType === s.id ? '' : s.id }))}
                    className={`px-3 py-3 rounded-xl text-sm font-medium transition-colors ${form.standType === s.id ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                    {t(s.tKey)}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-700 mb-2">{m('stockingDegree')}</label>
              <div className="grid grid-cols-3 gap-2">
                {STOCKING_DEGREES.map(s => (
                  <button key={s.id} onClick={() => setForm(f => ({ ...f, stockingDegree: f.stockingDegree === s.id ? '' : s.id }))}
                    className={`px-3 py-3 rounded-xl text-sm font-medium transition-colors ${form.stockingDegree === s.id ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                    {t(s.tKey)}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => setStep('soil')}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors">
              {m('continue')} <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* SCHRITT 6: Boden */}
        {step === 'soil' && (
          <div className="p-4">
            <button onClick={() => setStep('stand')} className="flex items-center gap-1 text-sm text-slate-500 mb-4 hover:text-slate-900">
              <ChevronLeft size={16} /> {m('back')}
            </button>
            <h2 className="text-xl font-bold mb-1">{m('soilSection')}</h2>
            <p className="text-slate-400 text-sm mb-5">{m('soilDesc')}</p>

            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                <Leaf size={14} className="text-emerald-600" /> {m('soilCondition')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {SOIL_CONDITIONS.map(s => (
                  <button key={s.id} onClick={() => setForm(f => ({ ...f, soilCondition: f.soilCondition === s.id ? '' : s.id }))}
                    className={`px-3 py-3 rounded-xl text-sm font-medium transition-colors ${form.soilCondition === s.id ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                    {t(s.tKey)}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                <Droplets size={14} className="text-blue-400" /> {m('soilMoisture')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {SOIL_MOISTURE.map(s => (
                  <button key={s.id} onClick={() => setForm(f => ({ ...f, soilMoisture: f.soilMoisture === s.id ? '' : s.id }))}
                    className={`px-3 py-3 rounded-xl text-sm font-medium transition-colors ${form.soilMoisture === s.id ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                    {t(s.tKey)}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => setStep('exposition')}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors">
              {m('continue')} <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* SCHRITT 7: Exposition */}
        {step === 'exposition' && (
          <div className="p-4">
            <button onClick={() => setStep('soil')} className="flex items-center gap-1 text-sm text-slate-500 mb-4 hover:text-slate-900">
              <ChevronLeft size={16} /> {m('back')}
            </button>
            <h2 className="text-xl font-bold mb-1">{m('exposition')}</h2>
            <p className="text-slate-400 text-sm mb-5">{m('expositionDesc')}</p>

            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-700 mb-2">{m('aspect')}</label>
              <div className="grid grid-cols-3 gap-2">
                {EXPOSITIONS.map(s => (
                  <button key={s.id} onClick={() => setForm(f => ({
                    ...f, exposition: f.exposition === s.id ? '' : s.id,
                    ...(s.id === 'FLAT' || f.exposition === s.id ? { slopeClass: '', slopePosition: '' } : {}),
                  }))}
                    className={`py-3 rounded-xl text-sm font-medium transition-colors ${form.exposition === s.id ? 'bg-amber-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                    {t(s.tKey)}
                  </button>
                ))}
              </div>
            </div>

            {form.exposition && form.exposition !== 'FLAT' && (
              <>
                <div className="mb-5">
                  <label className="block text-sm font-medium text-slate-700 mb-2">{m('slopeClass')}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {SLOPE_CLASSES.map(s => (
                      <button key={s.id} onClick={() => setForm(f => ({ ...f, slopeClass: f.slopeClass === s.id ? '' : s.id }))}
                        className={`py-3 rounded-xl text-sm font-medium transition-colors ${form.slopeClass === s.id ? 'bg-amber-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                        {t(s.tKey)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-5">
                  <label className="block text-sm font-medium text-slate-700 mb-2">{m('slopePosition')}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {SLOPE_POSITIONS.map(s => (
                      <button key={s.id} onClick={() => setForm(f => ({ ...f, slopePosition: f.slopePosition === s.id ? '' : s.id }))}
                        className={`py-3 rounded-xl text-sm font-medium transition-colors ${form.slopePosition === s.id ? 'bg-amber-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                        {t(s.tKey)}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <button onClick={() => setStep('notes')}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors">
              {m('continue')} <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* SCHRITT 8: Notizen */}
        {step === 'notes' && (
          <div className="p-4">
            <button onClick={() => setStep('exposition')} className="flex items-center gap-1 text-sm text-slate-500 mb-4 hover:text-slate-900">
              <ChevronLeft size={16} /> {m('back')}
            </button>
            <h2 className="text-xl font-bold mb-1">{m('notesSection')}</h2>
            <p className="text-slate-400 text-sm mb-5">{m('notesDesc')}</p>

            <textarea
              rows={4}
              placeholder={m('notesPlaceholder')}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 resize-none mb-5"
            />

            <button onClick={() => setStep('review')}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors">
              {m('review')} <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* SCHRITT 9: Zusammenfassung & Speichern */}
        {step === 'review' && (
          <div className="p-4">
            <button onClick={() => setStep('notes')} className="flex items-center gap-1 text-sm text-slate-500 mb-4 hover:text-slate-900">
              <ChevronLeft size={16} /> {m('back')}
            </button>
            <h2 className="text-xl font-bold mb-1">{m('review')}</h2>
            <p className="text-slate-400 text-sm mb-5">{m('reviewDesc')}</p>

            {/* Foto-Vorschau */}
            {photoPreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoPreview} alt={m('tree')} className="w-full aspect-video object-cover rounded-xl mb-4" />
            )}

            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 mb-5">
              {/* Standort */}
              <div className="px-4 py-3 flex justify-between">
                <span className="text-sm text-slate-500">{m('location')}</span>
                <span className="text-sm font-medium text-slate-900 text-right">
                  {form.forestName || '–'}
                  {form.compartmentName && <span className="text-slate-500"> · {form.compartmentName}</span>}
                </span>
              </div>
              {form.lat && (
                <div className="px-4 py-3 flex justify-between">
                  <span className="text-sm text-slate-500">GPS</span>
                  <span className="text-sm font-mono text-slate-700">{form.lat.toFixed(5)}, {form.lng?.toFixed(5)}</span>
                </div>
              )}
              {/* Baumart */}
              <div className="px-4 py-3 flex justify-between items-center">
                <span className="text-sm text-slate-500">{m('speciesLabel')}</span>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: (() => {
                    const f = speciesFavorites.find(s => s.id === form.species);
                    const r = speciesResults.find(s => s.id === form.species);
                    const l = TREE_SPECIES.find(s => s.id === form.species);
                    return f?.color ?? r?.color ?? l?.color ?? '#64748b';
                  })() }} />
                  <span className="text-sm font-medium text-slate-900">{selectedSpeciesLabel || getSpeciesLabel(form.species)}</span>
                </div>
              </div>
              {/* BHD */}
              {form.diameter && (
                <div className="px-4 py-3 flex justify-between">
                  <span className="text-sm text-slate-500">BHD</span>
                  <span className="text-sm font-medium text-slate-900">{form.diameter} cm</span>
                </div>
              )}
              {/* Höhe */}
              {form.height && (
                <div className="px-4 py-3 flex justify-between">
                  <span className="text-sm text-slate-500">{m('heightLabel')}</span>
                  <span className="text-sm font-medium text-slate-900">{form.height} m</span>
                </div>
              )}
              {/* Alter */}
              {form.age && (
                <div className="px-4 py-3 flex justify-between">
                  <span className="text-sm text-slate-500">{m('ageLabel')}</span>
                  <span className="text-sm font-medium text-slate-900">~{form.age} {m('years')}</span>
                </div>
              )}
              {/* Bestand */}
              {(form.standType || form.stockingDegree) && (
                <div className="px-4 py-3 flex justify-between">
                  <span className="text-sm text-slate-500">{m('standSection')}</span>
                  <span className="text-sm text-slate-700">
                    {(() => { const found = STAND_TYPES.find(s => s.id === form.standType); return found ? t(found.tKey) : ''; })()}
                    {form.standType && form.stockingDegree && ' · '}
                    {(() => { const found = STOCKING_DEGREES.find(s => s.id === form.stockingDegree); return found ? t(found.tKey) : ''; })()}
                  </span>
                </div>
              )}
              {/* Boden */}
              {(form.soilCondition || form.soilMoisture) && (
                <div className="px-4 py-3 flex justify-between">
                  <span className="text-sm text-slate-500">{m('soilSection')}</span>
                  <span className="text-sm text-slate-700">
                    {(() => { const found = SOIL_CONDITIONS.find(s => s.id === form.soilCondition); return found ? t(found.tKey) : ''; })()}
                    {form.soilCondition && form.soilMoisture && ' · '}
                    {(() => { const found = SOIL_MOISTURE.find(s => s.id === form.soilMoisture); return found ? t(found.tKey) : ''; })()}
                  </span>
                </div>
              )}
              {/* Exposition */}
              {form.exposition && (
                <div className="px-4 py-3 flex justify-between">
                  <span className="text-sm text-slate-500">{m('exposition')}</span>
                  <span className="text-sm text-slate-700">
                    {(() => { const found = EXPOSITIONS.find(s => s.id === form.exposition); return found ? t(found.tKey) : ''; })()}
                    {form.slopeClass && (() => { const found = SLOPE_CLASSES.find(s => s.id === form.slopeClass); return found ? ` · ${t(found.tKey)}` : ''; })()}
                    {form.slopePosition && (() => { const found = SLOPE_POSITIONS.find(s => s.id === form.slopePosition); return found ? ` · ${t(found.tKey)}` : ''; })()}
                  </span>
                </div>
              )}
              {/* Notizen */}
              {/* Kronengesundheit */}
              {(formCrownCondition || formHealth !== 'HEALTHY') && (
                <div className="px-4 py-3 flex justify-between">
                  <span className="text-sm text-slate-500">{m('crownHealth')}</span>
                  <span className="text-sm text-slate-700">
                    {formCrownCondition && `${formCrownCondition}% ${m('vital')}`}
                    {formHealth !== 'HEALTHY' && ` · ${formHealth === 'DAMAGED' ? m('damaged') : formHealth === 'DEAD' ? m('dead') : m('markedForFelling')}`}
                    {formDamageType && ` (${formDamageType})`}
                  </span>
                </div>
              )}
              {form.notes && (
                <div className="px-4 py-3">
                  <span className="text-sm text-slate-500 block mb-1">{m('notesSection')}</span>
                  <span className="text-sm text-slate-700">{form.notes}</span>
                </div>
              )}
            </div>

            {/* CO2 Storage */}
            {(() => {
              const d = form.diameter ? parseFloat(form.diameter) : null;
              const h = form.height ? parseFloat(form.height) : null;
              const co2 = d && h && form.species ? calcCo2Storage(form.species, d, h) : null;
              if (!co2) return null;
              return (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-center mb-5">
                  <p className="text-xs text-emerald-600 font-medium">{m('co2Storage')}</p>
                  <p className="text-2xl font-bold text-emerald-700">{Math.round(co2).toLocaleString()} {m('co2Unit')}</p>
                </div>
              );
            })()}

            <button
              onClick={saveTree}
              disabled={isSavingTree}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              {isSavingTree
                ? <><Loader2 size={18} className="animate-spin" /> {m('saving')}</>
                : <><Check size={18} /> {m('saveTree')}</>
              }
            </button>
          </div>
        )}

        {/* Gespeichert */}
        {step === 'saved' && (
          <div className="p-4 flex flex-col items-center text-center pt-12">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
              <Check size={40} className="text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">{m('treeSaved')}</h2>
            <p className="text-slate-400 mb-2">
              {TREE_SPECIES.find(s => s.id === form.species)?.label ?? form.species}
              {form.diameter && ` · Ø ${form.diameter} cm`}
              {form.height && ` · ${form.height} m`}
            </p>
            {form.lat && form.lng && (
              <p className="text-xs text-slate-500 font-mono mb-1">
                {form.lat.toFixed(5)}, {form.lng.toFixed(5)}
              </p>
            )}
            {!isOnline && (
              <p className="text-sm text-amber-600 mt-2 mb-4 flex items-center gap-1.5">
                <CloudOff size={14} /> {m('offlineSaved')}
              </p>
            )}
            {isOnline && (
              <p className="text-sm text-emerald-600 mt-2">
                ✓ {m('onMap')}
              </p>
            )}
            {photoUploadStatus === 'uploading' && (
              <p className="text-sm text-slate-400 mt-2 mb-2 flex items-center justify-center gap-1.5">
                <RefreshCw size={13} className="animate-spin" /> {m('uploadingPhoto')}
              </p>
            )}
            {photoUploadStatus === 'success' && (
              <p className="text-sm text-emerald-600 mt-2 mb-2">✓ {m('photoSaved')}</p>
            )}
            {photoUploadStatus === 'error' && (
              <p className="text-sm text-amber-600 mt-2 mb-2">
                {m('photoUploadFailed')}
              </p>
            )}

            {/* Stichproben-Fortschritt im Plot-Modus */}
            {mode === 'plot' && plotSession && (() => {
              const target = getTargetSampleSize(1, 'rein'); // Basiswert — ohne Flächeninfo
              const pct = Math.min(100, Math.round(savedCount / target * 100));
              const done = savedCount >= target;
              return (
                <div className={`mt-4 w-full rounded-xl px-4 py-3 ${done ? 'bg-emerald-900/30 border border-emerald-700/40' : 'bg-slate-800 border border-slate-700'}`}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className={done ? 'text-emerald-400' : 'text-slate-300'}>
                      {done ? `✓ ${m('sampleComplete')}` : `${m('sample')}: ${savedCount} / ${target} ${m('trees')}`}
                    </span>
                    <span className={done ? 'text-emerald-400' : 'text-slate-500'}>{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${done ? 'bg-emerald-500' : 'bg-emerald-600'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })()}

            <div className="mt-4 w-full space-y-3">
              <button
                onClick={nextTree}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <TreePine size={18} /> {m('nextTreeBtn')}
              </button>
              {savedPoiId && (
                <button
                  onClick={() => setStep('task')}
                  className="w-full py-3 border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <ClipboardList size={18} /> {m('addTask')}
                </button>
              )}
              {mode === 'plot' ? (
                <button
                  onClick={finishPlot}
                  className="w-full py-3 bg-violet-700 hover:bg-violet-600 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <CircleDot size={16} /> {m('finishPlot')}
                </button>
              ) : (
                <button
                  onClick={finish}
                  className="w-full text-center text-sm text-slate-500 hover:text-slate-700 py-2 transition-colors"
                >
                  {m('finishInventory')} ({savedCount} {savedCount === 1 ? m('tree') : m('trees')})
                </button>
              )}
            </div>
          </div>
        )}

        {/* SCHRITT 4b: Aufgabe erstellen */}
        {step === 'task' && (
          <div className="p-4">
            <button onClick={() => setStep('saved')} className="flex items-center gap-1 text-sm text-slate-500 mb-4 hover:text-slate-900">
              <ChevronLeft size={16} /> {m('back')}
            </button>
            <h2 className="text-xl font-bold mb-1">{m('addTask')}</h2>
            <p className="text-slate-400 text-sm mb-5">
              {m('taskDesc')}
            </p>

            {/* Titel */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">{m('taskTitle')} *</label>
              <input
                type="text"
                placeholder={m('taskTitlePlaceholder')}
                value={taskTitle}
                onChange={e => setTaskTitle(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Priorität */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">{m('priority')}</label>
              <div className="grid grid-cols-3 gap-2">
                {([['LOW', m('priorityLow'), 'bg-slate-600'], ['MEDIUM', m('priorityMedium'), 'bg-amber-600'], ['HIGH', m('priorityHigh'), 'bg-red-600']] as [string, string, string][]).map(([val, label, active]) => (
                  <button
                    key={val}
                    onClick={() => setTaskPriority(val)}
                    className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      taskPriority === val ? `${active} text-white` : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Fälligkeitsdatum */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">{m('dueDate')}</label>
              <DateTrigger
                value={taskDueDate}
                placeholder={m('noDateSelected')}
                onClick={() => setTaskShowDatePicker(true)}
              />
              {taskShowDatePicker && (
                <DatePickerSheet
                  value={taskDueDate}
                  label={m('dueDateLabel')}
                  onChange={setTaskDueDate}
                  onClose={() => setTaskShowDatePicker(false)}
                />
              )}
            </div>

            {/* Zuweisung */}
            {members.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <span className="flex items-center gap-1.5"><User size={14} /> {m('assignTo')}</span>
                </label>
                <div className="space-y-1.5">
                  <button
                    onClick={() => setTaskAssigneeId('')}
                    className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors ${
                      taskAssigneeId === '' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {m('unassigned')}
                  </button>
                  {members.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setTaskAssigneeId(m.id)}
                      className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors ${
                        taskAssigneeId === m.id ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {m.firstName && m.lastName ? `${m.firstName} ${m.lastName}` : m.email}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {taskSaveError && (
              <div className="px-4 py-3 bg-red-50 border border-red-300 rounded-xl flex items-center justify-between gap-3">
                <span className="text-sm text-red-700">{taskSaveError}</span>
                <button onClick={() => setTaskSaveError(null)} className="text-red-600 shrink-0">
                  <span aria-hidden>✕</span>
                </button>
              </div>
            )}

            <button
              onClick={saveTask}
              disabled={!taskTitle.trim() || taskSaving}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              {taskSaving ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : (
                <><ClipboardList size={18} /> {m('saveTask')}</>
              )}
            </button>
          </div>
        )}

        {/* PLOT-DONE: Plot abgeschlossen */}
        {step === 'plot-done' && plotSession && (
          <div className="p-4 flex flex-col items-center text-center pt-10">
            <div className="w-20 h-20 bg-violet-100 rounded-full flex items-center justify-center mb-6">
              <CircleDot size={40} className="text-violet-600" />
            </div>
            <h2 className="text-2xl font-bold mb-1">{m('plotCompleted')}</h2>
            <p className="text-slate-700 text-base font-medium mb-1">{plotSession.name}</p>
            <p className="text-slate-400 text-sm mb-2">
              Radius {plotSession.radiusM} m · {savedCount} {savedCount === 1 ? m('tree') : m('trees')} {m('captured')}
            </p>
            <p className="text-xs text-slate-500 mb-8">
              {m('plotEvaluationHint')}
            </p>
            <div className="w-full space-y-3">
              <button
                onClick={startNewPlot}
                className="w-full py-4 bg-violet-700 hover:bg-violet-600 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <CircleDot size={18} /> {m('newPlot')}
              </button>
              <button
                onClick={finish}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium text-slate-700 transition-colors"
              >
                {m('finishInventory')} ({savedCount} {savedCount === 1 ? m('tree') : m('trees')})
              </button>
            </div>
          </div>
        )}

        {/* SCHRITT 5: Session-Abschluss */}
        {step === 'summary' && (
          <div className="p-4">
            {/* Header */}
            <div className="flex flex-col items-center text-center pt-6 pb-6">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                <Check size={32} className="text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold mb-1">{m('inventoryCompleted')}</h2>
              <p className="text-slate-400 text-sm">
                {sessionTrees.length} {sessionTrees.length === 1 ? m('tree') : m('trees')} {m('captured')}
              </p>
              {pendingCount > 0 && (
                <div className="mt-3 flex items-center gap-2 bg-amber-900/30 border border-amber-800 rounded-xl px-3 py-2">
                  <CloudOff size={14} className="text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-700">
                    {m('pendingSyncCount', { count: pendingCount })}
                  </p>
                  {isOnline && (
                    <button
                      onClick={syncPending}
                      disabled={isSyncing}
                      className="ml-auto shrink-0 text-xs text-emerald-600 underline disabled:opacity-50"
                    >
                      {isSyncing ? 'Sync…' : m('syncNow')}
                    </button>
                  )}
                </div>
              )}
              {pendingCount === 0 && (
                <p className="mt-2 text-xs text-emerald-600 flex items-center gap-1">
                  <Check size={12} /> {m('allSynced')}
                </p>
              )}
            </div>

            {/* Baumliste */}
            {sessionTrees.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{m('capturedTrees')}</h3>
                <div className="space-y-2">
                  {sessionTrees.map((tree, i) => {
                    const speciesLabel = TREE_SPECIES.find(s => s.id === tree.species)?.label ?? tree.species;
                    const speciesColor = TREE_SPECIES.find(s => s.id === tree.species)?.color ?? '#64748b';
                    const soilFound = SOIL_CONDITIONS.find(s => s.id === tree.soilCondition);
                    const soilLabel = soilFound ? t(soilFound.tKey) : undefined;
                    const moistFound = SOIL_MOISTURE.find(s => s.id === tree.soilMoisture);
                    const moistLabel = moistFound ? t(moistFound.tKey) : undefined;
                    return (
                      <div key={i} className="bg-white border border-slate-200 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: speciesColor }} />
                          <span className="font-medium text-sm">{speciesLabel}</span>
                          <span className="ml-auto text-xs text-slate-500">#{i + 1}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-400">
                          {tree.diameter && <span>Ø {tree.diameter} cm</span>}
                          {tree.height && <span>↕ {tree.height} m</span>}
                          {soilLabel && <span>{m('soilSection')}: {soilLabel}</span>}
                          {moistLabel && <span>{m('soilMoisture')}: {moistLabel}</span>}
                          {tree.lat && tree.lng && (
                            <span className="font-mono">{tree.lat.toFixed(4)}, {tree.lng.toFixed(4)}</span>
                          )}
                        </div>
                        {!tree.synced && (
                          <span className="mt-1 inline-flex items-center gap-1 text-xs text-amber-600">
                            <CloudOff size={10} /> {m('offlineSaved')}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Aktionen */}
            <div className="space-y-3 pb-8">
              <button
                onClick={startNew}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <TreePine size={18} /> {m('newSession')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
