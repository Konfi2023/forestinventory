export const BASE_MAPS = {
  DARK: {
    id: 'DARK',
    label: 'Dark Mode',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
    attribution: '&copy; <a href="https://carto.com">CARTO</a>',
    previewColor: '#1a1a1a',
    tileSize: 512,
    zoomOffset: -1,
    minZoom: 4,
    maxZoom: 22,
  },
  LIGHT: {
    id: 'LIGHT',
    label: 'Light Mode',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
    attribution: '&copy; <a href="https://carto.com">CARTO</a>',
    previewColor: '#f5f5f5',
    tileSize: 512,
    zoomOffset: -1,
    minZoom: 4,
    maxZoom: 22,
  },
  SATELLITE: {
    id: 'SATELLITE',
    label: 'Satellit (Esri)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
    previewColor: '#104020',
    tileSize: 256,
    zoomOffset: 0,
    minZoom: 4,
    maxZoom: 19,   // Esri-Tiles enden bei 19, danach "durchstechen"
  },
  OUTDOORS: {
    id: 'OUTDOORS',
    label: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    previewColor: '#cceebb',
    tileSize: 256,
    zoomOffset: 0,
    minZoom: 4,
    maxZoom: 19,
  },
  TOPO: {
    id: 'TOPO',
    label: 'Topografie (OpenTopo)',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    previewColor: '#b5c99a',
    tileSize: 256,
    zoomOffset: 0,
    minZoom: 4,
    maxZoom: 17,
  },
} as const;

// Zoom-Limits für Overlay-Layer (überschreiben die Basis-Karte wenn aktiv)
export const OVERLAY_ZOOM_LIMITS = {
  // Sentinel Hub WMS: braucht Zoom ≥ 8, Tiles enden bei 18
  SENTINEL: { min: 8, max: 18 },
  // Windy (Niederschlag/Wind): funktioniert nur auf Länder-/Kontinentebene
  WINDY: { min: 3, max: 12 },
  // RainViewer Radar: Tiles bis Zoom 10, darunter sinnvoll ab Zoom 3
  RADAR: { min: 3, max: 16 },
} as const;

// Neue Typen für Themen-Rendering (Vorbereitung)
export type MapTheme = 'STANDARD' | 'SPECIES' | 'AGE_CLASS';