import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import proj4 from 'proj4';

// ─── Bekannte Projektionen ────────────────────────────────────────────────────
// Häufige EPSG-Codes für Deutschland/Europa — erweitert bei Bedarf

const KNOWN_PROJECTIONS: Record<number, string> = {
  4326:  '+proj=longlat +datum=WGS84 +no_defs',                                          // WGS84
  4258:  '+proj=longlat +ellps=GRS80 +no_defs',                                           // ETRS89
  3857:  '+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs', // Web Mercator
  25831: '+proj=utm +zone=31 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',    // UTM 31N / ETRS89
  25832: '+proj=utm +zone=32 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',    // UTM 32N / ETRS89 ← häufigste DE-Projektion
  25833: '+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',    // UTM 33N / ETRS89
  31467: '+proj=tmerc +lat_0=0 +lon_0=9 +k=1 +x_0=3500000 +y_0=0 +ellps=bessel +datum=potsdam +units=m +no_defs', // Gauss-Krüger 3
  31468: '+proj=tmerc +lat_0=0 +lon_0=12 +k=1 +x_0=4500000 +y_0=0 +ellps=bessel +datum=potsdam +units=m +no_defs', // Gauss-Krüger 4
  32632: '+proj=utm +zone=32 +datum=WGS84 +units=m +no_defs',                            // UTM 32N / WGS84
  32633: '+proj=utm +zone=33 +datum=WGS84 +units=m +no_defs',                            // UTM 33N / WGS84
  2056:  '+proj=somerc +lat_0=46.9524055555556 +lon_0=7.43958333333333 +k_0=1 +x_0=2600000 +y_0=1200000 +ellps=bessel +towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs', // Schweiz LV95
  21781: '+proj=somerc +lat_0=46.9524055555556 +lon_0=7.43958333333333 +k_0=1 +x_0=600000 +y_0=200000 +ellps=bessel +towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs',   // Schweiz LV03
  31256: '+proj=tmerc +lat_0=0 +lon_0=13.3333333333333 +k=1 +x_0=0 +y_0=-5000000 +ellps=bessel +datum=hermannskogel +units=m +no_defs', // Österreich MGI M31
  31287: '+proj=lcc +lat_1=49 +lat_2=46 +lat_0=47.5 +lon_0=13.3333333333333 +x_0=400000 +y_0=400000 +ellps=bessel +datum=hermannskogel +units=m +no_defs', // Österreich Lambert
};

const WGS84 = '+proj=longlat +datum=WGS84 +no_defs';

// ─── Validierung ──────────────────────────────────────────────────────────────

// Erlaubte Bounding Box: Europa + etwas Puffer
const EUROPE_BOUNDS = { minLng: -30, maxLng: 45, minLat: 25, maxLat: 75 };
// Max. plausible Fläche für einen einzelnen Forst-Import (ha)
const MAX_AREA_HA = 500_000;

function isValidCoord(lng: number, lat: number): boolean {
  return (
    isFinite(lng) && isFinite(lat) &&
    lng >= -180 && lng <= 180 &&
    lat >= -90  && lat <= 90
  );
}

function isInEurope(lng: number, lat: number): boolean {
  return (
    lng >= EUROPE_BOUNDS.minLng && lng <= EUROPE_BOUNDS.maxLng &&
    lat >= EUROPE_BOUNDS.minLat && lat <= EUROPE_BOUNDS.maxLat
  );
}

function approxAreaHa(ring: [number, number][]): number {
  // Shoelace-Formel in Grad² → grobe Umrechnung in ha (1° lat ≈ 111km)
  let area = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    area += x1 * y2 - x2 * y1;
  }
  const areaDeg2 = Math.abs(area) / 2;
  const avgLat   = ring.reduce((s, c) => s + c[1], 0) / ring.length;
  const kmPerDegLng = 111.32 * Math.cos(avgLat * Math.PI / 180);
  const kmPerDegLat = 111.32;
  return areaDeg2 * kmPerDegLng * kmPerDegLat * 100; // km² → ha
}

// ─── Koordinaten-Transformation ───────────────────────────────────────────────

function getTransform(srsId: number): ((coord: [number, number]) => [number, number]) | null {
  if (srsId === 4326 || srsId === 4258) return (c) => c; // bereits WGS84
  const proj = KNOWN_PROJECTIONS[srsId];
  if (!proj) return null;
  return (coord: [number, number]) => {
    const result = proj4(proj, WGS84, coord);
    return [result[0], result[1]];
  };
}

// ─── WKB Parser ───────────────────────────────────────────────────────────────

