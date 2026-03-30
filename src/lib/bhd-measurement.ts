/**
 * Credit card detection and BHD calculation using OpenCV.js.
 *
 * ISO 7810 credit card: 85.6 mm × 54.0 mm (aspect ratio ~1.585:1)
 * The card is detected as a quadrilateral with matching aspect ratio.
 * Scale (px/mm) is derived from the card's longer edge.
 */

const CARD_WIDTH_MM = 85.6;
const CARD_HEIGHT_MM = 54.0;
const CARD_ASPECT = CARD_WIDTH_MM / CARD_HEIGHT_MM; // ~1.585
const ASPECT_TOLERANCE = 0.35; // allow perspective distortion

export interface CardDetectionResult {
  found: boolean;
  corners: { x: number; y: number }[];
  pixelsPerMm: number;
  cardWidthPx: number;
}

export interface BhdResult {
  bhdCm: number;
  method: 'CARD';
}

/**
 * Detect credit card rectangle in an image.
 * @param cv - The OpenCV.js module
 * @param imgElement - An HTMLImageElement with the photo loaded
 * @param maxDim - Downscale image to this max dimension for performance
 */
export function detectCreditCard(
  cv: any,
  imgElement: HTMLImageElement,
  maxDim = 1600,
): CardDetectionResult {
  // Draw image to canvas
  const canvas = document.createElement('canvas');
  let w = imgElement.naturalWidth;
  let h = imgElement.naturalHeight;
  const scale = Math.min(1, maxDim / Math.max(w, h));
  w = Math.round(w * scale);
  h = Math.round(h * scale);
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(imgElement, 0, 0, w, h);

  const src = cv.imread(canvas);
  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  const edges = new cv.Mat();
  const dilated = new cv.Mat();
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();

  try {
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
    cv.Canny(blurred, edges, 40, 120);

    // Dilate to close gaps
    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
    cv.dilate(edges, dilated, kernel);
    kernel.delete();

    cv.findContours(dilated, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    let bestScore = Infinity;
    let bestCorners: { x: number; y: number }[] = [];
    let bestCardWidthPx = 0;

    const imgArea = w * h;
    const minArea = imgArea * 0.003; // card must be at least 0.3% of image
    const maxArea = imgArea * 0.5;   // and at most 50%

    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const peri = cv.arcLength(contour, true);
      const approx = new cv.Mat();

      cv.approxPolyDP(contour, approx, 0.02 * peri, true);

      if (approx.rows === 4) {
        const area = cv.contourArea(approx);
        if (area < minArea || area > maxArea) { approx.delete(); continue; }

        // Get the 4 corners
        const corners: { x: number; y: number }[] = [];
        for (let j = 0; j < 4; j++) {
          corners.push({ x: approx.data32S[j * 2] / scale, y: approx.data32S[j * 2 + 1] / scale });
        }

        // Compute side lengths
        const sides = [];
        for (let j = 0; j < 4; j++) {
          const a = corners[j];
          const b = corners[(j + 1) % 4];
          sides.push(Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2));
        }

        // Group into long and short sides
        sides.sort((a, b) => a - b);
        const shortSide = (sides[0] + sides[1]) / 2;
        const longSide = (sides[2] + sides[3]) / 2;
        const aspect = longSide / shortSide;

        // Check aspect ratio match
        const aspectDiff = Math.abs(aspect - CARD_ASPECT);
        if (aspectDiff > ASPECT_TOLERANCE) { approx.delete(); continue; }

        // Score: closer to ideal aspect ratio is better
        if (aspectDiff < bestScore) {
          bestScore = aspectDiff;
          bestCorners = corners;
          bestCardWidthPx = longSide; // longer side = card width (85.6mm)
        }
      }
      approx.delete();
    }

    if (bestCorners.length === 4) {
      return {
        found: true,
        corners: bestCorners,
        pixelsPerMm: bestCardWidthPx / CARD_WIDTH_MM,
        cardWidthPx: bestCardWidthPx,
      };
    }

    return { found: false, corners: [], pixelsPerMm: 0, cardWidthPx: 0 };
  } finally {
    src.delete();
    gray.delete();
    blurred.delete();
    edges.delete();
    dilated.delete();
    contours.delete();
    hierarchy.delete();
  }
}

/**
 * Calculate BHD from two user-tapped trunk edge points.
 */
export function calculateBhd(
  leftPoint: { x: number; y: number },
  rightPoint: { x: number; y: number },
  pixelsPerMm: number,
): BhdResult {
  const distPx = Math.sqrt(
    (rightPoint.x - leftPoint.x) ** 2 + (rightPoint.y - leftPoint.y) ** 2,
  );
  const diameterMm = distPx / pixelsPerMm;
  const bhdCm = Math.round(diameterMm / 10 * 10) / 10; // round to 1 decimal
  return { bhdCm: Math.round(bhdCm), method: 'CARD' };
}
