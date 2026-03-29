'use client';

import { Tent, Home, Ban, Boxes, Truck, TreePine, MapPin, Navigation, ExternalLink } from 'lucide-react';
import { getSpeciesLabel } from '@/lib/tree-species';

const POI_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  HUNTING_STAND: { icon: Tent,     color: 'text-yellow-500', label: 'Hochsitz'   },
  LOG_PILE:      { icon: Boxes,    color: 'text-blue-500',   label: 'Polter'     },
  HUT:           { icon: Home,     color: 'text-orange-500', label: 'Hütte'      },
  BARRIER:       { icon: Ban,      color: 'text-red-500',    label: 'Schranke'   },
  VEHICLE:       { icon: Truck,    color: 'text-gray-500',   label: 'Fahrzeug'   },
  TREE:          { icon: TreePine, color: 'text-green-500',  label: 'Einzelbaum' },
};

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  EXCAVATOR: 'Bagger', HARVESTER: 'Harvester', FORWARDER: 'Forwarder',
  TRACTOR: 'Traktor', SKIDDER: 'Seilschlepper', CRANE_TRUCK: 'LKW mit Kran',
  MULCHER: 'Mulcher', CHAINSAW: 'Motorsäge', TRAILER: 'Anhänger', OTHER: 'Sonstiges',
};

const WOOD_TYPE_LABELS: Record<string, string> = {
  LOG: 'Stammholz', INDUSTRIAL: 'Industrieholz', ENERGY: 'Energieholz', PULP: 'Faserholz',
};

const HEALTH_LABELS: Record<string, { label: string; color: string }> = {
  HEALTHY:            { label: 'Gesund',              color: 'text-green-500'  },
  DAMAGED:            { label: 'Geschädigt',           color: 'text-orange-400' },
  DEAD:               { label: 'Abgestorben',          color: 'text-red-400'    },
  MARKED_FOR_FELLING: { label: 'Zum Fällen markiert', color: 'text-blue-400'   },
};

interface Props {
  poi: any;
  tasks: any[];
}

export function MobilePoiDetail({ poi, tasks }: Props) {
  const config = POI_CONFIG[poi.type] ?? { icon: MapPin, color: 'text-gray-400', label: 'Objekt' };
  const Icon = config.icon;

  const linkedTasks = tasks.filter((t: any) => {
    if (t.status === 'DONE') return false;
    if (t.poiId === poi.id) return true;
    if (t.lat && t.lng) {
      return Math.abs(t.lat - poi.lat) < 0.00002 && Math.abs(t.lng - poi.lng) < 0.00002;
    }
    return false;
  });

  const imageKey = poi.vehicle?.imageKey || poi.tree?.imageKey || poi.logPile?.imageKey || null;

  const navigateToLocation = () => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${poi.lat},${poi.lng}`, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
          <Icon className={`w-5 h-5 ${config.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 truncate">{poi.name || config.label}</h3>
          <p className="text-xs text-slate-500">{config.label}</p>
        </div>
      </div>

      {/* Bild */}
      {imageKey && (
        <div className="rounded-xl overflow-hidden border border-slate-200 aspect-video bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/images/poi?key=${encodeURIComponent(imageKey)}`}
            alt={poi.name || config.label}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Typ-spezifische Infos */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        {poi.type === 'VEHICLE' && poi.vehicle && (
          <>
            <InfoItem label="Typ" value={VEHICLE_TYPE_LABELS[poi.vehicle.vehicleType] ?? poi.vehicle.vehicleType} />
            {poi.vehicle.serialNumber && <InfoItem label="Kennzeichen" value={poi.vehicle.serialNumber} />}
            {poi.vehicle.yearBuilt && <InfoItem label="Baujahr" value={poi.vehicle.yearBuilt} />}
          </>
        )}
        {poi.type === 'TREE' && poi.tree && (
          <>
            {poi.tree.species && <InfoItem label="Baumart" value={getSpeciesLabel(poi.tree.species)} />}
            {poi.tree.diameter && <InfoItem label="BHD" value={`${poi.tree.diameter} cm`} />}
            {poi.tree.height && <InfoItem label="Höhe" value={`${poi.tree.height} m`} />}
            {poi.tree.health && <InfoItem label="Zustand" value={HEALTH_LABELS[poi.tree.health]?.label ?? poi.tree.health} />}
          </>
        )}
        {poi.type === 'LOG_PILE' && poi.logPile && (
          <>
            {poi.logPile.volumeFm && <InfoItem label="Festmeter" value={`${poi.logPile.volumeFm} fm`} />}
            {poi.logPile.logLength && <InfoItem label="Stammlänge" value={`${poi.logPile.logLength} m`} />}
            {poi.logPile.treeSpecies && <InfoItem label="Baumart" value={getSpeciesLabel(poi.logPile.treeSpecies)} />}
            {poi.logPile.woodType && <InfoItem label="Holzart" value={WOOD_TYPE_LABELS[poi.logPile.woodType] ?? poi.logPile.woodType} />}
            {poi.logPile.qualityClass && <InfoItem label="Qualität" value={poi.logPile.qualityClass} />}
            {poi.logPile.layerCount && <InfoItem label="Lagen" value={poi.logPile.layerCount} />}
          </>
        )}
      </div>

      {/* Koordinaten */}
      <div className="flex items-center gap-2 text-xs text-slate-500 font-mono bg-slate-50 px-3 py-2 rounded-lg">
        <MapPin className="w-3 h-3 shrink-0" />
        {poi.lat.toFixed(6)}, {poi.lng.toFixed(6)}
      </div>

      {/* Notizen */}
      {(poi.note || poi.vehicle?.notes || poi.tree?.notes || poi.logPile?.notes) && (
        <div className="text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-lg whitespace-pre-wrap">
          {poi.note || poi.vehicle?.notes || poi.tree?.notes || poi.logPile?.notes}
        </div>
      )}

      {/* Verknüpfte Aufgaben */}
      {linkedTasks.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase mb-1.5">Offene Aufgaben ({linkedTasks.length})</p>
          <div className="space-y-1.5">
            {linkedTasks.map((t: any) => (
              <div key={t.id} className="flex items-center gap-2 text-sm bg-slate-50 px-3 py-2 rounded-lg">
                <span className={`w-2 h-2 rounded-full shrink-0 ${t.priority === 'URGENT' ? 'bg-red-500' : t.priority === 'HIGH' ? 'bg-orange-500' : 'bg-blue-500'}`} />
                <span className="truncate text-slate-700">{t.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigieren */}
      <button
        onClick={navigateToLocation}
        className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl font-medium text-sm transition-colors"
      >
        <Navigation className="w-4 h-4" />
        In Google Maps navigieren
        <ExternalLink className="w-3.5 h-3.5 opacity-60" />
      </button>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-slate-50 px-3 py-2 rounded-lg">
      <p className="text-[10px] text-slate-400 uppercase font-semibold">{label}</p>
      <p className="text-slate-800 font-medium">{value}</p>
    </div>
  );
}
