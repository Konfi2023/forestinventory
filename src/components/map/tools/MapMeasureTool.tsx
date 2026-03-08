'use client';

import { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import { useMapStore } from '../stores/useMapStores';
import L from 'leaflet';
import area from '@turf/area';
import { calculatePathLengthM } from '@/lib/map-helpers';
import { X } from 'lucide-react';

import 'leaflet-draw';

function formatDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
}

function formatArea(sqm: number): string {
  if (sqm >= 1_000_000) return `${(sqm / 1_000_000).toFixed(2)} km²`;
  if (sqm >= 10_000)    return `${(sqm / 10_000).toFixed(2)} ha`;
  return `${Math.round(sqm)} m²`;
}

export default function MapMeasureTool() {
  const map     = useMap();
  const mode    = useMapStore(s => s.interactionMode);
  const setMode = useMapStore(s => s.setInteractionMode);

  const drawerRef = useRef<any>(null);
  const layerRef  = useRef<L.Layer | null>(null);

  const [result, setResult] = useState<string | null>(null);
  const [label,  setLabel]  = useState('');

  const isActive = mode === 'MEASURE_DISTANCE' || mode === 'MEASURE_AREA';

  const clearLayer = () => {
    if (layerRef.current) {
      try { map.removeLayer(layerRef.current); } catch {}
      layerRef.current = null;
    }
  };

  const stopDrawing = () => {
    drawerRef.current?.disable();
    drawerRef.current = null;
    clearLayer();
    setResult(null);
    map.doubleClickZoom.enable();
  };

  useEffect(() => {
    if (!isActive) {
      stopDrawing();
      return;
    }

    clearLayer();
    setResult(null);

    // DoubleClick-Zoom deaktivieren — sonst zoomt die Karte beim Abschluss
    map.doubleClickZoom.disable();

    const isDistance = mode === 'MEASURE_DISTANCE';

    // @ts-ignore
    const drawer = isDistance
      // @ts-ignore
      ? new L.Draw.Polyline(map, {
          shapeOptions: { color: '#f59e0b', weight: 3, dashArray: '8 4', opacity: 0.95 },
          metric: true,
          feet: false,
          showLength: true,
          guidelineDistance: 10,
        })
      // @ts-ignore
      : new L.Draw.Polygon(map, {
          allowIntersection: false,
          showArea: true,
          shapeOptions: { color: '#8b5cf6', weight: 2, fillOpacity: 0.15, opacity: 0.9 },
          metric: true,
        });

    drawerRef.current = drawer;
    drawer.enable();

    const onCreated = (e: any) => {
      const layer   = e.layer;
      const geoJson = layer.toGeoJSON();

      if (isDistance) {
        const m = calculatePathLengthM(geoJson.geometry);
        setResult(formatDistance(m));
        setLabel('Strecke');
      } else {
        const sqm = area(geoJson);
        setResult(formatArea(sqm));
        setLabel('Fläche');
      }

      map.addLayer(layer);
      layerRef.current = layer;
    };

    map.on(L.Draw.Event.CREATED, onCreated);

    return () => {
      map.off(L.Draw.Event.CREATED, onCreated);
      drawerRef.current?.disable();
      map.doubleClickZoom.enable();
    };
  }, [map, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isActive) return null;

  const isDistance = mode === 'MEASURE_DISTANCE';
  const accent     = isDistance ? 'bg-amber-500 border-amber-400 text-black' : 'bg-violet-600 border-violet-500 text-white';

  return (
    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[2000] flex flex-col items-center gap-2 animate-in fade-in slide-in-from-top-4">
      {result ? (
        /* Ergebnis-Banner */
        <div className={`${accent} px-5 py-2.5 rounded-full shadow-2xl font-bold flex items-center gap-3 border`}>
          <span className="opacity-60 text-xs uppercase tracking-wider">{label}:</span>
          <span className="text-xl font-black">{result}</span>
          <button
            onClick={() => { stopDrawing(); setMode('VIEW'); }}
            className="ml-1 p-1 rounded-full bg-black/20 hover:bg-black/30 transition"
            title="Messung beenden"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        /* Hinweis-Banner während des Zeichnens */
        <div className={`${accent} px-5 py-2 rounded-full shadow-2xl flex items-center gap-3 border text-xs font-bold`}>
          {isDistance
            ? 'Klicken zum Messen · Doppelklick zum Abschließen'
            : 'Fläche zeichnen · Doppelklick zum Abschließen'}
          <button
            onClick={() => { stopDrawing(); setMode('VIEW'); }}
            className="p-1 rounded-full bg-black/20 hover:bg-black/30 transition"
          >
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
