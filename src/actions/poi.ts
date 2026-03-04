"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/lib/rbac-middleware";
import { PERMISSIONS } from "@/lib/permissions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// ... createPoi (schon vorhanden) ...

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
        forestId: data.forestId
      }
    });

    revalidatePath("/dashboard/map");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updatePoi(poiId: string, data: { name?: string; note?: string; lat?: number; lng?: number }) {
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
        lng: data.lng
      }
    });

    revalidatePath("/dashboard/map");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deletePoi(poiId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");

    await requireAuthContext(session.user.id, PERMISSIONS.FOREST_EDIT);

    await prisma.forestPoi.delete({
      where: { id: poiId }
    });

    revalidatePath("/dashboard/map");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

function getPoiName(type: string) {
  switch (type) {
    case 'HUNTING_STAND': return 'Hochsitz';
    case 'LOG_PILE': return 'Holzpolter';
    case 'BARRIER': return 'Schranke';
    case 'HUT': return 'Hütte';
    default: return 'Objekt';
  }
}