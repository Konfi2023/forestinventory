export interface TreeSpecies {
  id: string;
  label: string;
  color: string;
}

export const TREE_SPECIES: TreeSpecies[] = [
  { id: 'OAK',      label: 'Eiche',       color: '#22c55e' },
  { id: 'SPRUCE',   label: 'Fichte',      color: '#1e40af' },
  { id: 'BEECH',    label: 'Buche',       color: '#a3e635' },
  { id: 'PINE',     label: 'Kiefer',      color: '#06b6d4' },
  { id: 'DOUGLAS',  label: 'Douglasie',   color: '#a855f7' },
  { id: 'LARCH',    label: 'Lärche',      color: '#f97316' },
  { id: 'FIR',      label: 'Tanne',       color: '#0f766e' },
  { id: 'BIRCH',    label: 'Birke',       color: '#fbbf24' },
  { id: 'ALDER',    label: 'Erle',        color: '#64748b' },
  { id: 'ASH',      label: 'Esche',       color: '#78716c' },
  { id: 'MAPLE',    label: 'Ahorn',       color: '#84cc16' },
  { id: 'POPLAR',   label: 'Pappel',      color: '#e2e8f0' },
  { id: 'MIXED',    label: 'Mischbestand',color: '#f59e0b' },
  { id: 'OTHER',    label: 'Sonstige',    color: '#9ca3af' },
];

export function getSpeciesColor(id: string): string {
  return TREE_SPECIES.find(s => s.id === id)?.color ?? '#22c55e';
}

export function getSpeciesLabel(id: string): string {
  return TREE_SPECIES.find(s => s.id === id)?.label ?? id;
}

/** Dominant species (highest count) from content array */
export function getDominantSpecies(content: { species: string; count: number }[]): string | null {
  if (!content?.length) return null;
  return content.reduce((a, b) => (b.count > a.count ? b : a)).species;
}
