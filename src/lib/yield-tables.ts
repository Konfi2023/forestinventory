/**
 * Ertragstafeln (Yield Tables) für die 6 Hauptbaumarten
 * Quellen: Wiedemann (Fichte, Kiefer), Schober (Buche, Eiche), Bergel (Douglasie, Lärche)
 *
 * Tabellenstruktur je Art und Ertragsklasse (EKL I–V):
 *   Alter → { hTop, gHa, vHa, ivHa }
 *   hTop  = Oberhöhe in m (100 stärkste Stämme/ha)
 *   gHa   = Grundfläche des Hauptbestands in m²/ha
 *   vHa   = Vorrat m³/ha (Derbholz mit Rinde)
 *   ivHa  = laufender jährlicher Zuwachs m³/ha/a
 */

export type Species = 'SPRUCE' | 'PINE' | 'BEECH' | 'OAK' | 'DOUGLAS' | 'LARCH';
export type SiteClass = 1 | 2 | 3 | 4 | 5; // I = beste, V = schlechteste Bonität

export interface YieldRow {
  age: number;
  hTop: number;  // Oberhöhe m
  gHa: number;   // Grundfläche m²/ha
  vHa: number;   // Vorrat m³/ha
  ivHa: number;  // lfd. Zuwachs m³/ha/a
}

type YieldTable = Record<SiteClass, YieldRow[]>;

// ─── FICHTE (Wiedemann 1936/1937) ────────────────────────────────────────────
const SPRUCE_TABLE: YieldTable = {
  1: [
    { age: 20, hTop: 11.5, gHa: 22, vHa:  78, ivHa: 7.8 },
    { age: 30, hTop: 17.2, gHa: 30, vHa: 161, ivHa:10.6 },
    { age: 40, hTop: 22.2, gHa: 36, vHa: 256, ivHa:12.8 },
    { age: 50, hTop: 26.6, gHa: 40, vHa: 348, ivHa:13.5 },
    { age: 60, hTop: 30.3, gHa: 43, vHa: 432, ivHa:13.2 },
    { age: 70, hTop: 33.5, gHa: 45, vHa: 507, ivHa:12.5 },
    { age: 80, hTop: 36.2, gHa: 46, vHa: 573, ivHa:11.6 },
    { age: 90, hTop: 38.5, gHa: 47, vHa: 630, ivHa:10.7 },
    { age:100, hTop: 40.4, gHa: 47, vHa: 679, ivHa: 9.9 },
    { age:120, hTop: 43.5, gHa: 47, vHa: 759, ivHa: 8.5 },
  ],
  2: [
    { age: 20, hTop:  9.5, gHa: 19, vHa:  60, ivHa: 6.2 },
    { age: 30, hTop: 14.7, gHa: 27, vHa: 132, ivHa: 9.0 },
    { age: 40, hTop: 19.3, gHa: 33, vHa: 216, ivHa:11.1 },
    { age: 50, hTop: 23.4, gHa: 37, vHa: 300, ivHa:12.0 },
    { age: 60, hTop: 26.9, gHa: 40, vHa: 377, ivHa:11.7 },
    { age: 70, hTop: 29.9, gHa: 42, vHa: 445, ivHa:11.2 },
    { age: 80, hTop: 32.5, gHa: 43, vHa: 505, ivHa:10.5 },
    { age: 90, hTop: 34.7, gHa: 44, vHa: 557, ivHa: 9.7 },
    { age:100, hTop: 36.6, gHa: 44, vHa: 601, ivHa: 9.0 },
    { age:120, hTop: 39.8, gHa: 44, vHa: 673, ivHa: 7.8 },
  ],
  3: [
    { age: 20, hTop:  7.8, gHa: 16, vHa:  43, ivHa: 4.6 },
    { age: 30, hTop: 12.3, gHa: 24, vHa: 104, ivHa: 7.4 },
    { age: 40, hTop: 16.5, gHa: 30, vHa: 177, ivHa: 9.4 },
    { age: 50, hTop: 20.3, gHa: 34, vHa: 252, ivHa:10.3 },
    { age: 60, hTop: 23.6, gHa: 37, vHa: 321, ivHa:10.2 },
    { age: 70, hTop: 26.5, gHa: 39, vHa: 383, ivHa: 9.8 },
    { age: 80, hTop: 29.0, gHa: 40, vHa: 437, ivHa: 9.2 },
    { age: 90, hTop: 31.1, gHa: 41, vHa: 484, ivHa: 8.5 },
    { age:100, hTop: 32.9, gHa: 41, vHa: 524, ivHa: 7.9 },
    { age:120, hTop: 36.1, gHa: 41, vHa: 589, ivHa: 6.8 },
  ],
  4: [
    { age: 30, hTop:  9.8, gHa: 20, vHa:  76, ivHa: 5.8 },
    { age: 40, hTop: 13.6, gHa: 26, vHa: 138, ivHa: 7.5 },
    { age: 50, hTop: 17.1, gHa: 30, vHa: 202, ivHa: 8.4 },
    { age: 60, hTop: 20.2, gHa: 33, vHa: 264, ivHa: 8.5 },
    { age: 70, hTop: 23.0, gHa: 35, vHa: 320, ivHa: 8.2 },
    { age: 80, hTop: 25.4, gHa: 37, vHa: 371, ivHa: 7.7 },
    { age: 90, hTop: 27.6, gHa: 38, vHa: 415, ivHa: 7.2 },
    { age:100, hTop: 29.4, gHa: 38, vHa: 452, ivHa: 6.7 },
    { age:120, hTop: 32.6, gHa: 38, vHa: 513, ivHa: 5.8 },
  ],
  5: [
    { age: 40, hTop: 10.4, gHa: 20, vHa:  96, ivHa: 5.5 },
    { age: 50, hTop: 13.6, gHa: 24, vHa: 150, ivHa: 6.5 },
    { age: 60, hTop: 16.5, gHa: 27, vHa: 204, ivHa: 6.9 },
    { age: 70, hTop: 19.1, gHa: 30, vHa: 254, ivHa: 6.8 },
    { age: 80, hTop: 21.5, gHa: 31, vHa: 299, ivHa: 6.5 },
    { age: 90, hTop: 23.6, gHa: 32, vHa: 338, ivHa: 6.1 },
    { age:100, hTop: 25.5, gHa: 33, vHa: 372, ivHa: 5.7 },
    { age:120, hTop: 28.8, gHa: 33, vHa: 428, ivHa: 4.9 },
  ],
};

