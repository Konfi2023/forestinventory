'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, ChevronDown, TreePine, RefreshCw, AlertTriangle } from 'lucide-react';
import { useMapStore } from '@/components/map/stores/useMapStores';
import { getBoundsFromGeoJson } from '@/lib/map-helpers';
import { MapStyleToggle } from './MapStyleToggle';
import { OfflineMapButton } from './OfflineMapButton';
import { MobileDetailSheet } from './MobileDetailSheet';
import { MobilePoiCreator } from './MobilePoiCreator';

interface MapData {
  forests: unknown[];
  tasks: unknown[];
  members: unknown[];
  currentUserId: string;
  orgSlug: string;
  permissions: string[];
}

const MapViewer = dynamic(
  () => import('@/components/map/viewer/MapViewer'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-slate-100 flex items-center justify-center">
        <Loader2 className="animate-spin w-6 h-6 text-emerald-600" />
      </div>
    ),
  }
);

const GeoDataHandler = dynamic(
  () => import('@/components/map/viewer/GeoDataHandler').then(m => m.GeoDataHandler),
  { ssr: false }
);

const UserLocationMarker = dynamic(
  () => import('@/components/map/layers/UserLocationMarker').then(m => m.UserLocationMarker),
  { ssr: false }
);

interface Forest { id: string; name: string; }

interface Props {
  orgSlug: string;
  forests: Forest[];
}

export function MobileMapView({ orgSlug, forests }: Props) {
  const [data, setData]       = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [forestId, setForestId] = useState<string>(forests[0]?.id ?? '');
  const pendingForestId = useRef<string>(forestId);
  const [pendingNewPoi, setPendingNewPoi] = useState<{ lat: number; lng: number } | null>(null);

  const isReady = useMapStore(s => s.isReady);

  // Set LIGHT basemap on first mount (client-side only, avoids module-level store mutation)
  useEffect(() => {
    useMapStore.setState({ activeBaseMap: 'LIGHT' });
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch(`/api/app/mapdata?orgSlug=${encodeURIComponent(orgSlug)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as MapData;
      setData(json);
    } catch (e) {
      console.error('MobileMapView: Ladefehler', e);
      setLoadError(true);
    }
    setLoading(false);
  }, [orgSlug]);

  useEffect(() => { loadData(); }, [loadData]);

  // fitBounds auf gewählten Wald — sobald Map bereit UND Daten da
  function zoomToForest(fId: string, mapData: any) {
    const forest = mapData?.forests?.find((f: any) => f.id === fId);
    if (!forest?.geoJson) return;
    const bounds = getBoundsFromGeoJson(forest.geoJson);
    if (!bounds) return;
    setTimeout(() => {
      useMapStore.getState().fitBounds?.(bounds);
    }, 200);
  }

  // Wenn Map ready wird und wir schon Daten haben → auf ersten Wald zoomen
  useEffect(() => {
    if (isReady && data) {
      zoomToForest(pendingForestId.current, data);
    }
  }, [isReady, data]); // eslint-disable-line react-hooks/exhaustive-deps

  // Forest-Wechsel via Dropdown
  function handleForestChange(fId: string) {
    setForestId(fId);
    pendingForestId.current = fId;
    if (isReady && data) zoomToForest(fId, data);
  }

  // Bounding box des aktuellen Waldes für Offline-Caching
  const forestBounds = useMemo(() => {
    if (!data) return null;
    const forest = (data.forests as any[])?.find((f: any) => f.id === forestId);
    if (!forest?.geoJson) return null;
    const b = getBoundsFromGeoJson(forest.geoJson);
    if (!b) return null;
    return { south: b[0][0], west: b[0][1], north: b[1][0], east: b[1][1] };
  }, [data, forestId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-100">
        <Loader2 className="animate-spin w-6 h-6 text-emerald-600" />
        <span className="ml-2 text-sm text-slate-500">Lade Karte…</span>
      </div>
    );
  }

  if (loadError && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 bg-slate-100 px-8 text-center">
        <AlertTriangle className="w-8 h-8 text-amber-500" />
        <p className="text-slate-600 text-sm">Karte konnte nicht geladen werden.</p>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium text-sm transition-colors"
        >
          <RefreshCw size={16} />
          Erneut versuchen
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Forest-Selektor */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-3 py-2 flex items-center gap-2">
        <TreePine size={15} className="text-emerald-600 shrink-0" />
        <div className="relative flex-1">
          <select
            value={forestId}
            onChange={e => handleForestChange(e.target.value)}
            className="w-full appearance-none bg-slate-50 text-sm text-slate-800 rounded-lg px-3 py-1.5 pr-7 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {forests.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Karte */}
      <div className="relative flex-1 overflow-hidden">
        <MapViewer forestData={data} minimal>
          <GeoDataHandler
            data={data!}
            onRefresh={loadData}
            onLongPress={(latlng) => setPendingNewPoi(latlng)}
          />
          <UserLocationMarker />
        </MapViewer>

        {/* Floating controls – unten links */}
        <div className="absolute bottom-4 left-3 z-[1000] flex flex-col gap-2">
          <MapStyleToggle />
          <OfflineMapButton bounds={forestBounds} />
        </div>
      </div>

      {/* Bottom-Sheet für POI/Task Details */}
      {data && (
        <MobileDetailSheet
          data={{ forests: data.forests as any[], tasks: data.tasks as any[], orgSlug }}
          onRefresh={loadData}
        />
      )}

      {/* POI-Creator-Sheet (Long-Press) */}
      {data && (
        <MobilePoiCreator
          latlng={pendingNewPoi}
          forests={data.forests as any[]}
          orgSlug={orgSlug}
          currentUserId={(data as any).currentUserId}
          onClose={() => setPendingNewPoi(null)}
          onRefresh={loadData}
        />
      )}
    </div>
  );
}
