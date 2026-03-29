'use client';

import { useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useMapStore } from '@/components/map/stores/useMapStores';
import { MobilePoiDetail } from './mobile-details/MobilePoiDetail';
import { MobileTaskDetail } from './mobile-details/MobileTaskDetail';

interface Props {
  data: {
    forests: any[];
    tasks: any[];
    orgSlug: string;
  };
  onRefresh: () => void;
}

export function MobileDetailSheet({ data, onRefresh }: Props) {
  const selectedId = useMapStore(s => s.selectedFeatureId);
  const selectedType = useMapStore(s => s.selectedFeatureType);
  const selectFeature = useMapStore(s => s.selectFeature);

  const isOpen = !!selectedId;

  const selectedPoi = useMemo(() => {
    if (selectedType !== 'POI' || !selectedId) return null;
    for (const f of (data.forests || [])) {
      const poi = (f.pois || []).find((p: any) => p.id === selectedId);
      if (poi) return poi;
    }
    return null;
  }, [selectedId, selectedType, data.forests]);

  const selectedTask = useMemo(() => {
    if (selectedType !== 'TASK' || !selectedId) return null;
    return (data.tasks || []).find((t: any) => t.id === selectedId) ?? null;
  }, [selectedId, selectedType, data.tasks]);

  const handleClose = () => selectFeature(null, null);

  // Only show for POI and TASK selections
  if (!isOpen || (selectedType !== 'POI' && selectedType !== 'TASK')) return null;
  if (selectedType === 'POI' && !selectedPoi) return null;
  if (selectedType === 'TASK' && !selectedTask) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <SheetContent
        side="bottom"
        className="bg-white rounded-t-2xl max-h-[75vh] overflow-y-auto px-5 pb-8 pt-4"
        showCloseButton={false}
      >
        {/* Drag handle */}
        <div className="flex justify-center mb-3">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        <SheetHeader className="sr-only">
          <SheetTitle>
            {selectedType === 'POI' ? (selectedPoi?.name || 'POI Details') : (selectedTask?.title || 'Aufgabe')}
          </SheetTitle>
        </SheetHeader>

        {selectedType === 'POI' && selectedPoi && (
          <MobilePoiDetail poi={selectedPoi} tasks={data.tasks || []} />
        )}

        {selectedType === 'TASK' && selectedTask && (
          <MobileTaskDetail task={selectedTask} orgSlug={data.orgSlug} onRefresh={onRefresh} />
        )}
      </SheetContent>
    </Sheet>
  );
}