// ─── KIEFER (Wiedemann 1943) ──────────────────────────────────────────────────
const PINE_TABLE: YieldTable = {
  1: [
    { age: 20, hTop:  9.5, gHa: 19, vHa:  54, ivHa: 5.3 },
    { age: 30, hTop: 15.0, gHa: 26, vHa: 121, ivHa: 7.9 },
    { age: 40, hTop: 19.7, gHa: 31, vHa: 194, ivHa: 9.4 },
    { age: 50, hTop: 23.7, gHa: 34, vHa: 263, ivHa: 9.9 },
    { age: 60, hTop: 27.1, gHa: 36, vHa: 326, ivHa: 9.8 },
    { age: 70, hTop: 30.0, gHa: 37, vHa: 381, ivHa: 9.3 },
    { age: 80, hTop: 32.5, gHa: 38, vHa: 430, ivHa: 8.7 },
    { age: 90, hTop: 34.7, gHa: 39, vHa: 472, ivHa: 8.1 },
    { age:100, hTop: 36.5, gHa: 39, vHa: 509, ivHa: 7.5 },
    { age:120, hTop: 39.6, gHa: 39, vHa: 572, ivHa: 6.4 },
  ],
  2: [
    { age: 20, hTop:  8.0, gHa: 17, vHa:  42, ivHa: 4.4 },
    { age: 30, hTop: 12.9, gHa: 24, vHa: 100, ivHa: 6.8 },
    { age: 40, hTop: 17.2, gHa: 28, vHa: 164, ivHa: 8.2 },
    { age: 50, hTop: 21.0, gHa: 31, vHa: 227, ivHa: 8.7 },
    { age: 60, hTop: 24.2, gHa: 33, vHa: 284, ivHa: 8.6 },
    { age: 70, hTop: 27.0, gHa: 35, vHa: 336, ivHa: 8.2 },
    { age: 80, hTop: 29.4, gHa: 36, vHa: 381, ivHa: 7.7 },
    { age: 90, hTop: 31.5, gHa: 36, vHa: 421, ivHa: 7.2 },
    { age:100, hTop: 33.3, gHa: 37, vHa: 455, ivHa: 6.7 },
    { age:120, hTop: 36.4, gHa: 37, vHa: 513, ivHa: 5.7 },
  ],
  3: [
    { age: 30, hTop: 10.5, gHa: 20, vHa:  77, ivHa: 5.4 },
    { age: 40, hTop: 14.4, gHa: 25, vHa: 134, ivHa: 7.0 },
    { age: 50, hTop: 18.0, gHa: 28, vHa: 191, ivHa: 7.5 },
    { age: 60, hTop: 21.1, gHa: 30, vHa: 243, ivHa: 7.5 },
    { age: 70, hTop: 23.8, gHa: 31, vHa: 290, ivHa: 7.1 },
    { age: 80, hTop: 26.2, gHa: 32, vHa: 331, ivHa: 6.7 },
    { age: 90, hTop: 28.3, gHa: 33, vHa: 366, ivHa: 6.3 },
    { age:100, hTop: 30.1, gHa: 33, vHa: 397, ivHa: 5.8 },
    { age:120, hTop: 33.2, gHa: 34, vHa: 450, ivHa: 5.0 },
  ],
  4: [
    { age: 40, hTop: 11.3, gHa: 21, vHa:  98, ivHa: 5.5 },
    { age: 50, hTop: 14.8, gHa: 24, vHa: 153, ivHa: 6.2 },
    { age: 60, hTop: 17.9, gHa: 27, vHa: 203, ivHa: 6.3 },
    { age: 70, hTop: 20.6, gHa: 28, vHa: 247, ivHa: 6.1 },
    { age: 80, hTop: 22.9, gHa: 29, vHa: 285, ivHa: 5.7 },
    { age: 90, hTop: 25.0, gHa: 30, vHa: 317, ivHa: 5.4 },
    { age:100, hTop: 26.7, gHa: 30, vHa: 345, ivHa: 5.0 },
    { age:120, hTop: 29.7, gHa: 30, vHa: 392, ivHa: 4.3 },
  ],
  5: [
    { age: 50, hTop: 11.2, gHa: 19, vHa: 110, ivHa: 4.8 },
    { age: 60, hTop: 14.0, gHa: 22, vHa: 155, ivHa: 5.1 },
    { age: 70, hTop: 16.7, gHa: 24, vHa: 198, ivHa: 5.0 },
    { age: 80, hTop: 19.1, gHa: 25, vHa: 236, ivHa: 4.8 },
    { age: 90, hTop: 21.2, gHa: 26, vHa: 268, ivHa: 4.5 },
    { age:100, hTop: 23.1, gHa: 27, vHa: 296, ivHa: 4.2 },
    { age:120, hTop: 26.5, gHa: 27, vHa: 342, ivHa: 3.6 },
  ],
};

