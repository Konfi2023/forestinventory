import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * PostGIS-basierte räumliche Abfragen für Forest-Modell.
 * Nutzt prisma.$queryRaw da Prisma keine nativen PostGIS-Typen unterstützt.
 */

interface ForestSpatialResult {
  id: string;
  name: string;
  organizationId: string;
  areaHa: number | null;
  distanceKm?: number;
}

/** Wälder im Umkreis von radiusKm um einen Punkt (lat/lng) */
export async function findForestsNearby(
  lat: number,
  lng: number,
  radiusKm: number,
): Promise<ForestSpatialResult[]> {
  return prisma.$queryRaw<ForestSpatialResult[]>`
    SELECT
      id, name, "organizationId", "areaHa",
      ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography) / 1000.0 AS "distanceKm"
    FROM app."Forest"
    WHERE geom IS NOT NULL
      AND ST_DWithin(
        geom::geography,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        ${radiusKm * 1000}
      )
    ORDER BY "distanceKm" ASC
  `;
}

/** Wälder in einer Bounding Box */
export async function findForestsInBBox(
  minLat: number,
  minLng: number,
  maxLat: number,
  maxLng: number,
): Promise<ForestSpatialResult[]> {
  return prisma.$queryRaw<ForestSpatialResult[]>`
    SELECT id, name, "organizationId", "areaHa"
    FROM app."Forest"
    WHERE geom IS NOT NULL
      AND geom && ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326)
    ORDER BY name ASC
  `;
}

/** Echter geographischer Centroid eines Waldes */
export async function getForestCentroid(
  forestId: string,
): Promise<{ lat: number; lng: number } | null> {
  const result = await prisma.$queryRaw<{ lat: number; lng: number }[]>`
    SELECT
      ST_Y(ST_Centroid(geom)) AS lat,
      ST_X(ST_Centroid(geom)) AS lng
    FROM app."Forest"
    WHERE id = ${forestId} AND geom IS NOT NULL
  `;
  return result[0] ?? null;
}

/** Exakte geographische Fläche in Hektar */
export async function getForestAreaHa(
  forestId: string,
): Promise<number | null> {
  const result = await prisma.$queryRaw<{ ha: number }[]>`
    SELECT ST_Area(geom::geography) / 10000.0 AS ha
    FROM app."Forest"
    WHERE id = ${forestId} AND geom IS NOT NULL
  `;
  return result[0]?.ha ?? null;
}

/** Anzahl Wälder mit befüllter geom-Spalte vs. gesamt */
export async function getGeomCoverage(): Promise<{ total: number; withGeom: number }> {
  const result = await prisma.$queryRaw<{ total: bigint; with_geom: bigint }[]>`
    SELECT
      COUNT(*) AS total,
      COUNT(geom) AS with_geom
    FROM app."Forest"
  `;
  return {
    total: Number(result[0]?.total ?? 0),
    withGeom: Number(result[0]?.with_geom ?? 0),
  };
}
