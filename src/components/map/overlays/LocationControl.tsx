'use client';

import { Crosshair, Loader2 } from 'lucide-react';
import { useMapStore } from '../stores/useMapStores';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export function LocationControl() {
  const flyTo = useMapStore(s => s.flyTo);
  const [loading, setLoading] = useState(false);

  const handleGPS = () => {
    if (!navigator.geolocation) return alert("Geolocation nicht verfügbar");
    
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const { latitude, longitude } = pos.coords;
            if (typeof flyTo === 'function') {
                flyTo([latitude, longitude], 18);
            }
            setLoading(false);
        },
        (err) => {
            console.error(err);
            setLoading(false);
            alert("Standort konnte nicht ermittelt werden.");
        },
        { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  return (
    <div className="flex flex-col gap-2 font-sans pointer-events-auto">
      <button
        onClick={handleGPS}
        className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 shadow-xl border",
            "bg-[#151515]/90 backdrop-blur-md border-white/10 text-white hover:bg-white/10 hover:border-white/30",
            loading && "cursor-wait opacity-80"
        )}
        title="Auf meinen Standort zentrieren"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Crosshair className="w-5 h-5" />}
      </button>
    </div>
  );
}