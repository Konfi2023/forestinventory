'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils'; 

// Store & Config
import { useMapStore } from '../stores/useMapStores';
import { BASE_MAPS } from '../registry/MapConfig';

// Helper für Geometrie
import { geoJSONToLeaflet } from '@/lib/map-helpers';

// Overlays
import { LayerControl } from '../overlays/LayerControl';
import { LocationControl } from '../overlays/LocationControl';

// Editor lazy laden
const MapGeometryEditor = dynamic(
  () => import('../editor/MapGeometryEditor'),
  { ssr: false }
);

// --- 1. Fix für fehlende Leaflet Icons ---
const fixLeafletIcons = () => {
  // @ts-ignore
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
};

// --- 2. Map Controller ---
function MapController({ forestData }: { forestData: any }) {
  const map = useMap();
  const setMapReady = useMapStore((s) => s.setMapReady);
  const hasZoomed = useRef(false);

  useEffect(() => {
    if (!map) return;

    fixLeafletIcons();
    setMapReady(true);
    
    // Globale Funktionen registrieren
    useMapStore.setState({ 
      flyTo: (coords, zoom) => {
        if (map && map.getContainer()) { 
           try {
               map.flyTo(coords, zoom || 18, { duration: 1.5 });
           } catch (e) {
               console.warn("Map flight prevented", e);
           }
        }
      },
      fitBounds: (bounds) => {
        if (map && map.getContainer()) {
            try { 
                map.fitBounds(bounds, { padding: [50, 50], animate: true, duration: 1.5 }); 
            } catch (e) { console.warn("FitBounds failed", e); }
        }
      }
    });

    // Auto-Zoom: überspringen wenn focusTaskId in der URL steht –
    // dann übernimmt MapPageClient den Zoom auf den Task.
    const hasFocusTarget = typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('focusTaskId');

    const zoomTimer = setTimeout(() => {
        if (hasFocusTarget) return;
        if (!map || !forestData?.forests || forestData.forests.length === 0) return;
        if (hasZoomed.current) return;

        const allPoints: L.LatLngExpression[] = [];

        forestData.forests.forEach((forest: any) => {
            if (!forest.geoJson) return;
            const shapes = geoJSONToLeaflet(forest.geoJson);
            shapes.forEach(ring => {
                ring.forEach(p => allPoints.push([p.lat, p.lng]));
            });
        });

        if (allPoints.length > 0) {
            const bounds = L.latLngBounds(allPoints);
            if (bounds.isValid()) {
                try {
                    map.invalidateSize(); 
                    map.fitBounds(bounds, { padding: [50, 50], animate: true, duration: 1 });
                    hasZoomed.current = true;
                } catch (e) {
                    console.warn("Auto-zoom failed", e);
                }
            }
        }
    }, 500); 

    return () => {
      clearTimeout(zoomTimer);
      setMapReady(false);
      useMapStore.setState({ 
        flyTo: (coords, zoom) => console.warn("Map not initialized yet", coords, zoom),
        fitBounds: (bounds) => console.warn("Map not initialized yet", bounds),
      });
    };
  }, [map, setMapReady, forestData]); 

  return null;
}

// --- 3. Haupt-Komponente ---
interface MapViewerProps {
  forestData: any; 
  children?: React.ReactNode; 
}

export default function MapViewer({ forestData, children }: MapViewerProps) {
  const interactionMode = useMapStore((s) => s.interactionMode);
  const activeBaseMapId = useMapStore((s) => s.activeBaseMap);
  
  const selectedFeatureType = useMapStore((s) => s.selectedFeatureType);
  const selectedFeatureId = useMapStore((s) => s.selectedFeatureId);
  
  // remountKey: Beim Unmount geleert, beim Mount neu gesetzt.
  // Verhindert Leaflet-Fehler "Map container is being reused" im React Strict Mode.
  const [remountKey, setRemountKey] = useState<string>('');

  useEffect(() => {
    const key = `map-${Math.random().toString(36).substring(7)}`;
    setRemountKey(key);
    return () => {
      setRemountKey('');
    };
  }, []);

  if (!remountKey) return null;

  const baseMapConfig = BASE_MAPS[activeBaseMapId] || BASE_MAPS.DARK;

  const isTaskOpen = selectedFeatureType === 'TASK' && !!selectedFeatureId;
  const isSidebarOpen = (selectedFeatureType === 'FOREST' || selectedFeatureType === 'POI') && !!selectedFeatureId;

  return (
    <div className="relative w-full h-full bg-[#050505] overflow-hidden">
      
      {/* 1. LAYER CONTROL */}
      <div 
        className={cn(
            "absolute top-6 z-[500] transition-all duration-300 ease-in-out",
            isTaskOpen ? "right-[40rem]" : 
            isSidebarOpen ? "right-[26rem]" : 
            "right-6"
        )}
      >
        <LayerControl />
      </div>

      {/* 2. NAVIGATION / GPS */}
      <div 
        className={cn(
            "absolute bottom-24 z-[500] transition-all duration-300 ease-in-out",
            isTaskOpen ? "right-[40rem]" : 
            isSidebarOpen ? "right-[26rem]" : 
            "right-3"
        )}
      >
         <LocationControl />
      </div>

      {/* KARTE */}
      <MapContainer
        key={remountKey} 
        center={[51.1657, 10.4515]} 
        zoom={6}
        className="w-full h-full z-0"
        zoomControl={false} 
        minZoom={4}
        maxZoom={22}
        scrollWheelZoom={true}
      >
        <TileLayer
          key={baseMapConfig.id} 
          url={baseMapConfig.url}
          attribution={baseMapConfig.attribution}
          maxNativeZoom={19}
          maxZoom={22}
        />

        {activeBaseMapId === 'SATELLITE' && (
           <TileLayer 
              url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
              zIndex={1000}
              opacity={0.8}
           />
        )}
        
        <MapController forestData={forestData} />
        
        <ZoomControl position="bottomright" />

        {children}

        {(interactionMode === 'DRAW_FOREST' || interactionMode === 'EDIT_GEOMETRY') && (
           <MapGeometryEditor />
        )}

      </MapContainer>
    </div>
  );
}