// ─── BUCHE (Schober 1967) ─────────────────────────────────────────────────────
const BEECH_TABLE: YieldTable = {
  1: [
    { age: 30, hTop: 12.5, gHa: 23, vHa:  97, ivHa: 6.7 },
    { age: 40, hTop: 18.3, gHa: 30, vHa: 190, ivHa: 9.1 },
    { age: 50, hTop: 23.4, gHa: 35, vHa: 290, ivHa:10.5 },
    { age: 60, hTop: 27.8, gHa: 38, vHa: 388, ivHa:11.0 },
    { age: 70, hTop: 31.4, gHa: 40, vHa: 480, ivHa:10.9 },
    { age: 80, hTop: 34.5, gHa: 41, vHa: 563, ivHa:10.5 },
    { age: 90, hTop: 37.1, gHa: 42, vHa: 637, ivHa: 9.9 },
    { age:100, hTop: 39.2, gHa: 42, vHa: 702, ivHa: 9.3 },
    { age:120, hTop: 42.5, gHa: 42, vHa: 809, ivHa: 8.0 },
    { age:140, hTop: 45.0, gHa: 42, vHa: 894, ivHa: 6.9 },
  ],
  2: [
    { age: 30, hTop: 10.5, gHa: 20, vHa:  75, ivHa: 5.5 },
    { age: 40, hTop: 15.8, gHa: 27, vHa: 158, ivHa: 8.0 },
    { age: 50, hTop: 20.6, gHa: 32, vHa: 249, ivHa: 9.4 },
    { age: 60, hTop: 24.7, gHa: 35, vHa: 339, ivHa: 9.9 },
    { age: 70, hTop: 28.3, gHa: 37, vHa: 424, ivHa: 9.8 },
    { age: 80, hTop: 31.3, gHa: 38, vHa: 502, ivHa: 9.5 },
    { age: 90, hTop: 33.9, gHa: 39, vHa: 572, ivHa: 8.9 },
    { age:100, hTop: 36.1, gHa: 39, vHa: 634, ivHa: 8.3 },
    { age:120, hTop: 39.6, gHa: 40, vHa: 737, ivHa: 7.2 },
    { age:140, hTop: 42.2, gHa: 40, vHa: 819, ivHa: 6.2 },
  ],
  3: [
    { age: 40, hTop: 13.0, gHa: 23, vHa: 120, ivHa: 6.5 },
    { age: 50, hTop: 17.5, gHa: 28, vHa: 203, ivHa: 8.2 },
    { age: 60, hTop: 21.5, gHa: 31, vHa: 286, ivHa: 8.8 },
    { age: 70, hTop: 25.0, gHa: 33, vHa: 365, ivHa: 8.8 },
    { age: 80, hTop: 28.0, gHa: 35, vHa: 438, ivHa: 8.5 },
    { age: 90, hTop: 30.6, gHa: 36, vHa: 503, ivHa: 8.1 },
    { age:100, hTop: 32.8, gHa: 37, vHa: 560, ivHa: 7.6 },
    { age:120, hTop: 36.5, gHa: 37, vHa: 658, ivHa: 6.5 },
    { age:140, hTop: 39.3, gHa: 37, vHa: 737, ivHa: 5.6 },
  ],
  4: [
    { age: 50, hTop: 14.1, gHa: 23, vHa: 152, ivHa: 6.7 },
    { age: 60, hTop: 17.9, gHa: 27, vHa: 228, ivHa: 7.5 },
    { age: 70, hTop: 21.3, gHa: 29, vHa: 302, ivHa: 7.7 },
    { age: 80, hTop: 24.4, gHa: 31, vHa: 370, ivHa: 7.6 },
    { age: 90, hTop: 27.0, gHa: 32, vHa: 431, ivHa: 7.2 },
    { age:100, hTop: 29.3, gHa: 33, vHa: 484, ivHa: 6.8 },
    { age:120, hTop: 33.2, gHa: 33, vHa: 575, ivHa: 5.8 },
    { age:140, hTop: 36.2, gHa: 34, vHa: 648, ivHa: 5.0 },
  ],
  5: [
    { age: 60, hTop: 14.1, gHa: 21, vHa: 163, ivHa: 6.0 },
    { age: 70, hTop: 17.3, gHa: 24, vHa: 232, ivHa: 6.5 },
    { age: 80, hTop: 20.3, gHa: 26, vHa: 297, ivHa: 6.5 },
    { age: 90, hTop: 23.0, gHa: 27, vHa: 356, ivHa: 6.3 },
    { age:100, hTop: 25.3, gHa: 28, vHa: 407, ivHa: 5.9 },
    { age:120, hTop: 29.6, gHa: 29, vHa: 492, ivHa: 5.1 },
    { age:140, hTop: 33.1, gHa: 29, vHa: 561, ivHa: 4.4 },
  ],
};

