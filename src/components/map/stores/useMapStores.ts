import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { BASE_MAPS, MapTheme } from '../registry/MapConfig';

// Definiert die erlaubten Layer-IDs
export type LayerId = 
  | 'FOREST_BOUNDARY' 
  | 'SECTIONS'        
  | 'TASKS'           
  | 'INFRASTRUCTURE'  
  | 'ACTIVITY_PLAN'   
  | 'CADASTRAL';      

export type BaseMapId = keyof typeof BASE_MAPS;

export type FeatureType = 
  | 'FOREST' 
  | 'TASK' 
  | 'POI' 
  | 'POLYGON' 
  | 'PATH'
  | 'PLANTING'
  | 'MAINTENANCE'
  | 'CALAMITY'
  | 'HABITAT'
  | 'HUNTING';

export type PoiType = 'HUNTING_STAND' | 'HUT' | 'LOG_PILE' | 'BARRIER' | 'VEHICLE' | 'TREE' | null;
export type PathType = 'ROAD' | 'SKID_TRAIL' | 'WATER' | null;

// Sentinel Hub Satelliten-Layer
export type SatelliteLayerId = 'NONE' | 'TRUE_COLOR' | 'NDVI' | 'EVI' | 'VH-BACKSCATTER' | 'RGB-KOMPOSIT';

export interface MapState {
  // 1. View State
  center: [number, number];
  zoom: number;
  isReady: boolean;

  // 2. Karten Konfiguration
  activeBaseMap: BaseMapId;        
  activeTheme: MapTheme;           
  activeLayers: LayerId[];         
  
  // 3. Selektion & Interaktion
  selectedFeatureId: string | null;
  selectedFeatureType: FeatureType | null;
  hoveredFeatureId: string | null;
  previousFeatureId: string | null;
  previousFeatureType: FeatureType | null;
  
  // Interaktions-Modus
  interactionMode: 'VIEW' | 'DRAW_FOREST' | 'EDIT_GEOMETRY' | 'DRAW_POI' | 'MOVE_POI' | 'DRAW_PATH' | 'MEASURE_DISTANCE' | 'MEASURE_AREA' | 'DRAW_PLANTING' | 'DRAW_HUNTING' | 'DRAW_CALAMITY';

  // Hält das GeoJSON-Objekt oder die POI-Daten, die gerade bearbeitet werden
  editingFeatureData: any | null;

  activePoiType: PoiType;
  activePathType: PathType;
  lastForestId: string | null;

  // Satellitendaten (Sentinel Hub WMS)
  satelliteLayer: SatelliteLayerId;
  satelliteDate: string;       // YYYY-MM-DD (Enddatum des 30-Tage-Fensters)
  satelliteOpacity: number;    // 0–1
  satellitePlaying: boolean;
  setSatelliteLayer: (layer: SatelliteLayerId) => void;
  setSatelliteDate: (date: string) => void;
  setSatelliteOpacity: (opacity: number) => void;
  setSatellitePlaying: (playing: boolean) => void;

  // Wetterkarte (RainViewer Niederschlagsradar)
  weatherRadar: boolean;
  weatherRadarOpacity: number;
  weatherRadarFrameIndex: number;
  weatherRadarPlaying: boolean;
  weatherRadarFrames: Array<{ time: number; path: string; isPast: boolean }>;
  weatherRadarHost: string;
  setWeatherRadar: (active: boolean) => void;
  setWeatherRadarOpacity: (v: number) => void;
  setWeatherRadarFrameIndex: (idx: number) => void;
  setWeatherRadarPlaying: (playing: boolean) => void;
  setWeatherRadarData: (host: string, frames: Array<{ time: number; path: string; isPast: boolean }>) => void;

  // Actions
  setMapReady: (ready: boolean) => void;
  setBaseMap: (id: BaseMapId) => void;
  setTheme: (theme: MapTheme) => void;
  toggleLayer: (layer: LayerId) => void;
  setLayerVisibility: (layer: LayerId, visible: boolean) => void;
  
  selectFeature: (id: string | null, type: FeatureType | null) => void;
  restorePreviousFeature: () => void;
  setHoveredFeature: (id: string | null) => void;
  
  setInteractionMode: (mode: 'VIEW' | 'DRAW_FOREST' | 'EDIT_GEOMETRY' | 'DRAW_POI' | 'MOVE_POI' | 'DRAW_PATH' | 'MEASURE_DISTANCE' | 'MEASURE_AREA' | 'DRAW_PLANTING' | 'DRAW_HUNTING' | 'DRAW_CALAMITY') => void;
  setEditingFeature: (data: any | null) => void;
  setActivePoiType: (type: PoiType) => void;
  setActivePathType: (type: PathType) => void;

  refreshData: () => void;

  // Task-Sidebar
  taskSidebarOpen: boolean;
  setTaskSidebarOpen: (open: boolean) => void;
  hoveredTaskId: string | null;
  setHoveredTaskId: (id: string | null) => void;