function parseWkb(buf: Buffer, offset = 0): { geojson: any; end: number } {
  const byteOrder = buf.readUInt8(offset);
  const le = byteOrder === 1;

  const u32 = (o: number) => (le ? buf.readUInt32LE(o) : buf.readUInt32BE(o));
  const f64 = (o: number) => (le ? buf.readDoubleLE(o) : buf.readDoubleBE(o));

  const rawType  = u32(offset + 1);
  const hasZ     = (rawType & 0x80000000) !== 0;
  const hasM     = (rawType & 0x40000000) !== 0;
  const baseType = rawType & 0x0fffffff;
  const geomType =
    baseType > 3000 ? baseType - 3000 :
    baseType > 2000 ? baseType - 2000 :
    baseType > 1000 ? baseType - 1000 : baseType;
  const withZ      = hasZ || baseType > 1000;
  const withM      = hasM || (baseType > 2000 && baseType < 3000);
  const coordSize  = 16 + (withZ ? 8 : 0) + (withM ? 8 : 0);

  const readXY = (o: number): [number, number] => [f64(o), f64(o + 8)];

  const readRing = (o: number) => {
    const n = u32(o); o += 4;
    const coords: [number, number][] = [];
    for (let i = 0; i < n; i++) { coords.push(readXY(o)); o += coordSize; }
    return { coords, end: o };
  };

  let pos = offset + 5;

  if (geomType === 1) {
    return { geojson: { type: 'Point', coordinates: readXY(pos) }, end: pos + coordSize };
  }
  if (geomType === 2) {
    const n = u32(pos); pos += 4;
    const coords: [number, number][] = [];
    for (let i = 0; i < n; i++) { coords.push(readXY(pos)); pos += coordSize; }
    return { geojson: { type: 'LineString', coordinates: coords }, end: pos };
  }
  if (geomType === 3) {
    const numRings = u32(pos); pos += 4;
    const rings: [number, number][][] = [];
    for (let r = 0; r < numRings; r++) {
      const { coords, end } = readRing(pos);
      rings.push(coords); pos = end;
    }
    return { geojson: { type: 'Polygon', coordinates: rings }, end: pos };
  }
  if (geomType === 4) {
    const n = u32(pos); pos += 4;
    const pts: [number, number][] = [];
    for (let i = 0; i < n; i++) { const { geojson, end } = parseWkb(buf, pos); pts.push(geojson.coordinates); pos = end; }
    return { geojson: { type: 'MultiPoint', coordinates: pts }, end: pos };
  }
  if (geomType === 5) {
    const n = u32(pos); pos += 4;
    const lines: any[] = [];
    for (let i = 0; i < n; i++) { const { geojson, end } = parseWkb(buf, pos); lines.push(geojson.coordinates); pos = end; }
    return { geojson: { type: 'MultiLineString', coordinates: lines }, end: pos };
  }
  if (geomType === 6) {
    const n = u32(pos); pos += 4;
    const polys: any[] = [];
    for (let i = 0; i < n; i++) { const { geojson, end } = parseWkb(buf, pos); polys.push(geojson.coordinates); pos = end; }
    return { geojson: { type: 'MultiPolygon', coordinates: polys }, end: pos };
  }
  if (geomType === 7) {
    const n = u32(pos); pos += 4;
    const geoms: any[] = [];
    for (let i = 0; i < n; i++) { const { geojson, end } = parseWkb(buf, pos); geoms.push(geojson); pos = end; }
    return { geojson: { type: 'GeometryCollection', geometries: geoms }, end: pos };
  }
  throw new Error(`Unsupported WKB type: ${geomType}`);
}

// ─── GPKG Blob → GeoJSON (mit Transformation) ────────────────────────────────

function parseGpkgGeom(
  blob: Buffer,
  transform: ((c: [number, number]) => [number, number]) | null,
): { geojson: any; srsId: number } {
  if (blob[0] !== 0x47 || blob[1] !== 0x50) throw new Error('Kein gültiger GPKG-Geometry-Blob');
  const flags            = blob[3];
  const envelopeIndicator = (flags >> 1) & 0x07;
  const envelopeSizes    = [0, 32, 48, 64, 48];
  const wkbOffset        = 8 + (envelopeSizes[envelopeIndicator] ?? 0);

  const le    = (flags & 0x01) === 1;
  const srsId = le ? blob.readUInt32LE(4) : blob.readUInt32BE(4);

  const wkbBuf = blob.subarray(wkbOffset);
  let { geojson } = parseWkb(wkbBuf as unknown as Buffer);

  if (transform) {
    geojson = transformGeojson(geojson, transform);
  }

  return { geojson, srsId };
}

function transformGeojson(
  geojson: any,
  t: (c: [number, number]) => [number, number],
): any {
  const tc = (ring: [number, number][]) => ring.map(t);
  switch (geojson.type) {
    case 'Point':           return { ...geojson, coordinates: t(geojson.coordinates) };
    case 'LineString':      return { ...geojson, coordinates: tc(geojson.coordinates) };
    case 'Polygon':         return { ...geojson, coordinates: geojson.coordinates.map(tc) };
    case 'MultiPoint':      return { ...geojson, coordinates: geojson.coordinates.map(t) };
    case 'MultiLineString': return { ...geojson, coordinates: geojson.coordinates.map(tc) };
    case 'MultiPolygon':    return { ...geojson, coordinates: geojson.coordinates.map((p: any) => p.map(tc)) };
    default:                return geojson;
  }
}

