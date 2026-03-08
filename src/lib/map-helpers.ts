import { Feature, Geometry, Position } from 'geojson';
import L from 'leaflet';

/**
 * Konvertiert GeoJSON Koordinaten [lng, lat] in Leaflet [lat, lng].
 * Behandelt Polygon und MultiPolygon.
 */
export function geoJSONToLeaflet(geoJson: any): { lat: number; lng: number }[][] {
  if (!geoJson || !geoJson.geometry) return [];

  const type = geoJson.geometry.type;
  const coords = geoJson.geometry.coordinates;

  const flip = (pair: number[]) => ({ lat: pair[1], lng: pair[0] });

  try {
    if (type === 'Polygon') {
      // Ein Polygon ist ein Array von Ringen (Außenring + Löcher)
      // Wir nehmen hier vereinfacht den Außenring [0]
      return [coords[0].map(flip)];
    } 
    else if (type === 'MultiPolygon') {
      // Ein MultiPolygon ist ein Array von Polygonen
      return coords.map((poly: any[]) => poly[0].map(flip));
    }
    // Fallback für LineStrings (Wege)
    else if (type === 'LineString') {
      return [coords.map(flip)];
    }
  } catch (e) {
    console.error("GeoJSON Parse Error:", e);
    return [];
  }
  
  return [];
}

/**
 * Berechnet den Mittelpunkt (Centroid) für Auto-Zoom
 */
export function getCenterOfBounds(polygons: { lat: number; lng: number }[][]): [number, number] | null {
  if (polygons.length === 0 || polygons[0].length === 0) return null;
  
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;

  polygons.flat().forEach(p => {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  });

  return [(minLat + maxLat) / 2, (minLng + maxLng) / 2];
}
/**
 * NEU: Berechnet die Bounding Box (Grenzen) für ein GeoJSON Objekt.
 * Wird genutzt, um die Kamera optimal auf einen Wald zu zoomen (Hybrid-Lösung).
 */
export function getBoundsFromGeoJson(geoJson: any): [[number, number], [number, number]] | null {
  const leafletCoords = geoJSONToLeaflet(geoJson);
  if (leafletCoords.length === 0) return null;

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  // Alle Punkte durchgehen und Extremwerte finden
  leafletCoords.forEach(ring => {
    ring.forEach(p => {
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
    });
  });

  if (minLat === Infinity) return null;

  // Rückgabe im Format [[lat1, lng1], [lat2, lng2]]
  return [
    [minLat, minLng],
    [maxLat, maxLng]
  ];
}

/**
 * Konvertiert GeoJSON LineString → L.LatLngExpression[] für <Polyline>.
 */
export function geoJSONLineToLeaflet(geoJson: any): L.LatLngExpression[] {
  if (!geoJson) return [];
  const coords = geoJson.geometry?.coordinates ?? geoJson.coordinates;
  if (!coords || !Array.isArray(coords)) return [];
  try {
    return coords.map((pair: number[]) => [pair[1], pair[0]] as L.LatLngExpression);
  } catch {
    return [];
  }
}

/**
 * Berechnet die Länge eines GeoJSON-LineStrings in Metern (Haversine).
 */
export function calculatePathLengthM(geoJson: any): number {
  const points = geoJSONLineToLeaflet(geoJson) as [number, number][];
  if (points.length < 2) return 0;

  const R = 6371000; // Erdradius in Metern
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const [lat1, lng1] = points[i - 1];
    const [lat2, lng2] = points[i];
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    total += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  return Math.round(total);
}