// ─── EICHE (Schober 1967) ─────────────────────────────────────────────────────
const OAK_TABLE: YieldTable = {
  1: [
    { age: 40, hTop: 15.0, gHa: 21, vHa: 128, ivHa: 6.4 },
    { age: 60, hTop: 22.2, gHa: 27, vHa: 246, ivHa: 7.6 },
    { age: 80, hTop: 28.0, gHa: 30, vHa: 354, ivHa: 7.8 },
    { age:100, hTop: 32.5, gHa: 32, vHa: 446, ivHa: 7.4 },
    { age:120, hTop: 36.1, gHa: 33, vHa: 520, ivHa: 6.8 },
    { age:140, hTop: 38.9, gHa: 33, vHa: 582, ivHa: 6.1 },
    { age:160, hTop: 41.2, gHa: 33, vHa: 633, ivHa: 5.4 },
  ],
  2: [
    { age: 40, hTop: 12.5, gHa: 18, vHa:  99, ivHa: 5.3 },
    { age: 60, hTop: 18.9, gHa: 24, vHa: 201, ivHa: 6.5 },
    { age: 80, hTop: 24.3, gHa: 27, vHa: 296, ivHa: 6.8 },
    { age:100, hTop: 28.7, gHa: 29, vHa: 378, ivHa: 6.5 },
    { age:120, hTop: 32.2, gHa: 30, vHa: 445, ivHa: 6.0 },
    { age:140, hTop: 35.1, gHa: 30, vHa: 502, ivHa: 5.4 },
    { age:160, hTop: 37.5, gHa: 30, vHa: 549, ivHa: 4.8 },
  ],
  3: [
    { age: 60, hTop: 15.5, gHa: 20, vHa: 155, ivHa: 5.4 },
    { age: 80, hTop: 20.5, gHa: 23, vHa: 238, ivHa: 5.8 },
    { age:100, hTop: 24.8, gHa: 25, vHa: 310, ivHa: 5.6 },
    { age:120, hTop: 28.3, gHa: 26, vHa: 370, ivHa: 5.2 },
    { age:140, hTop: 31.2, gHa: 27, vHa: 421, ivHa: 4.7 },
    { age:160, hTop: 33.7, gHa: 27, vHa: 464, ivHa: 4.2 },
  ],
  4: [
    { age: 80, hTop: 16.6, gHa: 19, vHa: 173, ivHa: 4.7 },
    { age:100, hTop: 20.7, gHa: 21, vHa: 238, ivHa: 4.6 },
    { age:120, hTop: 24.4, gHa: 22, vHa: 296, ivHa: 4.4 },
    { age:140, hTop: 27.5, gHa: 23, vHa: 344, ivHa: 4.0 },
    { age:160, hTop: 30.1, gHa: 23, vHa: 385, ivHa: 3.6 },
  ],
  5: [
    { age:100, hTop: 16.2, gHa: 16, vHa: 163, ivHa: 3.5 },
    { age:120, hTop: 19.8, gHa: 18, vHa: 213, ivHa: 3.5 },
    { age:140, hTop: 23.1, gHa: 19, vHa: 256, ivHa: 3.2 },
    { age:160, hTop: 26.0, gHa: 20, vHa: 292, ivHa: 2.9 },
  ],
};

