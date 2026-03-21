'use client';

import { useMapStore } from '../stores/useMapStores';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

// Sub-Components
import { ForestDetailView } from './detail-panel/ForestDetailView';
import { PoiDetailView } from './detail-panel/PoiDetailView';
import { PathDetailView } from './detail-panel/PathDetailView';
import { PlantingDetailView } from './detail-panel/PlantingDetailView';
import { HuntingDetailView } from './detail-panel/HuntingDetailView';
import { CalamityDetailView } from './detail-panel/CalamityDetailView';
import { CompartmentDetailView } from './detail-panel/CompartmentDetailView';

interface Props {
  forests: any[];
  tasks: any[];
  members: any[];
  owners: { id: string; name: string }[];
  orgSlug: string;
  onForestDeleted?: (id: string) => void;
  canEdit: boolean;
  canDelete: boolean;
}

export function MapDetailPanel({ forests, tasks, members, owners, orgSlug, onForestDeleted, canEdit, canDelete }: Props) {
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

  const selectedPath = selectedType === 'PATH'
    ? forests?.flatMap(f => f.paths || []).find(p => p.id === selectedId)
    : null;
  const selectedPathForest = selectedPath
    ? forests?.find(f => f.id === selectedPath.forestId)
    : null;

  const selectedPlanting = selectedType === 'PLANTING'
    ? forests?.flatMap(f => f.plantings || []).find(p => p.id === selectedId)
    : null;
  const selectedPlantingForest = selectedPlanting
    ? forests?.find(f => f.id === selectedPlanting.forestId)
    : null;

  const selectedHunting = selectedType === 'HUNTING'
    ? forests?.flatMap(f => f.hunting || []).find(h => h.id === selectedId)
    : null;
  const selectedHuntingForest = selectedHunting
    ? forests?.find(f => f.id === selectedHunting.forestId)
    : null;

  const selectedCalamity = selectedType === 'CALAMITY'
    ? forests?.flatMap(f => f.calamities || []).find(c => c.id === selectedId)
    : null;
  const selectedCalamityForest = selectedCalamity
    ? forests?.find(f => f.id === selectedCalamity.forestId)
    : null;

  const selectedCompartment = selectedType === 'COMPARTMENT'
    ? forests?.flatMap(f => f.compartments || []).find(c => c.id === selectedId)
    : null;
  const selectedCompartmentForest = selectedCompartment
    ? forests?.find(f => f.id === selectedCompartment.forestId)
    : null;

  // --- ANIMATION STEUERN ---
  useEffect(() => {
    const hasSelection = !!selectedId && (
      selectedType === 'FOREST' || selectedType === 'POI' || selectedType === 'PATH' ||
      selectedType === 'PLANTING' || selectedType === 'HUNTING' || selectedType === 'CALAMITY' ||
      selectedType === 'COMPARTMENT'
    );
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
              owners={owners}
              onClose={handleClose}
              onRefresh={refreshData}
              onDeleteSuccess={(id) => {
                  if(onForestDeleted) onForestDeleted(id);
                  handleClose();
              }}
              canEdit={canEdit}
              canDelete={canDelete}
              userId={session?.user?.id || ""}
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

  if (selectedType === 'PATH' && selectedPath) {
    return (
      <PathDetailView
        key={selectedPath.id}
        path={selectedPath}
        forest={selectedPathForest}
        orgSlug={orgSlug}
        tasks={tasks}
        members={members}
        forests={forests}
        onClose={handleClose}
        onRefresh={refreshData}
        onDeleteSuccess={() => { refreshData(); handleClose(); }}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    );
  }

  if (selectedType === 'PLANTING' && selectedPlanting) {
    return (
      <PlantingDetailView
        key={selectedPlanting.id}
        planting={selectedPlanting}
        forest={selectedPlantingForest}
        orgSlug={orgSlug}
        tasks={tasks}
        members={members}
        forests={forests}
        onClose={handleClose}
        onRefresh={refreshData}
        onDeleteSuccess={() => { refreshData(); handleClose(); }}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    );
  }

  if (selectedType === 'HUNTING' && selectedHunting) {
    return (
      <HuntingDetailView
        key={selectedHunting.id}
        hunting={selectedHunting}
        forest={selectedHuntingForest}
        orgSlug={orgSlug}
        tasks={tasks}
        members={members}
        forests={forests}
        onClose={handleClose}
        onRefresh={refreshData}
        onDeleteSuccess={() => { refreshData(); handleClose(); }}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    );
  }

  if (selectedType === 'CALAMITY' && selectedCalamity) {
    return (
      <CalamityDetailView
        key={selectedCalamity.id}
        calamity={selectedCalamity}
        forest={selectedCalamityForest}
        orgSlug={orgSlug}
        tasks={tasks}
        members={members}
        forests={forests}
        onClose={handleClose}
        onRefresh={refreshData}
        onDeleteSuccess={() => { refreshData(); handleClose(); }}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    );
  }

  if (selectedType === 'COMPARTMENT' && selectedCompartment) {
    return (
      <CompartmentDetailView
        key={selectedCompartment.id}
        compartment={selectedCompartment}
        forest={selectedCompartmentForest}
        orgSlug={orgSlug}
        onClose={handleClose}
        onRefresh={refreshData}
        onDeleteSuccess={() => { refreshData(); handleClose(); }}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    );
  }

  return null;
}