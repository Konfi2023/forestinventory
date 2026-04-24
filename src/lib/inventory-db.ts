import Dexie, { type Table } from 'dexie';

export interface PendingLogPile {
  id?: number;
  orgSlug?: string; // gespeichert für Hintergrund-Sync
  forestId: string;
  forestName: string;
  lat: number;
  lng: number;
  treeSpecies: string | null;
  woodType: string | null;
  volumeFm: number | null;
  logLength: number | null;
  layerCount: number | null;
  qualityClass: string | null;
  imageDataUrl: string | null; // base64 preview für Offline
  notes: string | null;
  createdAt: string;
  synced: boolean;
}

export interface PendingTree {
  id?: number;
  forestId: string;
  forestName: string;
  compartmentId?: string;
  plotId?: string; // Probekreis-ID (optional)
  lat: number;
  lng: number;
  species: string;
  diameter: number | null;
  height: number | null;
  age: number | null;
  // Boden
  soilCondition:  string | null;
  soilMoisture:   string | null;
  // Standort
  exposition:     string | null;
  slopeClass:     string | null;
  slopePosition:  string | null;
  standType:      string | null;
  stockingDegree: string | null;
  // Vitalität
  damageType:        string | null;
  damageSeverity:    number | null;
  crownCondition:    number | null;
  imageDataUrl:      string | null; // base64 Stammfoto für Offline
  crownImageDataUrl: string | null; // base64 Kronenfoto für Offline
  notes: string | null;
  createdAt: string;
  synced: boolean;
}

export interface PendingPlot {
  id?: number;
  plotId?: string;          // server-seitige UUID nach Sync
  forestId: string;
  compartmentId?: string;
  lat: number;
  lng: number;
  radiusM: number;
  name?: string;
  notes?: string;
  createdAt: string;
  synced: boolean;
}

export interface CachedSpecies {
  id: string;
  scientificName: string;
  label: string;
  color: string;
  legacyId: string | null;
  isFavorite: boolean;
  usageCount: number;
}

export interface PendingPath {
  id?: number;
  orgSlug: string;
  forestId: string;
  forestName: string;
  type: 'ROAD' | 'SKID_TRAIL' | 'WATER';
  name: string | null;
  note: string | null;
  // GeoJSON LineString coordinate array: [[lng, lat], ...]
  coordinates: [number, number][];
  lengthM: number;
  startedAt: string;
  stoppedAt: string | null; // null = noch in Aufnahme
  confirmed: boolean;       // true sobald User im Bestätigen-Sheet gespeichert hat
  synced: boolean;
}

export class InventoryDB extends Dexie {
  pendingTrees!: Table<PendingTree, number>;
  pendingLogPiles!: Table<PendingLogPile, number>;
  pendingPlots!: Table<PendingPlot, number>;
  cachedSpecies!: Table<CachedSpecies, string>;
  pendingPaths!: Table<PendingPath, number>;

  constructor() {
    super('Forest ManagerDB');
    this.version(1).stores({
      pendingTrees: '++id, synced, createdAt, forestId',
    });
    this.version(2).stores({
      pendingTrees: '++id, synced, createdAt, forestId',
    });
    // Version 3: Polter-Offline-Erfassung
    this.version(3).stores({
      pendingTrees:    '++id, synced, createdAt, forestId',
      pendingLogPiles: '++id, synced, createdAt, forestId',
    });
    // Version 4: Kronenfoto für Bäume
    this.version(4).stores({
      pendingTrees:    '++id, synced, createdAt, forestId',
      pendingLogPiles: '++id, synced, createdAt, forestId',
    });
    // Version 5: orgSlug in pendingLogPiles für Hintergrund-Sync
    this.version(5).stores({
      pendingTrees:    '++id, synced, createdAt, forestId',
      pendingLogPiles: '++id, synced, createdAt, forestId',
    });
    // Version 6: compartmentId in pendingTrees
    this.version(6).stores({
      pendingTrees:    '++id, synced, createdAt, forestId',
      pendingLogPiles: '++id, synced, createdAt, forestId',
    });
    // Version 7: plotId in pendingTrees + pendingPlots Tabelle
    this.version(7).stores({
      pendingTrees:    '++id, synced, createdAt, forestId, plotId',
      pendingLogPiles: '++id, synced, createdAt, forestId',
      pendingPlots:    '++id, synced, createdAt, forestId',
    });
    // Version 8: Offline-Cache für Baumarten
    this.version(8).stores({
      pendingTrees:    '++id, synced, createdAt, forestId, plotId',
      pendingLogPiles: '++id, synced, createdAt, forestId',
      pendingPlots:    '++id, synced, createdAt, forestId',
      cachedSpecies:   'id, isFavorite',
    });
    // Version 9: Wege-Aufnahme (live + offline)
    this.version(9).stores({
      pendingTrees:    '++id, synced, createdAt, forestId, plotId',
      pendingLogPiles: '++id, synced, createdAt, forestId',
      pendingPlots:    '++id, synced, createdAt, forestId',
      cachedSpecies:   'id, isFavorite',
      pendingPaths:    '++id, synced, confirmed, startedAt, forestId, orgSlug',
    });
  }
}

export const db = new InventoryDB();