// ─── DOUGLASIE (Bergel 1985) ──────────────────────────────────────────────────
const DOUGLAS_TABLE: YieldTable = {
  1: [
    { age: 20, hTop: 12.5, gHa: 26, vHa:  96, ivHa: 9.5 },
    { age: 30, hTop: 19.5, gHa: 37, vHa: 226, ivHa:14.2 },
    { age: 40, hTop: 26.0, gHa: 46, vHa: 386, ivHa:16.5 },
    { age: 50, hTop: 31.7, gHa: 52, vHa: 553, ivHa:17.0 },
    { age: 60, hTop: 36.6, gHa: 56, vHa: 713, ivHa:16.4 },
    { age: 70, hTop: 40.7, gHa: 58, vHa: 856, ivHa:15.5 },
    { age: 80, hTop: 44.3, gHa: 59, vHa: 980, ivHa:14.3 },
    { age: 90, hTop: 47.3, gHa: 60, vHa:1085, ivHa:13.1 },
    { age:100, hTop: 49.9, gHa: 60, vHa:1172, ivHa:12.0 },
  ],
  2: [
    { age: 20, hTop: 10.5, gHa: 22, vHa:  74, ivHa: 7.5 },
    { age: 30, hTop: 16.8, gHa: 32, vHa: 185, ivHa:12.0 },
    { age: 40, hTop: 22.7, gHa: 41, vHa: 323, ivHa:14.2 },
    { age: 50, hTop: 28.0, gHa: 47, vHa: 469, ivHa:14.9 },
    { age: 60, hTop: 32.5, gHa: 51, vHa: 610, ivHa:14.5 },
    { age: 70, hTop: 36.4, gHa: 53, vHa: 737, ivHa:13.7 },
    { age: 80, hTop: 39.8, gHa: 55, vHa: 849, ivHa:12.7 },
    { age: 90, hTop: 42.7, gHa: 56, vHa: 944, ivHa:11.6 },
    { age:100, hTop: 45.3, gHa: 56, vHa:1024, ivHa:10.6 },
  ],
  3: [
    { age: 30, hTop: 13.8, gHa: 27, vHa: 143, ivHa: 9.6 },
    { age: 40, hTop: 19.2, gHa: 35, vHa: 258, ivHa:11.8 },
    { age: 50, hTop: 24.2, gHa: 41, vHa: 385, ivHa:12.7 },
    { age: 60, hTop: 28.5, gHa: 45, vHa: 506, ivHa:12.5 },
    { age: 70, hTop: 32.3, gHa: 47, vHa: 617, ivHa:11.9 },
    { age: 80, hTop: 35.7, gHa: 49, vHa: 715, ivHa:11.1 },
    { age: 90, hTop: 38.7, gHa: 50, vHa: 800, ivHa:10.2 },
    { age:100, hTop: 41.3, gHa: 50, vHa: 873, ivHa: 9.4 },
  ],
  4: [
    { age: 40, hTop: 15.5, gHa: 29, vHa: 191, ivHa: 9.3 },
    { age: 50, hTop: 20.1, gHa: 35, vHa: 299, ivHa:10.4 },
    { age: 60, hTop: 24.3, gHa: 39, vHa: 403, ivHa:10.5 },
    { age: 70, hTop: 28.0, gHa: 42, vHa: 499, ivHa:10.1 },
    { age: 80, hTop: 31.4, gHa: 44, vHa: 585, ivHa: 9.5 },
    { age: 90, hTop: 34.4, gHa: 45, vHa: 660, ivHa: 8.8 },
    { age:100, hTop: 37.1, gHa: 45, vHa: 724, ivHa: 8.0 },
  ],
  5: [
    { age: 50, hTop: 15.7, gHa: 28, vHa: 211, ivHa: 8.0 },
    { age: 60, hTop: 19.8, gHa: 32, vHa: 300, ivHa: 8.4 },
    { age: 70, hTop: 23.5, gHa: 36, vHa: 385, ivHa: 8.3 },
    { age: 80, hTop: 26.9, gHa: 38, vHa: 462, ivHa: 7.9 },
    { age: 90, hTop: 30.0, gHa: 39, vHa: 530, ivHa: 7.4 },
    { age:100, hTop: 32.8, gHa: 40, vHa: 589, ivHa: 6.8 },
  ],
};

