'use client';

import { Map, Satellite } from 'lucide-react';
import { useMapStore } from '@/components/map/stores/useMapStores';

export function MapStyleToggle() {
  const activeBaseMap = useMapStore(s => s.activeBaseMap);
  const setBaseMap = useMapStore(s => s.setBaseMap);

  const isSatellite = activeBaseMap === 'SATELLITE';

  return (
    <button
      onClick={() => setBaseMap(isSatellite ? 'LIGHT' : 'SATELLITE')}
      className="w-10 h-10 rounded-xl flex items-center justify-center shadow-xl border bg-white/90 backdrop-blur-md border-slate-200 text-slate-700 hover:bg-white active:bg-slate-100 transition-all"
      title={isSatellite ? 'Straßenkarte' : 'Satellitenansicht'}
    >
      {isSatellite ? <Map className="w-5 h-5" /> : <Satellite className="w-5 h-5" />}
    </button>
  );
}
