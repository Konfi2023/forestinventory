'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useMapStore, MapState, SatelliteLayerId } from '../stores/useMapStores';
import { useShallow } from 'zustand/react/shallow';
import { LAYER_REGISTRY } from '../registry/LayerRegistry';
import { Polygon, Marker, Polyline, Tooltip, useMapEvents, useMap } from 'react-leaflet';
import { geoJSONToLeaflet, geoJSONLineToLeaflet, calculatePathLengthM } from '@/lib/map-helpers';
import { getSpeciesColor, getSpeciesLabel, getDominantSpecies } from '@/lib/tree-species';
import L from 'leaflet';
import { createPoi } from '@/actions/poi';
import { toast } from 'sonner';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Ab diesem Zoom-Level werden POIs angezeigt.
const POI_VISIBILITY_THRESHOLD = 14;

// Sentinel Hub WMS-Proxy
const SENTINEL_INSTANCE_ID = process.env.NEXT_PUBLIC_SENTINEL_INSTANCE_ID ?? '671a490f-2a09-4ff0-87b8-151f8775ab85';
const WMS_BASE_URL = `/api/wms/${SENTINEL_INSTANCE_ID}`;

// Sentinel-Layer-IDs in der Sentinel Hub Konfiguration
const SENTINEL_LAYER_MAP: Record<Exclude<SatelliteLayerId, 'NONE'>, { id: string; format: string }> = {
  // Sentinel-2
  TRUE_COLOR:       { id: 'TRUE_COLOR',       format: 'image/jpeg' },
  NDVI:             { id: 'VEGETATION_INDEX', format: 'image/png'  },
  EVI:              { id: 'VEGETATION_INDEX', format: 'image/png'  },
  // Sentinel-1
  'VH-BACKSCATTER': { id: 'VH-BACKSCATTER',  format: 'image/png' },
  'RGB-KOMPOSIT':    { id: 'RGB-KOMPOSIT',      format: 'image/png' },
};

// Berechnet 30-Tage-Zeitfenster: "YYYY-MM-DD/YYYY-MM-DD"
function toTimeRange(dateStr: string): string {
  const end   = new Date(dateStr);
  const start = new Date(dateStr);
  start.setDate(end.getDate() - 30);
  return `${start.toISOString().split('T')[0]}/${end.toISOString().split('T')[0]}`;
}

const COLORS = {
    PLANTING: '#22c55e',
    MAINTENANCE: '#ef4444',
    CALAMITY: '#f97316',
    HABITAT: '#a855f7',
    HUNTING: '#84cc16'
};

interface GeoDataProps {
  data: {
    forests: any[];
    tasks: any[];
    currentUserId: string;
    orgSlug: string;
  };
  onRefresh: () => void;
  onLongPress?: (latlng: { lat: number; lng: number }) => void;
}

// ... (createTaskIcon bleibt unverändert) ...
const createTaskIcon = (priority: string, status: string, isSelected: boolean) => {
    let color = '#3b82f6'; 
    let pulseColor = 'bg-blue-500';

    if (status === 'DONE') {
        color = '#22c55e'; pulseColor = 'bg-green-500';
    } else if (priority === 'URGENT') {
        color = '#ef4444'; pulseColor = 'bg-red-500';
    } else if (priority === 'HIGH') {
        color = '#f97316'; pulseColor = 'bg-orange-500';
    } else if (status === 'BLOCKED') {
        color = '#64748b'; pulseColor = 'bg-slate-500';
    }

    const isImportant = (priority === 'URGENT' || priority === 'HIGH') && status !== 'DONE';
    
    const size = isSelected ? 48 : 32;
    const anchorX = size / 2;
    const anchorY = isSelected ? 46 : 30;

    const html = `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: ${size}px; height: ${size}px;">
        ${isSelected 
            ? `<div style="position: absolute; width: 100%; height: 100%; border-radius: 9999px; background-color: rgba(255,255,255,0.4); animation: pulse 2s infinite;"></div>`
            : (isImportant ? `<div style="position: absolute; width: 100%; height: 100%; border-radius: 9999px; opacity: 0.75; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;" class="${pulseColor}"></div>` : '')
        }
        <div style="position: relative; width: ${isSelected ? 20 : 14}px; height: ${isSelected ? 20 : 14}px; background-color: ${color}; border: ${isSelected ? '3px' : '2px'} solid white; border-radius: 9999px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5); z-index: 10;"></div>
        <div style="position: absolute; top: 50%; width: ${isSelected ? 3 : 2}px; height: ${isSelected ? 18 : 12}px; background-color: rgba(255,255,255,0.8); transform: translateY(2px);"></div>
      </div>
    `;

    return L.divIcon({ className: 'bg-transparent border-none', html: html, iconSize: [size, size], iconAnchor: [anchorX, anchorY] });
};


