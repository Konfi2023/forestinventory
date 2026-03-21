export interface TreeSpecies {
  id: string;
  label: string;
  color: string;
}

export const TREE_SPECIES: TreeSpecies[] = [
  // ── Nadelbaumarten ──────────────────────────────────────────────────────────
  { id: 'SPRUCE',       label: 'Fichte',                 color: '#1e40af' },
  { id: 'PINE',         label: 'Kiefer',                 color: '#06b6d4' },
  { id: 'DOUGLAS',      label: 'Douglasie',              color: '#a855f7' },
  { id: 'LARCH',        label: 'Lärche',                 color: '#f97316' },
  { id: 'FIR',          label: 'Weißtanne',              color: '#0f766e' },
  { id: 'BLACK_PINE',   label: 'Schwarzkiefer',          color: '#164e63' },
  { id: 'STONE_PINE',   label: 'Zirbelkiefer',           color: '#155e75' },
  { id: 'CEDAR',        label: 'Zeder',                  color: '#713f12' },
  { id: 'THUJA',        label: 'Thuja / Lebensbaum',     color: '#365314' },

  // ── Eichen & schwere Laubbaumarten ──────────────────────────────────────────
  { id: 'OAK',          label: 'Stieleiche',             color: '#22c55e' },
  { id: 'SESSION_OAK',  label: 'Traubeneiche',           color: '#16a34a' },
  { id: 'RED_OAK',      label: 'Roteiche',               color: '#dc2626' },
  { id: 'BEECH',        label: 'Rotbuche',               color: '#a3e635' },
  { id: 'HORNBEAM',     label: 'Hainbuche',              color: '#65a30d' },
  { id: 'ASH',          label: 'Esche',                  color: '#78716c' },
  { id: 'SYCAMORE',     label: 'Bergahorn',              color: '#84cc16' },
  { id: 'MAPLE',        label: 'Spitz-/Feldahorn',       color: '#bef264' },
  { id: 'ELM',          label: 'Ulme',                   color: '#57534e' },
  { id: 'LIME',         label: 'Linde',                  color: '#d9f99d' },
  { id: 'WALNUT',       label: 'Walnuss',                color: '#92400e' },
  { id: 'CHESTNUT',     label: 'Edelkastanie',           color: '#b45309' },
  { id: 'CHERRY',       label: 'Vogelkirsche',           color: '#e11d48' },

  // ── Leichte Laubbaumarten & Pionierbaumarten ─────────────────────────────────
  { id: 'BIRCH',        label: 'Birke',                  color: '#fbbf24' },
  { id: 'ALDER',        label: 'Schwarzerle',            color: '#64748b' },
  { id: 'GREY_ALDER',   label: 'Grauerle',               color: '#94a3b8' },
  { id: 'POPLAR',       label: 'Pappel / Hybridpappel',  color: '#e2e8f0' },
  { id: 'ASPEN',        label: 'Zitterpappel / Aspe',    color: '#cbd5e1' },
  { id: 'WILLOW',       label: 'Weide',                  color: '#4ade80' },
  { id: 'ROWAN',        label: 'Eberesche / Vogelbeere', color: '#fb7185' },
  { id: 'BLACK_LOCUST', label: 'Robinie',                color: '#fde68a' },
  { id: 'PAULOWNIA',    label: 'Paulownia',              color: '#c084fc' },

  // ── Sonstiges ────────────────────────────────────────────────────────────────
  { id: 'MIXED',        label: 'Mischbestand',           color: '#f59e0b' },
  { id: 'OTHER',        label: 'Sonstige',               color: '#9ca3af' },
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
