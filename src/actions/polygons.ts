"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/lib/rbac-middleware";
import { PERMISSIONS } from "@/lib/permissions";

// ─── PLANTING ────────────────────────────────────────────────────────────────

export async function createPlanting(data: {
  forestId: string;
  treeSpecies: string;
  description?: string;
  note?: string;
  geoJson: any;
  areaHa?: number;
  userId: string;
  orgSlug: string;
}) {
  try {
    await requireAuthContext(data.userId, PERMISSIONS.FOREST_EDIT);
    const record = await prisma.forestPlanting.create({
      data: {
        forestId: data.forestId,
        treeSpecies: data.treeSpecies,
        description: data.description,
        note: data.note,
        geoJson: data.geoJson,
        areaHa: data.areaHa,
      },
    });
    revalidatePath(`/dashboard/org/${data.orgSlug}/map`);
    return { success: true, id: record.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updatePlanting(
  id: string,
  data: { treeSpecies?: string; description?: string; note?: string; content?: any; geoJson?: any; areaHa?: number },
  orgSlug: string
) {
  try {
    await prisma.forestPlanting.update({ where: { id }, data });
    revalidatePath(`/dashboard/org/${orgSlug}/map`);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deletePlanting(id: string, orgSlug: string) {
  try {
    await prisma.forestPlanting.delete({ where: { id } });
    revalidatePath(`/dashboard/org/${orgSlug}/map`);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── HUNTING ─────────────────────────────────────────────────────────────────

export async function createHunting(data: {
  forestId: string;
  name?: string;
  pachter?: string;
  endsAt?: string;
  note?: string;
  geoJson: any;
  areaHa?: number;
  userId: string;
  orgSlug: string;
}) {
  try {
    await requireAuthContext(data.userId, PERMISSIONS.FOREST_EDIT);
    const record = await prisma.forestHunting.create({
      data: {
        forestId: data.forestId,
        name: data.name,
        pachter: data.pachter,
        endsAt: data.endsAt,
        note: data.note,
        geoJson: data.geoJson,
        areaHa: data.areaHa,
      },
    });
    revalidatePath(`/dashboard/org/${data.orgSlug}/map`);
    return { success: true, id: record.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updateHunting(
  id: string,
  data: { name?: string; pachter?: string; endsAt?: string; note?: string; geoJson?: any; areaHa?: number },
  orgSlug: string
) {
  try {
    await prisma.forestHunting.update({ where: { id }, data });
    revalidatePath(`/dashboard/org/${orgSlug}/map`);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteHunting(id: string, orgSlug: string) {
  try {
    await prisma.forestHunting.delete({ where: { id } });
    revalidatePath(`/dashboard/org/${orgSlug}/map`);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── CALAMITY ────────────────────────────────────────────────────────────────

export async function createCalamity(data: {
  forestId: string;
  cause?: string;
  status?: string;
  amount?: number;
  description?: string;
  note?: string;
  geoJson: any;
  areaHa?: number;
  userId: string;
  orgSlug: string;
}) {
  try {
    await requireAuthContext(data.userId, PERMISSIONS.FOREST_EDIT);
    const record = await prisma.forestCalamity.create({
      data: {
        forestId: data.forestId,
        cause: data.cause,
        status: data.status,
        amount: data.amount,
        description: data.description,
        note: data.note,
        geoJson: data.geoJson,
        areaHa: data.areaHa,
      },
    });
    revalidatePath(`/dashboard/org/${data.orgSlug}/map`);
    return { success: true, id: record.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

const CALAMITY_CAUSE_LABELS: Record<string, string> = {
  WIND:        'Windwurf',
  BARK_BEETLE: 'Borkenkäfer',
  FIRE:        'Brand',
  SNOW:        'Schneebruch',
  DROUGHT:     'Trockenheit',
  OTHER:       'Sonstiges',
};

export async function updateCalamity(
  id: string,
  data: { cause?: string; status?: string; amount?: number; description?: string; note?: string; geoJson?: any; areaHa?: number },
  orgSlug: string
) {
  try {
    await prisma.forestCalamity.update({ where: { id }, data });

    // Titel der verknüpften Maßnahme synchron halten
    if (data.cause !== undefined || data.description !== undefined) {
      const linked = await prisma.operation.findUnique({
        where: { calamityId: id },
        select: { id: true, title: true },
      });
      if (linked) {
        // Neuberechnung: aktuellen Stand aus DB holen um beide Felder zu kennen
        const current = await prisma.forestCalamity.findUnique({
          where: { id },
          select: { cause: true, description: true },
        });
        const effectiveCause       = data.cause       !== undefined ? data.cause       : current?.cause;
        const effectiveDescription = data.description !== undefined ? data.description : current?.description;

        const newTitle =
          (effectiveDescription && effectiveDescription.trim())
            ? effectiveDescription.trim()
            : effectiveCause
              ? (CALAMITY_CAUSE_LABELS[effectiveCause] ?? effectiveCause)
              : linked.title;

        if (newTitle !== linked.title) {
          await prisma.operation.update({ where: { id: linked.id }, data: { title: newTitle } });
        }
      }
    }

    revalidatePath(`/dashboard/org/${orgSlug}/map`);
    revalidatePath(`/dashboard/org/${orgSlug}/operations`);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteCalamity(id: string, orgSlug: string) {
  try {
    await prisma.forestCalamity.delete({ where: { id } });
    revalidatePath(`/dashboard/org/${orgSlug}/map`);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── BIOMASS TRACKING TOGGLE ─────────────────────────────────────────────────

export async function togglePolygonBiomass(
  id: string,
  type: 'PLANTING' | 'CALAMITY',
  enabled: boolean,
  orgSlug: string,
) {
  try {
    if (type === 'PLANTING') {
      await prisma.forestPlanting.update({ where: { id }, data: { trackBiomass: enabled } });
    } else {
      await prisma.forestCalamity.update({ where: { id }, data: { trackBiomass: enabled } });
    }
    revalidatePath(`/dashboard/org/${orgSlug}/map`);
    revalidatePath(`/dashboard/org/${orgSlug}/biomass`);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
