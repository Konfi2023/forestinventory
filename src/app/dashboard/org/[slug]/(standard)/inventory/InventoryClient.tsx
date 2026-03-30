'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { TREE_SPECIES, getSpeciesLabel, getSpeciesColor } from '@/lib/tree-species';
import { db, type PendingTree, type PendingPlot } from '@/lib/inventory-db';
import { validateTreeMeasurement, estimateHeight, getTargetSampleSize } from '@/lib/forest-mensuration';
import {
  Camera, MapPin, Trees, ChevronRight, ChevronLeft,
  Check, CloudOff, RefreshCw, Leaf, Droplets, TreePine,
  ClipboardList, User, Loader2, CircleDot, Upload, Sparkles,
} from 'lucide-react';
import { DatePickerSheet, DateTrigger } from '@/app/app/tabs/DatePickerSheet';
import { ImportInventoryDialog } from './ImportInventoryDialog';
import { BhdMeasurement } from '@/components/BhdMeasurement';

const SOIL_CONDITIONS = [
  { id: 'SANDY', label: 'Sandig' },
  { id: 'LOAMY', label: 'Lehmig' },
  { id: 'CLAY', label: 'Tonig' },
  { id: 'HUMUS', label: 'Humos' },
  { id: 'ROCKY', label: 'Steinig' },
  { id: 'MIXED', label: 'Gemischt' },
];

const SOIL_MOISTURE = [
  { id: 'DRY', label: 'Trocken' },
  { id: 'FRESH', label: 'Frisch' },
  { id: 'MOIST', label: 'Feucht' },
  { id: 'WET', label: 'Nass' },
  { id: 'WATERLOGGED', label: 'Staunass' },
];

const EXPOSITIONS = [
  { id: 'N', label: 'N' }, { id: 'NE', label: 'NO' }, { id: 'E', label: 'O' },
  { id: 'SE', label: 'SO' }, { id: 'S', label: 'S' }, { id: 'SW', label: 'SW' },
  { id: 'W', label: 'W' }, { id: 'NW', label: 'NW' }, { id: 'FLAT', label: 'Eben' },
];

const SLOPE_CLASSES = [
  { id: 'FLAT', label: 'Flach (<5°)' },
  { id: 'MODERATE', label: 'Mäßig (5–15°)' },
  { id: 'STEEP', label: 'Steil (15–30°)' },
  { id: 'VERY_STEEP', label: 'Sehr steil (>30°)' },
];

const SLOPE_POSITIONS = [
  { id: 'SUMMIT', label: 'Kuppe' },
  { id: 'UPPER_SLOPE', label: 'Oberhang' },
  { id: 'MID_SLOPE', label: 'Mittelhang' },
  { id: 'LOWER_SLOPE', label: 'Unterhang' },
  { id: 'VALLEY', label: 'Talboden' },
];

const STAND_TYPES = [
  { id: 'PURE_CONIFER',   label: 'Rein Nadel' },
  { id: 'PURE_DECIDUOUS', label: 'Rein Laub' },
  { id: 'MIXED',          label: 'Mischbestand' },
  { id: 'EDGE',           label: 'Waldrand' },
  { id: 'CLEARCUT',       label: 'Freifläche' },
  { id: 'YOUNG_GROWTH',   label: 'Jungwuchs' },
];

const STOCKING_DEGREES = [
  { id: 'OPEN',       label: 'Locker' },
  { id: 'SPARSE',     label: 'Licht' },
  { id: 'MEDIUM',     label: 'Mittel' },
  { id: 'DENSE',      label: 'Dicht' },
  { id: 'VERY_DENSE', label: 'Sehr dicht' },
];

type Step = 'mode' | 'plot-setup' | 'camera' | 'location' | 'species' | 'height-age' | 'stand' | 'soil' | 'exposition' | 'notes' | 'review' | 'saved' | 'task' | 'plot-done' | 'summary';

const SINGLE_STEPS: Step[] = ['camera', 'location', 'species', 'height-age', 'stand', 'soil', 'exposition', 'notes', 'review'];
const PLOT_STEPS: Step[] = ['camera', 'species', 'height-age', 'stand', 'soil', 'exposition', 'notes', 'review'];

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

