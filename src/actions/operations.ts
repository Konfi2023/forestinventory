"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { OperationType, OperationStatus, PolterStatus, TimberSaleStatus, WoodType } from "@prisma/client";

async function getOrgId(slug: string, userId: string) {
  const m = await prisma.membership.findFirst({
    where: { userId, organization: { slug } },
    select: { organizationId: true },
  });
  if (!m) throw new Error("Kein Zugriff");
  return m.organizationId;
}

function revalidate(slug: string) {
  revalidatePath(`/dashboard/org/${slug}/operations`);
  revalidatePath(`/dashboard/org/${slug}/map`);
}

// ─── OPERATION ────────────────────────────────────────────────────────────────

export async function createOperation(orgSlug: string, data: {
  forestId: string;
  title: string;
  year: number;
  type: OperationType;
  description?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Nicht eingeloggt");
  await getOrgId(orgSlug, session.user.id);

  const op = await prisma.operation.create({ data });
  revalidate(orgSlug);
  return { success: true, id: op.id };
}

export async function updateOperation(orgSlug: string, id: string, data: {
  title?: string;
  status?: OperationStatus;
  description?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Nicht eingeloggt");

  // Kalamitäts-Verknüpfung vor dem Update lesen (für Kaskade)
  const existing = data.title !== undefined
    ? await prisma.operation.findUnique({ where: { id }, select: { calamityId: true } })
    : null;

  await prisma.operation.update({ where: { id }, data });

  // Titel-Kaskade: verknüpfte Kalamitätsfläche mitziehen
  if (data.title !== undefined && existing?.calamityId) {
    await prisma.forestCalamity.update({
      where: { id: existing.calamityId },
      data:  { description: data.title },
    });
    revalidatePath(`/dashboard/org/${orgSlug}/map`);
  }

  revalidate(orgSlug);
  return { success: true };
}

export async function deleteOperation(orgSlug: string, id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Nicht eingeloggt");

  await prisma.operation.delete({ where: { id } });
  revalidate(orgSlug);
  return { success: true };
}

// Labels für Kalamitäts-Ursachen (identisch zu CalamityDetailView)
const CAUSE_LABELS: Record<string, string> = {
  WIND:        'Windwurf',
  BARK_BEETLE: 'Borkenkäfer',
  FIRE:        'Brand',
  SNOW:        'Schneebruch',
  DROUGHT:     'Trockenheit',
  OTHER:       'Sonstiges',
};

function calamityTitle(calamity: { cause: string | null; description: string | null }): string {
  if (calamity.description) return calamity.description;
  if (calamity.cause) return CAUSE_LABELS[calamity.cause] ?? calamity.cause;
  return 'Kalamitätsfläche';
}

/**
 * Erstellt eine Maßnahme aus einer Kalamitätsfläche.
 * Name, Titel und Verknüpfung sind identisch — bei Änderung des Kalamitäts-
 * namens wird der Maßnahmentitel automatisch mitgeführt (via updateCalamity).
 */
export async function createOperationFromCalamity(
  orgSlug: string,
  calamityId: string
): Promise<{ success: boolean; operationId?: string; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Nicht eingeloggt");
    await getOrgId(orgSlug, session.user.id);

    // Prüfen ob schon eine Maßnahme verknüpft ist
    const existing = await prisma.operation.findUnique({ where: { calamityId } });
    if (existing) return { success: true, operationId: existing.id };

    const calamity = await prisma.forestCalamity.findUnique({
      where: { id: calamityId },
      select: { forestId: true, cause: true, description: true, areaHa: true },
    });
    if (!calamity) throw new Error('Kalamitätsfläche nicht gefunden');

    const title = calamityTitle(calamity);
    const year  = new Date().getFullYear();

    const op = await prisma.operation.create({
      data: {
        title,
        year,
        type:       OperationType.HARVEST,
        status:     OperationStatus.IN_PROGRESS,
        forestId:   calamity.forestId,
        calamityId,
        description: calamity.areaHa
          ? `Kalamitätsnutzung – ${calamity.areaHa.toFixed(2)} ha`
          : 'Kalamitätsnutzung',
      },
    });

    revalidate(orgSlug);
    revalidatePath(`/dashboard/org/${orgSlug}/map`);
    return { success: true, operationId: op.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── LOG PILE ────────────────────────────────────────────────────────────────

export async function createLogPile(orgSlug: string, data: {
  operationId: string;
  name?: string;
  lat?: number;
  lng?: number;
  forestPoiId?: string;
  treeSpecies?: string;
  woodType?: WoodType;
  qualityClass?: string;
  estimatedAmount?: number;
  logLength?: number;
  note?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Nicht eingeloggt");

  // If linking to an existing POI, copy coordinates from it
  let lat = data.lat;
  let lng = data.lng;
  if (data.forestPoiId && (lat == null || lng == null)) {
    const poi = await prisma.forestPoi.findUnique({
      where: { id: data.forestPoiId },
      select: { lat: true, lng: true },
    });
    if (poi) { lat = poi.lat; lng = poi.lng; }
  }

  await prisma.logPile.create({
    data: { ...data, lat: lat ?? 0, lng: lng ?? 0 },
  });
  revalidate(orgSlug);
  return { success: true };
}

export async function updateLogPile(orgSlug: string, id: string, data: {
  name?: string;
  status?: PolterStatus;
  measuredAmount?: number;
  estimatedAmount?: number;
  logLength?: number;
  treeSpecies?: string;
  qualityClass?: string;
  woodType?: WoodType;
  note?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Nicht eingeloggt");

  const pile = await prisma.logPile.update({ where: { id }, data, select: { forestPoiId: true } });

  // Verknüpften POI synchron halten (ForestPoiLogPile)
  if (pile.forestPoiId) {
    const poiSync: Record<string, any> = {};
    if (data.logLength    !== undefined) poiSync.logLength    = data.logLength;
    if (data.estimatedAmount !== undefined) poiSync.volumeFm  = data.estimatedAmount;
    if (data.treeSpecies  !== undefined) poiSync.treeSpecies  = data.treeSpecies;
    if (data.woodType     !== undefined) poiSync.woodType     = data.woodType;
    if (data.qualityClass !== undefined) poiSync.qualityClass = data.qualityClass;
    if (Object.keys(poiSync).length > 0) {
      await prisma.forestPoiLogPile.upsert({
        where: { poiId: pile.forestPoiId },
        create: { poiId: pile.forestPoiId, ...poiSync },
        update: poiSync,
      });
    }
  }

  revalidate(orgSlug);
  return { success: true };
}

export async function deleteLogPile(orgSlug: string, id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Nicht eingeloggt");

  await prisma.logPile.delete({ where: { id } });
  revalidate(orgSlug);
  return { success: true };
}

// ─── TIMBER SALE ─────────────────────────────────────────────────────────────

export async function createTimberSale(orgSlug: string, data: {
  buyerName: string;
  contractNumber?: string;
  pricePerUnit?: number;
  operationId?: string;
  logPileIds?: string[];
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Nicht eingeloggt");
  const orgId = await getOrgId(orgSlug, session.user.id);

  const sale = await prisma.timberSale.create({
    data: {
      organizationId: orgId,
      buyerName: data.buyerName,
      contractNumber: data.contractNumber,
      pricePerUnit: data.pricePerUnit,
      operationId: data.operationId,
      logPiles: data.logPileIds?.length
        ? { connect: data.logPileIds.map(id => ({ id })) }
        : undefined,
    },
  });

  // LogPiles als SOLD markieren
  if (data.logPileIds?.length) {
    await prisma.logPile.updateMany({
      where: { id: { in: data.logPileIds } },
      data: { status: 'SOLD', timberSaleId: sale.id },
    });
  }

  revalidate(orgSlug);
  return { success: true, id: sale.id };
}

export async function updateTimberSale(orgSlug: string, id: string, data: {
  buyerName?: string;
  contractNumber?: string;
  status?: TimberSaleStatus;
  pricePerUnit?: number;
  eudrReference?: string | null;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Nicht eingeloggt");

  await prisma.timberSale.update({ where: { id }, data });
  revalidate(orgSlug);
  return { success: true };
}

// ─── TRANSPORT TICKET ────────────────────────────────────────────────────────

export async function createTransportTicket(orgSlug: string, data: {
  timberSaleId: string;
  ticketNumber: string;
  plateNumber?: string;
  driverName?: string;
  carrierName?: string;
  pickupDate: string;
  forestAmount?: number;
  forestUnit?: string;
  factoryAmount: number;
  factoryUnit?: string;
  eudrReference?: string;
  note?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Nicht eingeloggt");

  const ticket = await prisma.transportTicket.create({
    data: {
      timberSaleId:  data.timberSaleId,
      ticketNumber:  data.ticketNumber,
      plateNumber:   data.plateNumber,
      driverName:    data.driverName,
      carrierName:   data.carrierName,
      pickupDate:    new Date(data.pickupDate),
      forestAmount:  data.forestAmount,
      forestUnit:    data.forestUnit ?? "fm",
      factoryAmount: data.factoryAmount,
      factoryUnit:   data.factoryUnit ?? "fm",
      eudrReference: data.eudrReference,
      note:          data.note,
    },
  });

  revalidate(orgSlug);
  return { success: true, id: ticket.id };
}

export async function updateTransportTicket(orgSlug: string, id: string, data: {
  ticketNumber?: string;
  plateNumber?: string;
  driverName?: string;
  carrierName?: string;
  pickupDate?: string;
  forestAmount?: number;
  forestUnit?: string;
  factoryAmount?: number;
  factoryUnit?: string;
  eudrReference?: string;
  note?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Nicht eingeloggt");

  await prisma.transportTicket.update({
    where: { id },
    data: {
      ...data,
      pickupDate: data.pickupDate ? new Date(data.pickupDate) : undefined,
    },
  });

  revalidate(orgSlug);
  return { success: true };
}

export async function deleteTransportTicket(orgSlug: string, id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Nicht eingeloggt");

  await prisma.transportTicket.delete({ where: { id } });
  revalidate(orgSlug);
  return { success: true };
}

export async function deleteTimberSale(orgSlug: string, id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Nicht eingeloggt");

  // Polter freigeben
  await prisma.logPile.updateMany({
    where: { timberSaleId: id },
    data: { status: 'MEASURED', timberSaleId: null },
  });
  await prisma.timberSale.delete({ where: { id } });
  revalidate(orgSlug);
  return { success: true };
}
