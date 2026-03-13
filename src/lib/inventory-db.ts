import Dexie, { type Table } from 'dexie';

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
  damageType:     string | null;
  damageSeverity: number | null;
  crownCondition: number | null;
  notes: string | null;
  createdAt: string;
  synced: boolean;
}

export class InventoryDB extends Dexie {
  pendingTrees!: Table<PendingTree, number>;

  constructor() {
    super('ForestInventoryDB');
    this.version(1).stores({
      pendingTrees: '++id, synced, createdAt, forestId',
    });
    // Version 2: Neue Felder für Standort und Vitalität
    this.version(2).stores({
      pendingTrees: '++id, synced, createdAt, forestId',
    });
  }
}

export const db = new InventoryDB();