interface Compartment { id: string; name: string | null; color: string | null; }
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
  // BHD OpenCV measurement
  const [bhdMeasureOpen, setBhdMeasureOpen] = useState(false);
  const [bhdMethod, setBhdMethod] = useState<'CARD' | 'ESTIMATE' | null>(null);
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

  // Load species favorites on mount
  useEffect(() => {
    fetch(`/api/tree-species/search?orgSlug=${orgSlug}`)
      .then(r => r.json())
      .then(data => {
        setSpeciesFavorites(data.favorites ?? []);
        setSpeciesResults(data.results ?? []);
      })
      .catch(() => {});
  }, [orgSlug]);

  // Search species from DB
  function searchSpeciesDb(query: string) {
    clearTimeout(speciesSearchTimeout.current);
    if (query.length < 1) {
      // Reset to initial list
      fetch(`/api/tree-species/search?orgSlug=${orgSlug}`)
        .then(r => r.json())
        .then(data => { setSpeciesResults(data.results ?? []); setSpeciesSearchLoading(false); })
        .catch(() => setSpeciesSearchLoading(false));
      return;
    }
    setSpeciesSearchLoading(true);
    speciesSearchTimeout.current = setTimeout(() => {
      fetch(`/api/tree-species/search?q=${encodeURIComponent(query)}&orgSlug=${orgSlug}`)
        .then(r => r.json())
        .then(data => { setSpeciesResults(data.results ?? []); setSpeciesSearchLoading(false); })
        .catch(() => setSpeciesSearchLoading(false));
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
        body: JSON.stringify({ imageBase64: base64, mimeType: 'image/jpeg' }),
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
      setPhotoPreview(ev.target?.result as string);
      // Auto-open BHD measurement overlay after photo is loaded
      setBhdMeasureOpen(true);
    };
    reader.readAsDataURL(file);
    // Trigger GPS + locate silently in background
    captureGps();
    // Trigger AI analysis in background
    if (navigator.onLine) analyzeTreePhoto(file);
  }

  function handleCrownPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    crownPhotoFileRef.current = file;
    const reader = new FileReader();
    reader.onload = (ev) => setCrownPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
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
      damageType:        null,
      damageSeverity:    null,
      crownCondition:    null,
      imageDataUrl:      photoPreview,
      crownImageDataUrl: crownPhotoPreview,
      notes:             form.notes || null,
      createdAt:         new Date().toISOString(),
      synced:            false,
    };

    if (isOnline) {
      try {
        const res = await fetch('/api/inventory/tree', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...treeData, speciesId: form.species, orgSlug }),
        });
        if (res.ok) {
          treeData.synced = true;
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
          }
        }
      } catch {
        // Offline-Fallback
      }
    }

    if (!treeData.synced) {
      await db.pendingTrees.add(treeData);
      await loadPendingCount();
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
      setTaskSaveError('Aufgabe konnte nicht gespeichert werden. Bitte erneut versuchen.');
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
          onMeasured={(bhdCm) => {
            setForm(f => ({ ...f, diameter: String(bhdCm) }));
            setBhdMethod('CARD');
            setBhdMeasureOpen(false);
          }}
          onSkip={() => setBhdMeasureOpen(false)}
        />
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
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2">
          <TreePine size={20} className="text-emerald-600" />
          <span className="font-semibold text-sm">Forstinventur</span>
          {form.forestName && (
            <span className="text-xs text-slate-400 hidden sm:block">· {form.forestName}</span>
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
              <CloudOff size={12} /> Offline
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
                ? `✓ ${syncResult.ok} sync · ${syncResult.fail} fehlgeschlagen`
                : `✓ ${syncResult.ok} synchronisiert`
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
              {isSyncing ? 'Sync läuft…' : `${pendingCount} ausstehend`}
            </button>
          )}
        </div>
      </div>

      {/* Aktiver Plot-Banner */}
      {mode === 'plot' && plotSession && step !== 'mode' && step !== 'plot-setup' && step !== 'plot-done' && step !== 'summary' && (
        <div className="flex items-center gap-2 px-4 py-2 bg-violet-100 border-b border-violet-200 shrink-0">
          <CircleDot size={13} className="text-violet-700 shrink-0" />
          <span className="text-xs font-semibold text-violet-800">{plotSession.name}</span>
          <span className="text-xs text-violet-600">· Radius {plotSession.radiusM} m · {savedCount} {savedCount === 1 ? 'Baum' : 'Bäume'} erfasst</span>
          <button onClick={finishPlot} className="ml-auto text-xs text-violet-700 hover:text-violet-900 underline shrink-0">
            Plot abschließen
          </button>
        </div>
      )}

      {/* Steps Indicator */}
      {step !== 'mode' && step !== 'plot-setup' && step !== 'plot-done' && step !== 'saved' && step !== 'summary' && step !== 'task' && (() => {
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto">

        {/* MODE: Auswahl */}
        {step === 'mode' && (
          <div className="p-6 flex flex-col gap-4 pt-10">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold mb-1">Erfassung starten</h2>
              <p className="text-slate-400 text-sm">Wie möchtest du heute messen?</p>
            </div>
            <button
              onClick={() => { setMode('single'); setStep('camera'); }}
              className="w-full flex flex-col items-start gap-1.5 px-5 py-5 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-400 rounded-2xl transition-colors text-left shadow-sm"
            >
              <div className="flex items-center gap-2 mb-1">
                <TreePine size={22} className="text-emerald-600" />
                <span className="text-lg font-bold">Einzelbaum</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Bäume einzeln erfassen — Foto, GPS, BHD, Höhe, Art. Kein Probekreis. Ideal für Stichproben, Einzelmarkierungen oder Bestandsergänzungen.
              </p>
            </button>
            <button
              onClick={() => { setMode('plot'); setStep('plot-setup'); captureGps(); }}
              className="w-full flex flex-col items-start gap-1.5 px-5 py-5 bg-white hover:bg-violet-50 border border-slate-200 hover:border-violet-400 rounded-2xl transition-colors text-left shadow-sm"
            >
              <div className="flex items-center gap-2 mb-1">
                <CircleDot size={22} className="text-violet-600" />
                <span className="text-lg font-bold">Plot-Stichprobe</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Probekreis-Inventur: Plot anlegen → alle Bäume im Radius erfassen → Plot abschließen → nächsten Plot starten. Ergibt N/ha, G/ha, V/ha und Ertragstafel-Vergleich.
              </p>
            </button>
            <button
              onClick={() => setShowImport(true)}
              className="w-full flex flex-col items-start gap-1.5 px-5 py-5 bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-400 rounded-2xl transition-colors text-left shadow-sm"
            >
              <div className="flex items-center gap-2 mb-1">
                <Upload size={22} className="text-amber-600" />
                <span className="text-lg font-bold">Daten importieren</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Bestehende Inventur einlesen — CSV-Datei oder Foto von Feldbuch / Notizen. Probekreise und Einzelbäume werden automatisch erkannt.
              </p>
            </button>
            {(pendingCount > 0 || sessionTrees.length > 0) && (
              <button onClick={() => setStep('summary')}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm text-slate-700 transition-colors">
                Letzte Session ansehen ({savedCount} Bäume)
              </button>
            )}
          </div>
        )}

        {/* PLOT-SETUP */}
        {step === 'plot-setup' && (
          <div className="p-4">
            <h2 className="text-xl font-bold mb-1">Plot einrichten</h2>
            <p className="text-slate-400 text-sm mb-5">GPS wird als Mittelpunkt gesetzt. Alle Bäume dieses Plots werden automatisch zugeordnet.</p>

            {/* GPS Status */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 mb-4 flex items-center gap-3">
              <MapPin size={16} className={locating || gpsLoading ? 'text-amber-600 animate-pulse' : form.lat ? 'text-emerald-600' : 'text-slate-500'} />
              <div className="flex-1 min-w-0">
                {locating || gpsLoading ? (
                  <p className="text-sm text-amber-600">GPS wird ermittelt…</p>
                ) : form.lat ? (
                  <p className="text-sm text-emerald-600 font-mono">{form.lat.toFixed(5)}, {form.lng?.toFixed(5)}</p>
                ) : (
                  <p className="text-sm text-slate-500">Kein GPS-Signal</p>
                )}
              </div>
              <button onClick={captureGps} disabled={gpsLoading || locating}
                className="text-xs text-slate-400 hover:text-emerald-600 disabled:opacity-40 shrink-0">
                Neu
              </button>
            </div>

            {/* Wald */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                <Trees size={14} className="text-emerald-600" /> Wald
              </label>
              <select
                value={form.forestId}
                onChange={e => {
                  const f = forests.find(f => f.id === e.target.value);
                  setForm(prev => ({ ...prev, forestId: e.target.value, forestName: f?.name ?? '', compartmentId: '', compartmentName: '' }));
                }}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-violet-500"
              >
                <option value="">– Wald wählen –</option>
                {forests.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>

            {/* Abteilung */}
            {form.forestId && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Abteilung</label>
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
                        <span className="font-medium">{c.name || 'Abteilung'}</span>
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
                    Keine Abteilung
                  </button>
                </div>
              </div>
            )}

            {/* Radius + Name */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Radius (m)</label>
                <input
                  type="number" inputMode="decimal"
                  value={plotRadius}
                  onChange={e => setPlotRadius(e.target.value)}
                  placeholder="10"
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Bezeichnung (opt.)</label>
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
              Plot starten
            </button>
            {!form.lat && (
              <p className="text-xs text-amber-600 mt-2 text-center">Warte auf GPS-Signal…</p>
            )}
            {!form.forestId && form.lat && (
              <p className="text-xs text-amber-600 mt-2 text-center">Bitte Wald auswählen.</p>
            )}
          </div>
        )}

        {/* SCHRITT 1: Kamera */}
        {step === 'camera' && (
          <div className="p-4">
            <h2 className="text-xl font-bold mb-1">Baum fotografieren</h2>
            <p className="text-slate-400 text-sm mb-3">Stammfoto aufnehmen — GPS und Standort werden automatisch ermittelt.</p>
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 mb-4">
              <span className="text-blue-500 text-base mt-0.5">💳</span>
              <p className="text-xs text-blue-700 leading-relaxed">
                <span className="font-medium">BHD messen:</span> Halte die Forest Manager Messkarte oder eine Kreditkarte <span className="font-medium">quer</span> an den Stamm. Nach dem Foto wird der Durchmesser gemessen.
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
                <img src={photoPreview} alt="Baum" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <Camera size={40} />
                  <span className="text-sm">Foto aufnehmen</span>
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

            {/* Kronenfoto */}
            <p className="text-xs text-slate-500 mb-1.5 mt-1 font-medium uppercase tracking-wide">Kronenfoto <span className="text-slate-600 normal-case">(optional)</span></p>
            <div
              onClick={() => crownFileInputRef.current?.click()}
              className={`relative w-full aspect-video rounded-xl flex items-center justify-center cursor-pointer transition-colors mb-4 overflow-hidden ${
                crownPhotoPreview ? '' : 'bg-slate-100 hover:bg-slate-200 border-2 border-dashed border-slate-300'
              }`}
            >
              {crownPhotoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={crownPhotoPreview} alt="Krone" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <Camera size={40} />
                  <span className="text-sm">Kronenfoto aufnehmen</span>
                </div>
              )}
              {crownPhotoPreview && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <Camera size={32} className="text-white" />
                </div>
              )}
            </div>
            <input
              ref={crownFileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleCrownPhoto}
            />

            {/* GPS-Status (mini, im Hintergrund) */}
            {(gpsLoading || form.lat) && (
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                <MapPin size={12} className={gpsLoading ? 'animate-pulse text-emerald-500' : 'text-emerald-600'} />
                {gpsLoading ? 'GPS wird ermittelt…' : `${form.lat?.toFixed(5)}, ${form.lng?.toFixed(5)}`}
              </div>
            )}

            {/* KI-Analyse-Ergebnis */}
            {aiStatus === 'analyzing' && (
              <div className="flex items-center gap-2 text-xs text-violet-600 mb-4 bg-violet-50 rounded-xl px-3 py-2.5">
                <Loader2 size={14} className="animate-spin" />
                KI analysiert Baumart und BHD…
              </div>
            )}
            {aiStatus === 'done' && aiResult && (
              <div className="mb-4 bg-violet-50 border border-violet-100 rounded-xl px-3 py-2.5 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-violet-700">
                  <Sparkles size={12} />
                  KI-Vorschlag
                </div>
                <p className="text-sm text-slate-700">
                  <span className="font-medium">{aiResult.speciesLabel || aiResult.species}</span>
                  {aiResult.speciesConfidence != null && (
                    <span className="text-slate-400 ml-1">({Math.round(aiResult.speciesConfidence * 100)} %)</span>
                  )}
                  {aiResult.heightM != null && (
                    <span className="text-slate-500"> · Höhe {aiResult.heightM} m</span>
                  )}
                </p>
                {aiResult.reasoning && (
                  <p className="text-[11px] text-slate-400 leading-relaxed">{aiResult.reasoning}</p>
                )}
                {aiResult.health && aiResult.health !== 'HEALTHY' && (
                  <p className="text-[11px] text-amber-600">
                    Zustand: {aiResult.health === 'DAMAGED' ? 'Geschädigt' : 'Abgestorben'}
                    {aiResult.damageType && ` (${aiResult.damageType})`}
                  </p>
                )}
              </div>
            )}
            {aiStatus === 'error' && (
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
                <Sparkles size={12} />
                KI-Analyse nicht verfügbar
              </div>
            )}

            {false && gpsError === 'insecure' ? (
                <div className="mt-1 space-y-2">
                  <p className="text-sm text-red-600 font-medium">GPS erfordert HTTPS.</p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Safari blockiert GPS auf unsicheren Verbindungen (HTTP). Öffne die App über eine HTTPS-Adresse.
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Schnellste Lösung: Starte auf dem PC einen HTTPS-Tunnel:
                  </p>
                  <p className="text-xs font-mono bg-slate-100 rounded px-2 py-1.5 text-emerald-700 font-mono">
                    npx ngrok http 3000
                  </p>
                  <p className="text-xs text-slate-500">
                    ngrok gibt eine <span className="text-slate-700">https://…ngrok-free.app</span>-URL aus — diese im iPhone-Safari öffnen.
                  </p>
                </div>
              ) : gpsError === 'denied' ? (
                <div className="mt-1 space-y-2">
                  <p className="text-sm text-amber-600 font-medium">Ortungsdienste sind deaktiviert.</p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Bitte erlaube den Standortzugriff in deinen Geräteeinstellungen:
                  </p>
                  <ul className="text-xs text-slate-400 list-disc list-inside space-y-0.5">
                    <li><span className="text-slate-700">iOS:</span> Einstellungen → Datenschutz → Ortungsdienste → Safari/Browser → „Beim Verwenden"</li>
                    <li><span className="text-slate-700">Android:</span> Einstellungen → Apps → Browser → Berechtigungen → Standort</li>
                  </ul>
                  <button
                    onClick={captureGps}
                    className="mt-1 text-xs text-emerald-600 underline hover:text-emerald-700"
                  >
                    Nochmal versuchen
                  </button>
                </div>
              ) : gpsError === 'timeout' ? (
                <div className="mt-1">
                  <p className="text-sm text-amber-600">GPS-Signal zu schwach. Im Freien erneut versuchen.</p>
                  <button onClick={captureGps} className="mt-1 text-xs text-emerald-600 underline hover:text-emerald-700">
                    Nochmal versuchen
                  </button>
                </div>
              ) : gpsError === 'unavailable' ? (
                <div className="mt-1">
                  <p className="text-sm text-amber-600">GPS nicht verfügbar auf diesem Gerät.</p>
                </div>
              ) : null}

            {/* BHD-Messergebnis anzeigen */}
            {bhdMethod === 'CARD' && form.diameter && (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 mb-3">
                <div className="flex items-center gap-2 text-sm text-emerald-700">
                  <Check size={14} />
                  <span>BHD: <span className="font-semibold">{form.diameter} cm</span> (gemessen)</span>
                </div>
                <button onClick={() => setBhdMeasureOpen(true)} className="text-xs text-emerald-600 hover:text-emerald-800">
                  Neu messen
                </button>
              </div>
            )}

            <button
              onClick={() => setStep(mode === 'plot' ? 'species' : 'location')}
              disabled={!photoPreview}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              Weiter <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* SCHRITT 2: Standort (nur im Einzelbaum-Modus) */}
        {step === 'location' && (
          <div className="p-4">
            <button onClick={() => setStep('camera')} className="flex items-center gap-1 text-sm text-slate-500 mb-4 hover:text-slate-900">
              <ChevronLeft size={16} /> Zurück
            </button>
            <h2 className="text-xl font-bold mb-1">Standort</h2>
            <p className="text-slate-400 text-sm mb-5">Wald und Abteilung werden per GPS vorgeschlagen. Bei Bedarf anpassen.</p>

            {/* GPS Status */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 mb-4 flex items-center gap-3">
              <MapPin size={16} className={locating || gpsLoading ? 'text-amber-600 animate-pulse' : form.lat ? 'text-emerald-600' : 'text-slate-500'} />
              <div className="flex-1 min-w-0">
                {locating || gpsLoading ? (
                  <p className="text-sm text-amber-600">GPS & Standort werden ermittelt…</p>
                ) : form.lat ? (
                  <p className="text-sm text-emerald-600 font-mono">{form.lat.toFixed(5)}, {form.lng?.toFixed(5)}</p>
                ) : (
                  <p className="text-sm text-slate-500">Kein GPS-Signal</p>
                )}
              </div>
              <button onClick={captureGps} disabled={gpsLoading || locating}
                className="text-xs text-slate-400 hover:text-emerald-600 disabled:opacity-40 shrink-0">
                Neu
              </button>
            </div>

            {/* GPS-Fehler */}
            {gpsError && !gpsLoading && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 mb-4 text-sm text-amber-700">
                {gpsError === 'denied' && 'GPS-Zugriff verweigert. Bitte in den Einstellungen freigeben.'}
                {gpsError === 'insecure' && 'GPS erfordert HTTPS. Bitte App über HTTPS öffnen.'}
                {gpsError === 'timeout' && 'GPS-Signal zu schwach. Im Freien erneut versuchen.'}
                {gpsError === 'unavailable' && 'GPS nicht verfügbar.'}
              </div>
            )}

            {/* Wald */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                <Trees size={14} className="text-emerald-600" /> Wald
              </label>
              <select
                value={form.forestId}
                onChange={e => {
                  const f = forests.find(f => f.id === e.target.value);
                  setForm(prev => ({ ...prev, forestId: e.target.value, forestName: f?.name ?? '', compartmentId: '', compartmentName: '' }));
                }}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-emerald-500"
              >
                <option value="">– Wald wählen –</option>
                {forests.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              {form.forestId && !gpsLoading && !locating && (
                <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                  <Check size={10} /> GPS-Vorschlag
                </p>
              )}
            </div>

            {/* Abteilung */}
            {form.forestId && (
              <div className="mb-5">
                <label className="block text-sm font-medium text-slate-700 mb-2">Abteilung</label>
                <div className="space-y-2">
                  {(forests.find(f => f.id === form.forestId)?.compartments ?? []).map(c => (
                    <button key={c.id}
                      onClick={() => setForm(f => ({ ...f, compartmentId: c.id, compartmentName: c.name ?? '' }))}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-colors border ${
                        form.compartmentId === c.id
                          ? 'bg-emerald-600/20 border-emerald-500 text-white'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: c.color ?? '#3b82f6' }} />
                        <span className="font-medium">{c.name || 'Abteilung'}</span>
                      </div>
                      {form.compartmentId === c.id && <Check size={16} className="text-emerald-600" />}
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
                    Keine Abteilung
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => setStep('species')}
              disabled={!form.forestId}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              Weiter <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* SCHRITT 3: Baumart + Durchmesser */}
        {step === 'species' && (
          <div className="p-4">
            <button onClick={() => setStep(mode === 'plot' ? 'camera' : 'location')} className="flex items-center gap-1 text-sm text-slate-500 mb-4 hover:text-slate-900">
              <ChevronLeft size={16} /> Zurück
            </button>
            <h2 className="text-xl font-bold mb-1">Baumart & Maße</h2>
            <p className="text-slate-400 text-sm mb-5">Baumart bestätigen und Durchmesser eingeben.</p>

            {/* Durchmesser */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Brusthöhendurchmesser (BHD) in cm
              </label>
              <input
                type="number"
                inputMode="decimal"
                placeholder="z.B. 42"
                value={form.diameter}
                onChange={e => setForm(f => ({ ...f, diameter: e.target.value }))}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 text-lg placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
              />
              {/* Plausibilitätswarnungen BHD */}
              {form.diameter && (() => {
                const d = parseFloat(form.diameter);
                const warns = validateTreeMeasurement({ diameterCm: isNaN(d) ? null : d });
                const dWarns = warns.filter(w => w.field === 'diameter');
                return dWarns.length > 0 ? (
                  <div className="mt-2 space-y-1">
                    {dWarns.map((w, i) => (
                      <p key={i} className={`text-xs px-3 py-1.5 rounded-lg ${w.severity === 'error' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                        ⚠ {w.message}
                      </p>
                    ))}
                  </div>
                ) : null;
              })()}
            </div>

            {/* Baumartensuche — DB-basiert mit Favoriten */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-slate-700 mb-2">Baumart</label>

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
                    className="text-xs text-emerald-600 hover:text-emerald-800">Ändern</button>
                </div>
              )}

              {/* Suchfeld */}
              {!form.species && (
                <>
                  <input
                    type="text"
                    placeholder="Baumart suchen (deutsch, englisch oder lateinisch)…"
                    value={speciesSearch}
                    onChange={e => { setSpeciesSearch(e.target.value); searchSpeciesDb(e.target.value); }}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 mb-3"
                  />

                  {/* Favoriten (häufig verwendet) */}
                  {!speciesSearch && speciesFavorites.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Häufig verwendet</p>
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
                      <p className="text-xs text-slate-400 py-3 text-center">Keine Baumart gefunden</p>
                    )}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setStep('height-age')}
              disabled={!form.species}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors mt-4"
            >
              Weiter <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* SCHRITT 4: Höhe & Alter */}
        {step === 'height-age' && (
          <div className="p-4">
            <button onClick={() => setStep('species')} className="flex items-center gap-1 text-sm text-slate-500 mb-4 hover:text-slate-900">
              <ChevronLeft size={16} /> Zurück
            </button>
            <h2 className="text-xl font-bold mb-1">Höhe & Alter</h2>
            <p className="text-slate-400 text-sm mb-5">Baumhöhe messen oder schätzen und Alter angeben.</p>

            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Baumhöhe in m
                {form.species && form.diameter && !isNaN(parseFloat(form.diameter)) && (() => {
                  const h = estimateHeight(form.species, parseFloat(form.diameter));
                  return h ? <span className="ml-2 text-xs text-emerald-600 font-normal">Richtwert: ~{h} m</span> : null;
                })()}
              </label>
              <input type="number" inputMode="decimal" placeholder="z.B. 28" value={form.height}
                onChange={e => setForm(f => ({ ...f, height: e.target.value }))}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 text-lg placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
              />
              {form.height && (() => {
                const d = form.diameter ? parseFloat(form.diameter) : null;
                const h = parseFloat(form.height);
                const warns = validateTreeMeasurement({ diameterCm: d && !isNaN(d) ? d : null, heightM: isNaN(h) ? null : h, species: form.species || null });
                const hWarns = warns.filter(w => w.field === 'height');
                return hWarns.length > 0 ? (
                  <div className="mt-2 space-y-1">
                    {hWarns.map((w, i) => (
                      <p key={i} className={`text-xs px-3 py-1.5 rounded-lg ${w.severity === 'error' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>⚠ {w.message}</p>
                    ))}
                  </div>
                ) : null;
              })()}
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-700 mb-2">Geschätztes Alter (Jahre)</label>
              <input type="number" inputMode="numeric" placeholder="z.B. 80" value={form.age}
                onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 text-lg placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button onClick={() => setStep('stand')}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors">
              Weiter <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* SCHRITT 5: Bestandstyp & Bestockungsgrad */}
        {step === 'stand' && (
          <div className="p-4">
            <button onClick={() => setStep('height-age')} className="flex items-center gap-1 text-sm text-slate-500 mb-4 hover:text-slate-900">
              <ChevronLeft size={16} /> Zurück
            </button>
            <h2 className="text-xl font-bold mb-1">Bestand</h2>
            <p className="text-slate-400 text-sm mb-5">Bestandstyp und Bestockungsgrad einschätzen.</p>

            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-700 mb-2">Bestandstyp</label>
              <div className="grid grid-cols-2 gap-2">
                {STAND_TYPES.map(s => (
                  <button key={s.id} onClick={() => setForm(f => ({ ...f, standType: f.standType === s.id ? '' : s.id }))}
                    className={`px-3 py-3 rounded-xl text-sm font-medium transition-colors ${form.standType === s.id ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-700 mb-2">Bestockungsgrad</label>
              <div className="grid grid-cols-3 gap-2">
                {STOCKING_DEGREES.map(s => (
                  <button key={s.id} onClick={() => setForm(f => ({ ...f, stockingDegree: f.stockingDegree === s.id ? '' : s.id }))}
                    className={`px-3 py-3 rounded-xl text-sm font-medium transition-colors ${form.stockingDegree === s.id ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => setStep('soil')}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors">
              Weiter <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* SCHRITT 6: Boden */}
        {step === 'soil' && (
          <div className="p-4">
            <button onClick={() => setStep('stand')} className="flex items-center gap-1 text-sm text-slate-500 mb-4 hover:text-slate-900">
              <ChevronLeft size={16} /> Zurück
            </button>
            <h2 className="text-xl font-bold mb-1">Boden</h2>
            <p className="text-slate-400 text-sm mb-5">Bodenbeschaffenheit und Feuchtigkeit angeben.</p>

            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                <Leaf size={14} className="text-emerald-600" /> Bodenbeschaffenheit
              </label>
              <div className="grid grid-cols-2 gap-2">
                {SOIL_CONDITIONS.map(s => (
                  <button key={s.id} onClick={() => setForm(f => ({ ...f, soilCondition: f.soilCondition === s.id ? '' : s.id }))}
                    className={`px-3 py-3 rounded-xl text-sm font-medium transition-colors ${form.soilCondition === s.id ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                <Droplets size={14} className="text-blue-400" /> Bodenfeuchtigkeit
              </label>
              <div className="grid grid-cols-2 gap-2">
                {SOIL_MOISTURE.map(s => (
                  <button key={s.id} onClick={() => setForm(f => ({ ...f, soilMoisture: f.soilMoisture === s.id ? '' : s.id }))}
                    className={`px-3 py-3 rounded-xl text-sm font-medium transition-colors ${form.soilMoisture === s.id ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => setStep('exposition')}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors">
              Weiter <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* SCHRITT 7: Exposition */}
        {step === 'exposition' && (
          <div className="p-4">
            <button onClick={() => setStep('soil')} className="flex items-center gap-1 text-sm text-slate-500 mb-4 hover:text-slate-900">
              <ChevronLeft size={16} /> Zurück
            </button>
            <h2 className="text-xl font-bold mb-1">Exposition</h2>
            <p className="text-slate-400 text-sm mb-5">Hangrichtung und bei Hanglage: Neigung und Position.</p>

            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-700 mb-2">Hangrichtung</label>
              <div className="grid grid-cols-3 gap-2">
                {EXPOSITIONS.map(s => (
                  <button key={s.id} onClick={() => setForm(f => ({
                    ...f, exposition: f.exposition === s.id ? '' : s.id,
                    ...(s.id === 'FLAT' || f.exposition === s.id ? { slopeClass: '', slopePosition: '' } : {}),
                  }))}
                    className={`py-3 rounded-xl text-sm font-medium transition-colors ${form.exposition === s.id ? 'bg-amber-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {form.exposition && form.exposition !== 'FLAT' && (
              <>
                <div className="mb-5">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Hangneigung</label>
                  <div className="grid grid-cols-2 gap-2">
                    {SLOPE_CLASSES.map(s => (
                      <button key={s.id} onClick={() => setForm(f => ({ ...f, slopeClass: f.slopeClass === s.id ? '' : s.id }))}
                        className={`py-3 rounded-xl text-sm font-medium transition-colors ${form.slopeClass === s.id ? 'bg-amber-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-5">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Hangposition</label>
                  <div className="grid grid-cols-2 gap-2">
                    {SLOPE_POSITIONS.map(s => (
                      <button key={s.id} onClick={() => setForm(f => ({ ...f, slopePosition: f.slopePosition === s.id ? '' : s.id }))}
                        className={`py-3 rounded-xl text-sm font-medium transition-colors ${form.slopePosition === s.id ? 'bg-amber-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <button onClick={() => setStep('notes')}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors">
              Weiter <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* SCHRITT 8: Notizen */}
        {step === 'notes' && (
          <div className="p-4">
            <button onClick={() => setStep('exposition')} className="flex items-center gap-1 text-sm text-slate-500 mb-4 hover:text-slate-900">
              <ChevronLeft size={16} /> Zurück
            </button>
            <h2 className="text-xl font-bold mb-1">Notizen</h2>
            <p className="text-slate-400 text-sm mb-5">Besonderheiten, Schäden oder sonstige Anmerkungen.</p>

            <textarea
              rows={4}
              placeholder="z.B. Zwiesel, Borkenkäferbefall, Stammriss…"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 resize-none mb-5"
            />

            <button onClick={() => setStep('review')}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors">
              Zusammenfassung <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* SCHRITT 9: Zusammenfassung & Speichern */}
        {step === 'review' && (
          <div className="p-4">
            <button onClick={() => setStep('notes')} className="flex items-center gap-1 text-sm text-slate-500 mb-4 hover:text-slate-900">
              <ChevronLeft size={16} /> Zurück
            </button>
            <h2 className="text-xl font-bold mb-1">Zusammenfassung</h2>
            <p className="text-slate-400 text-sm mb-5">Daten prüfen und Baum speichern.</p>

            {/* Foto-Vorschau */}
            {photoPreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoPreview} alt="Baum" className="w-full aspect-video object-cover rounded-xl mb-4" />
            )}

            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 mb-5">
              {/* Standort */}
              <div className="px-4 py-3 flex justify-between">
                <span className="text-sm text-slate-500">Standort</span>
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
                <span className="text-sm text-slate-500">Baumart</span>
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
                  <span className="text-sm text-slate-500">Höhe</span>
                  <span className="text-sm font-medium text-slate-900">{form.height} m</span>
                </div>
              )}
              {/* Alter */}
              {form.age && (
                <div className="px-4 py-3 flex justify-between">
                  <span className="text-sm text-slate-500">Alter</span>
                  <span className="text-sm font-medium text-slate-900">~{form.age} Jahre</span>
                </div>
              )}
              {/* Bestand */}
              {(form.standType || form.stockingDegree) && (
                <div className="px-4 py-3 flex justify-between">
                  <span className="text-sm text-slate-500">Bestand</span>
                  <span className="text-sm text-slate-700">
                    {STAND_TYPES.find(s => s.id === form.standType)?.label ?? ''}
                    {form.standType && form.stockingDegree && ' · '}
                    {STOCKING_DEGREES.find(s => s.id === form.stockingDegree)?.label ?? ''}
                  </span>
                </div>
              )}
              {/* Boden */}
              {(form.soilCondition || form.soilMoisture) && (
                <div className="px-4 py-3 flex justify-between">
                  <span className="text-sm text-slate-500">Boden</span>
                  <span className="text-sm text-slate-700">
                    {SOIL_CONDITIONS.find(s => s.id === form.soilCondition)?.label ?? ''}
                    {form.soilCondition && form.soilMoisture && ' · '}
                    {SOIL_MOISTURE.find(s => s.id === form.soilMoisture)?.label ?? ''}
                  </span>
                </div>
              )}
              {/* Exposition */}
              {form.exposition && (
                <div className="px-4 py-3 flex justify-between">
                  <span className="text-sm text-slate-500">Exposition</span>
                  <span className="text-sm text-slate-700">
                    {EXPOSITIONS.find(s => s.id === form.exposition)?.label ?? ''}
                    {form.slopeClass && ` · ${SLOPE_CLASSES.find(s => s.id === form.slopeClass)?.label ?? ''}`}
                    {form.slopePosition && ` · ${SLOPE_POSITIONS.find(s => s.id === form.slopePosition)?.label ?? ''}`}
                  </span>
                </div>
              )}
              {/* Notizen */}
              {form.notes && (
                <div className="px-4 py-3">
                  <span className="text-sm text-slate-500 block mb-1">Notizen</span>
                  <span className="text-sm text-slate-700">{form.notes}</span>
                </div>
              )}
            </div>

            <button
              onClick={saveTree}
              disabled={isSavingTree}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              {isSavingTree
                ? <><Loader2 size={18} className="animate-spin" /> Wird gespeichert…</>
                : <><Check size={18} /> Baum speichern</>
              }
            </button>
          </div>
        )}

        {/* SCHRITT 4: Gespeichert */}
        {step === 'saved' && (
          <div className="p-4 flex flex-col items-center text-center pt-12">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
              <Check size={40} className="text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Baum gespeichert</h2>
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
                <CloudOff size={14} /> Offline gespeichert – wird synchronisiert sobald online
              </p>
            )}
            {isOnline && (
              <p className="text-sm text-emerald-600 mt-2">
                ✓ Auf der Karte sichtbar
              </p>
            )}
            {photoUploadStatus === 'uploading' && (
              <p className="text-sm text-slate-400 mt-2 mb-2 flex items-center justify-center gap-1.5">
                <RefreshCw size={13} className="animate-spin" /> Foto wird hochgeladen…
              </p>
            )}
            {photoUploadStatus === 'success' && (
              <p className="text-sm text-emerald-600 mt-2 mb-2">✓ Foto gespeichert</p>
            )}
            {photoUploadStatus === 'error' && (
              <p className="text-sm text-amber-600 mt-2 mb-2">
                ⚠ Foto konnte nicht hochgeladen werden – Baum ist trotzdem gespeichert
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
                      {done ? '✓ Stichprobe vollständig' : `Stichprobe: ${savedCount} / ${target} Bäume`}
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
              {savedPoiId && (
                <button
                  onClick={() => setStep('task')}
                  className="w-full py-3 bg-blue-700 hover:bg-blue-600 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <ClipboardList size={18} /> Aufgabe erstellen
                </button>
              )}
              <button
                onClick={nextTree}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <TreePine size={18} /> Nächster Baum
              </button>
              {mode === 'plot' ? (
                <button
                  onClick={finishPlot}
                  className="w-full py-3 bg-violet-700 hover:bg-violet-600 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <CircleDot size={16} /> Plot abschließen
                </button>
              ) : (
                <button
                  onClick={finish}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium text-slate-700 transition-colors"
                >
                  Inventur beenden ({savedCount} {savedCount === 1 ? 'Baum' : 'Bäume'})
                </button>
              )}
            </div>
          </div>
        )}

        {/* SCHRITT 4b: Aufgabe erstellen */}
        {step === 'task' && (
          <div className="p-4">
            <button onClick={() => setStep('saved')} className="flex items-center gap-1 text-sm text-slate-500 mb-4 hover:text-slate-900">
              <ChevronLeft size={16} /> Zurück
            </button>
            <h2 className="text-xl font-bold mb-1">Aufgabe erstellen</h2>
            <p className="text-slate-400 text-sm mb-5">
              Diese Aufgabe wird dem Baum zugeordnet und erscheint im Kanban-Board und Kalender.
            </p>

            {/* Titel */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Titel *</label>
              <input
                type="text"
                placeholder="z.B. Schaden kontrollieren"
                value={taskTitle}
                onChange={e => setTaskTitle(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Priorität */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Priorität</label>
              <div className="grid grid-cols-3 gap-2">
                {([['LOW', 'Niedrig', 'bg-slate-600'], ['MEDIUM', 'Mittel', 'bg-amber-600'], ['HIGH', 'Hoch', 'bg-red-600']] as [string, string, string][]).map(([val, label, active]) => (
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
              <label className="block text-sm font-medium text-slate-700 mb-2">Fällig bis (optional)</label>
              <DateTrigger
                value={taskDueDate}
                placeholder="Kein Datum gewählt"
                onClick={() => setTaskShowDatePicker(true)}
              />
              {taskShowDatePicker && (
                <DatePickerSheet
                  value={taskDueDate}
                  label="Fälligkeitsdatum"
                  onChange={setTaskDueDate}
                  onClose={() => setTaskShowDatePicker(false)}
                />
              )}
            </div>

            {/* Zuweisung */}
            {members.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <span className="flex items-center gap-1.5"><User size={14} /> Zuweisen an (optional)</span>
                </label>
                <div className="space-y-1.5">
                  <button
                    onClick={() => setTaskAssigneeId('')}
                    className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors ${
                      taskAssigneeId === '' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    Nicht zugewiesen
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
                <><ClipboardList size={18} /> Aufgabe speichern</>
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
            <h2 className="text-2xl font-bold mb-1">Plot abgeschlossen</h2>
            <p className="text-slate-700 text-base font-medium mb-1">{plotSession.name}</p>
            <p className="text-slate-400 text-sm mb-2">
              Radius {plotSession.radiusM} m · {savedCount} {savedCount === 1 ? 'Baum' : 'Bäume'} erfasst
            </p>
            <p className="text-xs text-slate-500 mb-8">
              Die Auswertung (N/ha, G/ha, V/ha, Ertragstafel) erscheint in der Forsteinrichtung.
            </p>
            <div className="w-full space-y-3">
              <button
                onClick={startNewPlot}
                className="w-full py-4 bg-violet-700 hover:bg-violet-600 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <CircleDot size={18} /> Neuen Plot starten
              </button>
              <button
                onClick={finish}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium text-slate-700 transition-colors"
              >
                Inventur beenden ({savedCount} {savedCount === 1 ? 'Baum' : 'Bäume'})
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
              <h2 className="text-2xl font-bold mb-1">Inventur abgeschlossen</h2>
              <p className="text-slate-400 text-sm">
                {sessionTrees.length} {sessionTrees.length === 1 ? 'Baum' : 'Bäume'} erfasst
              </p>
              {pendingCount > 0 && (
                <div className="mt-3 flex items-center gap-2 bg-amber-900/30 border border-amber-800 rounded-xl px-3 py-2">
                  <CloudOff size={14} className="text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-700">
                    {pendingCount} {pendingCount === 1 ? 'Datensatz' : 'Datensätze'} warten auf Synchronisation
                  </p>
                  {isOnline && (
                    <button
                      onClick={syncPending}
                      disabled={isSyncing}
                      className="ml-auto shrink-0 text-xs text-emerald-600 underline disabled:opacity-50"
                    >
                      {isSyncing ? 'Sync…' : 'Jetzt sync'}
                    </button>
                  )}
                </div>
              )}
              {pendingCount === 0 && (
                <p className="mt-2 text-xs text-emerald-600 flex items-center gap-1">
                  <Check size={12} /> Alle Daten synchronisiert
                </p>
              )}
            </div>

            {/* Baumliste */}
            {sessionTrees.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Erfasste Bäume</h3>
                <div className="space-y-2">
                  {sessionTrees.map((tree, i) => {
                    const speciesLabel = TREE_SPECIES.find(s => s.id === tree.species)?.label ?? tree.species;
                    const speciesColor = TREE_SPECIES.find(s => s.id === tree.species)?.color ?? '#64748b';
                    const soilLabel = SOIL_CONDITIONS.find(s => s.id === tree.soilCondition)?.label;
                    const moistLabel = SOIL_MOISTURE.find(s => s.id === tree.soilMoisture)?.label;
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
                          {soilLabel && <span>Boden: {soilLabel}</span>}
                          {moistLabel && <span>Feuchte: {moistLabel}</span>}
                          {tree.lat && tree.lng && (
                            <span className="font-mono">{tree.lat.toFixed(4)}, {tree.lng.toFixed(4)}</span>
                          )}
                        </div>
                        {!tree.synced && (
                          <span className="mt-1 inline-flex items-center gap-1 text-xs text-amber-600">
                            <CloudOff size={10} /> Offline gespeichert
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
                <TreePine size={18} /> Neue Session starten
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
