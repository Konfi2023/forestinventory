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

export type PoiType = 'HUNTING_STAND' | 'HUT' | 'LOG_PILE' | 'BARRIER' | null;

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
  
  // Interaktions-Modus (NEU: MOVE_POI hinzugefügt)
  interactionMode: 'VIEW' | 'DRAW_FOREST' | 'EDIT_GEOMETRY' | 'DRAW_POI' | 'MOVE_POI';
  
  // Hält das GeoJSON-Objekt oder die POI-Daten, die gerade bearbeitet werden
  editingFeatureData: any | null;

  activePoiType: PoiType; 

  // 4. Data Sync
  dataVersion: number;

  // Actions
  setMapReady: (ready: boolean) => void;
  setBaseMap: (id: BaseMapId) => void;
  setTheme: (theme: MapTheme) => void;
  toggleLayer: (layer: LayerId) => void;
  setLayerVisibility: (layer: LayerId, visible: boolean) => void;
  
  selectFeature: (id: string | null, type: FeatureType | null) => void;
  setHoveredFeature: (id: string | null) => void;
  
  setInteractionMode: (mode: 'VIEW' | 'DRAW_FOREST' | 'EDIT_GEOMETRY' | 'DRAW_POI' | 'MOVE_POI') => void;
  setEditingFeature: (data: any | null) => void;
  setActivePoiType: (type: PoiType) => void;

  refreshData: () => void;

  // Map Movement
  flyTo: (coords: [number, number], zoom?: number) => void;
  fitBounds: (bounds: any) => void; 
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
    
    interactionMode: 'VIEW',
    editingFeatureData: null,
    activePoiType: null,
    
    dataVersion: 0,

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

    selectFeature: (id, type) => set({ 
      selectedFeatureId: id, 
      selectedFeatureType: type 
    }),
    
    setHoveredFeature: (id) => set({ hoveredFeatureId: id }),

    setInteractionMode: (mode) => set({ interactionMode: mode }),

    setEditingFeature: (data) => set({ editingFeatureData: data }),

    setActivePoiType: (type) => set({ activePoiType: type }),

    refreshData: () => set((s) => ({ dataVersion: s.dataVersion + 1 })),
    
    flyTo: (coords, zoom) => console.warn("Map not initialized yet", coords, zoom),
    fitBounds: (bounds) => console.warn("Map not initialized yet", bounds), 
  }))
);