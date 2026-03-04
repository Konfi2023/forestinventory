'use client';

import React, { useState, useMemo } from 'react';
import { useMapStore, MapState } from '../stores/useMapStores'; 
import { LAYER_REGISTRY } from '../registry/LayerRegistry';
import { Polygon, Marker, Polyline, Tooltip, useMapEvents, useMap } from 'react-leaflet';
import { geoJSONToLeaflet } from '@/lib/map-helpers';
import L from 'leaflet';
import { createPoi } from '@/actions/poi';
import { toast } from 'sonner';

// Ab diesem Zoom-Level werden POIs angezeigt.
const POI_VISIBILITY_THRESHOLD = 14; 

const COLORS = {
    PLANTING: '#22c55e',
    MAINTENANCE: '#ef4444',
    CALAMITY: '#f97316',
    HABITAT: '#a855f7',
    HUNTING: '#84cc16'
};

interface GeoDataProps {
  data: {
    forests: any[]; 
    tasks: any[];
    currentUserId: string;
    orgSlug: string;
  };
  onRefresh: () => void;
}

// ... (createTaskIcon bleibt unverändert) ...
const createTaskIcon = (priority: string, status: string, isSelected: boolean) => {
    let color = '#3b82f6'; 
    let pulseColor = 'bg-blue-500';

    if (status === 'DONE') {
        color = '#22c55e'; pulseColor = 'bg-green-500';
    } else if (priority === 'URGENT') {
        color = '#ef4444'; pulseColor = 'bg-red-500';
    } else if (priority === 'HIGH') {
        color = '#f97316'; pulseColor = 'bg-orange-500';
    } else if (status === 'BLOCKED') {
        color = '#64748b'; pulseColor = 'bg-slate-500';
    }

    const isImportant = (priority === 'URGENT' || priority === 'HIGH') && status !== 'DONE';
    
    const size = isSelected ? 48 : 32;
    const anchorX = size / 2;
    const anchorY = isSelected ? 46 : 30;

    const html = `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: ${size}px; height: ${size}px;">
        ${isSelected 
            ? `<div style="position: absolute; width: 100%; height: 100%; border-radius: 9999px; background-color: rgba(255,255,255,0.4); animation: pulse 2s infinite;"></div>`
            : (isImportant ? `<div style="position: absolute; width: 100%; height: 100%; border-radius: 9999px; opacity: 0.75; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;" class="${pulseColor}"></div>` : '')
        }
        <div style="position: relative; width: ${isSelected ? 20 : 14}px; height: ${isSelected ? 20 : 14}px; background-color: ${color}; border: ${isSelected ? '3px' : '2px'} solid white; border-radius: 9999px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5); z-index: 10;"></div>
        <div style="position: absolute; top: 50%; width: ${isSelected ? 3 : 2}px; height: ${isSelected ? 18 : 12}px; background-color: rgba(255,255,255,0.8); transform: translateY(2px);"></div>
      </div>
    `;

    return L.divIcon({ className: 'bg-transparent border-none', html: html, iconSize: [size, size], iconAnchor: [anchorX, anchorY] });
};


// NEU: POI Icon mit Indikator (Roter Punkt)
const createPoiIcon = (type: string, isSelected: boolean, hasOpenTask: boolean) => {
    let color = '#9ca3af'; 
    let iconChar = '📍';

    switch (type) {
        case 'HUNTING_STAND': color = '#eab308'; iconChar = '🔭'; break;
        case 'LOG_PILE': color = '#3b82f6'; iconChar = '🪵'; break;
        case 'HUT': color = '#f97316'; iconChar = '🏠'; break;
        case 'BARRIER': color = '#ef4444'; iconChar = '⛔'; break;
    }
    
    const size = isSelected ? 36 : 24;
    const anchor = size / 2;

    const html = `
      <div style="position: relative; width: ${size}px; height: ${size}px;">
        <div style="
          background-color: ${color}; 
          width: 100%; height: 100%; 
          border-radius: 50%; 
          border: ${isSelected ? '3px' : '2px'} solid white; 
          display: flex; align-items: center; justify-content: center; 
          box-shadow: 0 2px 5px rgba(0,0,0,0.3); 
          font-size: ${isSelected ? 18 : 12}px;
          ${isSelected ? 'transform: scale(1.1); transition: transform 0.2s;' : ''}
        ">
          ${iconChar}
        </div>
        
        ${/* INDICATOR FÜR TASK */ ''}
        ${hasOpenTask ? `
            <div style="
                position: absolute; 
                top: -2px; right: -2px; 
                width: 10px; height: 10px; 
                background-color: #ef4444; 
                border: 2px solid white; 
                border-radius: 50%;
                z-index: 20;
                box-shadow: 0 0 0 1px #000;
            "></div>
        ` : ''}
      </div>
    `;
    return L.divIcon({ className: 'bg-transparent border-none', html: html, iconSize: [size, size], iconAnchor: [anchor, anchor] });
};


