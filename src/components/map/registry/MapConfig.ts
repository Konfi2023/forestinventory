export const BASE_MAPS = {
  DARK: {
    id: 'DARK',
    label: 'Dark Mode',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO',
    previewColor: '#1a1a1a'
  },
  LIGHT: {
    id: 'LIGHT',
    label: 'Light Mode',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO',
    previewColor: '#f5f5f5'
  },
  SATELLITE: {
    id: 'SATELLITE',
    label: 'Satellit (Esri)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
    previewColor: '#104020'
  },
  OUTDOORS: {
    id: 'OUTDOORS',
    label: 'Topografie',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OSM',
    previewColor: '#cceebb'
  }
} as const;

// Neue Typen für Themen-Rendering (Vorbereitung)
export type MapTheme = 'STANDARD' | 'SPECIES' | 'AGE_CLASS';