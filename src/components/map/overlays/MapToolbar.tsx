'use client';

import { useMapStore, PoiType } from '../stores/useMapStores';
import { 
  MousePointer2, 
  Trees, 
  Plus, // Trigger für das Menü
  Tent, // Hochsitz
  Ban,  // Schranke
  Home, // Hütte
  Boxes // Polter
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
  const mode = useMapStore(s => s.interactionMode);
  const setMode = useMapStore(s => s.setInteractionMode);
  const activePoi = useMapStore(s => s.activePoiType);
  const setPoi = useMapStore(s => s.setActivePoiType);
  
  // Lokaler State für das aufgeklappte "Hinzufügen"-Menü
  const [showPoiMenu, setShowPoiMenu] = useState(false);

  // Definition der verfügbaren POI-Werkzeuge
  const poiTools = [
      { id: 'HUNTING_STAND', icon: Tent, label: 'Hochsitz', color: 'text-yellow-500' },
      { id: 'LOG_PILE', icon: Boxes, label: 'Polter', color: 'text-blue-500' },
      { id: 'HUT', icon: Home, label: 'Hütte', color: 'text-orange-500' },
      { id: 'BARRIER', icon: Ban, label: 'Schranke', color: 'text-red-500' },
  ] as const;

  const handlePoiSelect = (type: PoiType) => {
      setMode('DRAW_POI');
      setPoi(type);
      setShowPoiMenu(false); // Menü nach Auswahl schließen
  };

  return (
    <div className="absolute top-6 left-6 z-[400] flex flex-col gap-2 font-sans">
      
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
                onClick={() => setShowPoiMenu(!showPoiMenu)}
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