"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// Default-Kategorien (werden beim ersten Abruf angelegt)
const DEFAULTS = [
  { key: "MANUAL_WORK",  name: "Handarbeit", hourlyRate: 45,  color: "#22c55e", sortOrder: 0 },
  { key: "MACHINE_WORK", name: "Maschine",   hourlyRate: 120, color: "#3b82f6", sortOrder: 1 },
  { key: "PLANNING",     name: "Planung",    hourlyRate: 60,  color: "#8b5cf6", sortOrder: 2 },
  { key: "TRAVEL",       name: "Anfahrt",    hourlyRate: 35,  color: "#f59e0b", sortOrder: 3 },
  { key: "INSPECTION",   name: "Begehung",   hourlyRate: 55,  color: "#06b6d4", sortOrder: 4 },
];

async function assertMember(organizationId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Nicht angemeldet");
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, organizationId },
  });
  if (!membership) throw new Error("Kein Mitglied");
  return session.user;
}

export async function getRateCategories(organizationId: string) {
  // Lazy-seed: Defaults anlegen falls noch keine existieren
  const count = await prisma.rateCategory.count({ where: { organizationId } });
  if (count === 0) {
    await prisma.rateCategory.createMany({
      data: DEFAULTS.map((d) => ({ ...d, organizationId, isBuiltIn: true })),
    });
  }
  return prisma.rateCategory.findMany({
    where: { organizationId, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function createRateCategory(
  organizationId: string,
  data: { name: string; hourlyRate: number; color?: string }
) {
  await assertMember(organizationId);
  const cat = await prisma.rateCategory.create({
    data: {
      organizationId,
      name: data.name,
      hourlyRate: data.hourlyRate,
      color: data.color ?? "#94a3b8",
      isBuiltIn: false,
    },
  });
  revalidatePath(`/dashboard/org`);
  return cat;
}

export async function updateRateCategory(
  id: string,
  data: { name?: string; hourlyRate?: number; color?: string }
) {
  const cat = await prisma.rateCategory.findUnique({ where: { id } });
  if (!cat) throw new Error("Nicht gefunden");
  await assertMember(cat.organizationId);
  const updated = await prisma.rateCategory.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.hourlyRate !== undefined && { hourlyRate: data.hourlyRate }),
      ...(data.color !== undefined && { color: data.color }),
    },
  });
  revalidatePath(`/dashboard/org`);
  return updated;
}

export async function deleteRateCategory(id: string) {
  const cat = await prisma.rateCategory.findUnique({ where: { id } });
  if (!cat) throw new Error("Nicht gefunden");
  if (cat.isBuiltIn) throw new Error("Standard-Kategorien können nicht gelöscht werden");
  await assertMember(cat.organizationId);
  // Soft-delete
  await prisma.rateCategory.update({ where: { id }, data: { isActive: false } });
  revalidatePath(`/dashboard/org`);
}

export async function updateTimeEntryRateOverride(
  entryId: string,
  hourlyRateOverride: number | null
) {
  const entry = await prisma.timeEntry.findUnique({ where: { id: entryId } });
  if (!entry) throw new Error("Nicht gefunden");
  await prisma.timeEntry.update({
    where: { id: entryId },
    data: { hourlyRateOverride: hourlyRateOverride !== null ? hourlyRateOverride : null },
  });
  revalidatePath(`/dashboard/org`);
}

export async function updateTaskTimeEntriesRate(
  taskId: string,
  hourlyRateOverride: number | null
) {
  await prisma.timeEntry.updateMany({
    where: { taskId },
    data: { hourlyRateOverride: hourlyRateOverride !== null ? hourlyRateOverride : null },
  });
  revalidatePath(`/dashboard/org`);
}
