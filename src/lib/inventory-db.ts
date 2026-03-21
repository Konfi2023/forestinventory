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
  lat: number;
  lng: number;
  species: string;
  diameter: number | null;
  height: number | null;
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

export class InventoryDB extends Dexie {
  pendingTrees!: Table<PendingTree, number>;
  pendingLogPiles!: Table<PendingLogPile, number>;

  constructor() {
    super('ForestInventoryDB');
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
  }
}

export const db = new InventoryDB();
