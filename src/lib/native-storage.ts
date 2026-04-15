/**
 * Native Storage — zuverlaessiger Offline-Speicher fuer die Capacitor-App.
 * Nutzt Capacitor Preferences (native SharedPreferences/UserDefaults)
 * statt IndexedDB/localStorage, die im WebView unzuverlaessig sein koennen.
 */

import { isNativeApp, setPreference, getPreference } from './capacitor-bridge';

const PENDING_TREES_KEY = 'pending_trees_v1';
const SPECIES_CACHE_KEY = 'species_cache';

// --- Pending Trees -------------------------------------------------------

export interface NativePendingTree {
  id: string;
  forestId: string;
  forestName: string;
  compartmentId?: string;
  plotId?: string;
  lat: number;
  lng: number;
  species: string;
  diameter: number | null;
  height: number | null;
  age: number | null;
  soilCondition: string | null;
  soilMoisture: string | null;
  exposition: string | null;
  slopeClass: string | null;
  slopePosition: string | null;
  standType: string | null;
  stockingDegree: string | null;
  damageType: string | null;
  damageSeverity: number | null;
  crownCondition: number | null;
  notes: string | null;
  createdAt: string;
  synced: boolean;
  photoPath?: string | null;
  crownPhotoPath?: string | null;
}

export async function getPendingTrees(): Promise<NativePendingTree[]> {
  const raw = await getPreference(PENDING_TREES_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

export async function addPendingTree(tree: NativePendingTree): Promise<void> {
  const trees = await getPendingTrees();
  trees.push(tree);
  await setPreference(PENDING_TREES_KEY, JSON.stringify(trees));
}

export async function markTreeSynced(id: string): Promise<void> {
  const trees = await getPendingTrees();
  const updated = trees.map(t => t.id === id ? { ...t, synced: true } : t);
  await setPreference(PENDING_TREES_KEY, JSON.stringify(updated));
}

export async function removeSyncedTrees(): Promise<void> {
  const trees = await getPendingTrees();
  const pending = trees.filter(t => !t.synced);
  await setPreference(PENDING_TREES_KEY, JSON.stringify(pending));
}

export async function getPendingTreeCount(): Promise<number> {
  const trees = await getPendingTrees();
  return trees.filter(t => !t.synced).length;
}

// --- Species Cache -------------------------------------------------------

export async function getCachedSpecies(): Promise<any[]> {
  const raw = await getPreference(SPECIES_CACHE_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

export async function setCachedSpecies(species: any[]): Promise<void> {
  await setPreference(SPECIES_CACHE_KEY, JSON.stringify(species));
}

// --- Photo Storage (native) ----------------------------------------------

export async function savePhotoLocally(dataUrl: string, filename: string): Promise<string | null> {
  if (!isNativeApp()) return null;

  try {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const base64 = dataUrl.split(',')[1];
    if (!base64) return null;

    const result = await Filesystem.writeFile({
      path: 'forestmanager/photos/' + filename,
      data: base64,
      directory: Directory.Data,
      recursive: true,
    });
    return result.uri;
  } catch (e) {
    console.warn('[native-storage] Photo save error:', e);
    return null;
  }
}

export async function readPhotoLocally(uri: string): Promise<string | null> {
  if (!isNativeApp()) return null;

  try {
    const { Filesystem } = await import('@capacitor/filesystem');
    const result = await Filesystem.readFile({ path: uri });
    if (typeof result.data === 'string') {
      return 'data:image/jpeg;base64,' + result.data;
    }
    return null;
  } catch {
    return null;
  }
}

// --- UUID Generator ------------------------------------------------------

export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}
