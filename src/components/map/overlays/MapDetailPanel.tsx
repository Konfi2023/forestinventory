'use client';

import { useMapStore } from '../stores/useMapStores';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

// Sub-Components
import { ForestDetailView } from './detail-panel/ForestDetailView';
import { PoiDetailView } from './detail-panel/PoiDetailView';

interface Props {
  forests: any[]; 
  tasks: any[];
  members: any[];
  orgSlug: string;
  onForestDeleted?: (id: string) => void;
  canEdit: boolean;
  canDelete: boolean;
}

export function MapDetailPanel({ forests, tasks, members, orgSlug, onForestDeleted, canEdit, canDelete }: Props) {
  const { data: session } = useSession();
  
  const selectedId = useMapStore((s) => s.selectedFeatureId);
  const selectedType = useMapStore((s) => s.selectedFeatureType);
  const selectFeature = useMapStore((s) => s.selectFeature);
  const refreshData = useMapStore((s) => s.refreshData);
  
  const [isVisible, setIsVisible] = useState(false);

  // --- DATEN FINDEN ---
  const selectedForest = selectedType === 'FOREST' ? forests?.find(f => f.id === selectedId) : null;
  
  const selectedPoi = selectedType === 'POI' 
    ? forests?.flatMap(f => f.pois || []).find(p => p.id === selectedId) 
    : null;

  // --- ANIMATION STEUERN ---
  useEffect(() => {
    const hasSelection = !!selectedId && (selectedType === 'FOREST' || selectedType === 'POI');
    setIsVisible(hasSelection);
  }, [selectedId, selectedType]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => selectFeature(null, null), 300); 
  };

  if (!selectedId) return null;

  // --- RENDER SWITCH ---
  
  if (selectedType === 'FOREST' && selectedForest) {
      return (
          <ForestDetailView 
              key={selectedForest.id}
              forest={selectedForest}
              tasks={tasks}
              onClose={handleClose}
              onRefresh={refreshData}
              onDeleteSuccess={(id) => { 
                  if(onForestDeleted) onForestDeleted(id); 
                  handleClose(); 
              }}
              canEdit={canEdit}
              canDelete={canDelete}
              userId={session?.user?.id || ""}
              // Durchreichen der Daten
              members={members}
              orgSlug={orgSlug}
          />
      );
  }

  if (selectedType === 'POI' && selectedPoi) {
      return (
          <PoiDetailView 
              key={selectedPoi.id}
              poi={selectedPoi}
              tasks={tasks}
              onClose={handleClose}
              onRefresh={refreshData}
              canEdit={canEdit}
              canDelete={canDelete}
              
              // --- FIX: HIER HABEN DIE DATEN GEFEHLT ---
              members={members}
              orgSlug={orgSlug}
              forests={forests} // Wichtig für das Dropdown im Task Dialog
          />
      );
  }

  return null;
}