// Baum-Icon: kleines Kreuz, Farbe abhängig vom Gesundheitszustand
const createTreeIcon = (isSelected: boolean, hasOpenTask: boolean, health?: string) => {
    const color =
        health === 'DAMAGED'            ? '#f97316' :
        health === 'DEAD'               ? '#ef4444' :
        health === 'MARKED_FOR_FELLING' ? '#3b82f6' :
                                          '#86efac'; // HEALTHY (default)

    const size   = isSelected ? 18 : 10;
    const bar    = isSelected ? 4  : 2;
    const anchor = size / 2;

    const html = `
      <div style="position:relative; width:${size}px; height:${size}px; filter:drop-shadow(0 0 2px rgba(0,0,0,0.9));">
        <div style="position:absolute;top:50%;left:0;transform:translateY(-50%);width:100%;height:${bar}px;background:${color};border-radius:1px;"></div>
        <div style="position:absolute;left:50%;top:0;transform:translateX(-50%);width:${bar}px;height:100%;background:${color};border-radius:1px;"></div>
        ${isSelected ? `<div style="position:absolute;inset:-3px;border:2px solid rgba(255,255,255,0.8);border-radius:2px;"></div>` : ''}
        ${hasOpenTask ? `<div style="position:absolute;top:-3px;right:-3px;width:6px;height:6px;background:#ef4444;border:1px solid white;border-radius:50%;"></div>` : ''}
      </div>
    `;
    return L.divIcon({ className: 'bg-transparent border-none', html, iconSize: [size, size], iconAnchor: [anchor, anchor] });
};

// NEU: POI Icon mit Indikator (Roter Punkt)
const createPoiIcon = (type: string, isSelected: boolean, hasOpenTask: boolean, isHovered = false) => {
    let color = '#9ca3af'; 
    let iconChar = '📍';

    switch (type) {
        case 'HUNTING_STAND': color = '#eab308'; iconChar = '🔭'; break;
        case 'LOG_PILE': color = '#3b82f6'; iconChar = '🪵'; break;
        case 'HUT': color = '#f97316'; iconChar = '🏠'; break;
        case 'BARRIER': color = '#ef4444'; iconChar = '⛔'; break;
        case 'VEHICLE': color = '#6b7280'; iconChar = '🚜'; break;
        case 'TREE': color = '#22c55e'; iconChar = '🌲'; break;
    }
    
    const size = isSelected ? 36 : isHovered ? 30 : 24;
    const anchor = size / 2;
    const glowStyle = isHovered && !isSelected
        ? `box-shadow: 0 0 0 3px ${color}55, 0 0 12px ${color}88;`
        : 'box-shadow: 0 2px 5px rgba(0,0,0,0.3);';

    const html = `
      <div style="position: relative; width: ${size}px; height: ${size}px;">
        <div style="
          background-color: ${color};
          width: 100%; height: 100%;
          border-radius: 50%;
          border: ${isSelected ? '3px' : '2px'} solid white;
          display: flex; align-items: center; justify-content: center;
          ${glowStyle}
          font-size: ${isSelected ? 18 : isHovered ? 15 : 12}px;
          ${isSelected ? 'transform: scale(1.1); transition: transform 0.2s;' : ''}
        ">
          ${iconChar}
        </div>
        
        ${/* INDICATOR FÜR TASK */ ''}
        ${hasOpenTask ? `
            <div style="
                position: absolute; 
                top: -2px; right: -2px; 
                width: 10px; height: 10px; 
                background-color: #ef4444; 
                border: 2px solid white; 
                border-radius: 50%;
                z-index: 20;
                box-shadow: 0 0 0 1px #000;
            "></div>
        ` : ''}
      </div>
    `;
    return L.divIcon({ className: 'bg-transparent border-none', html: html, iconSize: [size, size], iconAnchor: [anchor, anchor] });
};


