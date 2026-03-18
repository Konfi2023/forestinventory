'use client';

import { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import { useMapStore } from '../stores/useMapStores';
import { createForest, updateForest } from '@/actions/forest';
import { createPath, updatePath } from '@/actions/paths';
import { createPlanting, updatePlanting, createHunting, updateHunting, createCalamity, updateCalamity } from '@/actions/polygons';
import { toast } from 'sonner';
import L from 'leaflet';
import area from '@turf/area';
import centroid from '@turf/centroid';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';

import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import { Save, X, AlertTriangle } from 'lucide-react';
import { AREA_TOLERANCE_HA } from '@/lib/pricing-config';
import { calculatePathLengthM } from '@/lib/map-helpers';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Modal: Polygon außerhalb Waldgrenzen → Wald manuell zuweisen
function ForestAssignDialog({ forests, polygonType, onConfirm, onCancel }: {
  forests: any[];
  polygonType: string;
  onConfirm: (forestId: string) => void;
  onCancel: () => void;
}) {
  const [selectedForestId, setSelectedForestId] = useState('');
  const typeLabel = polygonType === 'DRAW_PLANTING' ? 'Pflanzfläche'
                  : polygonType === 'DRAW_HUNTING'  ? 'Jagdfläche'
                  : 'Kalamitätsfläche';
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4 space-y-4">
        <div>
          <h3 className="font-semibold text-slate-900 text-base">{typeLabel} außerhalb eines Waldes</h3>
          <p className="text-sm text-slate-500 mt-1">
            Der Mittelpunkt dieser Fläche liegt außerhalb aller eingezeichneten Waldflächen. Bitte weisen Sie sie einem Wald zu.
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

const PATH_COLORS: Record<string, string> = {
  ROAD:       '#94a3b8',
  SKID_TRAIL: '#eab308',
  WATER:      '#3b82f6',
};

function formatLength(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
}

export default function MapGeometryEditor({
  forests = [],
  areaLimitHa = null,
  usedAreaHa = 0,
  currentUserId = '',
  orgSlug = '',
}: {
  forests?: any[];
  areaLimitHa?: number | null;
  usedAreaHa?: number;
  currentUserId?: string;
  orgSlug?: string;
}) {
  const map = useMap();

  const mode           = useMapStore(s => s.interactionMode);
  const editingData    = useMapStore(s => s.editingFeatureData);
  const activePathType = useMapStore(s => s.activePathType);
  const setMode        = useMapStore(s => s.setInteractionMode);
  const setEditingFeature = useMapStore(s => s.setEditingFeature);
  const refreshData    = useMapStore(s => s.refreshData);
  const selectFeature  = useMapStore(s => s.selectFeature);

  const createdLayerRef = useRef<L.Layer | null>(null);
  const editToolbarRef  = useRef<L.EditToolbar.Edit | null>(null);
  const drawerRef       = useRef<L.Draw.Polygon | L.Draw.Polyline | null>(null);
  const pathLengthRef   = useRef<number>(0);

  // Refs zum Lesen aktueller Werte in Draw-Callbacks ohne Dependency-Schleife
  const editingDataRef   = useRef<any>(null);
  const currentUserIdRef = useRef<string>('');
  const orgSlugRef       = useRef<string>('');
  editingDataRef.current   = editingData;
  currentUserIdRef.current = currentUserId;
  orgSlugRef.current       = orgSlug;

  const [showSaveBar,      setShowSaveBar]      = useState(false);
  const [drawnLengthM,     setDrawnLengthM]     = useState<number | null>(null);
  const [pendingPolygon,   setPendingPolygon]   = useState<{ geoJson: any; areaHa: number; mode: string } | null>(null);
  const [currentEditAreaHa, setCurrentEditAreaHa] = useState<number | null>(null);

  // forests via Ref damit onCreated-Callback immer aktuelle Werte liest
  const forestsRef = useRef<any[]>([]);
  forestsRef.current = forests;

  // Limit-Werte via Ref (damit Closures immer aktuell sind)
  const areaLimitHaRef = useRef<number | null>(null);
  const usedAreaHaRef  = useRef<number>(0);
  areaLimitHaRef.current = areaLimitHa;
  usedAreaHaRef.current  = usedAreaHa;

  // ─── POLYGON SPEICHERN (shared) ─────────────────────────────────────────────
  const savePolygon = async (polygonMode: string, geoJson: any, areaHa: number, forestId: string) => {
    const orgSlug = editingDataRef.current?.orgSlug ?? orgSlugRef.current;
    const userId  = currentUserIdRef.current;
    try {
      if (polygonMode === 'DRAW_PLANTING') {
        const result = await createPlanting({ forestId, treeSpecies: 'Unbekannt', description: 'Pflanzfläche', geoJson, areaHa, userId, orgSlug });
        if (result.success) { toast.success('Pflanzfläche angelegt!'); refreshData(); if (result.id) setTimeout(() => selectFeature(result.id!, 'PLANTING'), 300); }
        else throw new Error(result.error);
      } else if (polygonMode === 'DRAW_HUNTING') {
        const result = await createHunting({ forestId, name: 'Jagdfläche', geoJson, areaHa, userId, orgSlug });
        if (result.success) { toast.success('Jagdfläche angelegt!'); refreshData(); if (result.id) setTimeout(() => selectFeature(result.id!, 'HUNTING'), 300); }
        else throw new Error(result.error);
      } else if (polygonMode === 'DRAW_CALAMITY') {
        const result = await createCalamity({ forestId, geoJson, areaHa, userId, orgSlug });
        if (result.success) { toast.success('Kalamitätsfläche angelegt!'); refreshData(); if (result.id) setTimeout(() => selectFeature(result.id!, 'CALAMITY'), 300); }
        else throw new Error(result.error);
      }
    } catch (err: any) {
      toast.error(`Fehler: ${err.message}`);
    } finally {
      setMode('VIEW');
      setEditingFeature(null);
    }
  };

  const handlePolygonForestAssign = async (forestId: string) => {
    if (!pendingPolygon) return;
    const { geoJson, areaHa, mode: polygonMode } = pendingPolygon;
    setPendingPolygon(null);
    await savePolygon(polygonMode, geoJson, areaHa, forestId);
  };

  // ─── DRAW FOREST ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!map || mode !== 'DRAW_FOREST') return;

    // @ts-ignore
    const drawer = new L.Draw.Polygon(map, {
      allowIntersection: false,
      guidelineDistance: 10,
      showArea: true,
      drawError: { color: '#e1e100', message: '<strong>Fehler:</strong> Kanten überschneiden sich!' },
      shapeOptions: { color: '#10b981', weight: 3, opacity: 1, fillOpacity: 0.2 },
    });

    drawerRef.current = drawer;
    drawer.enable();

    const onCreated = async (e: any) => {
      const layer   = e.layer;
      const geoJson = layer.toGeoJSON();

      const calculatedAreaSqM = area(geoJson);
      const calculatedAreaHa  = parseFloat((calculatedAreaSqM / 10000).toFixed(4));

      // Pre-Check Flächen-Limit vor Server-Call
      const limit = areaLimitHaRef.current;
      const used  = usedAreaHaRef.current;
      if (limit !== null && used + calculatedAreaHa > limit + AREA_TOLERANCE_HA) {
        const remaining = Math.max(0, limit - used);
        toast.error(
          `Limit überschritten: Noch ${remaining.toFixed(1)} ha verfügbar (Paket: ${limit} ha). ` +
          `Bitte Polygon verkleinern.`
        );
        setMode('VIEW');
        return;
      }

      try {
        const result = await createForest({
          name: 'Mein Wald',
          geoJson,
          areaHa: calculatedAreaHa,
          keycloakId: currentUserIdRef.current,
          orgSlug: editingDataRef.current?.orgSlug ?? orgSlugRef.current,
        });

        if (result.success) {
          toast.success('Wald angelegt!');
          refreshData();
          if (result.forestId) setTimeout(() => selectFeature(result.forestId!, 'FOREST'), 300);
        } else {
          toast.error('Fehler: ' + result.error);
        }
      } catch (err) {
        console.error(err);
        toast.error('Speichern fehlgeschlagen.');
      } finally {
        setMode('VIEW');
      }
    };

    map.on(L.Draw.Event.CREATED, onCreated);

    return () => {
      map.off(L.Draw.Event.CREATED, onCreated);
      try { if (drawerRef.current) { drawerRef.current.disable(); drawerRef.current = null; } } catch {}
    };
  }, [map, mode]);


  // ─── DRAW PATH ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!map || mode !== 'DRAW_PATH' || !activePathType) return;

    const color = PATH_COLORS[activePathType] ?? '#94a3b8';

    // @ts-ignore
    const drawer = new L.Draw.Polyline(map, {
      shapeOptions: {
        color,
        weight: 3,
        opacity: 0.9,
        dashArray: activePathType === 'SKID_TRAIL' ? '6, 4' : undefined,
      },
      guidelineDistance: 10,
    });

    drawerRef.current = drawer;
    drawer.enable();

    const onCreated = async (e: any) => {
      const layer   = e.layer;
      const geoJson = layer.toGeoJSON();
      const lengthM = calculatePathLengthM(geoJson);

      pathLengthRef.current = lengthM;
      setDrawnLengthM(lengthM);

      drawer.disable();
      map.addLayer(layer);
      createdLayerRef.current = layer;

      setShowSaveBar(true);
    };

    map.on(L.Draw.Event.CREATED, onCreated);

    return () => {
      map.off(L.Draw.Event.CREATED, onCreated);
      try { if (drawerRef.current) { drawerRef.current.disable(); drawerRef.current = null; } } catch {}
    };
  }, [map, mode, activePathType]);


  // ─── DRAW PLANTING / HUNTING / CALAMITY ─────────────────────────────────────
  useEffect(() => {
    const isPolygonDraw = mode === 'DRAW_PLANTING' || mode === 'DRAW_HUNTING' || mode === 'DRAW_CALAMITY';
    if (!map || !isPolygonDraw) return;

    const colorMap: Record<string, string> = {
      DRAW_PLANTING: '#22c55e',
      DRAW_HUNTING:  '#84cc16',
      DRAW_CALAMITY: '#f97316',
    };
    const color = colorMap[mode] ?? '#3b82f6';

    // @ts-ignore
    const drawer = new L.Draw.Polygon(map, {
      allowIntersection: false,
      showArea: true,
      shapeOptions: { color, weight: 2, opacity: 1, fillOpacity: 0.25 },
    });

    drawerRef.current = drawer;
    drawer.enable();

    // Capture mode in closure so onCreated always knows which polygon type
    const capturedMode = mode;

    const onCreated = async (e: any) => {
      const layer   = e.layer;
      const geoJson = layer.toGeoJSON();
      const areaHa  = parseFloat((area(geoJson) / 10000).toFixed(4));

      // Centroid berechnen und prüfen, ob er in einem bekannten Wald liegt
      let forestId: string | undefined;
      try {
        const c = centroid(geoJson);
        const found = forestsRef.current.find(
          f => f.geoJson && booleanPointInPolygon(c, f.geoJson.type === 'Feature' ? f.geoJson : { type: 'Feature', geometry: f.geoJson, properties: {} })
        );
        forestId = found?.id;
      } catch {
        forestId = undefined;
      }

      if (!forestId) {
        // Centroid liegt außerhalb aller Wälder → Modal anzeigen
        setPendingPolygon({ geoJson, areaHa, mode: capturedMode });
        return;
      }

      await savePolygon(capturedMode, geoJson, areaHa, forestId);
    };

    map.on(L.Draw.Event.CREATED, onCreated);

    return () => {
      map.off(L.Draw.Event.CREATED, onCreated);
      try { if (drawerRef.current) { drawerRef.current.disable(); drawerRef.current = null; } } catch {}
    };
  }, [map, mode]); // Nur mode und map — editingData via Ref gelesen


  // ─── EDIT GEOMETRY ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!map || mode !== 'EDIT_GEOMETRY' || !editingData) return;

    const isPath = editingData.featureType === 'PATH';
    const color  = isPath ? (PATH_COLORS[editingData.pathType] ?? '#94a3b8') : '#3b82f6';
    const dashArray = (isPath && editingData.pathType === 'SKID_TRAIL') ? '6, 4' : '10, 10';

    const editLayer = L.geoJSON(editingData.geoJson, {
      style: { color, weight: 3, dashArray, fillOpacity: 0.4 },
    }).getLayers()[0] as L.Path;

    if (!editLayer) return;

    map.addLayer(editLayer);
    createdLayerRef.current = editLayer as L.Layer;

    // @ts-ignore
    if (editLayer.getBounds) map.fitBounds(editLayer.getBounds(), { padding: [50, 50], animate: true });

    // @ts-ignore
    const editHandler = new L.EditToolbar.Edit(map, {
      featureGroup: new L.FeatureGroup().addLayer(editLayer),
    });

    editHandler.enable();
    editToolbarRef.current = editHandler;
    setShowSaveBar(true);

    // Live-Fläche initial setzen und bei Vertex-Änderungen aktualisieren (nur Wald-Edits)
    const featureTypeForArea = editingData.featureType ?? 'FOREST';
    if (featureTypeForArea === 'FOREST') {
      const initialArea = parseFloat((area(editingData.geoJson) / 10000).toFixed(4));
      setCurrentEditAreaHa(initialArea);

      const updateArea = () => {
        if (createdLayerRef.current) {
          // @ts-ignore
          const gj = createdLayerRef.current.toGeoJSON();
          setCurrentEditAreaHa(parseFloat((area(gj) / 10000).toFixed(4)));
        }
      };
      map.on('draw:editvertex', updateArea);
      map.on('draw:editmove',   updateArea);

      return () => {
        map.off('draw:editvertex', updateArea);
        map.off('draw:editmove',   updateArea);
        try { if (editToolbarRef.current) { editToolbarRef.current.disable(); editToolbarRef.current = null; } } catch {}
        try { if (createdLayerRef.current) { map.removeLayer(createdLayerRef.current); createdLayerRef.current = null; } } catch {}
        setShowSaveBar(false);
        setCurrentEditAreaHa(null);
      };
    }

    return () => {
      try { if (editToolbarRef.current) { editToolbarRef.current.disable(); editToolbarRef.current = null; } } catch {}
      try { if (createdLayerRef.current) { map.removeLayer(createdLayerRef.current); createdLayerRef.current = null; } } catch {}
      setShowSaveBar(false);
    };
  }, [map, mode, editingData]);


  // ─── SAVE / CANCEL ──────────────────────────────────────────────────────────
  const handleSaveDrawPath = async () => {
    if (!createdLayerRef.current || !activePathType) return;

    // @ts-ignore
    const geoJson = createdLayerRef.current.toGeoJSON();
    const lengthM = pathLengthRef.current;

    try {
      const forestId = editingData?.forestId;
      if (!forestId) {
        toast.error('Kein Wald zugeordnet. Bitte zuerst einen Wald auf der Karte auswählen.');
        return;
      }

      const name = activePathType === 'ROAD' ? 'LKW-Weg'
                 : activePathType === 'SKID_TRAIL' ? 'Rückegasse'
                 : 'Gewässer';

      const result = await createPath({
        forestId,
        type: activePathType,
        name,
        geoJson,
        lengthM,
        userId: currentUserId,
        orgSlug: editingData?.orgSlug ?? orgSlug,
      });

      if (result.success) {
        toast.success(`${name} gespeichert! (${formatLength(lengthM)})`);
        if (createdLayerRef.current) map.removeLayer(createdLayerRef.current);
        createdLayerRef.current = null;
        refreshData();
        if (result.pathId) setTimeout(() => selectFeature(result.pathId!, 'PATH'), 300);
      } else {
        toast.error('Fehler: ' + result.error);
      }
    } finally {
      setMode('VIEW');
      setEditingFeature(null);
      setShowSaveBar(false);
      setDrawnLengthM(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!createdLayerRef.current || !editingData) return;

    // @ts-ignore
    const newGeoJson  = createdLayerRef.current.toGeoJSON();
    const currentId   = editingData.id;
    const featureType = editingData.featureType ?? 'FOREST';
    const orgSlug     = editingData.orgSlug ?? orgSlugRef.current;

    try {
      if (featureType === 'PATH') {
        const newLengthM = calculatePathLengthM(newGeoJson);
        await updatePath(currentId, { geoJson: newGeoJson, lengthM: newLengthM, orgSlug });
        toast.success('Weg aktualisiert!');
        refreshData();
        setTimeout(() => selectFeature(currentId, 'PATH'), 100);
      } else if (featureType === 'PLANTING') {
        const areaHa = parseFloat((area(newGeoJson) / 10000).toFixed(4));
        await updatePlanting(currentId, { geoJson: newGeoJson, areaHa }, orgSlug);
        toast.success('Pflanzfläche aktualisiert!');
        refreshData();
        setTimeout(() => selectFeature(currentId, 'PLANTING'), 100);
      } else if (featureType === 'HUNTING') {
        const areaHa = parseFloat((area(newGeoJson) / 10000).toFixed(4));
        await updateHunting(currentId, { geoJson: newGeoJson, areaHa }, orgSlug);
        toast.success('Jagdfläche aktualisiert!');
        refreshData();
        setTimeout(() => selectFeature(currentId, 'HUNTING'), 100);
      } else if (featureType === 'CALAMITY') {
        const areaHa = parseFloat((area(newGeoJson) / 10000).toFixed(4));
        await updateCalamity(currentId, { geoJson: newGeoJson, areaHa }, orgSlug);
        toast.success('Kalamitätsfläche aktualisiert!');
        refreshData();
        setTimeout(() => selectFeature(currentId, 'CALAMITY'), 100);
      } else {
        const calculatedAreaHa = parseFloat((area(newGeoJson) / 10000).toFixed(4));
        await updateForest({
          id: currentId,
          keycloakId: currentUserId,
          name: editingData.name,
          geoJson: newGeoJson,
          areaHa: calculatedAreaHa,
          orgSlug,
        });
        toast.success('Grenzen aktualisiert!');
        refreshData();
        setTimeout(() => selectFeature(currentId, 'FOREST'), 100);
      }
    } catch (e) {
      toast.error('Fehler beim Update');
    } finally {
      setMode('VIEW');
      setEditingFeature(null);
    }
  };

  const handleCancelEdit = () => {
    const currentId = editingData?.id;
    const ft        = editingData?.featureType ?? 'FOREST';
    const reSelectTypeMap: Record<string, any> = {
      PATH: 'PATH', PLANTING: 'PLANTING', HUNTING: 'HUNTING', CALAMITY: 'CALAMITY',
    };
    const reSelectType = reSelectTypeMap[ft] ?? 'FOREST';
    setMode('VIEW');
    setEditingFeature(null);
    setShowSaveBar(false);
    setDrawnLengthM(null);
    if (createdLayerRef.current) {
      map.removeLayer(createdLayerRef.current);
      createdLayerRef.current = null;
    }
    if (currentId) {
      setTimeout(() => selectFeature(currentId, reSelectType), 100);
    }
  };


  // ─── SAVE BAR für DRAW_PATH ──────────────────────────────────────────────────
  if (mode === 'DRAW_PATH' && showSaveBar && drawnLengthM !== null) {
    return (
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[2000] flex flex-col items-center gap-2 animate-in fade-in slide-in-from-top-4">
        <div className="bg-[#1a1a1a]/95 border border-white/10 rounded-full px-4 py-1.5 text-xs text-gray-300">
          Länge: <span className="font-bold text-white">{formatLength(drawnLengthM)}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSaveDrawPath}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-full shadow-2xl font-bold flex items-center gap-2 transition-transform active:scale-95 border border-green-500"
          >
            <Save size={18} /> Weg speichern
          </button>
          <button
            onClick={handleCancelEdit}
            className="bg-white text-gray-700 hover:bg-gray-100 px-6 py-2.5 rounded-full shadow-2xl font-bold flex items-center gap-2 transition-transform active:scale-95"
          >
            <X size={18} /> Abbrechen
          </button>
        </div>
      </div>
    );
  }

  // ─── SAVE BAR für EDIT_GEOMETRY ──────────────────────────────────────────────
  if (mode === 'EDIT_GEOMETRY' && showSaveBar) {
    const isForestEdit = (editingData?.featureType ?? 'FOREST') === 'FOREST';
    const originalHa   = isForestEdit
      ? forests.find(f => f.id === editingData?.id)?.areaHa ?? 0
      : 0;
    const availableHa  = areaLimitHa != null
      ? areaLimitHa - (usedAreaHa - originalHa)
      : null;
    const areaExceeded = isForestEdit && availableHa != null && currentEditAreaHa != null
      && currentEditAreaHa > availableHa + AREA_TOLERANCE_HA;

    return (
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[2000] flex flex-col items-center gap-2 animate-in fade-in slide-in-from-top-4">
        {areaExceeded && currentEditAreaHa != null && availableHa != null && (
          <div className="flex items-center gap-2 bg-orange-500/90 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg backdrop-blur">
            <AlertTriangle size={14} />
            Polygon zu groß: {currentEditAreaHa.toFixed(1)} ha — max. {availableHa.toFixed(1)} ha verfügbar. Bitte verkleinern.
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={handleSaveEdit}
            disabled={areaExceeded}
            className="bg-green-600 hover:bg-green-700 disabled:bg-slate-500 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-full shadow-2xl font-bold flex items-center gap-2 transition-transform active:scale-95 border border-green-500 disabled:border-slate-400"
          >
            <Save size={18} /> Geometrie speichern
          </button>
          <button
            onClick={handleCancelEdit}
            className="bg-white text-gray-700 hover:bg-gray-100 px-6 py-2.5 rounded-full shadow-2xl font-bold flex items-center gap-2 transition-transform active:scale-95"
          >
            <X size={18} /> Abbrechen
          </button>
        </div>
      </div>
    );
  }

  if (pendingPolygon) {
    return (
      <ForestAssignDialog
        forests={forests}
        polygonType={pendingPolygon.mode}
        onConfirm={handlePolygonForestAssign}
        onCancel={() => { setPendingPolygon(null); setMode('VIEW'); setEditingFeature(null); }}
      />
    );
  }

  return null;
}
