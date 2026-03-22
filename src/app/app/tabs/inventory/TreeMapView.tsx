'use client';

import { useEffect, useRef, useState } from 'react';
import { RefreshCw, TreePine, ChevronDown } from 'lucide-react';
import { db } from '@/lib/inventory-db';
import { TREE_SPECIES } from '@/lib/tree-species';
import 'leaflet/dist/leaflet.css';

interface Forest { id: string; name: string; }

interface TreeMarker {
  id: string;
  lat: number;
  lng: number;
  species: string | null;
  diameter: number | null;
  height: number | null;
  synced: boolean;
  forestName: string;
}

interface Props {
  orgSlug: string;
  forests: Forest[];
}

export function TreeMapView({ orgSlug, forests }: Props) {
  const mapRef       = useRef<HTMLDivElement>(null);
  const leafletRef   = useRef<any>(null);   // Leaflet instance
  const mapInstance  = useRef<any>(null);   // L.Map instance
  const [loading, setLoading]     = useState(false);
  const [selected, setSelected]   = useState<TreeMarker | null>(null);
  const [forestId, setForestId]   = useState<string>(forests[0]?.id ?? '');
  const [treeCount, setTreeCount] = useState(0);
  const [offlineCount, setOfflineCount] = useState(0);

  // ── Karte einmalig initialisieren ────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;

    let destroyed = false;
    import('leaflet').then(mod => {
      if (destroyed || mapInstance.current) return;
      const L = mod.default;
      leafletRef.current = L;

      const map = L.map(mapRef.current!, {
        center: [51.16, 10.45],
        zoom: 6,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 20,
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);
      mapInstance.current = map;
    });

    return () => {
      destroyed = true;
      mapInstance.current?.remove();
      mapInstance.current = null;
      leafletRef.current  = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Daten laden + Karte aktualisieren ────────────────────────────────────
  async function loadTrees(fId: string) {
    if (!mapInstance.current || !leafletRef.current) return;
    const L   = leafletRef.current;
    const map = mapInstance.current;

    setLoading(true);
    setSelected(null);

    // Alte Tree-Marker entfernen
    map.eachLayer((layer: any) => {
      if (layer._treeMarker) map.removeLayer(layer);
    });

    try {
      // 1. Forest-Polygon laden und Karte zentrieren
      const fRes = await fetch(`/api/app/inventory/forest?forestId=${fId}`);
      if (fRes.ok) {
        const { forest } = await fRes.json();
        if (forest.geoJson) {
          const geoLayer = L.geoJSON(forest.geoJson, {
            style: { color: forest.color ?? '#10b981', weight: 2, fillOpacity: 0.08 },
          });
          // Nur zum Bounds-Berechnen, nicht dauerhaft auf Karte
          const bounds = geoLayer.getBounds();
          if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] });
        }
      }

      // 2. Bäume aus DB + Dexie laden
      const [apiRes, pending] = await Promise.all([
        fetch(`/api/app/inventory/trees?orgSlug=${orgSlug}`).then(r => r.ok ? r.json() : { trees: [] }),
        db.pendingTrees.where('synced').equals(0).toArray(),
      ]);

      const pendingMarkers: TreeMarker[] = pending
        .filter(p => p.forestId === fId)
        .map(p => ({
          id: String(p.id), lat: p.lat, lng: p.lng,
          species: p.species, diameter: p.diameter, height: p.height ?? null,
          synced: false, forestName: p.forestName,
        }));

      const apiMarkers: TreeMarker[] = (apiRes.trees ?? [])
        .filter((t: any) => t.forestId === fId)
        .map((t: any) => ({
          id: t.id, lat: t.lat, lng: t.lng,
          species: t.species, diameter: t.diameter, height: t.height,
          synced: true, forestName: t.forestName,
        }));

      const trees: TreeMarker[] = [...pendingMarkers, ...apiMarkers];
      setTreeCount(trees.length);
      setOfflineCount(pendingMarkers.length);

      // 3. Marker setzen
      const setSelectedRef = (t: TreeMarker) => setSelected(t);
      trees.forEach(tree => {
        const species    = TREE_SPECIES.find(s => s.id === tree.species);
        const color      = species?.color ?? '#64748b';
        const border     = tree.synced ? color : '#f59e0b';

        const icon = L.divIcon({
          className: '',
          html: `<div style="
            width:20px;height:20px;border-radius:50%;
            background:${color};border:3px solid ${border};
            box-shadow:0 1px 5px rgba(0,0,0,0.55);
          "></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        const marker: any = L.marker([tree.lat, tree.lng], { icon });
        marker._treeMarker = true;
        marker.on('click', () => setSelectedRef(tree));
        marker.addTo(map);
      });
    } catch (e) {
      console.error(e);
    }

    setLoading(false);
  }

  // Wenn Forest wechselt → neu laden (nachdem Karte bereit ist)
  useEffect(() => {
    if (!forestId) return;
    // Karte evtl. noch nicht initialisiert → kurz warten
    const timer = setTimeout(() => loadTrees(forestId), 100);
    return () => clearTimeout(timer);
  }, [forestId]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentForest = forests.find(f => f.id === forestId);

  return (
    <div className="flex flex-col h-full">
      {/* Forest-Selektor */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-3 py-2 flex items-center gap-2">
        <TreePine size={15} className="text-emerald-600 shrink-0" />
        <div className="relative flex-1">
          <select
            value={forestId}
            onChange={e => setForestId(e.target.value)}
            className="w-full appearance-none bg-slate-50 text-sm text-slate-800 rounded-lg px-3 py-1.5 pr-7 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {forests.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        <button
          onClick={() => loadTrees(forestId)}
          disabled={loading}
          className="shrink-0 text-slate-400 hover:text-slate-700 disabled:opacity-40"
          title="Aktualisieren"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Karte */}
      <div className="relative flex-1">
        <div ref={mapRef} className="h-full w-full" />

        {/* Lade-Overlay */}
        {loading && (
          <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/60 pointer-events-none">
            <RefreshCw size={22} className="animate-spin text-slate-500" />
          </div>
        )}

        {/* Zähler */}
        {!loading && (
          <div className="absolute top-2 left-2 z-[1000] bg-white/90 backdrop-blur border border-slate-200 px-2.5 py-1 rounded-lg text-xs text-slate-600 flex items-center gap-1.5">
            <TreePine size={12} className="text-emerald-600" />
            {treeCount} Bäume
            {offlineCount > 0 && <span className="text-amber-500">· {offlineCount} offline</span>}
          </div>
        )}

        {/* Leer-Hinweis */}
        {!loading && treeCount === 0 && (
          <div className="absolute inset-0 z-[999] flex flex-col items-center justify-center gap-2 text-slate-500 pointer-events-none">
            <TreePine size={32} />
            <p className="text-sm">Noch keine Bäume in diesem Wald.</p>
          </div>
        )}

        {/* Detail-Popup */}
        {selected && (
          <div className="absolute bottom-4 left-3 right-3 z-[1000] bg-white border border-slate-200 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: TREE_SPECIES.find(s => s.id === selected.species)?.color ?? '#64748b' }}
                />
                <span className="font-semibold text-sm text-slate-900">
                  {TREE_SPECIES.find(s => s.id === selected.species)?.label ?? selected.species ?? 'Unbekannte Baumart'}
                </span>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-800 text-xl leading-none">×</button>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
              {selected.diameter && <span>Ø {selected.diameter} cm</span>}
              {selected.height   && <span>↕ {selected.height} m</span>}
              <span className="font-mono">{selected.lat.toFixed(5)}, {selected.lng.toFixed(5)}</span>
              {!selected.synced  && <span className="text-amber-500">Offline – nicht sync.</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