// ─── Name-Feld ermitteln ──────────────────────────────────────────────────────

const NAME_CANDIDATES = ['name', 'Name', 'NAME', 'bezeichnung', 'Bezeichnung', 'label', 'id'];

function pickName(row: Record<string, any>, tableName: string, idx: number): string {
  for (const c of NAME_CANDIDATES) {
    if (row[c] != null && row[c] !== '') return String(row[c]);
  }
  for (const v of Object.values(row)) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return `${tableName} (${idx + 1})`;
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const tmpPath = path.join(tmpdir(), `gpkg_${randomUUID()}.gpkg`);
  try {
    const formData  = await req.formData();
    const file      = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'Keine Datei' }, { status: 400 });

    fs.writeFileSync(tmpPath, Buffer.from(await file.arrayBuffer()));

    const db = new Database(tmpPath, { readonly: true });

    // Feature-Tabellen aus gpkg_contents
    const contentRows = db.prepare(
      "SELECT table_name, identifier FROM gpkg_contents WHERE data_type = 'features'"
    ).all() as { table_name: string; identifier: string | null }[];

    if (!contentRows.length) {
      db.close();
      return NextResponse.json({ type: 'FeatureCollection', features: [], skipped: [] });
    }

    const features: any[]                         = [];
    const skipped:  { name: string; reason: string }[] = [];
    let   unknownSrs = false;

    for (const { table_name: tName, identifier } of contentRows) {
      const tId = identifier || tName;

      // Geometriespalte + SRS aus gpkg_geometry_columns
      const geomRows = db.prepare(
        'SELECT column_name, srs_id FROM gpkg_geometry_columns WHERE table_name = ?'
      ).all(tName) as { column_name: string; srs_id: number }[];
      if (!geomRows.length) continue;

      const { column_name: geomCol, srs_id: srsId } = geomRows[0];
      const transform = getTransform(srsId);

      if (!transform) {
        unknownSrs = true;
        skipped.push({ name: tId, reason: `Unbekannte Projektion EPSG:${srsId} — Feature-Tabelle übersprungen` });
        continue;
      }

      const rows = db.prepare(`SELECT * FROM "${tName}"`).all() as Record<string, any>[];

      for (const [idx, row] of rows.entries()) {
        const blob = row[geomCol];
        if (!blob) continue;

        const buf  = Buffer.isBuffer(blob) ? blob : Buffer.from(blob as ArrayBuffer);
        const name = pickName(row, tId, idx);

        try {
          const { geojson } = parseGpkgGeom(buf, transform);

          // ── Validierung ────────────────────────────────────────────────────

          // 1. Nur Polygone importieren
          if (geojson.type !== 'Polygon' && geojson.type !== 'MultiPolygon') {
            skipped.push({ name, reason: 'Kein Polygon (nur Flächen werden importiert)' });
            continue;
          }

          // 2. Koordinaten-Plausibilität
          const outerRing: [number, number][] =
            geojson.type === 'Polygon'
              ? geojson.coordinates[0]
              : geojson.coordinates[0][0];

          const allValid = outerRing.every(([lng, lat]) => isValidCoord(lng, lat));
          if (!allValid) {
            skipped.push({ name, reason: 'Ungültige Koordinaten nach Transformation' });
            continue;
          }

          // 3. Liegt das Polygon in Europa?
          const inEurope = outerRing.some(([lng, lat]) => isInEurope(lng, lat));
          if (!inEurope) {
            skipped.push({ name, reason: 'Koordinaten liegen nicht in Europa' });
            continue;
          }

          // 4. Fläche plausibel?
          const areaHa = approxAreaHa(outerRing);
          if (areaHa > MAX_AREA_HA) {
            skipped.push({ name, reason: `Fläche unrealistisch groß (${Math.round(areaHa).toLocaleString('de-DE')} ha)` });
            continue;
          }

          // ── Polygon(e) aufteilen bei MultiPolygon ──────────────────────────
          if (geojson.type === 'MultiPolygon') {
            geojson.coordinates.forEach((polyCoords: any, i: number) => {
              features.push({
                type: 'Feature',
                geometry: { type: 'Polygon', coordinates: polyCoords },
                properties: { name: `${name} (${i + 1})` },
              });
            });
          } else {
            features.push({
              type: 'Feature',
              geometry: geojson,
              properties: { name },
            });
          }

        } catch (e: any) {
          skipped.push({ name, reason: `Parse-Fehler: ${e.message}` });
        }
      }
    }

    db.close();

    return NextResponse.json({
      type: 'FeatureCollection',
      features,
      skipped,
      warnings: unknownSrs ? ['Einige Feature-Tabellen wurden übersprungen (unbekannte Projektion).'] : [],
    });

  } catch (err: any) {
    console.error('[GPKG]', err);
    return NextResponse.json({ error: err.message ?? 'Unbekannter Fehler' }, { status: 500 });
  } finally {
    try { fs.unlinkSync(tmpPath); } catch {}
  }
}
