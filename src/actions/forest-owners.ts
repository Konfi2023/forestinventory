"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function getOrgMembership(organizationId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Nicht eingeloggt");

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, organizationId },
  });
  if (!membership) throw new Error("Kein Zugriff");
  return membership;
}

export async function getForestOwners(organizationId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Nicht eingeloggt");

  return prisma.forestOwner.findMany({
    where: { organizationId },
    include: { forests: { select: { id: true, name: true, areaHa: true } } },
    orderBy: { name: "asc" },
  });
}

export async function createForestOwner(
  organizationId: string,
  data: {
    name: string;
    email?: string;
    phone?: string;
    street?: string;
    zip?: string;
    city?: string;
    notes?: string;
  }
) {
  await getOrgMembership(organizationId);

  const owner = await prisma.forestOwner.create({
    data: { organizationId, ...data },
  });

  revalidatePath(`/dashboard/org`);
  return owner;
}

export async function updateForestOwner(
  id: string,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    street?: string;
    zip?: string;
    city?: string;
    notes?: string;
  }
) {
  const owner = await prisma.forestOwner.findUnique({ where: { id } });
  if (!owner) throw new Error("Nicht gefunden");
  await getOrgMembership(owner.organizationId);

  const updated = await prisma.forestOwner.update({ where: { id }, data });
  revalidatePath(`/dashboard/org`);
  return updated;
}

export async function deleteForestOwner(id: string) {
  const owner = await prisma.forestOwner.findUnique({ where: { id } });
  if (!owner) throw new Error("Nicht gefunden");
  await getOrgMembership(owner.organizationId);

  await prisma.forestOwner.delete({ where: { id } });
  revalidatePath(`/dashboard/org`);
}

export async function assignOwnerToForest(forestId: string, ownerId: string | null) {
  const forest = await prisma.forest.findUnique({ where: { id: forestId } });
  if (!forest) throw new Error("Wald nicht gefunden");
  await getOrgMembership(forest.organizationId);

  await prisma.forest.update({
    where: { id: forestId },
    data: { ownerId },
  });

  revalidatePath(`/dashboard/org`);
}
