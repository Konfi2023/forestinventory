'use client';

import { useMapStore } from '../stores/useMapStores';
import { 
  MousePointer2, 
  Trees, 
  Crosshair, // Für GPS
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMap } from 'react-leaflet';
import { useState } from 'react';
import { MapImporter } from '../importer/MapImporter'; // Neu importieren

interface Props {
    canCreate: boolean;
    orgSlug: string; // Für Import nötig
    currentUserId: string;
    onRefresh: () => void;
}

export function MapToolbar({ canCreate, orgSlug, currentUserId, onRefresh }: Props) {
  const mode = useMapStore(s => s.interactionMode);
  const setMode = useMapStore(s => s.setInteractionMode);
  
  // Zugriff auf Leaflet Map Instanz für GPS
  // Hinweis: MapToolbar muss innerhalb von MapContainer sein, oder wir nutzen den Store für flyTo
  const flyTo = useMapStore(s => s.flyTo); // Haben wir im Store vorbereitet

  const handleGPS = () => {
    if (!navigator.geolocation) return alert("Geolocation nicht verfügbar");
    
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const { latitude, longitude } = pos.coords;
            flyTo([latitude, longitude], 18); // Zoom ganz nah ran
        },
        (err) => console.error(err),
        { enableHighAccuracy: true }
    );
  };

  return (
    <div className="absolute bottom-8 right-8 z-[1000] flex flex-col gap-3 font-sans items-end">
      
      {/* 1. Haupt-Tools (Zeichnen, Selektieren) */}
      <div className="bg-[#151515]/90 backdrop-blur-md border border-white/10 rounded-2xl p-2 shadow-2xl flex flex-col gap-2">
        
        <button
            onClick={() => setMode('VIEW')}
            className={cn(
              "p-3 rounded-xl transition-all duration-200 text-white hover:bg-white/10 relative group",
              (mode === 'VIEW' || mode === 'EDIT_GEOMETRY') && "bg-[#10b981] text-black hover:bg-[#10b981] shadow-[0_0_15px_rgba(16,185,129,0.4)]"
            )}
            title="Auswählen / Bearbeiten"
        >
            <MousePointer2 size={20} />
        </button>

        {canCreate && (
            <button
                onClick={() => setMode('DRAW_FOREST')}
                className={cn(
                "p-3 rounded-xl transition-all duration-200 text-white hover:bg-white/10 relative group",
                mode === 'DRAW_FOREST' && "bg-[#10b981] text-black hover:bg-[#10b981] shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                )}
                title="Neuen Wald einzeichnen"
            >
                <Trees size={20} />
            </button>
        )}
      </div>

      {/* 2. Utility Tools (GPS, Import) */}
      <div className="bg-[#151515]/90 backdrop-blur-md border border-white/10 rounded-2xl p-2 shadow-2xl flex flex-col gap-2">
         
         {/* GPS Button */}
         <button
            onClick={handleGPS}
            className="p-3 rounded-xl text-white hover:bg-white/10 transition-all duration-200"
            title="Mein Standort"
         >
            <Crosshair size={20} />
         </button>

         {/* Import Button (Nur wenn Rechte da sind) */}
         {canCreate && (
            <div className="p-1">
                <MapImporter 
                    orgSlug={orgSlug} 
                    keycloakId={currentUserId}
                    onImportComplete={onRefresh}
                />
            </div>
         )}
      </div>

    </div>
  );
}