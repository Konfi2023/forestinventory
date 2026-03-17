'use client';

import { useMapStore, PoiType, PathType } from '../stores/useMapStores';
import {
  MousePointer2,
  Trees,
  Plus,
  Tent,
  Ban,
  Home,
  Boxes,
  Truck,
  TreePine,
  Route,
  Waves,
  Ruler,
  SquareDashed,
  Printer,
  Sprout,
  Crosshair,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MapImporter } from '../importer/MapImporter';
import { useState } from 'react';

interface Props {
    canCreate: boolean;
    orgSlug: string;
    currentUserId: string;
    onRefresh: () => void;
}

export function MapToolbar({ canCreate, orgSlug, currentUserId, onRefresh }: Props) {
  const mode              = useMapStore(s => s.interactionMode);
  const setMode           = useMapStore(s => s.setInteractionMode);
  const activePoi         = useMapStore(s => s.activePoiType);
  const setPoi            = useMapStore(s => s.setActivePoiType);
  const activePathType    = useMapStore(s => s.activePathType);
  const setPathType       = useMapStore(s => s.setActivePathType);
  const selectedType      = useMapStore(s => s.selectedFeatureType);
  const lastForestId      = useMapStore(s => s.lastForestId);
  const setEditingFeature = useMapStore(s => s.setEditingFeature);

  const [showPoiMenu,     setShowPoiMenu]     = useState(false);
  const [showPathMenu,    setShowPathMenu]    = useState(false);
  const [showPolygonMenu, setShowPolygonMenu] = useState(false);

  const poiTools = [
      { id: 'HUNTING_STAND', icon: Tent,     label: 'Hochsitz',   color: 'text-yellow-500' },
      { id: 'LOG_PILE',      icon: Boxes,    label: 'Polter',     color: 'text-blue-500'   },
      { id: 'HUT',           icon: Home,     label: 'Hütte',      color: 'text-orange-500' },
      { id: 'BARRIER',       icon: Ban,      label: 'Schranke',   color: 'text-red-500'    },
      { id: 'VEHICLE',       icon: Truck,    label: 'Fahrzeug',   color: 'text-gray-400'   },
      { id: 'TREE',          icon: TreePine, label: 'Einzelbaum', color: 'text-green-500'  },
  ] as const;

  const pathTools = [
      { id: 'ROAD',       icon: Route,  label: 'LKW-Weg',    color: 'text-gray-400'   },
      { id: 'SKID_TRAIL', icon: Route,  label: 'Rückegasse', color: 'text-yellow-400' },
      { id: 'WATER',      icon: Waves,  label: 'Gewässer',   color: 'text-blue-400'   },
  ] as const;

  const handlePrintMap = () => {
    const styleEl = document.createElement('style');
    styleEl.id = 'print-map-style';
    styleEl.textContent = `
      @media print {
        body * { visibility: hidden !important; }
        .leaflet-container, .leaflet-container * { visibility: visible !important; }
        .leaflet-container {
          position: fixed !important;
          left: 0 !important; top: 0 !important;
          width: 100vw !important; height: 100vh !important;
          z-index: 9999 !important;
        }
      }
    `;
    document.head.appendChild(styleEl);
    window.print();
    setTimeout(() => document.getElementById('print-map-style')?.remove(), 1500);
  };

  const handlePoiSelect = (type: PoiType) => {
      setMode('DRAW_POI');
      setPoi(type);
      setShowPoiMenu(false);
  };

  const handlePathSelect = (type: PathType) => {
      setEditingFeature({ forestId: lastForestId });
      setMode('DRAW_PATH');
      setPathType(type);
      setShowPathMenu(false);
  };

  const handlePolygonSelect = (drawMode: 'DRAW_PLANTING' | 'DRAW_HUNTING' | 'DRAW_CALAMITY') => {
      setEditingFeature({ forestId: lastForestId, orgSlug });
      setMode(drawMode);
      setShowPolygonMenu(false);
  };

  return (
    <div className="no-print absolute top-6 left-6 z-[400] flex flex-col gap-2 font-sans">
      
      {/* --- 1. DAS HAUPT-DOCK (Vertikale Leiste) --- */}
      <div className="bg-[#151515]/95 backdrop-blur-md border border-white/10 rounded-xl p-1.5 shadow-2xl flex flex-col gap-1 w-12 items-center">
        
        {/* TOOL: AUSWÄHLEN (Standard) */}
        <button
            onClick={() => { setMode('VIEW'); setPoi(null); setShowPoiMenu(false); }}
            className={cn(
              "p-2.5 rounded-lg transition-all duration-200 group relative",
              (mode === 'VIEW' || mode === 'EDIT_GEOMETRY') 
                ? "bg-[#10b981] text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]" 
                : "text-gray-400 hover:text-white hover:bg-white/10"
            )}
        >
            <MousePointer2 size={20} />
             
             {/* Tooltip (fährt nach rechts aus) */}
             <span className="absolute left-full ml-3 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap border border-white/10 z-50 transition-opacity">
                Auswählen
            </span>
        </button>

        {canCreate && (
        <>
            {/* TOOL: WALD ZEICHNEN */}
            <button
                onClick={() => { setMode('DRAW_FOREST'); setPoi(null); setShowPoiMenu(false); }}
                className={cn(
                "p-2.5 rounded-lg transition-all duration-200 group relative",
                mode === 'DRAW_FOREST' 
                    ? "bg-[#10b981] text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]" 
                    : "text-gray-400 hover:text-white hover:bg-white/10"
                )}
            >
                <Trees size={20} />
                <span className="absolute left-full ml-3 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap border border-white/10 z-50 transition-opacity">
                    Wald einzeichnen
                </span>
            </button>

            {/* TRIGGER: POI MENÜ (Plus Button) */}
            <button
                onClick={() => { setShowPoiMenu(!showPoiMenu); setShowPathMenu(false); }}
                className={cn(
                "p-2.5 rounded-lg transition-all duration-200 group relative",
                mode === 'DRAW_POI' || showPoiMenu
                    ? "bg-white/10 text-white border border-white/20"
                    : "text-gray-400 hover:text-white hover:bg-white/10"
                )}
            >
                <Plus size={20} className={showPoiMenu ? "rotate-45 transition-transform duration-200" : "transition-transform duration-200"} />

                {!showPoiMenu && (
                    <span className="absolute left-full ml-3 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap border border-white/10 z-50 transition-opacity">
                        Objekt hinzufügen
                    </span>
                )}
            </button>

            {/* TRIGGER: WEG MENÜ */}
            <button
                onClick={() => { setShowPathMenu(!showPathMenu); setShowPoiMenu(false); setShowPolygonMenu(false); }}
                className={cn(
                "p-2.5 rounded-lg transition-all duration-200 group relative",
                mode === 'DRAW_PATH' || showPathMenu
                    ? "bg-white/10 text-white border border-white/20"
                    : "text-gray-400 hover:text-white hover:bg-white/10"
                )}
            >
                <Route size={20} />
                {!showPathMenu && (
                    <span className="absolute left-full ml-3 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap border border-white/10 z-50 transition-opacity">
                        Weg einzeichnen
                    </span>
                )}
            </button>

            {/* TRIGGER: FLÄCHEN MENÜ */}
            <button
                onClick={() => { setShowPolygonMenu(!showPolygonMenu); setShowPoiMenu(false); setShowPathMenu(false); }}
                className={cn(
                "p-2.5 rounded-lg transition-all duration-200 group relative",
                (mode === 'DRAW_PLANTING' || mode === 'DRAW_HUNTING' || mode === 'DRAW_CALAMITY') || showPolygonMenu
                    ? "bg-white/10 text-white border border-white/20"
                    : "text-gray-400 hover:text-white hover:bg-white/10"
                )}
            >
                <Layers size={20} />
                {!showPolygonMenu && (
                    <span className="absolute left-full ml-3 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap border border-white/10 z-50 transition-opacity">
                        Fläche einzeichnen
                    </span>
                )}
            </button>
        </>
        )}

        {/* Separator */}
        <div className="h-px bg-white/10 w-full my-1" />

        {/* TOOL: IMPORT (KML) */}
        {canCreate && (
            <div className="flex justify-center w-full">
                 <MapImporter
                    orgSlug={orgSlug}
                    keycloakId={currentUserId}
                    onImportComplete={onRefresh}
                 />
            </div>
        )}

        {/* Separator */}
        <div className="h-px bg-white/10 w-full my-1" />

        {/* TOOL: LINEAL */}
        <button
            onClick={() => mode === 'MEASURE_DISTANCE' ? setMode('VIEW') : setMode('MEASURE_DISTANCE')}
            className={cn(
              "p-2.5 rounded-lg transition-all duration-200 group relative",
              mode === 'MEASURE_DISTANCE'
                ? "bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                : "text-gray-400 hover:text-white hover:bg-white/10"
            )}
        >
            <Ruler size={20} />
            <span className="absolute left-full ml-3 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap border border-white/10 z-50 transition-opacity">
                Strecke messen
            </span>
        </button>

        {/* TOOL: FLÄCHE MESSEN */}
        <button
            onClick={() => mode === 'MEASURE_AREA' ? setMode('VIEW') : setMode('MEASURE_AREA')}
            className={cn(
              "p-2.5 rounded-lg transition-all duration-200 group relative",
              mode === 'MEASURE_AREA'
                ? "bg-violet-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]"
                : "text-gray-400 hover:text-white hover:bg-white/10"
            )}
        >
            <SquareDashed size={20} />
            <span className="absolute left-full ml-3 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap border border-white/10 z-50 transition-opacity">
                Fläche messen
            </span>
        </button>

        {/* TOOL: PDF EXPORT */}
        <button
            onClick={handlePrintMap}
            className="p-2.5 rounded-lg transition-all duration-200 group relative text-gray-400 hover:text-white hover:bg-white/10"
        >
            <Printer size={20} />
            <span className="absolute left-full ml-3 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap border border-white/10 z-50 transition-opacity">
                Karte drucken / PDF
            </span>
        </button>

      </div>

      {/* --- 2. DAS AUSGEKLAPPTE POI-MENÜ --- */}
      {showPoiMenu && (
          <div className="absolute left-14 top-24 bg-[#151515]/95 backdrop-blur-md border border-white/10 rounded-xl p-1.5 shadow-2xl flex flex-col gap-1 animate-in fade-in slide-in-from-left-2 z-[400] min-w-[140px]">
              {poiTools.map(tool => (
                  <button
                    key={tool.id}
                    onClick={() => handlePoiSelect(tool.id as PoiType)}
                    className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-xs font-bold uppercase tracking-wider group w-full text-left",
                        activePoi === tool.id
                            ? "bg-white/10 text-white"
                            : "hover:bg-white/10 text-gray-400 hover:text-white"
                    )}
                  >
                      <tool.icon size={16} className={tool.color} />
                      {tool.label}
                  </button>
              ))}
          </div>
      )}

      {/* --- 2b. DAS AUSGEKLAPPTE WEG-MENÜ --- */}
      {showPathMenu && (
          <div className="absolute left-14 top-36 bg-[#151515]/95 backdrop-blur-md border border-white/10 rounded-xl p-1.5 shadow-2xl flex flex-col gap-1 animate-in fade-in slide-in-from-left-2 z-[400] min-w-[140px]">
              {pathTools.map(tool => (
                  <button
                    key={tool.id}
                    onClick={() => handlePathSelect(tool.id as PathType)}
                    className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-xs font-bold uppercase tracking-wider w-full text-left",
                        activePathType === tool.id
                            ? "bg-white/10 text-white"
                            : "hover:bg-white/10 text-gray-400 hover:text-white"
                    )}
                  >
                      <tool.icon size={16} className={tool.color} />
                      {tool.label}
                  </button>
              ))}
          </div>
      )}

      {/* --- 2c. DAS AUSGEKLAPPTE FLÄCHEN-MENÜ --- */}
      {showPolygonMenu && (
          <div className="absolute left-14 top-48 bg-[#151515]/95 backdrop-blur-md border border-white/10 rounded-xl p-1.5 shadow-2xl flex flex-col gap-1 animate-in fade-in slide-in-from-left-2 z-[400] min-w-[155px]">
              <button
                onClick={() => handlePolygonSelect('DRAW_PLANTING')}
                className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-xs font-bold uppercase tracking-wider w-full text-left hover:bg-white/10 text-gray-400 hover:text-white"
              >
                <Sprout size={16} className="text-green-400" /> Pflanzfläche
              </button>
              <button
                onClick={() => handlePolygonSelect('DRAW_HUNTING')}
                className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-xs font-bold uppercase tracking-wider w-full text-left hover:bg-white/10 text-gray-400 hover:text-white"
              >
                <Crosshair size={16} className="text-lime-400" /> Jagdfläche
              </button>
              <button
                onClick={() => handlePolygonSelect('DRAW_CALAMITY')}
                className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-xs font-bold uppercase tracking-wider w-full text-left hover:bg-white/10 text-gray-400 hover:text-white"
              >
                <AlertTriangle size={16} className="text-orange-400" /> Kalamität
              </button>
          </div>
      )}

      {/* --- 3. HILFE-BUBBLE (Wenn Modus aktiv ist) --- */}
      {mode === 'DRAW_POI' && activePoi && (
         <div className="ml-14 absolute top-24 bg-blue-600 text-white font-bold px-4 py-3 rounded-xl shadow-2xl text-xs whitespace-nowrap animate-in slide-in-from-left-2 fade-in border border-blue-400 z-50">
             <p>Klicke auf die Karte,</p>
             <p className="font-normal opacity-90">um das Objekt zu platzieren.</p>
             <button 
                onClick={() => { setMode('VIEW'); setPoi(null); }} 
                className="mt-2 bg-black/20 hover:bg-black/30 w-full py-1 rounded text-[10px] uppercase transition-colors"
             >
                Abbrechen
             </button>
         </div>
      )}

      {mode === 'DRAW_PATH' && activePathType && (
        !lastForestId ? (
          <div className="ml-14 absolute top-36 bg-red-700 text-white font-bold px-4 py-3 rounded-xl shadow-2xl text-xs whitespace-nowrap animate-in slide-in-from-left-2 fade-in border border-red-500 z-50">
            <p>Zuerst einen Wald</p>
            <p className="font-normal opacity-90">auf der Karte auswählen.</p>
            <button
              onClick={() => { setMode('VIEW'); setPathType(null); }}
              className="mt-2 bg-black/20 hover:bg-black/30 w-full py-1 rounded text-[10px] uppercase transition-colors"
            >
              Abbrechen
            </button>
          </div>
        ) : (
          <div className="ml-14 absolute top-36 bg-amber-600 text-black font-bold px-4 py-3 rounded-xl shadow-2xl text-xs whitespace-nowrap animate-in slide-in-from-left-2 fade-in border border-amber-400 z-50">
            <p>Klicke auf die Karte,</p>
            <p className="font-normal opacity-90">um Punkte zu setzen.</p>
            <p className="mt-1 text-[10px] opacity-75 uppercase tracking-wider">Doppelklick zum Beenden</p>
            <button
              onClick={() => { setMode('VIEW'); setPathType(null); }}
              className="mt-2 bg-black/10 hover:bg-black/20 w-full py-1 rounded text-[10px] uppercase transition-colors font-bold"
            >
              Abbrechen
            </button>
          </div>
        )
      )}

      {(mode === 'DRAW_PLANTING' || mode === 'DRAW_HUNTING' || mode === 'DRAW_CALAMITY') && (
        <div className={cn(
          "ml-14 absolute top-48 font-bold px-4 py-3 rounded-xl shadow-2xl text-xs whitespace-nowrap animate-in slide-in-from-left-2 fade-in border z-50",
          mode === 'DRAW_PLANTING' ? "bg-green-700 text-white border-green-500" :
          mode === 'DRAW_HUNTING'  ? "bg-lime-700 text-white border-lime-500" :
          "bg-orange-700 text-white border-orange-500"
        )}>
          <p>Klicke auf die Karte,</p>
          <p className="font-normal opacity-90">um Eckpunkte zu setzen.</p>
          <p className="mt-1 text-[10px] opacity-75 uppercase tracking-wider">Doppelklick zum Beenden</p>
          <button
            onClick={() => { setMode('VIEW'); setEditingFeature(null); }}
            className="mt-2 bg-black/10 hover:bg-black/20 w-full py-1 rounded text-[10px] uppercase transition-colors font-bold"
          >
            Abbrechen
          </button>
        </div>
      )}

      {mode === 'DRAW_FOREST' && (
        <div className="ml-14 absolute top-12 bg-[#10b981] text-black font-bold px-4 py-3 rounded-xl shadow-2xl text-xs whitespace-nowrap animate-in slide-in-from-left-2 fade-in border border-emerald-400 z-50">
          <p>Klicke auf die Karte,</p>
          <p className="font-normal opacity-90">um Eckpunkte zu setzen.</p>
          <p className="mt-1 text-[10px] opacity-75 uppercase tracking-wider">Doppelklick zum Beenden</p>
          <button 
                onClick={() => setMode('VIEW')} 
                className="mt-2 bg-black/10 hover:bg-black/20 w-full py-1 rounded text-[10px] uppercase transition-colors text-black font-bold"
             >
                Abbrechen
             </button>
        </div>
      )}
    </div>
  );
}