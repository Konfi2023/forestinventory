/**
 * Tile-Pre-Cacher: Generiert Tile-URLs für eine Bounding-Box und lädt
 * sie per fetch(), damit Workbox sie im Cache ablegt.
 */

// Convert lat/lng to tile coords at a given zoom
function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { x, y };
}

export interface PrecacheProgress {
  total: number;
  cached: number;
  done: boolean;
}

type ProgressCallback = (p: PrecacheProgress) => void;

const CARTO_LIGHT = 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png';
const ESRI_SAT = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

function getTileUrls(
  bounds: { south: number; north: number; west: number; east: number },
  zoomMin: number,
  zoomMax: number,
  template: string,
): string[] {
  const urls: string[] = [];
  for (let z = zoomMin; z <= zoomMax; z++) {
    const topLeft = latLngToTile(bounds.north, bounds.west, z);
    const bottomRight = latLngToTile(bounds.south, bounds.east, z);
    const xMin = Math.min(topLeft.x, bottomRight.x);
    const xMax = Math.max(topLeft.x, bottomRight.x);
    const yMin = Math.min(topLeft.y, bottomRight.y);
    const yMax = Math.max(topLeft.y, bottomRight.y);
    for (let x = xMin; x <= xMax; x++) {
      for (let y = yMin; y <= yMax; y++) {
        urls.push(template.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y)));
      }
    }
  }
  return urls;
}

export async function precacheTiles(
  bounds: { south: number; north: number; west: number; east: number },
  onProgress: ProgressCallback,
  zoomMin = 10,
  zoomMax = 16,
  signal?: AbortSignal,
) {
  const urls = [
    ...getTileUrls(bounds, zoomMin, zoomMax, CARTO_LIGHT),
    ...getTileUrls(bounds, zoomMin, Math.min(zoomMax, 17), ESRI_SAT),
  ];

  const total = urls.length;
  let cached = 0;
  onProgress({ total, cached, done: false });

  // Fetch in batches of 6 to avoid flooding the network
  const BATCH = 6;
  for (let i = 0; i < urls.length; i += BATCH) {
    if (signal?.aborted) break;
    const batch = urls.slice(i, i + BATCH);
    await Promise.allSettled(
      batch.map(url =>
        fetch(url, { mode: 'no-cors', signal }).catch(() => {})
      )
    );
    cached = Math.min(i + BATCH, total);
    onProgress({ total, cached, done: false });
  }

  onProgress({ total, cached: total, done: true });
}

export function estimateTileCount(
  bounds: { south: number; north: number; west: number; east: number },
  zoomMin = 10,
  zoomMax = 16,
): number {
  return getTileUrls(bounds, zoomMin, zoomMax, '').length * 2; // both basemaps
}
