/**
 * Utilities for preparing GeoJSON for EUDR TRACES NT API submission.
 *
 * EUDR requirements (Verordnung EU 2023/1115 / GeoJSON File Description v1.5):
 * - Coordinates in EPSG:4326 (WGS84), order: [longitude, latitude]
 * - Only Polygon geometry (no MultiPolygon, no LineString)
 * - Polygon must be closed (first point === last point)
 * - No holes (only outer ring)
 * - Max 6 decimal places
 * - Max file size 25 MB
 * - Optional properties: ProductionPlace, ProducerCountry (ISO-3166-1 alpha-2), Area (ha)
 */

export interface EudrGeoJson {
  type: "FeatureCollection";
  features: EudrFeature[];
}

export interface EudrFeature {
  type: "Feature";
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
  properties: {
    ProductionPlace?: string;
    ProducerCountry?: string;
    Area?: number;
    [key: string]: unknown;
  };
}

/**
 * Validates a stored Forest.geoJson for EUDR compliance.
 * Returns a list of validation error messages (empty = valid).
 */
export function validateForEudr(geoJson: unknown): string[] {
  const errors: string[] = [];

  if (!geoJson || typeof geoJson !== "object") {
    errors.push("Kein GeoJSON vorhanden.");
    return errors;
  }

  const geo = geoJson as Record<string, unknown>;
  const geomType = geo.type as string;

  // Accept FeatureCollection, Feature, or bare Geometry
  let geometry: Record<string, unknown> | null = null;

  if (geomType === "FeatureCollection") {
    const features = geo.features as Array<Record<string, unknown>> | undefined;
    if (!features || features.length === 0) {
      errors.push("FeatureCollection enthält keine Features.");
      return errors;
    }
    const firstFeature = features[0];
    geometry = firstFeature.geometry as Record<string, unknown>;
  } else if (geomType === "Feature") {
    geometry = geo.geometry as Record<string, unknown>;
  } else {
    // bare geometry
    geometry = geo;
  }

  if (!geometry) {
    errors.push("Geometry fehlt.");
    return errors;
  }

  if (geometry.type !== "Polygon") {
    errors.push(
      `Geometry-Typ '${geometry.type}' nicht unterstützt. Nur Polygon erlaubt (EUDR-Anforderung).`
    );
    return errors;
  }

  const coords = geometry.coordinates as number[][][] | undefined;
  if (!coords || coords.length === 0) {
    errors.push("Polygon hat keine Koordinaten.");
    return errors;
  }

  if (coords.length > 1) {
    errors.push(
      "Polygon enthält Löcher (inner rings). EUDR erlaubt nur einfache Polygone ohne Aussparungen."
    );
  }

  const ring = coords[0];
  if (!ring || ring.length < 4) {
    errors.push("Polygon-Ring hat weniger als 4 Punkte (mind. 3 + Schlusspunkt erforderlich).");
    return errors;
  }

  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    // Not a hard error — we auto-fix this when building the payload
  }

  return errors;
}

/**
 * Converts a stored Forest.geoJson into an EUDR-compliant GeoJSON FeatureCollection.
 * - Ensures polygon is closed
 * - Rounds coordinates to 6 decimal places
 * - Adds optional EUDR properties
 */
export function toEudrGeoJson(
  geoJson: unknown,
  options?: {
    productionPlace?: string;
    producerCountry?: string;
    areaHa?: number;
  }
): EudrGeoJson {
  const geo = geoJson as Record<string, unknown>;
  const geomType = geo.type as string;

  let geometry: Record<string, unknown>;

  if (geomType === "FeatureCollection") {
    const features = geo.features as Array<Record<string, unknown>>;
    geometry = features[0].geometry as Record<string, unknown>;
  } else if (geomType === "Feature") {
    geometry = geo.geometry as Record<string, unknown>;
  } else {
    geometry = geo;
  }

  const rawCoords = geometry.coordinates as number[][][];
  const outerRing = rawCoords[0]; // drop holes

  // Round to 6 decimal places
  const rounded = outerRing.map(([lng, lat]) => [
    Math.round(lng * 1_000_000) / 1_000_000,
    Math.round(lat * 1_000_000) / 1_000_000,
  ]);

  // Ensure closed
  const first = rounded[0];
  const last = rounded[rounded.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    rounded.push([...first]);
  }

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [rounded],
        },
        properties: {
          ...(options?.productionPlace && { ProductionPlace: options.productionPlace }),
          ...(options?.producerCountry && { ProducerCountry: options.producerCountry }),
          ...(options?.areaHa !== undefined && { Area: options.areaHa }),
        },
      },
    ],
  };
}

/** Serialises an EUDR GeoJSON to a compact string and checks the 25 MB limit. */
export function serializeEudrGeoJson(geo: EudrGeoJson): string {
  const json = JSON.stringify(geo);
  const bytes = new TextEncoder().encode(json).length;
  if (bytes > 25 * 1024 * 1024) {
    throw new Error(
      `GeoJSON ist ${(bytes / 1024 / 1024).toFixed(1)} MB groß — EUDR-Limit beträgt 25 MB.`
    );
  }
  return json;
}
