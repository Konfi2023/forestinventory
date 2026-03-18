'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation'; 

// 1. Server Actions
import { getMapDataBySlug } from '@/app/dashboard/map/actions';

// 2. Store & Helpers
import { useMapStore } from '@/components/map/stores/useMapStores';
import { getBoundsFromGeoJson } from '@/lib/map-helpers';

// 3. Components
import { MapDetailPanel } from '@/components/map/overlays/MapDetailPanel';
import { MapToolbar } from '@/components/map/overlays/MapToolbar';
import { TaskSidebar } from '@/components/map/overlays/TaskSidebar';
import { TaskDetailSheet } from '@/app/dashboard/org/[slug]/(standard)/tasks/_components/TaskDetailSheet';

// 4. Dynamic Components
const MapViewer = dynamic(
  () => import('@/components/map/viewer/MapViewer'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-[#050505] flex items-center justify-center text-gray-500">
        <Loader2 className="animate-spin w-8 h-8 text-[#10b981] mr-2" />
        <span className="font-mono text-sm">Karte wird initialisiert...</span>
      </div>
    )
  }
);

const GeoDataHandler = dynamic(
  () => import('@/components/map/viewer/GeoDataHandler').then(mod => mod.GeoDataHandler),
  { ssr: false }
);

interface Props {
  orgSlug: string;
}

