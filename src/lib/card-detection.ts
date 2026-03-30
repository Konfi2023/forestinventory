/**
 * Detects two bright magenta markers on the Forest Manager Messkarte.
 *
 * The markers are bright magenta circles (R>200, G<80, B>200) placed
 * 76.0 mm apart (center to center) on a credit-card-sized reference card.
 *
 * Detection algorithm:
 * 1. Downscale image for performance
 * 2. Scan all pixels for magenta range
 * 3. Cluster magenta pixels into groups (simple connected-component)
 * 4. Find the two largest clusters
 * 5. Return their centers
 */

const MARKER_DISTANCE_MM = 76.0;
const MAX_DIM = 800; // Downscale for performance

interface Point { x: number; y: number }

export interface CardDetectionResult {
  found: boolean;
  marker1: Point; // In original image coordinates
  marker2: Point;
  pixelsPerMm: number;
}

export function detectCardMarkers(img: HTMLImageElement): CardDetectionResult {
  const fail: CardDetectionResult = { found: false, marker1: { x: 0, y: 0 }, marker2: { x: 0, y: 0 }, pixelsPerMm: 0 };

  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  if (!iw || !ih) return fail;

  // Downscale
  const scale = Math.min(1, MAX_DIM / Math.max(iw, ih));
  const w = Math.round(iw * scale);
  const h = Math.round(ih * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;

  // Find magenta pixels (R>180, G<100, B>180)
  const magentaPixels: Point[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (r > 180 && g < 100 && b > 180) {
        magentaPixels.push({ x, y });
      }
    }
  }

  if (magentaPixels.length < 10) return fail;

  // Simple clustering: K-means with K=2
  // Initialize with leftmost and rightmost magenta pixels
  magentaPixels.sort((a, b) => a.x - b.x);
  let c1 = { ...magentaPixels[0] };
  let c2 = { ...magentaPixels[magentaPixels.length - 1] };

  for (let iter = 0; iter < 10; iter++) {
    const g1: Point[] = [];
    const g2: Point[] = [];
    for (const p of magentaPixels) {
      const d1 = (p.x - c1.x) ** 2 + (p.y - c1.y) ** 2;
      const d2 = (p.x - c2.x) ** 2 + (p.y - c2.y) ** 2;
      if (d1 <= d2) g1.push(p); else g2.push(p);
    }
    if (g1.length === 0 || g2.length === 0) return fail;
    c1 = { x: g1.reduce((s, p) => s + p.x, 0) / g1.length, y: g1.reduce((s, p) => s + p.y, 0) / g1.length };
    c2 = { x: g2.reduce((s, p) => s + p.x, 0) / g2.length, y: g2.reduce((s, p) => s + p.y, 0) / g2.length };
  }

  // Validate: both clusters should have reasonable size
  const dist = Math.sqrt((c2.x - c1.x) ** 2 + (c2.y - c1.y) ** 2);
  if (dist < 20) return fail; // markers too close = noise

  // Convert back to original image coordinates
  const marker1 = { x: c1.x / scale, y: c1.y / scale };
  const marker2 = { x: c2.x / scale, y: c2.y / scale };
  const distOriginal = dist / scale;
  const pixelsPerMm = distOriginal / MARKER_DISTANCE_MM;

  return { found: true, marker1, marker2, pixelsPerMm };
}
