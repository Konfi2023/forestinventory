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
    const toastId = toast.loading('Verarbeite Geodaten...');

    try {
      const fileBaseName = file.name.replace(/\.[^/.]+$/, '');
      const ext = file.name.toLowerCase().split('.').pop();

      // ── 1. Format erkennen & Parsen ───────────────────────────────────────

      let geoJsonData: any  = null;
      let skipped: { name: string; reason: string }[] = [];

      if (ext === 'gpkg') {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/convert/gpkg', { method: 'POST', body: formData });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: res.statusText }));
          throw new Error(err.error ?? 'GPKG-Konvertierung fehlgeschlagen');
        }
        const result = await res.json();
        geoJsonData = result;
        skipped     = result.skipped ?? [];

        // Warnungen vom Server anzeigen
        for (const w of result.warnings ?? []) {
          toast.warning(w, { duration: 6000 });
        }
      } else {
        const text = await file.text();
        if (ext === 'kml') {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(text, 'text/xml');
          geoJsonData = kml(xmlDoc);
        } else if (ext === 'json' || ext === 'geojson') {
          geoJsonData = JSON.parse(text);
        } else {
          throw new Error('Format nicht unterstützt. Bitte .kml, .geojson oder .gpkg nutzen.');
        }
      }

      // ── 2. Polygone extrahieren ───────────────────────────────────────────

      const extractedFeatures: any[] = [];

      const processGeometry = (geometry: any, name: string) => {
        if (!geometry) return;
        if (geometry.type === 'Polygon') {
          extractedFeatures.push({ type: 'Feature', geometry, properties: { name } });
        } else if (geometry.type === 'MultiPolygon') {
          geometry.coordinates.forEach((coords: any[], index: number) => {
            extractedFeatures.push({
              type: 'Feature',
              geometry: { type: 'Polygon', coordinates: coords },
              properties: { name: `${name} (${index + 1})` },
            });
          });
        } else if (geometry.type === 'GeometryCollection') {
          geometry.geometries.forEach((g: any) => processGeometry(g, name));
        }
      };

      const processFeature = (feature: any, fallbackName: string) => {
        const featName = feature.properties?.name || feature.properties?.Name;
        const name = featName?.trim() ? featName.trim() : fallbackName;
        if (feature.geometry) processGeometry(feature.geometry, name);
      };

      if (geoJsonData.type === 'FeatureCollection') {
        const features = geoJsonData.features.filter((f: any) => f.geometry);
        features.forEach((f: any, i: number) => {
          const fallback = features.length === 1 ? fileBaseName : `${fileBaseName} (${i + 1})`;
          processFeature(f, fallback);
        });
      } else if (geoJsonData.type === 'Feature') {
        processFeature(geoJsonData, fileBaseName);
      } else if (geoJsonData.type === 'GeometryCollection') {
        geoJsonData.geometries.forEach((g: any, i: number) => {
          const name = geoJsonData.geometries.length === 1 ? fileBaseName : `${fileBaseName} (${i + 1})`;
          processGeometry(g, name);
        });
      }

      // ── 3. Upload zur Datenbank ───────────────────────────────────────────

      if (extractedFeatures.length === 0) {
        toast.dismiss(toastId);
        // Übersprungene Features als Hinweis anzeigen
        if (skipped.length > 0) {
          toast.warning(
            `Keine importierbaren Flächen gefunden. ${skipped.length} Feature(s) übersprungen.`,
            { duration: 8000 }
          );
          skipped.slice(0, 3).forEach(s =>
            toast.info(`Übersprungen: ${s.name} — ${s.reason}`, { duration: 8000 })
          );
        } else {
          toast.warning('Keine gültigen Flächen (Polygone) gefunden.');
        }
        return;
      }

      let successCount = 0;
      for (const feature of extractedFeatures) {
        let calculatedAreaHa = 0;
        try {
          calculatedAreaHa = area(feature) / 10000;
        } catch (e) {
          console.warn('Konnte Fläche nicht berechnen', e);
        }
        const result = await createForest({
          name:        feature.properties.name,
          geoJson:     feature,
          areaHa:      calculatedAreaHa,
          keycloakId:  keycloakId,
          description: `Importiert aus ${file.name}`,
        });
        if (result.success) successCount++;
      }

      toast.dismiss(toastId);

      if (successCount > 0) {
        // Erfolg + ggf. Hinweis auf übersprungene
        if (skipped.length > 0) {
          toast.success(
            `${successCount} Fläche(n) importiert, ${skipped.length} übersprungen.`,
            { duration: 6000 }
          );
          skipped.slice(0, 3).forEach(s =>
            toast.info(`Übersprungen: ${s.name} — ${s.reason}`, { duration: 8000 })
          );
        } else {
          toast.success(`${successCount} Fläche(n) erfolgreich importiert!`);
        }
        onImportComplete();
      } else {
        toast.error('Import fehlgeschlagen. Bitte Datei prüfen.');
      }

    } catch (err: any) {
      console.error(err);
      toast.dismiss(toastId);
      toast.error('Import Fehler: ' + err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        type="file"
        accept=".kml,.json,.geojson,.gpkg"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
      />
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
        <span className="absolute left-full ml-3 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap border border-white/10 transition-opacity z-50 shadow-xl">
          KML / GPKG Importieren
        </span>
      </button>
    </>
  );
}