// ─── LÄRCHE (Schober 1946, Europäische Lärche) ───────────────────────────────
const LARCH_TABLE: YieldTable = {
  1: [
    { age: 20, hTop: 11.0, gHa: 20, vHa:  60, ivHa: 6.2 },
    { age: 30, hTop: 17.5, gHa: 28, vHa: 148, ivHa: 9.8 },
    { age: 40, hTop: 23.1, gHa: 34, vHa: 245, ivHa:11.5 },
    { age: 50, hTop: 27.9, gHa: 37, vHa: 339, ivHa:12.0 },
    { age: 60, hTop: 32.0, gHa: 39, vHa: 424, ivHa:11.7 },
    { age: 70, hTop: 35.4, gHa: 40, vHa: 499, ivHa:11.1 },
    { age: 80, hTop: 38.3, gHa: 41, vHa: 564, ivHa:10.3 },
    { age: 90, hTop: 40.8, gHa: 41, vHa: 620, ivHa: 9.5 },
    { age:100, hTop: 42.9, gHa: 42, vHa: 668, ivHa: 8.7 },
    { age:120, hTop: 46.4, gHa: 42, vHa: 747, ivHa: 7.4 },
  ],
  2: [
    { age: 20, hTop:  9.2, gHa: 17, vHa:  47, ivHa: 5.0 },
    { age: 30, hTop: 15.0, gHa: 25, vHa: 121, ivHa: 8.3 },
    { age: 40, hTop: 20.1, gHa: 30, vHa: 203, ivHa: 9.9 },
    { age: 50, hTop: 24.5, gHa: 33, vHa: 284, ivHa:10.5 },
    { age: 60, hTop: 28.4, gHa: 35, vHa: 358, ivHa:10.2 },
    { age: 70, hTop: 31.7, gHa: 36, vHa: 425, ivHa: 9.7 },
    { age: 80, hTop: 34.5, gHa: 37, vHa: 484, ivHa: 9.0 },
    { age: 90, hTop: 37.0, gHa: 38, vHa: 535, ivHa: 8.3 },
    { age:100, hTop: 39.2, gHa: 38, vHa: 578, ivHa: 7.6 },
    { age:120, hTop: 42.9, gHa: 38, vHa: 651, ivHa: 6.5 },
  ],
  3: [
    { age: 30, hTop: 12.3, gHa: 21, vHa:  93, ivHa: 6.6 },
    { age: 40, hTop: 17.0, gHa: 26, vHa: 161, ivHa: 8.3 },
    { age: 50, hTop: 21.1, gHa: 29, vHa: 230, ivHa: 9.0 },
    { age: 60, hTop: 24.7, gHa: 31, vHa: 295, ivHa: 8.9 },
    { age: 70, hTop: 27.9, gHa: 32, vHa: 354, ivHa: 8.5 },
    { age: 80, hTop: 30.7, gHa: 33, vHa: 406, ivHa: 7.9 },
    { age: 90, hTop: 33.2, gHa: 34, vHa: 451, ivHa: 7.3 },
    { age:100, hTop: 35.4, gHa: 34, vHa: 490, ivHa: 6.7 },
    { age:120, hTop: 39.3, gHa: 35, vHa: 556, ivHa: 5.7 },
  ],
  4: [
    { age: 40, hTop: 13.7, gHa: 22, vHa: 117, ivHa: 6.5 },
    { age: 50, hTop: 17.5, gHa: 25, vHa: 174, ivHa: 7.4 },
    { age: 60, hTop: 21.0, gHa: 27, vHa: 232, ivHa: 7.5 },
    { age: 70, hTop: 24.1, gHa: 28, vHa: 283, ivHa: 7.2 },
    { age: 80, hTop: 26.9, gHa: 29, vHa: 327, ivHa: 6.8 },
    { age: 90, hTop: 29.4, gHa: 30, vHa: 367, ivHa: 6.3 },
    { age:100, hTop: 31.6, gHa: 30, vHa: 400, ivHa: 5.8 },
    { age:120, hTop: 35.5, gHa: 31, vHa: 457, ivHa: 4.9 },
  ],
  5: [
    { age: 50, hTop: 13.6, gHa: 20, vHa: 118, ivHa: 5.8 },
    { age: 60, hTop: 17.0, gHa: 22, vHa: 170, ivHa: 6.2 },
    { age: 70, hTop: 20.1, gHa: 24, vHa: 218, ivHa: 6.1 },
    { age: 80, hTop: 22.9, gHa: 25, vHa: 261, ivHa: 5.8 },
    { age: 90, hTop: 25.5, gHa: 26, vHa: 299, ivHa: 5.4 },
    { age:100, hTop: 27.7, gHa: 26, vHa: 332, ivHa: 5.0 },
    { age:120, hTop: 31.7, gHa: 27, vHa: 385, ivHa: 4.2 },
  ],
};