// Dialog: POI außerhalb Waldgrenzen → Wald manuell zuweisen
function ForestAssignDialog({ forests, onConfirm, onCancel }: {
  forests: any[];
  onConfirm: (forestId: string) => void;
  onCancel: () => void;
}) {
  const [selectedForestId, setSelectedForestId] = useState('');
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4 space-y-4">
        <div>
          <h3 className="font-semibold text-slate-900 text-base">Objekt außerhalb eines Waldes</h3>
          <p className="text-sm text-slate-500 mt-1">
            Dieses Objekt liegt außerhalb aller eingezeichneten Waldflächen. Bitte weisen Sie es einem Wald zu.
          </p>
        </div>
        <Select onValueChange={setSelectedForestId} value={selectedForestId}>
          <SelectTrigger>
            <SelectValue placeholder="Wald auswählen…" />
          </SelectTrigger>
          <SelectContent>
            {forests.map((f: any) => (
              <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onCancel}>Abbrechen</Button>
          <Button size="sm" disabled={!selectedForestId} onClick={() => onConfirm(selectedForestId)}>
            Zuweisen & Speichern
          </Button>
        </div>
      </div>
    </div>
  );
}

export function GeoDataHandler({ data, onRefresh, onLongPress }: GeoDataProps) {
  const map = useMap();
  const [currentZoom, setCurrentZoom] = useState(map.getZoom());
  const [pendingPoi, setPendingPoi] = useState<{ lat: number; lng: number; type: string } | null>(null);

  // useShallow: verhindert Re-Render wenn activeLayers-Inhalt gleich bleibt
  // aber eine neue Array-Referenz entsteht (z.B. durch andere Store-Updates)
  const activeLayers = useMapStore(useShallow((s: MapState) => s.activeLayers));
  const selectFeature = useMapStore((s: MapState) => s.selectFeature);
  const selectedId = useMapStore((s: MapState) => s.selectedFeatureId);
  const hoveredId = useMapStore((s: MapState) => s.hoveredFeatureId);
  const setHovered = useMapStore((s: MapState) => s.setHoveredFeature);
  const editingData = useMapStore((s: MapState) => s.editingFeatureData);
  const interactionMode = useMapStore((s: MapState) => s.interactionMode);
  const activePoiType = useMapStore((s: MapState) => s.activePoiType);
  const setInteractionMode = useMapStore((s) => s.setInteractionMode);
  const hoveredTaskId = useMapStore((s) => s.hoveredTaskId);
  const setEditingFeature = useMapStore((s: MapState) => s.setEditingFeature);

  const satelliteLayer   = useMapStore((s) => s.satelliteLayer);
  const satelliteDate    = useMapStore((s) => s.satelliteDate);
  const satelliteOpacity = useMapStore((s) => s.satelliteOpacity);

  // Custom Pane für Wege: zIndex 450 > vector pane 400 → Linien immer über Waldpolygonen
  useEffect(() => {
    try {
      if (!map.getPane('paths-pane')) {
        map.createPane('paths-pane');
        map.getPane('paths-pane')!.style.zIndex = '450';
      }
    } catch {}
  }, [map]);

  // Sentinel Hub WMS Layer — liegt auf eigenem Pane unter den Vektordaten
  const sentinelLayerRef = useRef<L.TileLayer.WMS | null>(null);

  useEffect(() => {
    // Defensive guard: map might not be fully initialized (Strict Mode double-invoke)
    if (!map.getContainer()) return;

    // Layer entfernen wenn deaktiviert
    if (satelliteLayer === 'NONE') {
      sentinelLayerRef.current?.remove();
      sentinelLayerRef.current = null;
      return;
    }

    try {
      // Pane inline erstellen (verhindert Race mit separatem Pane-Effekt in Strict Mode)
      if (!map.getPane('satellite-pane')) {
        map.createPane('satellite-pane');
        map.getPane('satellite-pane')!.style.zIndex = '200';
      }

      const cfg = SENTINEL_LAYER_MAP[satelliteLayer];
      const timeRange = toTimeRange(satelliteDate);

      const isS1 = satelliteLayer === 'VH-BACKSCATTER' || satelliteLayer === 'RGB-KOMPOSIT';
      const s2Extras = isS1
        ? { orthorectify: 'true', backscattercoeff: 'GAMMA0_TERRAIN', polarization: 'DV' }
        : { MAXCC: 80, PRIORITY: 'leastCC' };
      const attribution = isS1
        ? '© Copernicus Data Space / Sentinel-1'
        : '© Copernicus Data Space / Sentinel-2';

      const wmsOptions: any = {
        layers:      cfg.id,
        format:      cfg.format,
        transparent: true,
        version:     '1.3.0',
        uppercase:   true,
        TIME:        timeRange,
        ...s2Extras,
        crossOrigin: true,
        tileSize:    256,
        pane:        'satellite-pane',
        attribution,
        opacity:     satelliteOpacity,
      };

      sentinelLayerRef.current?.remove();
      sentinelLayerRef.current = L.tileLayer.wms(WMS_BASE_URL, wmsOptions);
      sentinelLayerRef.current.addTo(map);
    } catch (e) {
      console.warn('Satellite layer error:', e);
      sentinelLayerRef.current = null;
    }

    return () => {
      sentinelLayerRef.current?.remove();
      sentinelLayerRef.current = null;
    };
  }, [map, satelliteLayer, satelliteDate, satelliteOpacity]);

  // ── RainViewer Niederschlagsradar ──────────────────────────────────────────
  const weatherRadar          = useMapStore(s => s.weatherRadar);
  const weatherRadarOpacity   = useMapStore(s => s.weatherRadarOpacity);
  const weatherRadarFrameIndex = useMapStore(s => s.weatherRadarFrameIndex);
  const weatherRadarFrames    = useMapStore(s => s.weatherRadarFrames);
  const weatherRadarHost      = useMapStore(s => s.weatherRadarHost);
  const setWeatherRadarData   = useMapStore(s => s.setWeatherRadarData);
  const setWeatherRadarFrameIndex = useMapStore(s => s.setWeatherRadarFrameIndex);

  const radarLayerRef = useRef<L.TileLayer | null>(null);

  // Frames von RainViewer laden
  useEffect(() => {
    if (!weatherRadar) return;
    const load = async () => {
      try {
        const res  = await fetch('https://api.rainviewer.com/public/weather-maps.json');
        const data = await res.json();
        const past     = (data.radar?.past     ?? []).map((f: any) => ({ ...f, isPast: true  }));
        const nowcast  = (data.radar?.nowcast  ?? []).map((f: any) => ({ ...f, isPast: false }));
        const frames   = [...past, ...nowcast];
        setWeatherRadarData(data.host ?? 'https://tilecache.rainviewer.com', frames);
        setWeatherRadarFrameIndex(Math.max(0, past.length - 1));
      } catch (e) {
        console.warn('RainViewer load failed', e);
      }
    };
    load();
    const timer = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [weatherRadar, setWeatherRadarData, setWeatherRadarFrameIndex]);

  // TileLayer erstellen / aktualisieren / entfernen
  useEffect(() => {
    if (!map.getContainer()) return;

    if (!weatherRadar || !weatherRadarFrames.length || !weatherRadarHost) {
      radarLayerRef.current?.remove();
      radarLayerRef.current = null;
      return;
    }
    const frame = weatherRadarFrames[weatherRadarFrameIndex];
    if (!frame) return;

    const RADAR_MAX_ZOOM = 16;
    let cancelled = false;

    const addLayer = () => {
      if (cancelled || !map.getContainer()) return;
      try {
        if (!map.getPane('radar-pane')) {
          map.createPane('radar-pane');
          map.getPane('radar-pane')!.style.zIndex = '210';
        }
        const tileUrl = `${weatherRadarHost}${frame.path}/256/{z}/{x}/{y}/6/1_1.png`;
        if (!radarLayerRef.current) {
          radarLayerRef.current = L.tileLayer(tileUrl, {
            opacity:       weatherRadarOpacity,
            tileSize:      256,
            pane:          'radar-pane',
            attribution:   '© RainViewer',
            zIndex:        210,
            maxNativeZoom: 10,
            maxZoom:       22,
          }).addTo(map);
        } else {
          radarLayerRef.current.setUrl(tileUrl);
          radarLayerRef.current.setOpacity(weatherRadarOpacity);
        }
      } catch (e) {
        console.warn('Radar layer error:', e);
        radarLayerRef.current = null;
      }
    };

    // Wenn aktueller Zoom über dem Radar-Maximum liegt, warten bis die
    // Fly-Animation (ausgelöst vom ZoomLimiter) abgeschlossen ist.
    if (map.getZoom() > RADAR_MAX_ZOOM) {
      map.once('zoomend', addLayer);
    } else {
      addLayer();
    }

    return () => {
      cancelled = true;
      map.off('zoomend', addLayer);
      radarLayerRef.current?.remove();
      radarLayerRef.current = null;
    };
  }, [map, weatherRadar, weatherRadarFrames, weatherRadarHost, weatherRadarFrameIndex, weatherRadarOpacity]);

  const showForests        = activeLayers.includes('FOREST_BOUNDARY');
  const showSections       = activeLayers.includes('SECTIONS');
  const showActivity       = activeLayers.includes('ACTIVITY_PLAN');
  const showInfrastructure = activeLayers.includes('INFRASTRUCTURE');
  const showTasks          = activeLayers.includes('TASKS');

  // ── Koordinaten-Konversion vorab berechnen ────────────────────────────────
  // geoJSONToLeaflet / geoJSONLineToLeaflet sind pure Funktionen und teuer
  // bei vielen Polygonen. Einmal pro data.forests-Änderung berechnen,
  // nicht bei jedem Hover/Select-Re-Render.
  const forestCoords = useMemo(() => {
    const m = new Map<string, ReturnType<typeof geoJSONToLeaflet>>();
    data.forests.forEach(f => m.set(f.id, geoJSONToLeaflet(f.geoJson)));
    return m;
  }, [data.forests]);

  const polygonCoords = useMemo(() => {
    const m = new Map<string, ReturnType<typeof geoJSONToLeaflet>>();
    data.forests.forEach(f => {
      f.plantings?.forEach((p: any)     => m.set(p.id, geoJSONToLeaflet(p.geoJson)));
      f.hunting?.forEach((h: any)       => m.set(h.id, geoJSONToLeaflet(h.geoJson)));
      f.calamities?.forEach((c: any)    => m.set(c.id, geoJSONToLeaflet(c.geoJson)));
      f.compartments?.forEach((c: any)  => m.set(c.id, geoJSONToLeaflet(c.geoJson)));
    });
    return m;
  }, [data.forests]);

  const pathCoords = useMemo(() => {
    const m = new Map<string, ReturnType<typeof geoJSONLineToLeaflet>>();
    data.forests.forEach(f => {
      f.paths?.forEach((p: any) => m.set(p.id, geoJSONLineToLeaflet(p.geoJson)));
    });
    return m;
  }, [data.forests]);

  const isDrawMode = interactionMode === 'DRAW_FOREST' || interactionMode === 'DRAW_PATH' ||
    interactionMode === 'DRAW_PLANTING' || interactionMode === 'DRAW_HUNTING' || interactionMode === 'DRAW_CALAMITY' ||
    interactionMode === 'DRAW_COMPARTMENT';

  const poisVisible = showInfrastructure && currentZoom >= POI_VISIBILITY_THRESHOLD;

  const isBeingEdited = (forestId: string) => {
    return interactionMode === 'EDIT_GEOMETRY' && editingData?.id === forestId;
  };

  const getForestStyle = useCallback((forest: any) => {
    const isSelected = selectedId === forest.id;
    const isHovered  = hoveredId  === forest.id;
    const baseColor  = forest.color || LAYER_REGISTRY.FOREST_BOUNDARY.color;
    return {
      color:       isSelected ? '#ffffff' : baseColor,
      weight:      isSelected || isHovered ? 3 : 2,
      fillColor:   baseColor,
      fillOpacity: isSelected ? 0.2 : 0.05,
      dashArray:   '5, 5',
    };
  }, [selectedId, hoveredId]);

  // Liste aller POIs erstellen für Kollisions-Check
  const allPois = useMemo(() => {
      return data.forests.flatMap(f => f.pois || []);
  }, [data.forests]);

  // Task-Counts pro POI: einmal berechnen statt per-render filtern
  const poiTaskCounts = useMemo(() => {
      const counts = new Map<string, number>();
      data.tasks.forEach((t: any) => {
          if (t.poiId && t.status !== 'DONE') {
              counts.set(t.poiId, (counts.get(t.poiId) ?? 0) + 1);
          }
      });
      return counts;
  }, [data.tasks]);

  // POI-ID des aktuell in der Sidebar gehovertes Tasks — einmal, nicht per POI
  const hoveredTaskPoiId = useMemo(() => {
      if (!hoveredTaskId) return null;
      return data.tasks.find((t: any) => t.id === hoveredTaskId)?.poiId ?? null;
  }, [hoveredTaskId, data.tasks]);

  // Tasks die innerhalb eines Polygons (Pflanzung, Jagd, Kalamität) liegen
  // bekommen keinen eigenen Pin — analog zu POI-Tasks (die via poiId ausgeblendet werden)
  const polygonTaskIds = useMemo(() => {
    const allPolygons = data.forests.flatMap((f: any) => [
      ...(f.plantings  ?? []).map((p: any) => p.geoJson),
      ...(f.hunting    ?? []).map((h: any) => h.geoJson),
      ...(f.calamities ?? []).map((c: any) => c.geoJson),
    ]);
    if (!allPolygons.length) return new Set<string>();
    const ids = new Set<string>();
    data.tasks.forEach((t: any) => {
      if (!t.lat || !t.lng || t.poiId) return;
      const p = point([t.lng, t.lat]);
      for (const geo of allPolygons) {
        try {
          const feature = geo.type === 'Feature' ? geo : { type: 'Feature', geometry: geo, properties: {} };
          if (booleanPointInPolygon(p, feature as any)) { ids.add(t.id); break; }
        } catch { /* ignore invalid geometries */ }
      }
    });
    return ids;
  }, [data.tasks, data.forests]);

  useMapEvents({
    zoomend: () => setCurrentZoom(map.getZoom()),
    contextmenu(e) {
      if (interactionMode === 'VIEW' && onLongPress) {
        e.originalEvent.preventDefault();
        onLongPress({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
    click(e) {
      if (interactionMode === 'DRAW_POI' && activePoiType) {
        if (pendingPoi) return; // Modal offen → Karten-Klicks ignorieren
        const { lat, lng } = e.latlng;

        // Detect which forest polygon contains the click point
        let forestId: string | undefined;
        try {
          const clickedPoint = point([lng, lat]);
          const containing = data.forests.find(f => f.geoJson && booleanPointInPolygon(clickedPoint, f.geoJson));
          forestId = containing?.id;
        } catch {
          forestId = undefined;
        }

        if (!forestId) {
          // Außerhalb aller Waldpolygone → Wald manuell zuweisen lassen
          setPendingPoi({ lat, lng, type: activePoiType });
          return;
        }

        toast.promise(
            createPoi({ lat, lng, type: activePoiType, orgSlug: data.orgSlug, userId: data.currentUserId, forestId }),
            {
                loading: 'Platziere Objekt...',
                success: () => { setInteractionMode('VIEW'); onRefresh(); return 'Objekt erstellt!'; },
                error: (err) => `Fehler: ${err.message}`
            }
        );
      }
    }
  });

  const handleForestAssign = (forestId: string) => {
    if (!pendingPoi) return;
    const { lat, lng, type } = pendingPoi;
    setPendingPoi(null);
    toast.promise(
      createPoi({ lat, lng, type, orgSlug: data.orgSlug, userId: data.currentUserId, forestId }),
      {
        loading: 'Platziere Objekt...',
        success: () => { setInteractionMode('VIEW'); onRefresh(); return 'Objekt erstellt!'; },
        error: (err) => `Fehler: ${err.message}`,
      }
    );
  };

  return (
    <>
      {pendingPoi && (
        <ForestAssignDialog
          forests={data.forests}
          onConfirm={handleForestAssign}
          onCancel={() => setPendingPoi(null)}
        />
      )}
      {data.forests.map((forest) => {
        if (isBeingEdited(forest.id)) return null;
        const forestLatLngs = forestCoords.get(forest.id) ?? [];
        
        return (
          <React.Fragment key={`forest-group-${forest.id}`}>
            
            {/* FOREST BOUNDARY */}
            {showForests && forestLatLngs.length > 0 && (
              <Polygon
                positions={forestLatLngs}
                pathOptions={getForestStyle(forest)}
                interactive={interactionMode === 'VIEW'} 
                eventHandlers={{
                  click: (e) => {
                    if (interactionMode === 'VIEW') {
                        L.DomEvent.stopPropagation(e); 
                        selectFeature(forest.id, 'FOREST');
                    }
                  },
                  mouseover: () => setHovered(forest.id),
                  mouseout: () => setHovered(null)
                }}
              >
                {currentZoom >= 12 && (
                    <Tooltip sticky direction="top" opacity={0.9} className="custom-tooltip !pointer-events-none">
                        <div className="text-center font-sans">
                            <span className="font-bold block text-sm">{forest.name}</span>
                            <span className="text-xs text-gray-500">{forest.areaHa?.toFixed(2)} ha</span>
                        </div>
                    </Tooltip>
                )}
              </Polygon>
            )}

            {/* ABTEILUNGEN — zuerst rendern (unter allen anderen Flächen) */}
            {showSections && forest.compartments?.map((c: any) => {
              const coords = polygonCoords.get(c.id) ?? [];
              if (!coords.length) return null;
              const isSel = selectedId === c.id;
              const isHov = hoveredId === c.id;
              const color = c.color ?? '#3b82f6';
              return (
                <Polygon
                  key={c.id}
                  positions={coords}
                  interactive={!isDrawMode}
                  pathOptions={{
                    color,
                    weight: isSel ? 3 : 2,
                    fillColor: color,
                    fillOpacity: isSel ? 0.2 : isHov ? 0.15 : 0.08,
                    dashArray: isSel ? undefined : '8, 6',
                    opacity: isSel ? 1 : isHov ? 0.9 : 0.75,
                  }}
                  eventHandlers={{
                    click: (e) => { if (interactionMode === 'VIEW') { L.DomEvent.stopPropagation(e); selectFeature(c.id, 'COMPARTMENT'); } },
                    mouseover: () => setHovered(c.id),
                    mouseout:  () => setHovered(null),
                  }}
                >
                  <Tooltip sticky direction="top" opacity={0.9} className="!pointer-events-none">
                    <span className="font-bold text-xs">{c.name || 'Abteilung'}</span>
                    {c.areaHa && <span className="text-gray-500 ml-1 text-xs">· {c.areaHa.toFixed(2)} ha</span>}
                  </Tooltip>
                </Polygon>
              );
            })}

            {/* JAGDFLÄCHEN — zuerst rendern (unter Pflanz- und Kalamitätsflächen) */}
            {showSections && forest.hunting?.map((h: any) => {
              const coords = polygonCoords.get(h.id) ?? [];
              if (!coords.length) return null;
              const isSel = selectedId === h.id;
              const isHov = hoveredId === h.id;
              return (
                <Polygon
                  key={h.id}
                  positions={coords}
                  interactive={!isDrawMode}
                  pathOptions={{
                    color: COLORS.HUNTING,
                    weight: isSel ? 3 : 2,
                    fillColor: COLORS.HUNTING,
                    fillOpacity: isSel ? 0.25 : 0.1,
                    dashArray: '15, 10, 5, 10',
                    opacity: isSel ? 1 : isHov ? 0.9 : 0.7,
                  }}
                  eventHandlers={{
                    click: (e) => { if (interactionMode === 'VIEW') { L.DomEvent.stopPropagation(e); selectFeature(h.id, 'HUNTING'); } },
                    mouseover: () => setHovered(h.id),
                    mouseout:  () => setHovered(null),
                  }}
                >
                  <Tooltip sticky direction="top" opacity={0.9} className="!pointer-events-none">
                    <span className="font-bold text-xs">{h.name || 'Jagdfläche'}</span>
                    {h.areaHa && <span className="text-gray-500 ml-1 text-xs">· {h.areaHa.toFixed(2)} ha</span>}
                  </Tooltip>
                </Polygon>
              );
            })}

            {/* KALAMITÄTSFLÄCHEN — unter Pflanzflächen */}
            {showSections && forest.calamities?.map((c: any) => {
              const coords = polygonCoords.get(c.id) ?? [];
              if (!coords.length) return null;
              const isSel = selectedId === c.id;
              const isHov = hoveredId === c.id;
              const label = c.cause === 'WIND' ? 'Windwurf' : c.cause === 'BARK_BEETLE' ? 'Borkenkäfer' : c.cause === 'FIRE' ? 'Brand' : c.cause === 'SNOW' ? 'Schneebruch' : c.cause === 'DROUGHT' ? 'Trockenheit' : 'Kalamität';
              return (
                <Polygon
                  key={c.id}
                  positions={coords}
                  interactive={!isDrawMode}
                  pathOptions={{
                    color: COLORS.CALAMITY,
                    weight: isSel ? 3 : 2,
                    fillColor: COLORS.CALAMITY,
                    fillOpacity: isSel ? 0.4 : isHov ? 0.3 : 0.22,
                    dashArray: isSel ? undefined : '6, 4',
                    opacity: isSel ? 1 : 0.85,
                  }}
                  eventHandlers={{
                    click: (e) => { if (interactionMode === 'VIEW') { L.DomEvent.stopPropagation(e); selectFeature(c.id, 'CALAMITY'); } },
                    mouseover: () => setHovered(c.id),
                    mouseout:  () => setHovered(null),
                  }}
                >
                  <Tooltip sticky direction="top" opacity={0.9} className="!pointer-events-none">
                    <span className="font-bold text-xs">{label}</span>
                    {c.areaHa && <span className="text-gray-500 ml-1 text-xs">· {c.areaHa.toFixed(2)} ha</span>}
                  </Tooltip>
                </Polygon>
              );
            })}

            {/* PFLANZFLÄCHEN — zuletzt rendern (oben im SVG-Stack → immer anklickbar) */}
            {showSections && forest.plantings?.map((p: any) => {
              const coords = polygonCoords.get(p.id) ?? [];
              if (!coords.length) return null;
              const isSel = selectedId === p.id;
              const isHov = hoveredId === p.id;

              const content: { species: string; count: number }[] = Array.isArray(p.content) ? p.content : [];
              const totalCount = content.reduce((s, c) => s + (Number(c.count) || 0), 0);
              const usePattern = content.length > 1 && totalCount > 0;
              const dominant = getDominantSpecies(content) ?? p.treeSpecies;
              const baseColor = getSpeciesColor(dominant ?? 'OAK');
              const patternId = `planting-pattern-${p.id}`;
              const label = p.description?.trim() || getSpeciesLabel(dominant ?? p.treeSpecies) || 'Pflanzfläche';

              const size = 50; let cx = 0;

              return (
                <React.Fragment key={p.id}>
                  {usePattern && (
                    <svg style={{ position: 'absolute', width: 0, height: 0 }}>
                      <defs>
                        <pattern id={patternId} patternUnits="userSpaceOnUse" width={size} height={size} patternTransform="rotate(45)">
                          {content.map((item, idx) => {
                            const ratio = (Number(item.count) || 0) / totalCount;
                            if (ratio <= 0) return null;
                            const w = size * ratio; const x = cx; cx += w;
                            return <rect key={idx} x={x} y="0" width={w} height={size} fill={getSpeciesColor(item.species)} strokeWidth="0" />;
                          })}
                        </pattern>
                      </defs>
                    </svg>
                  )}
                  <Polygon
                    positions={coords}
                    interactive={!isDrawMode}
                    pathOptions={{
                      color: isSel ? '#fff' : baseColor,
                      weight: isSel ? 3 : isHov ? 2.5 : 2,
                      fillColor: usePattern ? `url(#${patternId})` : baseColor,
                      fillOpacity: usePattern ? 1 : (isSel ? 0.5 : isHov ? 0.35 : 0.25),
                      opacity: isSel ? 1 : 0.85,
                    }}
                    eventHandlers={{
                      click: (e) => { if (interactionMode === 'VIEW') { L.DomEvent.stopPropagation(e); selectFeature(p.id, 'PLANTING'); } },
                      mouseover: () => setHovered(p.id),
                      mouseout:  () => setHovered(null),
                    }}
                  >
                    <Tooltip sticky direction="top" opacity={0.9} className="!pointer-events-none">
                      <span className="font-bold text-xs">{label}</span>
                      {p.areaHa && <span className="text-gray-500 ml-1 text-xs">· {p.areaHa.toFixed(2)} ha</span>}
                      {totalCount > 0 && <span className="text-gray-500 ml-1 text-xs">· {totalCount.toLocaleString('de-DE')} Stk.</span>}
                    </Tooltip>
                  </Polygon>
                </React.Fragment>
              );
            })}

            {/* INFRASTRUKTUR: POIs */}
            {showInfrastructure && poisVisible && forest.pois?.filter((poi: any) => !(poi.lat === 0 && poi.lng === 0)).map((poi: any) => {
                const isSelected = selectedId === poi.id;
                const isMoving = interactionMode === 'MOVE_POI' && isSelected;
                const displayLat = (isMoving && editingData && editingData.id === poi.id) ? editingData.lat : poi.lat;
                const displayLng = (isMoving && editingData && editingData.id === poi.id) ? editingData.lng : poi.lng;

                const hasTask = (poiTaskCounts.get(poi.id) ?? 0) > 0;

                return (
                    <Marker
                        key={poi.id}
                        position={[displayLat, displayLng]}
                        icon={
                            poi.type === 'TREE'
                                ? createTreeIcon(isSelected, hasTask, poi.tree?.health)
                                : createPoiIcon(poi.type, isSelected, hasTask, hoveredId === poi.id || hoveredTaskPoiId === poi.id)
                        }
                        draggable={isMoving}
                        eventHandlers={{
                            click: (e) => {
                                if (interactionMode === 'VIEW') {
                                    L.DomEvent.stopPropagation(e);
                                    selectFeature(poi.id, 'POI');
                                }
                            },
                            dragend: (e) => {
                                const marker = e.target;
                                const position = marker.getLatLng();
                                setEditingFeature({
                                    ...poi, 
                                    lat: position.lat,
                                    lng: position.lng
                                });
                            }
                        }}
                    >
                         <Tooltip direction="top" offset={[0, -12]} opacity={0.9} className="!pointer-events-none">
                            <span className="font-bold text-xs">{poi.name}</span>
                        </Tooltip>
                    </Marker>
                );
            })}

          </React.Fragment>
        );
      })}

      {/* INFRASTRUKTUR: Wege — in custom pane (zIndex 450) über Waldpolygonen */}
      {showInfrastructure && data.forests.flatMap((forest) =>
        (forest.paths ?? []).map((path: any) => {
          const coords = pathCoords.get(path.id) ?? [];
          if (!coords.length) return null;

          const isSelected = selectedId === path.id;
          const isHovered  = hoveredId === path.id;
          const defaultColor = path.type === 'SKID_TRAIL' ? '#eab308'
                             : path.type === 'WATER'      ? '#3b82f6'
                             :                              '#94a3b8';
          const color = path.color ?? defaultColor;
          const storedLength = path.lengthM ?? calculatePathLengthM(path.geoJson);
          const lengthLabel  = storedLength >= 1000
            ? `${(storedLength / 1000).toFixed(2)} km`
            : `${Math.round(storedLength)} m`;
          const typeLabel = path.type === 'SKID_TRAIL' ? 'Rückegasse'
                          : path.type === 'WATER'      ? 'Gewässer'
                          :                              'LKW-Weg';

          const pathEventHandlers = {
            click: (e: any) => {
              if (interactionMode === 'VIEW') {
                L.DomEvent.stopPropagation(e);
                selectFeature(path.id, 'PATH');
              }
            },
            mouseover: () => setHovered(path.id),
            mouseout:  () => setHovered(null),
          };

          return (
            <React.Fragment key={`${path.id}-${color}`}>
              {/* Sichtbare Linie */}
              <Polyline
                positions={coords}
                pathOptions={{
                  color,
                  weight: isSelected ? 5 : isHovered ? 4 : path.type === 'SKID_TRAIL' ? 2 : 3,
                  dashArray: path.type === 'SKID_TRAIL' ? '6, 4' : undefined,
                  opacity: isSelected ? 1 : 0.75,
                  pane: 'paths-pane',
                  interactive: false,
                }}
              >
                <Tooltip direction="top" offset={[0, -4]} opacity={0.9} className="!pointer-events-none">
                  <span className="font-bold text-xs">{path.name ?? typeLabel}</span>
                  <span className="text-gray-500 ml-1 text-xs">· {lengthLabel}</span>
                </Tooltip>
              </Polyline>
              {/* Unsichtbares Hit-Target mit großer Klickfläche */}
              <Polyline
                positions={coords}
                pathOptions={{
                  color,
                  weight: 20,
                  opacity: 0,
                  pane: 'paths-pane',
                }}
                eventHandlers={pathEventHandlers}
              />
            </React.Fragment>
          );
        })
      )}

      {/* TASKS */}
      {showTasks && currentZoom >= 10 && data.tasks.map((task) => {
        if (!task.lat || !task.lng) return null;

        // Dedup: Wenn Task an POI hängt oder innerhalb eines Polygons liegt -> NICHT ZEIGEN
        if (task.poiId) return null;
        if (polygonTaskIds.has(task.id)) return null;

        const isSelected = selectedId === task.id;

        return (
          <Marker
            key={task.id}
            position={[task.lat, task.lng]}
            icon={createTaskIcon(task.priority, task.status, isSelected)}
            eventHandlers={{
              click: (e) => {
                if (interactionMode === 'VIEW') {
                    L.DomEvent.stopPropagation(e);
                    selectFeature(task.id, 'TASK');
                }
              }
            }}
          >
            <Tooltip direction="top" offset={[0, -16]} opacity={0.9} className="!pointer-events-none">
                <span className="font-bold text-xs">{task.title}</span>
            </Tooltip>
          </Marker>
        );
      })}
    </>
  );
}