  // Windy Wetterkarte
  windyOpen: boolean;
  setWindyOpen: (open: boolean) => void;

  // Flurkarte (ALKIS WMS)
  showCadastral: boolean;
  setShowCadastral: (v: boolean) => void;

  // Map Movement
  flyTo: (coords: [number, number], zoom?: number) => void;
  fitBounds: (bounds: any) => void;
  invalidateSize: () => void;
}

export const useMapStore = create<MapState>()(
  devtools((set) => ({
    center: [51.1657, 10.4515], 
    zoom: 6,
    isReady: false,
    
    activeBaseMap: 'DARK',
    activeTheme: 'STANDARD',
    activeLayers: ['FOREST_BOUNDARY', 'SECTIONS', 'TASKS', 'INFRASTRUCTURE'],
    
    selectedFeatureId: null,
    selectedFeatureType: null,
    hoveredFeatureId: null,
    previousFeatureId: null,
    previousFeatureType: null,
    
    interactionMode: 'VIEW',
    editingFeatureData: null,
    activePoiType: null,
    activePathType: null,
    lastForestId: null,

    satelliteLayer: 'NONE',
    satelliteDate: new Date().toISOString().split('T')[0],
    satelliteOpacity: 0.85,
    satellitePlaying: false,

    weatherRadar: false,
    weatherRadarOpacity: 0.75,
    weatherRadarFrameIndex: 0,
    weatherRadarPlaying: false,
    weatherRadarFrames: [],
    weatherRadarHost: '',


    taskSidebarOpen: false,
    hoveredTaskId: null,

    setMapReady: (ready) => set({ isReady: ready }),
    setBaseMap: (id) => set({ activeBaseMap: id }),
    setTheme: (theme) => set({ activeTheme: theme }),

    toggleLayer: (layer) => set((state) => {
      const isActive = state.activeLayers.includes(layer);
      return {
        activeLayers: isActive 
          ? state.activeLayers.filter(l => l !== layer)
          : [...state.activeLayers, layer]
      };
    }),

    setLayerVisibility: (layer: LayerId, visible: boolean) => set((state) => {
      if (visible && !state.activeLayers.includes(layer)) {
        return { activeLayers: [...state.activeLayers, layer] };
      }
      if (!visible && state.activeLayers.includes(layer)) {
        return { activeLayers: state.activeLayers.filter(l => l !== layer) };
      }
      return {};
    }),

    selectFeature: (id, type) => set(state => ({
      // Vorheriges Feature merken – aber nur wenn es kein TASK war
      // (damit Task→Task keine History aufbaut)
      ...(state.selectedFeatureId && state.selectedFeatureType !== 'TASK'
        ? { previousFeatureId: state.selectedFeatureId, previousFeatureType: state.selectedFeatureType }
        : {}),
      selectedFeatureId: id,
      selectedFeatureType: type,
      ...(type === 'FOREST' && id ? { lastForestId: id } : {}),
    })),

    restorePreviousFeature: () => set(state => ({
      selectedFeatureId: state.previousFeatureId,
      selectedFeatureType: state.previousFeatureType,
      previousFeatureId: null,
      previousFeatureType: null,
    })),
    
    setHoveredFeature: (id) => set({ hoveredFeatureId: id }),

    setInteractionMode: (mode) => set({ interactionMode: mode }),

    setEditingFeature: (data) => set({ editingFeatureData: data }),

    setActivePoiType: (type) => set({ activePoiType: type }),
    setActivePathType: (type) => set({ activePathType: type }),

    setSatelliteLayer:   (layer)   => set({ satelliteLayer: layer }),
    setSatelliteDate:    (date)    => set({ satelliteDate: date }),
    setSatelliteOpacity: (opacity) => set({ satelliteOpacity: opacity }),
    setSatellitePlaying: (playing) => set({ satellitePlaying: playing }),

    setWeatherRadar:        (active)  => set({ weatherRadar: active }),
    setWeatherRadarOpacity: (v)       => set({ weatherRadarOpacity: v }),
    setWeatherRadarFrameIndex: (idx)  => set({ weatherRadarFrameIndex: idx }),
    setWeatherRadarPlaying: (playing) => set({ weatherRadarPlaying: playing }),
    setWeatherRadarData:    (host, frames) => set({ weatherRadarHost: host, weatherRadarFrames: frames }),

    refreshData: () => console.warn('refreshData: not yet registered'),

    setTaskSidebarOpen: (open) => set({ taskSidebarOpen: open }),
    setHoveredTaskId: (id) => set({ hoveredTaskId: id }),

    windyOpen: false,
    setWindyOpen: (open) => set({ windyOpen: open }),

    showCadastral: false,
    setShowCadastral: (v) => set({ showCadastral: v }),

    flyTo: (coords, zoom) => console.warn("Map not initialized yet", coords, zoom),
    fitBounds: (bounds) => console.warn("Map not initialized yet", bounds),
    invalidateSize: () => console.warn("Map not initialized yet"),
  }))
);