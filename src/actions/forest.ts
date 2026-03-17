"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAuthContext } from "@/lib/rbac-middleware";
import { PERMISSIONS } from "@/lib/permissions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AREA_TOLERANCE_HA } from "@/lib/pricing-config";

// --- CREATE & UPDATE (bleiben gleich) ---
export async function createForest(data: any) {
    // (Hier deinen bestehenden Code für create lassen oder kopieren)
    // Der Kürze halber hier nicht wiederholt, da Create funktioniert.
    // Bitte den createForest Code aus dem vorherigen Schritt beibehalten!
    // Falls du ihn brauchst, sag Bescheid.
    // ...
    // HIER DER WICHTIGE TEIL FÜR DICH ZUM EINFÜGEN:
     try {
        const { organizationId, userId } = await requireAuthContext(data.keycloakId, PERMISSIONS.FOREST_EDIT);

        // Flächen-Limit prüfen
        const org = await prisma.organization.findUnique({
          where: { id: organizationId },
          include: { plan: true },
        });
        const maxHa = org?.customAreaLimit ?? org?.plan?.maxHectares ?? null;
        if (maxHa !== null && data.areaHa != null) {
          const { _sum } = await prisma.forest.aggregate({
            where: { organizationId },
            _sum: { areaHa: true },
          });
          const usedHa = _sum.areaHa ?? 0;
          if (usedHa + data.areaHa > maxHa + AREA_TOLERANCE_HA) {
            throw new Error(
              `Ihr Paket erlaubt maximal ${maxHa} ha Waldpolygonfläche. ` +
              `Aktuell belegt: ${usedHa.toFixed(1)} ha. ` +
              `Das neue Polygon würde das Limit überschreiten.`
            );
          }
        }

        const forest = await prisma.forest.create({
        data: {
            name: data.name,
            description: data.description,
            location: data.location,
            geoJson: data.geoJson,
            areaHa: data.areaHa,
            organizationId: organizationId,
            grantedUsers: {
            connect: [{ id: userId }, ...(data.grantedUserIds?.map((id: string) => ({ id })) || [])]
            },
            color: "#10b981" 
        }
        });

        revalidatePath("/dashboard", "layout");
        return { success: true, forestId: forest.id };
    } catch (e: any) {
        console.error("Create Error:", e);
        return { success: false, error: e.message };
    }
}

export async function updateForest(data: any) {
    try {
        const { organizationId } = await requireAuthContext(data.keycloakId, PERMISSIONS.FOREST_EDIT);
        const existing = await prisma.forest.findFirst({ where: { id: data.id, organizationId } });
        if (!existing) throw new Error("Wald nicht gefunden oder kein Zugriff");

        await prisma.forest.update({
            where: { id: data.id },
            data: {
                name: data.name,
                description: data.description,
                geoJson: data.geoJson,
                areaHa: data.areaHa,
                color: data.color
            }
        });

        revalidatePath("/dashboard", "layout");
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}


// --- DELETE (DEBUG VERSION) ---
export async function deleteForest(forestId: string) {
  console.log("--- DELETE FOREST START ---");
  console.log("Angefragte ID:", forestId);

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Nicht eingeloggt");

    const userId = session.user.id;
    console.log("User ID:", userId);

    // Rechte prüfen
    const { organizationId } = await requireAuthContext(userId, PERMISSIONS.FOREST_DELETE);
    console.log("Org ID:", organizationId);

    // 1. Existenz prüfen
    const existing = await prisma.forest.findFirst({
      where: { id: forestId, organizationId }
    });

    if (!existing) {
        console.error("❌ Wald nicht in DB gefunden (oder falsche Org)");
        throw new Error("Nicht gefunden");
    }

    console.log("✅ Wald gefunden:", existing.name, existing.id);

    // 2. Abhängigkeiten manuell löschen (Falls Cascade in DB fehlt)
    // Das ist eine Sicherheitsmaßnahme, falls das Prisma Schema nicht synchron mit der DB ist
    await prisma.forestPoi.deleteMany({ where: { forestId } });
    await prisma.forestPath.deleteMany({ where: { forestId } });
    await prisma.forestPlanting.deleteMany({ where: { forestId } });
    await prisma.forestMaintenance.deleteMany({ where: { forestId } });
    await prisma.forestCalamity.deleteMany({ where: { forestId } });
    await prisma.forestHabitat.deleteMany({ where: { forestId } });
    await prisma.forestHunting.deleteMany({ where: { forestId } });
    await prisma.task.deleteMany({ where: { forestId } });
    
    // 3. Den Wald selbst löschen
    const deleted = await prisma.forest.delete({ where: { id: forestId } });
    console.log("🗑️ Wald gelöscht:", deleted);

    revalidatePath("/dashboard", "layout");

    return { success: true };
  } catch (e: any) {
    console.error("❌ DELETE ERROR:", e);
    return { success: false, error: e.message };
  }
}

// ─── Batch-Delete ─────────────────────────────────────────────────────────────

export async function batchDeleteForests(forestIds: string[]) {
  if (!forestIds.length) return { success: true, deleted: 0 };
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Nicht eingeloggt");

    const { organizationId } = await requireAuthContext(session.user.id, PERMISSIONS.FOREST_DELETE);

    // Nur Forests dieser Org löschen — Sicherheitscheck
    const existing = await prisma.forest.findMany({
      where: { id: { in: forestIds }, organizationId },
      select: { id: true },
    });
    const validIds = existing.map(f => f.id);
    if (!validIds.length) return { success: true, deleted: 0 };

    // Abhängigkeiten löschen
    await prisma.forestPoi.deleteMany({ where: { forestId: { in: validIds } } });
    await prisma.forestPath.deleteMany({ where: { forestId: { in: validIds } } });
    await prisma.forestPlanting.deleteMany({ where: { forestId: { in: validIds } } });
    await prisma.forestMaintenance.deleteMany({ where: { forestId: { in: validIds } } });
    await prisma.forestCalamity.deleteMany({ where: { forestId: { in: validIds } } });
    await prisma.forestHabitat.deleteMany({ where: { forestId: { in: validIds } } });
    await prisma.forestHunting.deleteMany({ where: { forestId: { in: validIds } } });
    await prisma.task.deleteMany({ where: { forestId: { in: validIds } } });

    const result = await prisma.forest.deleteMany({ where: { id: { in: validIds } } });

    revalidatePath("/dashboard", "layout");
    return { success: true, deleted: result.count };
  } catch (e: any) {
    console.error("❌ BATCH DELETE ERROR:", e);
    return { success: false, error: e.message };
  }
}