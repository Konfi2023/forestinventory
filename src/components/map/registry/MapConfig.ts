export const BASE_MAPS = {
  DARK: {
    id: 'DARK',
    label: 'Dark Mode',
    // @2x tiles: 512px statt 256px → ¼ so viele Requests für denselben Bereich
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
    attribution: '&copy; <a href="https://carto.com">CARTO</a>',
    previewColor: '#1a1a1a',
    tileSize: 512,
    zoomOffset: -1,
  },
  LIGHT: {
    id: 'LIGHT',
    label: 'Light Mode',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
    attribution: '&copy; <a href="https://carto.com">CARTO</a>',
    previewColor: '#f5f5f5',
    tileSize: 512,
    zoomOffset: -1,
  },
  SATELLITE: {
    id: 'SATELLITE',
    label: 'Satellit (Esri)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
    previewColor: '#104020',
    tileSize: 256,
    zoomOffset: 0,
  },
  OUTDOORS: {
    id: 'OUTDOORS',
    label: 'Topografie',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    previewColor: '#cceebb',
    tileSize: 256,
    zoomOffset: 0,
  }
} as const;

// Neue Typen für Themen-Rendering (Vorbereitung)
export type MapTheme = 'STANDARD' | 'SPECIES' | 'AGE_CLASS';