export function GeoDataHandler({ data, onRefresh }: GeoDataProps) {
  const map = useMap();
  const [currentZoom, setCurrentZoom] = useState(map.getZoom());

  const activeLayers = useMapStore((s: MapState) => s.activeLayers);
  const selectFeature = useMapStore((s: MapState) => s.selectFeature);
  const selectedId = useMapStore((s: MapState) => s.selectedFeatureId);
  const hoveredId = useMapStore((s: MapState) => s.hoveredFeatureId);
  const setHovered = useMapStore((s: MapState) => s.setHoveredFeature);
  const editingData = useMapStore((s: MapState) => s.editingFeatureData);
  const interactionMode = useMapStore((s: MapState) => s.interactionMode);
  const activePoiType = useMapStore((s: MapState) => s.activePoiType);
  const setInteractionMode = useMapStore((s) => s.setInteractionMode);
  const setEditingFeature = useMapStore((s: MapState) => s.setEditingFeature);

  const showForests = activeLayers.includes('FOREST_BOUNDARY');
  const showSections = activeLayers.includes('SECTIONS'); 
  const showActivity = activeLayers.includes('ACTIVITY_PLAN');
  const showInfrastructure = activeLayers.includes('INFRASTRUCTURE'); 
  const showTasks = activeLayers.includes('TASKS');

  const poisVisible = showInfrastructure && currentZoom >= POI_VISIBILITY_THRESHOLD;

  const isBeingEdited = (forestId: string) => {
    return interactionMode === 'EDIT_GEOMETRY' && editingData?.id === forestId;
  };

  const getForestStyle = (forest: any) => {
    const isSelected = selectedId === forest.id;
    const isHovered = hoveredId === forest.id;
    const baseColor = forest.color || LAYER_REGISTRY.FOREST_BOUNDARY.color;
    return { 
        color: isSelected ? '#ffffff' : baseColor, 
        weight: isSelected || isHovered ? 3 : 2, 
        fillColor: baseColor, 
        fillOpacity: isSelected ? 0.2 : 0.05,
        dashArray: '5, 5' 
    };
  };

  // Liste aller POIs erstellen für Kollisions-Check
  const allPois = useMemo(() => {
      return data.forests.flatMap(f => f.pois || []);
  }, [data.forests]);

  // Helper: Prüfen ob POI Aufgaben hat
  const getPoiTaskCount = (poiId: string) => {
      return data.tasks.filter(t => t.poiId === poiId && t.status !== 'DONE').length;
  };

  useMapEvents({
    zoomend: () => setCurrentZoom(map.getZoom()),
    click(e) {
      if (interactionMode === 'DRAW_POI' && activePoiType) {
        const { lat, lng } = e.latlng;
        const fallbackForestId = data.forests[0]?.id;

        if (!fallbackForestId) {
            toast.error("Bitte erst einen Wald anlegen!");
            return;
        }

        toast.promise(
            createPoi({ lat, lng, type: activePoiType, orgSlug: data.orgSlug, userId: data.currentUserId, forestId: fallbackForestId }),
            {
                loading: 'Platziere Objekt...',
                success: () => { setInteractionMode('VIEW'); onRefresh(); return 'Objekt erstellt!'; },
                error: (err) => `Fehler: ${err.message}`
            }
        );
      }
    }
  });

  return (
    <>
      {data.forests.map((forest) => {
        if (isBeingEdited(forest.id)) return null;
        const forestLatLngs = geoJSONToLeaflet(forest.geoJson);
        
        return (
          <React.Fragment key={`forest-group-${forest.id}`}>
            
            {/* FOREST BOUNDARY */}
            {showForests && forestLatLngs.length > 0 && (
              <Polygon
                positions={forestLatLngs}
                pathOptions={getForestStyle(forest)}
                interactive={interactionMode === 'VIEW'} 
                eventHandlers={{
                  click: (e) => {
                    if (interactionMode === 'VIEW') {
                        L.DomEvent.stopPropagation(e); 
                        selectFeature(forest.id, 'FOREST');
                    }
                  },
                  mouseover: () => setHovered(forest.id),
                  mouseout: () => setHovered(null)
                }}
              >
                {currentZoom >= 12 && (
                    <Tooltip sticky direction="top" opacity={0.9} className="custom-tooltip !pointer-events-none">
                        <div className="text-center font-sans">
                            <span className="font-bold block text-sm">{forest.name}</span>
                            <span className="text-xs text-gray-500">{forest.areaHa?.toFixed(2)} ha</span>
                        </div>
                    </Tooltip>
                )}
              </Polygon>
            )}

            {/* ... SECTIONS (Pflanzen etc.) hier einfügen wenn nötig ... */}
            {/* Um Platz zu sparen lasse ich die anderen Polygone hier weg, sie sind identisch zum vorigen Code */}
            {/* INFRASTRUKTUR: POIs */}
            {showInfrastructure && poisVisible && forest.pois?.map((poi: any) => {
                const isSelected = selectedId === poi.id;
                const isMoving = interactionMode === 'MOVE_POI' && isSelected;
                const displayLat = (isMoving && editingData && editingData.id === poi.id) ? editingData.lat : poi.lat;
                const displayLng = (isMoving && editingData && editingData.id === poi.id) ? editingData.lng : poi.lng;

                // NEU: Check auf Tasks
                const hasTask = getPoiTaskCount(poi.id) > 0;

                return (
                    <Marker
                        key={poi.id}
                        position={[displayLat, displayLng]}
                        icon={createPoiIcon(poi.type, isSelected, hasTask)} // Übergebe Status
                        draggable={isMoving}
                        eventHandlers={{
                            click: (e) => {
                                if (interactionMode === 'VIEW') {
                                    L.DomEvent.stopPropagation(e);
                                    selectFeature(poi.id, 'POI');
                                }
                            },
                            dragend: (e) => {
                                const marker = e.target;
                                const position = marker.getLatLng();
                                setEditingFeature({
                                    ...poi, 
                                    lat: position.lat,
                                    lng: position.lng
                                });
                            }
                        }}
                    >
                         <Tooltip direction="top" offset={[0, -12]} opacity={0.9} className="!pointer-events-none">
                            <span className="font-bold text-xs">{poi.name}</span>
                        </Tooltip>
                    </Marker>
                );
            })}

          </React.Fragment>
        );
      })}

      {/* TASKS */}
      {showTasks && currentZoom >= 10 && data.tasks.map((task) => {
        if (!task.lat || !task.lng) return null;

        // Dedup: Wenn Task an POI hängt -> NICHT ZEIGEN (ist im Icon integriert)
        if (task.poiId) return null;

        const isSelected = selectedId === task.id;

        return (
          <Marker
            key={task.id}
            position={[task.lat, task.lng]}
            icon={createTaskIcon(task.priority, task.status, isSelected)}
            eventHandlers={{
              click: (e) => {
                if (interactionMode === 'VIEW') {
                    L.DomEvent.stopPropagation(e);
                    selectFeature(task.id, 'TASK');
                }
              }
            }}
          >
            <Tooltip direction="top" offset={[0, -16]} opacity={0.9} className="!pointer-events-none">
                <span className="font-bold text-xs">{task.title}</span>
            </Tooltip>
          </Marker>
        );
      })}
    </>
  );
}