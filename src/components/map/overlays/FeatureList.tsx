'use client';

import { useMemo, useState } from 'react';
import { useDebounce } from 'use-debounce';
import { Search, X, TreePine, Tent, Home, Ban, Boxes, Truck, Sprout, Wrench, AlertTriangle, Shield, Target, Route, Trees } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMapStore } from '@/components/map/stores/useMapStores';
import { getBoundsFromGeoJson } from '@/lib/map-helpers';
import type { FeatureType } from '@/components/map/stores/useMapStores';

// ---------------------------------------------------------------------------
// Typen
// ---------------------------------------------------------------------------

type FeatureCategory = 'ALL' | 'POI' | 'POLYGON' | 'PATH';

interface NormalizedFeature {
  id: string;
  forestId: string;
  forestName: string;
  label: string;
  subLabel?: string;
  category: FeatureCategory;
  featureType: FeatureType;
  icon: React.ElementType;
  color: string;
  lat?: number;
  lng?: number;
  geoJson?: any;
}

// ---------------------------------------------------------------------------
// Icon / Farb-Mapping
// ---------------------------------------------------------------------------

const POI_META: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  HUNTING_STAND: { icon: Tent,     color: '#eab308', label: 'Hochsitz'    },
  LOG_PILE:      { icon: Boxes,    color: '#3b82f6', label: 'Polter'      },
  HUT:           { icon: Home,     color: '#f97316', label: 'Hütte'       },
  BARRIER:       { icon: Ban,      color: '#ef4444', label: 'Schranke'    },
  VEHICLE:       { icon: Truck,    color: '#6b7280', label: 'Fahrzeug'    },
  TREE:          { icon: TreePine, color: '#22c55e', label: 'Einzelbaum'  },
};

const POLYGON_META: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  PLANTING:    { icon: Sprout,        color: '#22c55e', label: 'Aufforstung'    },
  MAINTENANCE: { icon: Wrench,        color: '#ef4444', label: 'Pflegemaßnahme' },
  CALAMITY:    { icon: AlertTriangle, color: '#f97316', label: 'Schadereignis'  },
  HABITAT:     { icon: Shield,        color: '#a855f7', label: 'Habitat'        },
  HUNTING:     { icon: Target,        color: '#84cc16', label: 'Jagdbezirk'     },
  FOREST:      { icon: Trees,         color: '#10b981', label: 'Wald'           },
};

const PATH_META: Record<string, { label: string }> = {
  ROAD:       { label: 'Weg / Straße'  },
  SKID_TRAIL: { label: 'Rückegasse'    },
  WATER:      { label: 'Gewässer'      },
};

const MAX_RESULTS = 150;

// ---------------------------------------------------------------------------
// Normalisierung aller Forest-Daten
// ---------------------------------------------------------------------------

function buildFeatureList(forests: any[]): NormalizedFeature[] {
  const list: NormalizedFeature[] = [];

  forests.forEach(forest => {
    const forestName = forest.name ?? 'Unbenannter Wald';

    // Waldgrenze selbst
    list.push({
      id: forest.id,
      forestId: forest.id,
      forestName,
      label: forestName,
      category: 'POLYGON',
      featureType: 'FOREST',
      icon: POLYGON_META.FOREST.icon,
      color: forest.color ?? '#10b981',
      geoJson: forest.geoJson,
    });

    // POIs
    (forest.pois ?? []).forEach((poi: any) => {
      const meta = POI_META[poi.type] ?? { icon: Tent, color: '#9ca3af', label: poi.type };
      list.push({
        id: poi.id,
        forestId: forest.id,
        forestName,
        label: poi.name ?? meta.label,
        subLabel: meta.label,
        category: 'POI',
        featureType: 'POI',
        icon: meta.icon,
        color: meta.color,
        lat: poi.lat,
        lng: poi.lng,
      });
    });

    // Pflanzungen
    (forest.plantings ?? []).forEach((p: any) => {
      list.push({
        id: p.id,
        forestId: forest.id,
        forestName,
        label: p.treeSpecies ?? 'Aufforstung',
        subLabel: POLYGON_META.PLANTING.label,
        category: 'POLYGON',
        featureType: 'PLANTING',
        icon: POLYGON_META.PLANTING.icon,
        color: POLYGON_META.PLANTING.color,
        geoJson: p.geoJson,
      });
    });

    // Pflegemaßnahmen
    (forest.maintenance ?? []).forEach((m: any) => {
      list.push({
        id: m.id,
        forestId: forest.id,
        forestName,
        label: m.description ?? 'Pflegemaßnahme',
        subLabel: POLYGON_META.MAINTENANCE.label,
        category: 'POLYGON',
        featureType: 'MAINTENANCE',
        icon: POLYGON_META.MAINTENANCE.icon,
        color: POLYGON_META.MAINTENANCE.color,
        geoJson: m.geoJson,
      });
    });

    // Kalamitäten
    (forest.calamities ?? []).forEach((c: any) => {
      list.push({
        id: c.id,
        forestId: forest.id,
        forestName,
        label: c.cause ?? 'Schadereignis',
        subLabel: POLYGON_META.CALAMITY.label,
        category: 'POLYGON',
        featureType: 'CALAMITY',
        icon: POLYGON_META.CALAMITY.icon,
        color: POLYGON_META.CALAMITY.color,
        geoJson: c.geoJson,
      });
    });

    // Habitate
    (forest.habitats ?? []).forEach((h: any) => {
      list.push({
        id: h.id,
        forestId: forest.id,
        forestName,
        label: h.type ?? 'Habitat',
        subLabel: POLYGON_META.HABITAT.label,
        category: 'POLYGON',
        featureType: 'HABITAT',
        icon: POLYGON_META.HABITAT.icon,
        color: POLYGON_META.HABITAT.color,
        geoJson: h.geoJson,
      });
    });

    // Jagdbezirke
    (forest.hunting ?? []).forEach((h: any) => {
      list.push({
        id: h.id,
        forestId: forest.id,
        forestName,
        label: h.name ?? 'Jagdbezirk',
        subLabel: POLYGON_META.HUNTING.label,
        category: 'POLYGON',
        featureType: 'HUNTING',
        icon: POLYGON_META.HUNTING.icon,
        color: POLYGON_META.HUNTING.color,
        geoJson: h.geoJson,
      });
    });

    // Wege
    (forest.paths ?? []).forEach((p: any) => {
      const pathLabel = PATH_META[p.type]?.label ?? p.type;
      list.push({
        id: p.id,
        forestId: forest.id,
        forestName,
        label: p.name ?? pathLabel,
        subLabel: pathLabel,
        category: 'PATH',
        featureType: 'PATH',
        icon: Route,
        color: p.type === 'WATER' ? '#3b82f6' : p.type === 'SKID_TRAIL' ? '#eab308' : '#94a3b8',
        geoJson: p.geoJson,
      });
    });
  });

  return list;
}

