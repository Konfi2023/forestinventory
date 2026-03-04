'use client';

import { useMapStore } from '../stores/useMapStores';
import { LAYER_REGISTRY } from '../registry/LayerRegistry';
import { BASE_MAPS, MapTheme } from '../registry/MapConfig';
import { Layers, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export function LayerControl() {
  const { 
    activeBaseMap, setBaseMap, 
    activeTheme, setTheme,
    activeLayers, toggleLayer 
  } = useMapStore();
  
  const [isOpen, setIsOpen] = useState(false);

  // Overlays filtern (Wir nehmen nur die echten Datenebenen aus der Registry)
  const overlayLayers = Object.values(LAYER_REGISTRY).filter(l => !l.isBaseLayer);

  return (
    <div className="bg-[#151515]/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl transition-all w-72 flex flex-col font-sans">
      
      {/* HEADER */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 flex items-center justify-between text-xs font-bold text-white hover:bg-white/5 transition border-b border-white/5"
      >
        <span className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#10b981]" />
          Kartensteuerung
        </span>
        <span className="text-gray-500">
          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {isOpen && (
        <div className="p-4 space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar">
          
          {/* 1. HINTERGRUNDKARTE (Grid Layout) */}
          <section>
            <h4 className="text-[10px] uppercase text-gray-500 font-bold mb-3 tracking-wider">
              Hintergrund
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(BASE_MAPS).map((map) => (
                <button
                  key={map.id}
                  onClick={() => setBaseMap(map.id as any)}
                  className={cn(
                    "relative h-16 rounded-lg border transition-all overflow-hidden group",
                    activeBaseMap === map.id 
                      ? "border-[#10b981] ring-1 ring-[#10b981]" 
                      : "border-white/10 hover:border-white/30"
                  )}
                >
                  {/* Farb-Preview (später echtes Thumbnail) */}
                  <div 
                    className="absolute inset-0 opacity-50 group-hover:opacity-70 transition-opacity" 
                    style={{ backgroundColor: map.previewColor }} 
                  />
                  
                  {/* Label */}
                  <span className="absolute bottom-1 left-2 text-[10px] font-medium text-white z-10 shadow-black drop-shadow-md">
                    {map.label}
                  </span>

                  {/* Active Indicator */}
                  {activeBaseMap === map.id && (
                    <div className="absolute top-1 right-1 bg-[#10b981] text-black rounded-full p-0.5">
                      <Check size={8} strokeWidth={4} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* 2. KARTENSTIL (Themes) */}
          <section>
            <h4 className="text-[10px] uppercase text-gray-500 font-bold mb-3 tracking-wider">
              Darstellung (Thema)
            </h4>
            <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
              {(['STANDARD', 'SPECIES', 'AGE_CLASS'] as MapTheme[]).map((theme) => (
                <button
                  key={theme}
                  onClick={() => setTheme(theme)}
                  className={cn(
                    "flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all",
                    activeTheme === theme
                      ? "bg-[#333] text-white shadow-sm border border-white/10" 
                      : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                  )}
                >
                  {theme === 'STANDARD' ? 'Standard' : theme === 'SPECIES' ? 'Baumart' : 'Alter'}
                </button>
              ))}
            </div>
          </section>

          <div className="h-px bg-white/10 w-full" />

          {/* 3. OVERLAYS (Liste mit Toggles) */}
          <section>
            <h4 className="text-[10px] uppercase text-gray-500 font-bold mb-3 tracking-wider">
              Ebenen & Objekte
            </h4>
            <div className="space-y-1">
              {overlayLayers.map((layer) => {
                const isActive = activeLayers.includes(layer.id);
                const Icon = layer.icon;
                
                return (
                  <button
                    key={layer.id}
                    onClick={() => toggleLayer(layer.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-2.5 rounded-lg text-xs transition-all border group",
                      isActive 
                        ? "bg-white/5 border-white/10 text-white" 
                        : "bg-transparent border-transparent text-gray-500 hover:bg-white/5 hover:text-gray-300"
                    )}
                  >
                    <div 
                      className={cn(
                        "w-6 h-6 rounded flex items-center justify-center transition-colors",
                        isActive ? "" : "grayscale opacity-50"
                      )}
                      style={{ backgroundColor: isActive ? layer.color : '#222' }}
                    >
                      <Icon size={14} className="text-black/80" />
                    </div>

                    <span className="flex-1 text-left font-medium">
                      {layer.label}
                    </span>

                    {/* iOS Style Toggle Switch Simulation */}
                    <div className={cn(
                      "w-8 h-4 rounded-full relative transition-colors",
                      isActive ? "bg-[#10b981]" : "bg-gray-700"
                    )}>
                      <div className={cn(
                        "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-sm",
                        isActive ? "left-4.5" : "left-0.5"
                      )} />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

        </div>
      )}
    </div>
  );
}