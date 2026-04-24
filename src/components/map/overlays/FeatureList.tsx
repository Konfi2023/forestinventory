'use client';

import { useMemo, useState } from 'react';
import { useDebounce } from 'use-debounce';
import {
  Search, X, TreePine, Tent, Home, Ban, Boxes, Truck, Sprout,
  Wrench, AlertTriangle, Shield, Target, Route, Trees,
  CheckSquare, Square, Trash2, Undo2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMapStore } from '@/components/map/stores/useMapStores';
import { getBoundsFromGeoJson } from '@/lib/map-helpers';
import type { FeatureType } from '@/components/map/stores/useMapStores';
import { batchDeleteForests } from '@/actions/forest';
import { toast } from 'sonner';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { useTranslations } from 'next-intl';

// ---------------------------------------------------------------------------
// Typen
// ---------------------------------------------------------------------------

type FeatureCategory = 'ALL' | 'FOREST' | 'POLYGON' | 'POI' | 'PATH';

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
  importSource?: string; // z.B. "demo.gpkg"
}

// ---------------------------------------------------------------------------
// Icon / Farb-Mapping
// ---------------------------------------------------------------------------

const POI_META: Record<string, { icon: React.ElementType; color: string; tKey: string }> = {
  HUNTING_STAND: { icon: Tent,     color: '#eab308', tKey: 'poiHuntingStand' },
  LOG_PILE:      { icon: Boxes,    color: '#3b82f6', tKey: 'poiLogPile'      },
  HUT:           { icon: Home,     color: '#f97316', tKey: 'poiHut'          },
  BARRIER:       { icon: Ban,      color: '#ef4444', tKey: 'poiBarrier'      },
  VEHICLE:       { icon: Truck,    color: '#6b7280', tKey: 'poiVehicle'      },
  TREE:          { icon: TreePine, color: '#22c55e', tKey: 'poiTree'         },
};

const POLYGON_META: Record<string, { icon: React.ElementType; color: string; tKey: string }> = {
  PLANTING:    { icon: Sprout,        color: '#22c55e', tKey: 'polyPlanting'    },
  MAINTENANCE: { icon: Wrench,        color: '#ef4444', tKey: 'polyMaintenance' },
  CALAMITY:    { icon: AlertTriangle, color: '#f97316', tKey: 'polyCalamity'    },
  HABITAT:     { icon: Shield,        color: '#a855f7', tKey: 'polyHabitat'     },
  HUNTING:     { icon: Target,        color: '#84cc16', tKey: 'polyHunting'     },
  FOREST:      { icon: Trees,         color: '#10b981', tKey: 'polyForest'      },
};

const PATH_META: Record<string, { tKey: string }> = {
  ROAD:       { tKey: 'pathRoad'     },
  SKID_TRAIL: { tKey: 'pathSkidTrail' },
  WATER:      { tKey: 'pathWater'    },
  PATH:       { tKey: 'pathPath'     },
};

const MAX_RESULTS = 150;

// ---------------------------------------------------------------------------
// Normalisierung aller Forest-Daten
// ---------------------------------------------------------------------------

