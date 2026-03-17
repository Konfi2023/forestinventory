"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/lib/rbac-middleware";
import { PERMISSIONS } from "@/lib/permissions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { deleteFile } from "@/lib/storage";

// ---------------------------------------------------------------------------
// Basis-POI  (create / update / delete)
// ---------------------------------------------------------------------------

export async function createPoi(data: {
  lat: number;
  lng: number;
  type: string;
  name?: string;
  orgSlug: string;
  userId: string;
  forestId: string;
}) {
  try {
    await requireAuthContext(data.userId, PERMISSIONS.FOREST_EDIT);

    await prisma.forestPoi.create({
      data: {
        lat: data.lat,
        lng: data.lng,
        type: data.type,
        name: data.name || getPoiName(data.type),
        forestId: data.forestId,
      },
    });

    revalidatePath("/dashboard/map");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updatePoi(
  poiId: string,
  data: { name?: string; note?: string; lat?: number; lng?: number }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");

    await requireAuthContext(session.user.id, PERMISSIONS.FOREST_EDIT);

    await prisma.forestPoi.update({
      where: { id: poiId },
      data: {
        name: data.name,
        note: data.note,
        lat: data.lat,
        lng: data.lng,
      },
    });

    revalidatePath("/dashboard/map");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deletePoi(poiId: string, deleteTasks?: boolean) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");

    await requireAuthContext(session.user.id, PERMISSIONS.FOREST_EDIT);

    // Bild aus S3 löschen falls vorhanden
    const existing = await prisma.forestPoi.findUnique({
      where: { id: poiId },
      include: { vehicle: { select: { imageKey: true } } },
    });
    if (existing?.vehicle?.imageKey) {
      await deleteFile(existing.vehicle.imageKey).catch(() => null);
    }

    // Aufgaben löschen (vor dem POI, damit kein SetNull greift)
    if (deleteTasks) {
      await prisma.task.deleteMany({ where: { poiId } });
    }

    await prisma.forestPoi.delete({ where: { id: poiId } });

    revalidatePath("/dashboard/map");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ---------------------------------------------------------------------------
// Fahrzeug-Daten  (upsert)
// ---------------------------------------------------------------------------

export type UpsertPoiVehicleInput = {
  vehicleType?: string;
  serialNumber?: string;
  yearBuilt?: number | null;
  lastInspection?: Date | null;
  nextInspection?: Date | null;
  imageKey?: string | null;
  notes?: string;
};

export async function upsertPoiVehicle(
  poiId: string,
  data: UpsertPoiVehicleInput
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");

    await requireAuthContext(session.user.id, PERMISSIONS.FOREST_EDIT);

    // Wenn ein neues Bild hochgeladen wurde, altes Bild aus S3 löschen
    if (data.imageKey !== undefined) {
      const existing = await prisma.forestPoiVehicle.findUnique({
        where: { poiId },
        select: { imageKey: true },
      });
      if (existing?.imageKey && existing.imageKey !== data.imageKey) {
        await deleteFile(existing.imageKey).catch(() => null);
      }
    }

    await prisma.forestPoiVehicle.upsert({
      where: { poiId },
      create: {
        poiId,
        vehicleType: (data.vehicleType as any) ?? "OTHER",
        serialNumber: data.serialNumber ?? null,
        yearBuilt: data.yearBuilt ?? null,
        lastInspection: data.lastInspection ?? null,
        nextInspection: data.nextInspection ?? null,
        imageKey: data.imageKey ?? null,
        notes: data.notes ?? null,
      },
      update: {
        vehicleType: data.vehicleType as any,
        serialNumber: data.serialNumber ?? null,
        yearBuilt: data.yearBuilt ?? null,
        lastInspection: data.lastInspection ?? null,
        nextInspection: data.nextInspection ?? null,
        ...(data.imageKey !== undefined ? { imageKey: data.imageKey } : {}),
        notes: data.notes ?? null,
      },
    });

    revalidatePath("/dashboard/map");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ---------------------------------------------------------------------------
// Baum-Daten  (upsert)
// ---------------------------------------------------------------------------

export type UpsertPoiTreeInput = {
  species?: string;
  age?: number | null;
  diameter?: number | null;
  height?: number | null;
  health?: string;
  damageType?: string | null;
  damageSeverity?: number | null;
  crownCondition?: number | null;
  soilCondition?: string | null;
  soilMoisture?: string | null;
  exposition?: string | null;
  slopeClass?: string | null;
  slopePosition?: string | null;
  standType?: string | null;
  stockingDegree?: string | null;
  notes?: string;
  imageKey?: string | null;
};

export async function upsertPoiTree(poiId: string, data: UpsertPoiTreeInput) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");

    await requireAuthContext(session.user.id, PERMISSIONS.FOREST_EDIT);

    const co2 =
      data.diameter && data.height
        ? calculateCo2(data.species ?? "", data.diameter, data.height)
        : null;

    // Altes Bild löschen wenn ein neues gesetzt wird
    if (data.imageKey !== undefined) {
      const existing = await prisma.forestPoiTree.findUnique({
        where: { poiId },
        select: { imageKey: true },
      });
      if (existing?.imageKey && existing.imageKey !== data.imageKey) {
        await deleteFile(existing.imageKey).catch(() => null);
      }
    }

    const treeData = {
      species:        data.species        ?? null,
      age:            data.age            ?? null,
      diameter:       data.diameter       ?? null,
      height:         data.height         ?? null,
      health:         (data.health as any) ?? "HEALTHY",
      co2Storage:     co2,
      damageType:     data.damageType     ?? null,
      damageSeverity: data.damageSeverity ?? null,
      crownCondition: data.crownCondition ?? null,
      soilCondition:  (data.soilCondition  as any) ?? null,
      soilMoisture:   (data.soilMoisture   as any) ?? null,
      exposition:     (data.exposition     as any) ?? null,
      slopeClass:     (data.slopeClass     as any) ?? null,
      slopePosition:  (data.slopePosition  as any) ?? null,
      standType:      (data.standType      as any) ?? null,
      stockingDegree: (data.stockingDegree as any) ?? null,
      notes:          data.notes          ?? null,
      ...(data.imageKey !== undefined ? { imageKey: data.imageKey } : {}),
    };

    await prisma.forestPoiTree.upsert({
      where:  { poiId },
      create: { poiId, ...treeData },
      update: treeData,
    });

    // Phase 2: Messung als Zeitreiheneintrag speichern (nur wenn Messwerte vorhanden)
    if (data.diameter || data.height || data.health) {
      await prisma.treeMeasurement.create({
        data: {
          poiId,
          measuredById:  session.user.id,
          diameter:      data.diameter       ?? null,
          height:        data.height         ?? null,
          age:           data.age            ?? null,
          co2Storage:    co2,
          health:        (data.health as any) ?? "HEALTHY",
          damageType:    data.damageType     ?? null,
          damageSeverity:data.damageSeverity ?? null,
          crownCondition:data.crownCondition ?? null,
          soilMoisture:  (data.soilMoisture  as any) ?? null,
          notes:         data.notes          ?? null,
          imageKey:      data.imageKey       ?? null,
        },
      });
    }

    revalidatePath("/dashboard/map");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ---------------------------------------------------------------------------
// Polter-Daten (Festmeter + Stammlänge)
// ---------------------------------------------------------------------------

export async function upsertPoiLogPile(
  poiId: string,
  data: {
    volumeFm?: number | null;
    logLength?: number | null;
    layerCount?: number | null;
    treeSpecies?: string | null;
    woodType?: string | null;
    qualityClass?: string | null;
    imageKey?: string | null;
    notes?: string;
  },
  orgSlug?: string,
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");
    await requireAuthContext(session.user.id, PERMISSIONS.FOREST_EDIT);

    await prisma.forestPoiLogPile.upsert({
      where: { poiId },
      create: {
        poiId,
        volumeFm:    data.volumeFm    ?? null,
        logLength:   data.logLength   ?? null,
        layerCount:  data.layerCount  ?? null,
        treeSpecies: data.treeSpecies ?? null,
        woodType:    data.woodType    ?? null,
        qualityClass:data.qualityClass?? null,
        imageKey:    data.imageKey    ?? null,
        notes:       data.notes       ?? null,
      },
      update: {
        volumeFm:    data.volumeFm    ?? null,
        logLength:   data.logLength   ?? null,
        layerCount:  data.layerCount  ?? null,
        treeSpecies: data.treeSpecies ?? null,
        woodType:    data.woodType    ?? null,
        qualityClass:data.qualityClass?? null,
        ...(data.imageKey !== undefined ? { imageKey: data.imageKey } : {}),
        notes:       data.notes       ?? null,
      },
    });

    // Verknüpfte LogPile-Einträge (Maßnahmen-Tabelle) synchron halten
    const syncData: Record<string, any> = {};
    if (data.logLength   !== undefined) syncData.logLength   = data.logLength;
    if (data.volumeFm    !== undefined) syncData.estimatedAmount = data.volumeFm;
    if (data.treeSpecies !== undefined) syncData.treeSpecies = data.treeSpecies;
    if (data.woodType    !== undefined) syncData.woodType    = data.woodType;
    if (data.qualityClass!== undefined) syncData.qualityClass= data.qualityClass;
    if (Object.keys(syncData).length > 0) {
      await prisma.logPile.updateMany({
        where: { forestPoiId: poiId },
        data: syncData,
      });
    }

    revalidatePath("/dashboard/map");
    if (orgSlug) revalidatePath(`/dashboard/org/${orgSlug}/operations`);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ---------------------------------------------------------------------------
// Polter → Maßnahme verknüpfen (aus dem Karten-Detailpanel heraus)
// ---------------------------------------------------------------------------

export async function getOperationsForOrg(orgSlug: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { ops: [], error: null };

    const org = await prisma.organization.findUnique({
      where: { slug: orgSlug },
      select: { id: true },
    });
    if (!org) return { ops: [], error: "Organisation nicht gefunden" };

    const ops = await prisma.operation.findMany({
      where: {
        forest: { organizationId: org.id },
        status: { not: "CANCELLED" as any },
      },
      select: {
        id: true, title: true, year: true, status: true,
        forest: { select: { id: true, name: true } },
      },
      orderBy: [{ year: "desc" }, { title: "asc" }],
    });
    return { ops, error: null };
  } catch (e: any) {
    return { ops: [], error: e.message ?? "Unbekannter Fehler" };
  }
}

export async function linkPoiToOperation(
  poiId: string,
  operationId: string,
  orgSlug: string,
  data: {
    treeSpecies?: string;
    woodType?: string;
    qualityClass?: string;
    estimatedAmount?: number;
  }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");

    // Load POI for coordinates and name
    const poi = await prisma.forestPoi.findUnique({
      where: { id: poiId },
      select: { lat: true, lng: true, name: true, logPile: true },
    });
    if (!poi) throw new Error("POI nicht gefunden");

    // Check if already linked to this operation
    const existing = await prisma.logPile.findFirst({
      where: { forestPoiId: poiId, operationId },
    });
    if (existing) throw new Error("Dieser Polter ist dieser Maßnahme bereits zugewiesen");

    await prisma.logPile.create({
      data: {
        operationId,
        forestPoiId:     poiId,
        name:            poi.name ?? undefined,
        lat:             poi.lat,
        lng:             poi.lng,
        treeSpecies:     data.treeSpecies  || poi.logPile?.treeSpecies || undefined,
        woodType:        (data.woodType    || poi.logPile?.woodType    || "LOG") as any,
        qualityClass:    data.qualityClass || poi.logPile?.qualityClass || undefined,
        estimatedAmount: data.estimatedAmount ?? poi.logPile?.volumeFm ?? undefined,
      },
    });

    revalidatePath(`/dashboard/org/${orgSlug}/operations`);
    revalidatePath("/dashboard/map");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ---------------------------------------------------------------------------
// CO2-Berechnung  (server-seitig, artspezifische Holzdichten)
// ---------------------------------------------------------------------------

const WOOD_DENSITY: Record<string, number> = {
  eiche: 730,
  quercus: 730,
  buche: 720,
  fagus: 720,
  fichte: 460,
  picea: 460,
  kiefer: 510,
  pinus: 510,
  douglasie: 530,
  pseudotsuga: 530,
  lärche: 590,
  larix: 590,
  tanne: 450,
  abies: 450,
  birke: 650,
  betula: 650,
  erle: 560,
  alnus: 560,
  esche: 690,
  fraxinus: 690,
  ahorn: 640,
  acer: 640,
  pappel: 420,
  populus: 420,
};

const DEFAULT_DENSITY = 550;

/**
 * Schätzt die CO2-Speicherleistung eines Einzelbaums in kg.
 *
 * Formel: CO₂ = Volumen × Holzdichte × Kohlenstoffanteil × (44/12)
 * Volumen = π/4 × (BHD/100)² × Höhe × Formzahl(0.45)
 */
function calculateCo2(
  species: string,
  diameterCm: number,
  heightM: number
): number {
  const key = species.toLowerCase().split(" ")[0];
  const density = WOOD_DENSITY[key] ?? DEFAULT_DENSITY;

  const volumeM3 =
    (Math.PI / 4) * Math.pow(diameterCm / 100, 2) * heightM * 0.45;
  const biomassDryKg = volumeM3 * density;
  const co2Kg = biomassDryKg * 0.5 * (44 / 12);

  return Math.round(co2Kg * 10) / 10;
}

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

function getPoiName(type: string): string {
  switch (type) {
    case "HUNTING_STAND":
      return "Hochsitz";
    case "LOG_PILE":
      return "Holzpolter";
    case "BARRIER":
      return "Schranke";
    case "HUT":
      return "Hütte";
    case "VEHICLE":
      return "Fahrzeug";
    case "TREE":
      return "Einzelbaum";
    default:
      return "Objekt";
  }
}
