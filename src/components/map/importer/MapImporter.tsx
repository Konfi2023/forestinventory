'use client';

import { useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { createForest } from '@/actions/forest';
// @ts-ignore
import { kml } from '@mapbox/togeojson';
import area from '@turf/area';

interface Props {
  orgSlug: string;
  onImportComplete: () => void;
  keycloakId: string;
}

export function MapImporter({ orgSlug, onImportComplete, keycloakId }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const toastId = toast.loading("Verarbeite Geodaten...");

    const reader = new FileReader();
    
    reader.onload = async (event) => {
        try {
            const text = event.target?.result as string;
            let geoJsonData: any = null;

            // 1. Format erkennen & Parsen
            if (file.name.toLowerCase().endsWith('.kml')) {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(text, 'text/xml');
                geoJsonData = kml(xmlDoc);
            } else if (file.name.toLowerCase().endsWith('.json') || file.name.toLowerCase().endsWith('.geojson')) {
                geoJsonData = JSON.parse(text);
            } else {
                throw new Error("Format nicht unterstützt. Bitte .kml oder .geojson nutzen.");
            }

            // 2. Polygone extrahieren (Rekursive Logik für verschachtelte Geometrien)
            const extractedFeatures: any[] = [];
            
            const processGeometry = (geometry: any, name: string) => {
                if (!geometry) return;

                if (geometry.type === 'Polygon') {
                    extractedFeatures.push({
                        type: 'Feature',
                        geometry: geometry,
                        properties: { name }
                    });
                } 
                else if (geometry.type === 'MultiPolygon') {
                    // MultiPolygons in einzelne Polygone aufteilen für bessere Verwaltung
                    geometry.coordinates.forEach((coords: any[], index: number) => {
                        extractedFeatures.push({
                            type: 'Feature',
                            geometry: { type: 'Polygon', coordinates: coords },
                            properties: { name: `${name} (${index + 1})` }
                        });
                    });
                }
                else if (geometry.type === 'GeometryCollection') {
                    geometry.geometries.forEach((g: any) => processGeometry(g, name));
                }
            };

            const processFeature = (feature: any) => {
                // Name aus verschiedenen KML/GeoJSON Properties raten
                const name = feature.properties?.name || feature.properties?.Name || "Unbenannt";
                if (feature.geometry) {
                    processGeometry(feature.geometry, name);
                }
            };

            // Startpunkt der Traversierung
            if (geoJsonData.type === 'FeatureCollection') {
                geoJsonData.features.forEach((f: any) => processFeature(f));
            } else if (geoJsonData.type === 'Feature') {
                processFeature(geoJsonData);
            } else if (geoJsonData.type === 'GeometryCollection') {
                geoJsonData.geometries.forEach((g: any) => processGeometry(g, "Import"));
            }

            // 3. Upload zur Datenbank
            if (extractedFeatures.length === 0) {
                toast.dismiss(toastId);
                toast.warning("Keine gültigen Flächen (Polygone) gefunden.");
                setIsUploading(false);
                return;
            }

            let successCount = 0;
            for (const feature of extractedFeatures) {
                // Fläche berechnen (qm -> ha)
                let calculatedAreaHa = 0;
                try {
                    const areaSqM = area(feature);
                    calculatedAreaHa = areaSqM / 10000;
                } catch (e) {
                    console.warn("Konnte Fläche nicht berechnen", e);
                }

                const result = await createForest({
                    name: feature.properties.name,
                    geoJson: feature,
                    areaHa: calculatedAreaHa,
                    keycloakId: keycloakId,
                    description: `Importiert aus ${file.name}`
                });

                if (result.success) successCount++;
            }

            toast.dismiss(toastId);
            if (successCount > 0) {
                toast.success(`${successCount} Flächen erfolgreich importiert!`);
                onImportComplete(); // Trigger Map Refresh
            } else {
                toast.error("Import fehlgeschlagen. Bitte Datei prüfen.");
            }

        } catch (err: any) {
            console.error(err);
            toast.dismiss(toastId);
            toast.error("Import Fehler: " + err.message);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = ''; 
        }
    };

    reader.readAsText(file);
  };

  return (
    <>
      <input
        type="file"
        accept=".kml,.json,.geojson"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
      />
      
      {/* 
          Button im "Dock-Style" 
          Passt sich optisch an MapToolbar.tsx an
      */}
      <button 
        className="p-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200 flex items-center justify-center relative group"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
      >
        {isUploading ? (
            <Loader2 className="animate-spin w-5 h-5 text-[#10b981]" />
        ) : (
            <Upload className="w-5 h-5 group-hover:text-white" />
        )}

        {/* Tooltip, der nach rechts ausfährt */}
        <span className="absolute left-full ml-3 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap border border-white/10 transition-opacity z-50 shadow-xl">
            KML Importieren
        </span>
      </button>
    </>
  );
}