export default function MapPageClient({ orgSlug }: Props) {
  const [data, setData] = useState<{
      forests: any[],
      tasks: any[],
      members: any[],
      owners: { id: string; name: string }[],
      currentUserId: string,
      orgSlug: string,
      permissions: string[],
      areaLimitHa: number | null,
      usedAreaHa: number,
  } | null>(null);

  const selectedId = useMapStore(s => s.selectedFeatureId);
  const selectedType = useMapStore(s => s.selectedFeatureType);
  const selectFeature = useMapStore(s => s.selectFeature);
  const restorePreviousFeature = useMapStore(s => s.restorePreviousFeature);
  const isMapReady = useMapStore(s => s.isReady);

  const searchParams = useSearchParams();
  const focusTaskId = searchParams.get('focusTaskId');

  const loadMapData = useCallback(async () => {
    if (!orgSlug) return;
    try {
      const res = await getMapDataBySlug(orgSlug);
      const cleanData = {
          ...res,
          forests: res.forests || [],
          tasks: res.tasks || [],
          members: res.members || [],
          owners: res.owners || [],
          currentUserId: res.currentUserId || "",
          permissions: res.permissions || [],
          areaLimitHa: res.areaLimitHa ?? null,
          usedAreaHa: res.usedAreaHa ?? 0,
      };
      setData(cleanData);
    } catch (err) {
      console.error("Fehler beim Laden der Kartendaten:", err);
    }
  }, [orgSlug]);

  // Registriere loadMapData direkt als refreshData im Store —
  // so kann MapGeometryEditor es direkt aufrufen statt über dataVersion-Umweg.
  useEffect(() => {
    useMapStore.setState({ refreshData: loadMapData });
  }, [loadMapData]);

  useEffect(() => {
    loadMapData();
  }, [loadMapData]);

  // --- HYBRID AUTO-ZOOM EFFEKT ---
  useEffect(() => {
    if (!data || !focusTaskId || !isMapReady) return;

    const targetTask = data.tasks.find((t: any) => t.id === focusTaskId);
    if (!targetTask) return;

    // Koordinaten-Ermittlung in 3 Stufen:
    // 1. Eigene Task-Koordinaten (freie Pins)
    // 2. POI-Koordinaten aus data.forests (POI-gebundene Tasks)
    //    → zuverlässiger als targetTask.poi, da forests.pois immer geladen sind
    // 3. Fallback: Wald-Bounds
    let targetLat: number | null = targetTask.lat ?? null;
    let targetLng: number | null = targetTask.lng ?? null;

    if ((!targetLat || !targetLng) && targetTask.poiId) {
      const allPois = data.forests.flatMap((f: any) => f.pois || []);
      const linkedPoi = allPois.find((p: any) => p.id === targetTask.poiId);
      if (linkedPoi) {
        targetLat = linkedPoi.lat;
        targetLng = linkedPoi.lng;
      }
    }

    const { flyTo, fitBounds } = useMapStore.getState();

    if (targetLat && targetLng) {
      flyTo([targetLat, targetLng], 19);
    } else if (targetTask.linkedPolygonId && targetTask.linkedPolygonType) {
      // Polygon-Bounds berechnen (Kulturfläche, Kalamität, Jagdrevier, Weg)
      const parentForest = data.forests.find((f: any) => f.id === targetTask.forestId);
      if (parentForest) {
        const collectionKey: Record<string, string> = {
          PLANTING: 'plantings', CALAMITY: 'calamities', HUNTING: 'hunting', PATH: 'paths'
        };
        const key = collectionKey[targetTask.linkedPolygonType];
        const polygon = key && parentForest[key]?.find((p: any) => p.id === targetTask.linkedPolygonId);
        if (polygon?.geoJson) {
          const bounds = getBoundsFromGeoJson(polygon.geoJson);
          if (bounds) { fitBounds(bounds); }
        } else {
          const forestBounds = getBoundsFromGeoJson(parentForest.geoJson);
          if (forestBounds) fitBounds(forestBounds);
        }
      }
    } else {
      const parentForest = data.forests.find((f: any) => f.id === targetTask.forestId);
      if (parentForest?.geoJson) {
        const bounds = getBoundsFromGeoJson(parentForest.geoJson);
        if (bounds) fitBounds(bounds);
      }
    }

    // Sheet nach der Fluganimation öffnen (flyTo dauert ~1.5s)
    setTimeout(() => selectFeature(focusTaskId, 'TASK'), 1600);

  }, [data, focusTaskId, selectFeature, isMapReady]);


  const hasPermission = (perm: string) => {
      if (!data) return false;
      return data.permissions.includes('*') || data.permissions.includes(perm);
  };

  const handleOptimisticDelete = useCallback((forestId: string) => {
    if (selectedId === forestId) {
        selectFeature(null, null);
    }
    setData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        forests: prev.forests.filter((f: any) => f.id !== forestId)
      };
    });
  }, [selectedId, selectFeature]);

  const activeTask = selectedType === 'TASK' && data 
    ? data.tasks.find((t: any) => t.id === selectedId) 
    : null;

  if (!data) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-500 bg-[#050505]">
        <Loader2 className="animate-spin w-8 h-8 text-[#10b981]" />
        <span className="ml-2 font-mono text-sm">Lade Geodaten...</span>
      </div>
    );
  }

  return (
    <div className="flex w-full h-full overflow-hidden">
      {/* ── Linke Aufgaben-Sidebar ── */}
      <TaskSidebar tasks={data.tasks} forests={data.forests} orgSlug={orgSlug} onRefresh={loadMapData} />

      {/* ── Karte + rechtes Detail-Panel ── */}
      <div className="relative flex-1 overflow-hidden min-w-0">
        <MapViewer forestData={data} skipAutoZoom={!!focusTaskId}>
          <GeoDataHandler
            data={{ ...data, orgSlug }}
            onRefresh={loadMapData}
          />
          <MapToolbar
            canCreate={hasPermission('forest:edit')}
            orgSlug={orgSlug}
            currentUserId={data.currentUserId}
            onRefresh={loadMapData}
          />
        </MapViewer>

        <div className="no-print">
          <MapDetailPanel
            forests={data.forests}
            tasks={data.tasks}
            members={data.members}
            owners={data.owners}
            orgSlug={orgSlug}
            onForestDeleted={handleOptimisticDelete}
            canEdit={hasPermission('forest:edit')}
            canDelete={hasPermission('forest:delete')}
          />
        </div>
      </div>

      {activeTask && (
        <TaskDetailSheet
          task={activeTask}
          open={!!activeTask}
          onClose={() => restorePreviousFeature()}
          orgSlug={orgSlug}
          members={data.members}
          currentUserId={data.currentUserId}
        />
      )}
    </div>
  );
}