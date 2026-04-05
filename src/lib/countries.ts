/** EU + EEA + CH countries — ISO 3166-1 alpha-2 codes with localized names. */
export const COUNTRIES: Record<string, Record<string, string>> = {
  AT: { de: "Österreich", en: "Austria", es: "Austria", fr: "Autriche" },
  BE: { de: "Belgien", en: "Belgium", es: "Bélgica", fr: "Belgique" },
  BG: { de: "Bulgarien", en: "Bulgaria", es: "Bulgaria", fr: "Bulgarie" },
  CH: { de: "Schweiz", en: "Switzerland", es: "Suiza", fr: "Suisse" },
  CY: { de: "Zypern", en: "Cyprus", es: "Chipre", fr: "Chypre" },
  CZ: { de: "Tschechien", en: "Czechia", es: "Chequia", fr: "Tchéquie" },
  DE: { de: "Deutschland", en: "Germany", es: "Alemania", fr: "Allemagne" },
  DK: { de: "Dänemark", en: "Denmark", es: "Dinamarca", fr: "Danemark" },
  EE: { de: "Estland", en: "Estonia", es: "Estonia", fr: "Estonie" },
  ES: { de: "Spanien", en: "Spain", es: "España", fr: "Espagne" },
  FI: { de: "Finnland", en: "Finland", es: "Finlandia", fr: "Finlande" },
  FR: { de: "Frankreich", en: "France", es: "Francia", fr: "France" },
  GR: { de: "Griechenland", en: "Greece", es: "Grecia", fr: "Grèce" },
  HR: { de: "Kroatien", en: "Croatia", es: "Croacia", fr: "Croatie" },
  HU: { de: "Ungarn", en: "Hungary", es: "Hungría", fr: "Hongrie" },
  IE: { de: "Irland", en: "Ireland", es: "Irlanda", fr: "Irlande" },
  IS: { de: "Island", en: "Iceland", es: "Islandia", fr: "Islande" },
  IT: { de: "Italien", en: "Italy", es: "Italia", fr: "Italie" },
  LI: { de: "Liechtenstein", en: "Liechtenstein", es: "Liechtenstein", fr: "Liechtenstein" },
  LT: { de: "Litauen", en: "Lithuania", es: "Lituania", fr: "Lituanie" },
  LU: { de: "Luxemburg", en: "Luxembourg", es: "Luxemburgo", fr: "Luxembourg" },
  LV: { de: "Lettland", en: "Latvia", es: "Letonia", fr: "Lettonie" },
  MT: { de: "Malta", en: "Malta", es: "Malta", fr: "Malte" },
  NL: { de: "Niederlande", en: "Netherlands", es: "Países Bajos", fr: "Pays-Bas" },
  NO: { de: "Norwegen", en: "Norway", es: "Noruega", fr: "Norvège" },
  PL: { de: "Polen", en: "Poland", es: "Polonia", fr: "Pologne" },
  PT: { de: "Portugal", en: "Portugal", es: "Portugal", fr: "Portugal" },
  RO: { de: "Rumänien", en: "Romania", es: "Rumanía", fr: "Roumanie" },
  SE: { de: "Schweden", en: "Sweden", es: "Suecia", fr: "Suède" },
  SI: { de: "Slowenien", en: "Slovenia", es: "Eslovenia", fr: "Slovénie" },
  SK: { de: "Slowakei", en: "Slovakia", es: "Eslovaquia", fr: "Slovaquie" },
};

const LOCALE_DEFAULT_COUNTRY: Record<string, string> = {
  de: "DE",
  en: "DE",
  es: "ES",
  fr: "FR",
};

/** Returns the default country ISO code for a given locale. */
export function getDefaultCountry(locale: string): string {
  return LOCALE_DEFAULT_COUNTRY[locale] ?? "DE";
}

/** Returns country options sorted by localized name for a given locale. */
export function getCountryOptions(locale: string): { code: string; name: string }[] {
  return Object.entries(COUNTRIES)
    .map(([code, names]) => ({ code, name: names[locale] ?? names.en }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
}
