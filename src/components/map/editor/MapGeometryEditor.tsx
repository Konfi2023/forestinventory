'use client';

import { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import { useMapStore } from '../stores/useMapStores';
import { createForest, updateForest } from '@/actions/forest';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import L from 'leaflet';
import area from '@turf/area';

import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import { Save, X } from 'lucide-react';

export default function MapGeometryEditor() {
  const map = useMap();
  const { data: session } = useSession();
  
  // Store Access
  const mode = useMapStore(s => s.interactionMode);
  const editingData = useMapStore(s => s.editingFeatureData);
  const setMode = useMapStore(s => s.setInteractionMode);
  const setEditingFeature = useMapStore(s => s.setEditingFeature);
  const refreshData = useMapStore(s => s.refreshData);
  const selectFeature = useMapStore(s => s.selectFeature); // <--- NEU: Zum Wiederöffnen der Sidebar

  const createdLayerRef = useRef<L.Layer | null>(null);
  const editToolbarRef = useRef<L.EditToolbar.Edit | null>(null);
  const drawerRef = useRef<L.Draw.Polygon | null>(null);

  const [showSaveBar, setShowSaveBar] = useState(false);

  // --- DRAW MODE (NEU ERSTELLEN) ---
  useEffect(() => {
    if (!map || mode !== 'DRAW_FOREST') return;

    // @ts-ignore
    const drawer = new L.Draw.Polygon(map, {
        allowIntersection: false,
        guidelineDistance: 10,
        showArea: true,
        drawError: { color: '#e1e100', message: '<strong>Fehler:</strong> Kanten überschneiden sich!' },
        shapeOptions: { color: '#10b981', weight: 3, opacity: 1, fillOpacity: 0.2 }
    });

    drawerRef.current = drawer;
    drawer.enable();

    const onCreated = async (e: any) => {
      const layer = e.layer;
      const geoJson = layer.toGeoJSON();
      
      const calculatedAreaSqM = area(geoJson);
      const calculatedAreaHa = parseFloat((calculatedAreaSqM / 10000).toFixed(4));

      drawer.disable();
      map.addLayer(layer);

      setTimeout(async () => {
        const forestName = prompt(`Wie soll dieser Wald heißen? (ca. ${calculatedAreaHa.toFixed(2)} ha)`);
        
        if (!forestName) {
          map.removeLayer(layer);
          setMode('VIEW');
          return;
        }

        try {
          const result = await createForest({
            name: forestName,
            geoJson: geoJson,
            areaHa: calculatedAreaHa, 
            keycloakId: session?.user?.id as string,
          });

          if (result.success) {
            toast.success("Wald angelegt!");
            map.removeLayer(layer); 
            refreshData(); 
            // Optional: Den neuen Wald direkt selektieren
            if (result.forestId) selectFeature(result.forestId, 'FOREST');
          } else {
            toast.error("Fehler: " + result.error);
            map.removeLayer(layer);
          }
        } catch (err) {
          console.error(err);
          toast.error("Speichern fehlgeschlagen.");
          map.removeLayer(layer);
        } finally {
          setMode('VIEW');
        }
      }, 100);
    };

    map.on(L.Draw.Event.CREATED, onCreated);

    return () => {
      if (drawerRef.current) drawerRef.current.disable();
      map.off(L.Draw.Event.CREATED, onCreated);
    };
  }, [map, mode, session, setMode, refreshData, selectFeature]);


  // --- EDIT MODE (BESTEHEND BEARBEITEN) ---
  useEffect(() => {
    if (!map || mode !== 'EDIT_GEOMETRY' || !editingData) return;

    // 1. Layer erstellen
    const editLayer = L.geoJSON(editingData.geoJson, {
      style: { color: '#3b82f6', weight: 3, dashArray: '10, 10', fillOpacity: 0.4 }
    }).getLayers()[0] as L.Path;

    if (!editLayer) return;

    map.addLayer(editLayer);
    createdLayerRef.current = editLayer as L.Layer;

    // @ts-ignore
    if (editLayer.getBounds) map.fitBounds(editLayer.getBounds(), { padding: [50, 50], animate: true });

    // @ts-ignore
    const editHandler = new L.EditToolbar.Edit(map, {
        featureGroup: new L.FeatureGroup().addLayer(editLayer)
    });
    
    editHandler.enable();
    editToolbarRef.current = editHandler;
    setShowSaveBar(true);

    return () => {
      if (editToolbarRef.current) editToolbarRef.current.disable();
      if (createdLayerRef.current) map.removeLayer(createdLayerRef.current);
      setShowSaveBar(false);
    };
  }, [map, mode, editingData]);


  // --- SAVE / CANCEL LOGIC ---
  const handleSaveEdit = async () => {
    if (!createdLayerRef.current || !editingData) return;

    // @ts-ignore
    const newGeoJson = createdLayerRef.current.toGeoJSON();
    const calculatedAreaSqM = area(newGeoJson);
    const calculatedAreaHa = parseFloat((calculatedAreaSqM / 10000).toFixed(4));
    
    // ID merken, bevor wir editingData nullen
    const currentId = editingData.id;

    try {
       await updateForest({
          id: currentId,
          keycloakId: session?.user?.id as string,
          name: editingData.name, 
          geoJson: newGeoJson,
          areaHa: calculatedAreaHa,
          // Farbe etc. behalten wir bei (wird im Backend nicht überschrieben, wenn undefined)
       });
       
       toast.success("Grenzen aktualisiert!");
       refreshData();
    } catch (e) {
       toast.error("Fehler beim Update");
    } finally {
       setMode('VIEW');
       setEditingFeature(null);
       
       // UX FIX: Sidebar wieder öffnen für diesen Wald
       setTimeout(() => selectFeature(currentId, 'FOREST'), 100);
    }
  };

  const handleCancelEdit = () => {
    const currentId = editingData?.id;
    setMode('VIEW');
    setEditingFeature(null);
    // Auch bei Abbruch Sidebar wiederherstellen
    if (currentId) setTimeout(() => selectFeature(currentId, 'FOREST'), 100);
  };

  if (mode === 'EDIT_GEOMETRY' && showSaveBar) {
    return (
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[2000] flex gap-2 animate-in fade-in slide-in-from-top-4">
         <button 
           onClick={handleSaveEdit}
           className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-full shadow-2xl font-bold flex items-center gap-2 transition-transform active:scale-95 border border-green-500"
         >
            <Save size={18} /> Geometrie speichern
         </button>
         <button 
           onClick={handleCancelEdit}
           className="bg-white text-gray-700 hover:bg-gray-100 px-6 py-2.5 rounded-full shadow-2xl font-bold flex items-center gap-2 transition-transform active:scale-95"
         >
            <X size={18} /> Abbrechen
         </button>
      </div>
    );
  }

  return null;
}