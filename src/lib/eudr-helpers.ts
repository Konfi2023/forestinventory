// EUDR-Hilfsdaten und -Funktionen (kein "use server" — clientseitig nutzbar)

export const SCIENTIFIC_NAMES: Record<string, string> = {
  OAK:     "Quercus robur",
  SPRUCE:  "Picea abies",
  BEECH:   "Fagus sylvatica",
  PINE:    "Pinus sylvestris",
  DOUGLAS: "Pseudotsuga menziesii",
  LARCH:   "Larix decidua",
  FIR:     "Abies alba",
  BIRCH:   "Betula pendula",
  ALDER:   "Alnus glutinosa",
  ASH:     "Fraxinus excelsior",
  MAPLE:   "Acer pseudoplatanus",
  POPLAR:  "Populus tremula",
  MIXED:   "Species mixtae",
  OTHER:   "Species diversae",
};

// Baumart → Rohdichte kg/m³
const DENSITY_KG_M3: Record<string, number> = {
  OAK: 650, BEECH: 680, ASH: 670, MAPLE: 600,
  SPRUCE: 430, FIR: 430, LARCH: 550, PINE: 480,
  DOUGLAS: 470, BIRCH: 550, ALDER: 490, POPLAR: 380,
  MIXED: 500, OTHER: 500,
};

export function calcKgFromM3(species: string, m3: number): number {
  return Math.round((DENSITY_KG_M3[species] ?? 500) * m3);
}

export const HS_CODE_OPTIONS = [
  { code: "4403", label: "4403 – Rohholz (Stämme, unbearbeitet)" },
  { code: "4407", label: "4407 – Schnittholz (gesägt/gehobelt)" },
  { code: "4408", label: "4408 – Furnierblätter / Sperrholzlagen" },
  { code: "4412", label: "4412 – Sperrholz / Verbundholz" },
  { code: "4418", label: "4418 – Bauholzerzeugnisse (Fenster, Türen…)" },
  { code: "4401", label: "4401 – Brennholz / Holzpellets" },
];