// ---------------------------------------------------------------------------
// Hauptkomponente
// ---------------------------------------------------------------------------

interface Props {
  forests: any[];
}

const CATEGORY_LABELS: Record<FeatureCategory, string> = {
  ALL:     'Alle',
  POI:     'Objekte',
  POLYGON: 'Flächen',
  PATH:    'Wege',
};

export function FeatureList({ forests }: Props) {
  const flyTo        = useMapStore(s => s.flyTo);
  const fitBounds    = useMapStore(s => s.fitBounds);
  const selectFeature = useMapStore(s => s.selectFeature);

  const [rawSearch, setRawSearch]     = useState('');
  const [category, setCategory]       = useState<FeatureCategory>('ALL');
  const [search]                      = useDebounce(rawSearch, 200);

  // Alle Features einmal aufbauen
  const allFeatures = useMemo(() => buildFeatureList(forests), [forests]);

  // Gefilterte + durchsuchte Liste
  const filtered = useMemo(() => {
    let list = allFeatures;

    if (category !== 'ALL') {
      list = list.filter(f => f.category === category);
    }

    if (search.trim().length > 0) {
      const q = search.toLowerCase();
      list = list.filter(f =>
        f.label.toLowerCase().includes(q) ||
        f.subLabel?.toLowerCase().includes(q) ||
        f.forestName.toLowerCase().includes(q)
      );
    }

    return list;
  }, [allFeatures, category, search]);

  const shown    = filtered.slice(0, MAX_RESULTS);
  const overflow = filtered.length - shown.length;

  const handleClick = (feature: NormalizedFeature) => {
    if (feature.lat !== undefined && feature.lng !== undefined) {
      flyTo([feature.lat, feature.lng], 19);
    } else if (feature.geoJson) {
      const bounds = getBoundsFromGeoJson(feature.geoJson);
      if (bounds) fitBounds(bounds);
    }
    selectFeature(feature.id, feature.featureType);
  };

  return (
    <div className="flex flex-col h-full min-w-[288px]">
      {/* Suche */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
          <input
            value={rawSearch}
            onChange={e => setRawSearch(e.target.value)}
            placeholder="Suchen…"
            className="w-full bg-white/6 border border-white/10 rounded-lg pl-8 pr-8 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:bg-white/8 transition-colors"
          />
          {rawSearch && (
            <button
              onClick={() => setRawSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Kategorie-Filter */}
      <div className="flex gap-1 px-3 pb-2 shrink-0 overflow-x-auto">
        {(Object.keys(CATEGORY_LABELS) as FeatureCategory[]).map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={cn(
              'text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap transition-all',
              category === cat
                ? 'bg-emerald-600 text-white'
                : 'bg-white/6 text-gray-400 hover:bg-white/10 hover:text-white',
            )}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Ergebnis-Zähler */}
      <div className="px-3 pb-1.5 shrink-0">
        <span className="text-[10px] text-gray-600">
          {filtered.length === 0
            ? 'Keine Ergebnisse'
            : overflow > 0
              ? `${shown.length} von ${filtered.length.toLocaleString('de-DE')} — Suche verfeinern`
              : `${filtered.length.toLocaleString('de-DE')} Objekte`
          }
        </span>
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
        {shown.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 text-gray-600 text-xs gap-1">
            <Search className="w-5 h-5 opacity-30" />
            Keine Objekte gefunden
          </div>
        ) : (
          shown.map(feature => (
            <FeatureRow key={feature.id} feature={feature} onClick={() => handleClick(feature)} />
          ))
        )}

        {overflow > 0 && (
          <div className="text-center py-3 text-[10px] text-gray-600 border border-dashed border-white/8 rounded-lg mt-1">
            + {overflow.toLocaleString('de-DE')} weitere — Suche verfeinern
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feature-Zeile
// ---------------------------------------------------------------------------

function FeatureRow({ feature, onClick }: { feature: NormalizedFeature; onClick: () => void }) {
  const Icon = feature.icon;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/6 text-left transition-colors group"
    >
      <div
        className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${feature.color}22`, border: `1px solid ${feature.color}44` }}
      >
        <Icon className="w-3 h-3" style={{ color: feature.color }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-200 group-hover:text-white truncate transition-colors leading-tight">
          {feature.label}
        </p>
        <p className="text-[10px] text-gray-600 truncate leading-tight">
          {feature.subLabel ? `${feature.subLabel} · ` : ''}{feature.forestName}
        </p>
      </div>
    </button>
  );
}
