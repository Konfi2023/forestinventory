'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tent, Home, Ban, Boxes, Truck, TreePine, Loader2 } from 'lucide-react';
import { createPoi } from '@/actions/poi';
import { toast } from 'sonner';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';

const POI_TYPES = [
  { type: 'HUNTING_STAND', icon: Tent,     color: 'bg-yellow-100 text-yellow-600', label: 'Hochsitz' },
  { type: 'LOG_PILE',      icon: Boxes,    color: 'bg-blue-100 text-blue-600',     label: 'Polter' },
  { type: 'HUT',           icon: Home,     color: 'bg-orange-100 text-orange-600', label: 'Hütte' },
  { type: 'BARRIER',       icon: Ban,      color: 'bg-red-100 text-red-600',       label: 'Schranke' },
  { type: 'VEHICLE',       icon: Truck,    color: 'bg-slate-100 text-slate-600',   label: 'Fahrzeug' },
  { type: 'TREE',          icon: TreePine, color: 'bg-green-100 text-green-600',   label: 'Einzelbaum' },
];

interface Props {
  latlng: { lat: number; lng: number } | null;
  forests: any[];
  orgSlug: string;
  currentUserId: string;
  onClose: () => void;
  onRefresh: () => void;
}

export function MobilePoiCreator({ latlng, forests, orgSlug, currentUserId, onClose, onRefresh }: Props) {
  const [saving, setSaving] = useState(false);

  if (!latlng) return null;

  const handleSelect = async (poiType: string) => {
    // Find which forest contains the point
    let forestId: string | undefined;
    try {
      const p = point([latlng.lng, latlng.lat]);
      const found = forests.find((f: any) => f.geoJson && booleanPointInPolygon(p, f.geoJson));
      forestId = found?.id;
    } catch {}

    if (!forestId) {
      toast.error('Dieser Punkt liegt außerhalb aller Waldgrenzen.');
      return;
    }

    setSaving(true);
    try {
      await createPoi({
        lat: latlng.lat,
        lng: latlng.lng,
        type: poiType,
        orgSlug,
        userId: currentUserId,
        forestId,
      });
      toast.success('Objekt erstellt!');
      onRefresh();
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? 'Fehler beim Erstellen');
    }
    setSaving(false);
  };

  return (
    <Sheet open={!!latlng} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent
        side="bottom"
        className="bg-white rounded-t-2xl px-5 pb-8 pt-4"
        showCloseButton={false}
      >
        <div className="flex justify-center mb-3">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        <SheetHeader className="mb-4">
          <SheetTitle className="text-base text-slate-900">Neues Objekt erstellen</SheetTitle>
        </SheetHeader>

        {saving ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {POI_TYPES.map(({ type, icon: Icon, color, label }) => (
              <button
                key={type}
                onClick={() => handleSelect(type)}
                className="flex flex-col items-center gap-2 py-4 rounded-xl border border-slate-200 hover:border-emerald-400 active:bg-slate-50 transition-colors"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-slate-700">{label}</span>
              </button>
            ))}
          </div>
        )}

        <p className="text-[10px] text-slate-400 text-center mt-3 font-mono">
          {latlng.lat.toFixed(5)}, {latlng.lng.toFixed(5)}
        </p>
      </SheetContent>
    </Sheet>
  );
}