// ─── Tabellen-Map ─────────────────────────────────────────────────────────────
const TABLES: Record<Species, YieldTable> = {
  SPRUCE:  SPRUCE_TABLE,
  PINE:    PINE_TABLE,
  BEECH:   BEECH_TABLE,
  OAK:     OAK_TABLE,
  DOUGLAS: DOUGLAS_TABLE,
  LARCH:   LARCH_TABLE,
};

/** Interpoliert linear zwischen zwei Tabellenzeilen */
function interpolate(rows: YieldRow[], age: number): YieldRow | null {
  if (rows.length === 0) return null;
  if (age <= rows[0].age) return rows[0];
  if (age >= rows[rows.length - 1].age) return rows[rows.length - 1];
  const i = rows.findIndex(r => r.age >= age);
  if (i <= 0) return rows[0];
  const r0 = rows[i - 1];
  const r1 = rows[i];
  const t = (age - r0.age) / (r1.age - r0.age);
  return {
    age,
    hTop:  r0.hTop  + t * (r1.hTop  - r0.hTop),
    gHa:   r0.gHa   + t * (r1.gHa   - r0.gHa),
    vHa:   r0.vHa   + t * (r1.vHa   - r0.vHa),
    ivHa:  r0.ivHa  + t * (r1.ivHa  - r0.ivHa),
  };
}

