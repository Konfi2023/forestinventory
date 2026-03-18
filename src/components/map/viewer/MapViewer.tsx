'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

// Store & Config
import { useMapStore } from '../stores/useMapStores';
import { BASE_MAPS, OVERLAY_ZOOM_LIMITS } from '../registry/MapConfig';

// Helper für Geometrie
import { geoJSONToLeaflet } from '@/lib/map-helpers';

// Overlays
import { LayerControl } from '../overlays/LayerControl';
import { CadastralLayer } from '../layers/CadastralLayer';
import { LocationControl } from '../overlays/LocationControl';
import { MapWeatherWidget } from '../overlays/MapWeatherWidget';

// Editor lazy laden
const MapGeometryEditor = dynamic(
  () => import('../editor/MapGeometryEditor'),
  { ssr: false }
);

const MapMeasureTool = dynamic(
  () => import('../tools/MapMeasureTool'),
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

// --- 2a. Scale Bar — syncs to Zustand, rendered OUTSIDE Leaflet via MapViewer ---
function ScaleBar() {
  const map = useMap();
  const setScaleBar = useMapStore((s) => s.setScaleBar);

  useEffect(() => {
    const update = () => {
      const lat = map.getCenter().lat;
      const metersPerPx = (40075016.686 * Math.abs(Math.cos(lat * Math.PI / 180))) / Math.pow(2, map.getZoom() + 8);
      const maxM = metersPerPx * 100;
      const steps = [1,2,5,10,20,50,100,200,500,1000,2000,5000,10000,20000,50000,100000];
      const nice = steps.find(v => v >= maxM) ?? steps[steps.length - 1];
      setScaleBar({
        width: Math.round(nice / metersPerPx),
        label: nice >= 1000 ? `${nice / 1000} km` : `${nice} m`,
      });
    };
    update();
    map.on('zoomend moveend', update);
    return () => { map.off('zoomend moveend', update); };
  }, [map, setScaleBar]);

  return null;
}

// --- 2b. Zoom Limiter — passt min/maxZoom dynamisch an die aktive Kartenansicht an ---
function ZoomLimiter() {
  const map            = useMap();
  const activeBaseMap  = useMapStore(s => s.activeBaseMap);
  const satelliteLayer = useMapStore(s => s.satelliteLayer);
  const windyOpen      = useMapStore(s => s.windyOpen);
  const weatherRadar   = useMapStore(s => s.weatherRadar);

  useEffect(() => {
    if (!map.getContainer()) return;
    const base = BASE_MAPS[activeBaseMap as keyof typeof BASE_MAPS] ?? BASE_MAPS.DARK;
    let min = base.minZoom;
    let max = base.maxZoom;

    // Overlay-Limits: XOR — nur eines aktiv gleichzeitig
    if (windyOpen) {
      min = Math.max(min, OVERLAY_ZOOM_LIMITS.WINDY.min);
      max = Math.min(max, OVERLAY_ZOOM_LIMITS.WINDY.max);
    } else if (satelliteLayer !== 'NONE') {
      min = Math.max(min, OVERLAY_ZOOM_LIMITS.SENTINEL.min);
      max = Math.min(max, OVERLAY_ZOOM_LIMITS.SENTINEL.max);
    } else if (weatherRadar) {
      min = Math.max(min, OVERLAY_ZOOM_LIMITS.RADAR.min);
      max = Math.min(max, OVERLAY_ZOOM_LIMITS.RADAR.max);
    }

    try {
      // Limits sofort setzen — blockiert weitere Tile-Requests außerhalb des gültigen Bereichs
      // noch während die Fly-Animation läuft
      map.setMinZoom(min);
      map.setMaxZoom(max);
      const current = map.getZoom();
      if (current < min) map.flyTo(map.getCenter(), min, { animate: true, duration: 0.8 });
      else if (current > max) map.flyTo(map.getCenter(), max, { animate: true, duration: 0.8 });
    } catch (e) {
      console.warn('ZoomLimiter: map not ready', e);
    }
  }, [map, activeBaseMap, satelliteLayer, windyOpen, weatherRadar]);

  return null;
}

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
      },
      invalidateSize: () => {
        if (map && map.getContainer()) {
            try { map.invalidateSize(); } catch (e) {}
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
        invalidateSize: () => console.warn("Map not initialized yet"),
      });
    };
  }, [map, setMapReady, forestData]); 

  return null;
}

// --- 3. Haupt-Komponente ---
interface MapViewerProps {
  forestData: any;
  children?: React.ReactNode;
  skipAutoZoom?: boolean;
  minimal?: boolean; // Blendet LayerControl + WeatherWidget aus (für Mobile-App)
}