function buildFeatureList(forests: any[], t: (key: string) => string): NormalizedFeature[] {
  const list: NormalizedFeature[] = [];

  forests.forEach(forest => {
    const forestName = forest.name ?? t('unnamedForest');
    // Import-Quelle aus description extrahieren: "Importiert aus xyz.gpkg"
    const importMatch = (forest.description ?? '').match(/^Importiert aus (.+)$/);
    const importSource = importMatch ? importMatch[1] : undefined;

    list.push({
      id: forest.id,
      forestId: forest.id,
      forestName,
      label: forestName,
      category: 'FOREST',
      featureType: 'FOREST',
      icon: POLYGON_META.FOREST.icon,
      color: forest.color ?? '#10b981',
      geoJson: forest.geoJson,
      importSource,
    });

    (forest.pois ?? []).forEach((poi: any) => {
      const meta = POI_META[poi.type] ?? { icon: Tent, color: '#9ca3af', tKey: '' };
      const metaLabel = meta.tKey ? t(meta.tKey) : poi.type;
      list.push({
        id: poi.id, forestId: forest.id, forestName,
        label: poi.name ?? metaLabel, subLabel: metaLabel,
        category: 'POI', featureType: 'POI',
        icon: meta.icon, color: meta.color,
        lat: poi.lat, lng: poi.lng,
      });
    });

    (forest.plantings ?? []).forEach((p: any) => {
      list.push({
        id: p.id, forestId: forest.id, forestName,
        label: p.treeSpecies ?? t('polyPlanting'), subLabel: t(POLYGON_META.PLANTING.tKey),
        category: 'POLYGON', featureType: 'PLANTING',
        icon: POLYGON_META.PLANTING.icon, color: POLYGON_META.PLANTING.color, geoJson: p.geoJson,
      });
    });

    (forest.maintenance ?? []).forEach((m: any) => {
      list.push({
        id: m.id, forestId: forest.id, forestName,
        label: m.description ?? t('polyMaintenance'), subLabel: t(POLYGON_META.MAINTENANCE.tKey),
        category: 'POLYGON', featureType: 'MAINTENANCE',
        icon: POLYGON_META.MAINTENANCE.icon, color: POLYGON_META.MAINTENANCE.color, geoJson: m.geoJson,
      });
    });

    (forest.calamities ?? []).forEach((c: any) => {
      list.push({
        id: c.id, forestId: forest.id, forestName,
        label: c.cause ?? t('polyCalamity'), subLabel: t(POLYGON_META.CALAMITY.tKey),
        category: 'POLYGON', featureType: 'CALAMITY',
        icon: POLYGON_META.CALAMITY.icon, color: POLYGON_META.CALAMITY.color, geoJson: c.geoJson,
      });
    });

    (forest.habitats ?? []).forEach((h: any) => {
      list.push({
        id: h.id, forestId: forest.id, forestName,
        label: h.type ?? t('polyHabitat'), subLabel: t(POLYGON_META.HABITAT.tKey),
        category: 'POLYGON', featureType: 'HABITAT',
        icon: POLYGON_META.HABITAT.icon, color: POLYGON_META.HABITAT.color, geoJson: h.geoJson,
      });
    });

    (forest.hunting ?? []).forEach((h: any) => {
      list.push({
        id: h.id, forestId: forest.id, forestName,
        label: h.name ?? t('polyHunting'), subLabel: t(POLYGON_META.HUNTING.tKey),
        category: 'POLYGON', featureType: 'HUNTING',
        icon: POLYGON_META.HUNTING.icon, color: POLYGON_META.HUNTING.color, geoJson: h.geoJson,
      });
    });

    (forest.paths ?? []).forEach((p: any) => {
      const pathLabel = PATH_META[p.type] ? t(PATH_META[p.type].tKey) : p.type;
      list.push({
        id: p.id, forestId: forest.id, forestName,
        label: p.name ?? pathLabel, subLabel: pathLabel,
        category: 'PATH', featureType: 'PATH',
        icon: Route,
        color: p.type === 'WATER' ? '#3b82f6' : p.type === 'SKID_TRAIL' ? '#eab308' : p.type === 'PATH' ? '#a16207' : '#94a3b8',
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
  orgSlug?: string;
  onRefresh?: () => void;
}

const CATEGORY_KEYS: Record<FeatureCategory, string> = {
  ALL:     'catAll',
  FOREST:  'catForests',
  POLYGON: 'catPolygons',
  POI:     'catPois',
  PATH:    'catPaths',
};

export function FeatureList({ forests, orgSlug = '', onRefresh }: Props) {
  const t = useTranslations('Map');
  const flyTo         = useMapStore(s => s.flyTo);
  const fitBounds     = useMapStore(s => s.fitBounds);
  const selectFeature = useMapStore(s => s.selectFeature);

  const [rawSearch, setRawSearch] = useState('');
  const [category, setCategory]   = useState<FeatureCategory>('ALL');
  const [search]                  = useDebounce(rawSearch, 200);

  // Batch-Select (nur für Wälder)
  const [selectMode, setSelectMode]   = useState(false);
  const [selected, setSelected]       = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting]   = useState(false);
  const [importsOpen, setImportsOpen] = useState(false);

  const allFeatures = useMemo(() => buildFeatureList(forests, t), [forests, t]);

  const filtered = useMemo(() => {
    let list = allFeatures;
    if (category !== 'ALL') list = list.filter(f => f.category === category);
    if (search.trim()) {
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

  // Wälder in der aktuellen Ansicht (für Select-All)
  const visibleForestIds = useMemo(
    () => shown.filter(f => f.category === 'FOREST').map(f => f.id),
    [shown]
  );

  // Import-Gruppen: Wälder nach importSource gruppieren
  const importGroups = useMemo(() => {
    const groups: Record<string, NormalizedFeature[]> = {};
    allFeatures.forEach(f => {
      if (f.category === 'FOREST' && f.importSource) {
        if (!groups[f.importSource]) groups[f.importSource] = [];
        groups[f.importSource].push(f);
      }
    });
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [allFeatures]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (visibleForestIds.every(id => selected.has(id))) {
      setSelected(prev => {
        const next = new Set(prev);
        visibleForestIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelected(prev => {
        const next = new Set(prev);
        visibleForestIds.forEach(id => next.add(id));
        return next;
      });
    }
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const handleBatchDelete = async (ids: string[], label: string) => {
    setIsDeleting(true);
    const toastId = toast.loading(t('deletingAreas', { count: ids.length }));
    try {
      const res = await batchDeleteForests(ids, orgSlug);
      toast.dismiss(toastId);
      if (res.success) {
        toast.success(t('areasDeleted', { count: res.deleted ?? 0 }));
        exitSelectMode();
        onRefresh?.();
      } else {
        toast.error(`${t('errorSaving')}: ${res.error}`);
      }
    } catch (e: any) {
      toast.dismiss(toastId);
      toast.error(`${t('errorSaving')}: ${e.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClick = (feature: NormalizedFeature) => {
    if (selectMode && feature.category === 'FOREST') {
      toggleSelect(feature.id);
      return;
    }
    if (feature.lat !== undefined && feature.lng !== undefined) {
      flyTo([feature.lat, feature.lng], 19);
    } else if (feature.geoJson) {
      const bounds = getBoundsFromGeoJson(feature.geoJson);
      if (bounds) fitBounds(bounds);
    }
    selectFeature(feature.id, feature.featureType);
  };

  const allVisibleSelected = visibleForestIds.length > 0 &&
    visibleForestIds.every(id => selected.has(id));

  return (
    <div className="flex flex-col h-full min-w-[288px]">

      {/* Suche */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
          <input
            value={rawSearch}
            onChange={e => setRawSearch(e.target.value)}
            placeholder={t('search')}
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
        {(Object.keys(CATEGORY_KEYS) as FeatureCategory[]).map(cat => (
          <button
            key={cat}
            onClick={() => { setCategory(cat); if (cat !== 'FOREST') exitSelectMode(); }}
            className={cn(
              'text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap transition-all',
              category === cat
                ? 'bg-emerald-600 text-white'
                : 'bg-white/6 text-gray-400 hover:bg-white/10 hover:text-white',
            )}
          >
            {t(CATEGORY_KEYS[cat])}
          </button>
        ))}
      </div>

      {/* ── Import-Rückgängig-Banner (nur wenn Importe existieren) ── */}
      {importGroups.length > 0 && (category === 'ALL' || category === 'FOREST') && (
        <div className="mx-3 mb-2 rounded-lg border border-amber-500/30 bg-amber-500/10 shrink-0">
          <button
            onClick={() => setImportsOpen(o => !o)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs text-amber-300 font-semibold"
          >
            <span className="flex items-center gap-1.5">
              <Undo2 size={12} />
              {t('undoImports', { count: importGroups.length })}
            </span>
            {importsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {importsOpen && (
            <div className="px-3 pb-2 space-y-1.5">
              {importGroups.map(([source, features]) => (
                <div key={source} className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-gray-300 truncate flex-1" title={source}>
                    {source}
                    <span className="text-gray-500 ml-1">({t('importAreas', { count: features.length })})</span>
                  </span>
                  <DeleteConfirmDialog
                    trigger={
                      <button
                        className="shrink-0 text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                        disabled={isDeleting}
                      >
                        {t('delete')}
                      </button>
                    }
                    title={t('deleteImportTitle', { source })}
                    description={t('deleteImportDesc', { count: features.length })}
                    confirmString={source}
                    onConfirm={async () => {
                      await handleBatchDelete(features.map(f => f.id), source);
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Auswahl-Toolbar (nur FOREST) ── */}
      {(category === 'FOREST' || category === 'ALL') && (
        <div className="px-3 pb-2 shrink-0 flex items-center gap-2">
          {!selectMode ? (
            <button
              onClick={() => setSelectMode(true)}
              className="text-[10px] text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors"
            >
              <CheckSquare size={11} /> {t('selectMultiple')}
            </button>
          ) : (
            <>
              <button
                onClick={toggleSelectAll}
                className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                {allVisibleSelected
                  ? <><CheckSquare size={11} /> {t('deselectAll')}</>
                  : <><Square size={11} /> {t('selectAll')}</>
                }
              </button>
              <span className="flex-1" />
              <button
                onClick={exitSelectMode}
                className="text-[10px] text-gray-500 hover:text-gray-300"
              >
                {t('cancel')}
              </button>
            </>
          )}
        </div>
      )}

      {/* Ergebnis-Zähler */}
      <div className="px-3 pb-1.5 shrink-0">
        <span className="text-[10px] text-gray-600">
          {filtered.length === 0
            ? t('noResults')
            : overflow > 0
              ? t('refineSearch', { shown: shown.length, total: filtered.length.toLocaleString() })
              : t('objectCount', { count: filtered.length })
          }
        </span>
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
        {shown.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 text-gray-600 text-xs gap-1">
            <Search className="w-5 h-5 opacity-30" />
            {t('noObjectsFound')}
          </div>
        ) : (
          shown.map(feature => (
            <FeatureRow
              key={feature.id}
              feature={feature}
              onClick={() => handleClick(feature)}
              selectMode={selectMode && feature.category === 'FOREST'}
              selected={selected.has(feature.id)}
            />
          ))
        )}
        {overflow > 0 && (
          <div className="text-center py-3 text-[10px] text-gray-600 border border-dashed border-white/8 rounded-lg mt-1">
            {t('moreRefine', { count: overflow })}
          </div>
        )}
      </div>

      {/* ── Batch-Delete-Bar ── */}
      {selectMode && selected.size > 0 && (
        <div className="shrink-0 border-t border-white/10 px-3 py-2 bg-black/40 flex items-center justify-between gap-2">
          <span className="text-xs text-gray-300">
            {t('areasSelected', { count: selected.size })}
          </span>
          <DeleteConfirmDialog
            trigger={
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                disabled={isDeleting}
              >
                <Trash2 size={12} /> {t('delete')}
              </button>
            }
            title={t('deleteAreasTitle', { count: selected.size })}
            description={t('deleteAreasDesc')}
            confirmString={t('delete').toLowerCase()}
            onConfirm={async () => {
              await handleBatchDelete([...selected], t('importAreas', { count: selected.size }));
            }}
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feature-Zeile
// ---------------------------------------------------------------------------

function FeatureRow({
  feature, onClick, selectMode, selected,
}: {
  feature: NormalizedFeature;
  onClick: () => void;
  selectMode: boolean;
  selected: boolean;
}) {
  const Icon = feature.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/6 text-left transition-colors group',
        selected && 'bg-emerald-900/30 border border-emerald-500/30',
      )}
    >
      {selectMode ? (
        <div className="w-6 h-6 flex items-center justify-center shrink-0">
          {selected
            ? <CheckSquare className="w-4 h-4 text-emerald-400" />
            : <Square className="w-4 h-4 text-gray-600 group-hover:text-gray-400" />
          }
        </div>
      ) : (
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${feature.color}22`, border: `1px solid ${feature.color}44` }}
        >
          <Icon className="w-3 h-3" style={{ color: feature.color }} />
        </div>
      )}
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