/**
 * Schätzt die Ertragsklasse (Bonität) aus Bestandesalter und gemessener Oberhöhe.
 * Wählt die EKL, deren interpolierte Oberhöhe am nächsten an hTop liegt.
 */
export function estimateSiteClass(species: Species, age: number, hTop: number): SiteClass {
  const table = TABLES[species];
  if (!table) return 3;
  let bestClass: SiteClass = 3;
  let bestDiff = Infinity;
  (([1, 2, 3, 4, 5] as SiteClass[])).forEach(ekl => {
    const row = interpolate(table[ekl], age);
    if (!row) return;
    const diff = Math.abs(row.hTop - hTop);
    if (diff < bestDiff) { bestDiff = diff; bestClass = ekl; }
  });
  return bestClass;
}

/**
 * Gibt interpolierte Tafelwerte zurück.
 * Gibt null zurück, wenn Baumart nicht in den Tafeln.
 */
export function getYieldTableValues(species: Species, age: number, siteClass: SiteClass): YieldRow | null {
  const table = TABLES[species];
  if (!table) return null;
  return interpolate(table[siteClass], age);
}

/**
 * Berechnet Bestockungsgrad = gemessene Grundfläche / Tafelgrundlfläche
 */
export function calcStockingDegree(
  measuredGHa: number,
  species: Species,
  age: number,
  siteClass: SiteClass,
): number | null {
  const ref = getYieldTableValues(species, age, siteClass);
  if (!ref || ref.gHa <= 0) return null;
  return Math.round((measuredGHa / ref.gHa) * 100) / 100;
}

/** Alle unterstützten Arten für Ertragstafeln */
export const YIELD_TABLE_SPECIES: Species[] = ['SPRUCE', 'PINE', 'BEECH', 'OAK', 'DOUGLAS', 'LARCH'];

export function isYieldTableSpecies(species: string): species is Species {
  return YIELD_TABLE_SPECIES.includes(species as Species);
}

/** Lesbare Bezeichnungen */
export const SITE_CLASS_LABELS: Record<SiteClass, string> = {
  1: 'EKL I (sehr gut)',
  2: 'EKL II (gut)',
  3: 'EKL III (mittel)',
  4: 'EKL IV (gering)',
  5: 'EKL V (sehr gering)',
};
