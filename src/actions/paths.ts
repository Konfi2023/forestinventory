"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/lib/rbac-middleware";
import { PERMISSIONS } from "@/lib/permissions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function createPath(data: {
  forestId: string;
  type: string;
  name?: string;
  color?: string;
  geoJson: any;
  lengthM: number;
  note?: string;
  userId: string;
}) {
  try {
    await requireAuthContext(data.userId, PERMISSIONS.FOREST_EDIT);

    const path = await prisma.forestPath.create({
      data: {
        forestId: data.forestId,
        type: data.type,
        name: data.name || getPathName(data.type),
        color: data.color,
        geoJson: data.geoJson,
        lengthM: data.lengthM,
        note: data.note,
      },
    });

    revalidatePath("/dashboard/map");
    return { success: true, pathId: path.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function updatePath(
  pathId: string,
  data: {
    name?: string;
    color?: string;
    geoJson?: any;
    lengthM?: number;
    note?: string;
  }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Nicht authentifiziert");

    await prisma.forestPath.update({
      where: { id: pathId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.geoJson !== undefined && { geoJson: data.geoJson }),
        ...(data.lengthM !== undefined && { lengthM: data.lengthM }),
        ...(data.note !== undefined && { note: data.note }),
      },
    });

    revalidatePath("/dashboard/map");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deletePath(pathId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Nicht authentifiziert");

    await prisma.forestPath.delete({ where: { id: pathId } });

    revalidatePath("/dashboard/map");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

function getPathName(type: string): string {
  switch (type) {
    case "ROAD":       return "LKW-Weg";
    case "SKID_TRAIL": return "Rückegasse";
    case "WATER":      return "Gewässer";
    default:           return "Weg";
  }
}
