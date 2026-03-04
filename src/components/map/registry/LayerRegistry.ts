import { LayerId } from '../stores/useMapStores';
import { Trees, MapPin, Footprints, CheckSquare, Layers, FileText } from 'lucide-react';

export interface LayerConfig {
  id: LayerId;
  label: string;
  icon: any; // Lucide Icon Component
  color: string;
  zIndex: number;
  isBaseLayer?: boolean; // Wenn true, wird es anders im Switcher behandelt
  description?: string;
}

export const LAYER_REGISTRY: Record<LayerId, LayerConfig> = {
  FOREST_BOUNDARY: {
    id: 'FOREST_BOUNDARY',
    label: 'Waldgrenzen',
    icon: Trees,
    color: '#10b981', // Emerald-500
    zIndex: 1,
    description: 'Außengrenzen deiner Liegenschaften'
  },
  SECTIONS: {
    id: 'SECTIONS',
    label: 'Bestände / Flächen',
    icon: Layers,
    color: '#3b82f6', // Blue-500
    zIndex: 2,
    description: 'Pflanzungen, Biotope und Abteilungen'
  },
  ACTIVITY_PLAN: {
    id: 'ACTIVITY_PLAN',
    label: 'Maßnahmen',
    icon: FileText,
    color: '#f59e0b', // Amber-500
    zIndex: 3,
    description: 'Geplante Ernten und Pflegeflächen'
  },
  INFRASTRUCTURE: {
    id: 'INFRASTRUCTURE',
    label: 'Infrastruktur',
    icon: Footprints,
    color: '#64748b', // Slate-500
    zIndex: 4,
    description: 'Wege, Polterplätze, Hochsitze'
  },
  TASKS: {
    id: 'TASKS',
    label: 'Aufgaben',
    icon: CheckSquare,
    color: '#ef4444', // Red-500
    zIndex: 10, // Immer ganz oben
    description: 'Offene Tickets und Meldungen'
  },
  CADASTRAL: {
    id: 'CADASTRAL',
    label: 'Flurstücke (ALKIS)',
    icon: MapPin,
    color: '#000000',
    zIndex: 0,
    isBaseLayer: true
  }
};

export const getLayerConfig = (id: LayerId) => LAYER_REGISTRY[id];