export default function MapViewer({ forestData, children, skipAutoZoom, minimal = false }: MapViewerProps) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);
  const scaleBar = useMapStore((s) => s.scaleBar);

  const interactionMode = useMapStore((s) => s.interactionMode);
  const activeBaseMapId = useMapStore((s) => s.activeBaseMap);

  const selectedFeatureType = useMapStore((s) => s.selectedFeatureType);
  const selectedFeatureId = useMapStore((s) => s.selectedFeatureId);

  const windyOpen    = useMapStore((s) => s.windyOpen);
  const setWindyOpen = useMapStore((s) => s.setWindyOpen);
  const showCadastral = useMapStore((s) => s.showCadastral);

  // Windy-Koordinaten: ausgewählter Wald → erster Wald → Deutschland-Zentrum
  const windyCoords = useMemo(() => {
    const forests: any[] = forestData?.forests ?? [];
    const target = (selectedFeatureType === 'FOREST' && selectedFeatureId)
      ? forests.find((f: any) => f.id === selectedFeatureId)
      : forests[0];
    if (!target?.geoJson) return { lat: 51.1657, lng: 10.4515, zoom: 6 };
    const geom = target.geoJson?.features?.[0]?.geometry ?? target.geoJson?.geometry ?? target.geoJson;
    if (geom?.type !== 'Polygon' || !geom?.coordinates?.[0]?.length) return { lat: 51.1657, lng: 10.4515, zoom: 6 };
    const coords: [number, number][] = geom.coordinates[0];
    const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
    const lng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
    return isFinite(lat) && isFinite(lng) ? { lat, lng, zoom: 11 } : { lat: 51.1657, lng: 10.4515, zoom: 6 };
  }, [forestData, selectedFeatureId, selectedFeatureType]);

  // Stabiler Key: wird einmalig beim ersten Render erzeugt und ändert sich nie.
  const [remountKey] = useState(() => `map-${Math.random().toString(36).substring(7)}`);

  const baseMapConfig = BASE_MAPS[activeBaseMapId] || BASE_MAPS.DARK;

  const isTaskOpen = selectedFeatureType === 'TASK' && !!selectedFeatureId;
  const isSidebarOpen = (selectedFeatureType === 'FOREST' || selectedFeatureType === 'POI') && !!selectedFeatureId;

  return (
    <div className="relative w-full h-full bg-[#050505] overflow-hidden">

      {/* Scale bar — rendered outside Leaflet container so print can see it */}
      {scaleBar.label && (
        <div className="map-scale-bar absolute bottom-4 left-1/2 -translate-x-1/2 z-[500] pointer-events-none flex flex-col items-center gap-0.5">
          <span className="text-[10px] text-white font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            {scaleBar.label}
          </span>
          <div
            className="border-b-2 border-l-2 border-r-2 border-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
            style={{ width: scaleBar.width, height: 5 }}
          />
        </div>
      )}

      {/* TOP-RIGHT CONTROLS: Layer + GPS */}
      <div
        className={cn(
            "absolute top-6 z-[500] transition-all duration-300 ease-in-out flex items-start gap-2",
            isTaskOpen ? "right-[40rem]" :
            isSidebarOpen ? "right-[26rem]" :
            "right-6"
        )}
      >
        <LocationControl />
        {!minimal && <LayerControl />}
      </div>

      {/* 3. WETTER-WIDGET */}
      {!minimal && (
        <div className={cn('absolute left-6 z-[500] transition-all duration-300', windyOpen ? 'bottom-24' : 'bottom-6')}>
          <MapWeatherWidget forests={forestData?.forests ?? []} />
        </div>
      )}

      {/* 4. WINDY OVERLAY */}
      {windyOpen && (
        <div className="absolute inset-0 z-[400]">
          <iframe
            src={`https://embed.windy.com/embed2.html?lat=${windyCoords.lat.toFixed(4)}&lon=${windyCoords.lng.toFixed(4)}&zoom=${windyCoords.zoom}&level=surface&overlay=wind&product=ecmwf&menu=&message=true&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1`}
            className="w-full h-full border-0"
            title="Windy Wetterkarte"
            allow="geolocation"
          />
          {/* Schließen-Button — über dem iFrame */}
          <button
            onClick={() => setWindyOpen(false)}
            className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/70 hover:bg-black/90 text-white text-xs font-medium backdrop-blur border border-white/20 shadow-xl transition"
            title="Wetterkarte schließen"
          >
            <X size={13} />
            Schließen
          </button>
        </div>
      )}

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
          tileSize={baseMapConfig.tileSize}
          zoomOffset={baseMapConfig.zoomOffset}
          maxNativeZoom={baseMapConfig.tileSize === 512 ? 18 : 19}
          maxZoom={22}
          keepBuffer={4}
          updateWhenIdle={false}
          updateWhenZooming={false}
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
        <ScaleBar />
        <ZoomLimiter />

        <CadastralLayer visible={showCadastral} />

        {children}

        {(
          interactionMode === 'DRAW_FOREST' ||
          interactionMode === 'EDIT_GEOMETRY' ||
          interactionMode === 'DRAW_PATH' ||
          interactionMode === 'DRAW_PLANTING' ||
          interactionMode === 'DRAW_HUNTING' ||
          interactionMode === 'DRAW_CALAMITY'
        ) && (
           <MapGeometryEditor
             forests={forestData?.forests ?? []}
             areaLimitHa={forestData?.areaLimitHa ?? null}
             usedAreaHa={forestData?.usedAreaHa ?? 0}
             currentUserId={forestData?.currentUserId ?? ''}
           />
        )}

        {(interactionMode === 'MEASURE_DISTANCE' || interactionMode === 'MEASURE_AREA') && (
           <MapMeasureTool />
        )}

      </MapContainer>
    </div>
  );
}