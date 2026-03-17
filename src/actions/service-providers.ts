"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function checkMembership(organizationId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Nicht eingeloggt");
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, organizationId },
  });
  if (!membership) throw new Error("Kein Zugriff");
  return membership;
}

export async function getServiceProviders(organizationId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Nicht eingeloggt");
  return prisma.serviceProvider.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
  });
}

export async function createServiceProvider(
  organizationId: string,
  data: {
    name: string;
    email?: string;
    phone?: string;
    street?: string;
    zip?: string;
    city?: string;
    category?: string;
    notes?: string;
  }
) {
  await checkMembership(organizationId);
  const provider = await prisma.serviceProvider.create({
    data: { organizationId, ...data },
  });
  revalidatePath(`/dashboard/org`);
  return provider;
}

export async function updateServiceProvider(
  id: string,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    street?: string;
    zip?: string;
    city?: string;
    category?: string;
    notes?: string;
  }
) {
  const provider = await prisma.serviceProvider.findUnique({ where: { id } });
  if (!provider) throw new Error("Nicht gefunden");
  await checkMembership(provider.organizationId);
  const updated = await prisma.serviceProvider.update({ where: { id }, data });
  revalidatePath(`/dashboard/org`);
  return updated;
}

export async function deleteServiceProvider(id: string) {
  const provider = await prisma.serviceProvider.findUnique({ where: { id } });
  if (!provider) throw new Error("Nicht gefunden");
  await checkMembership(provider.organizationId);
  await prisma.serviceProvider.delete({ where: { id } });
  revalidatePath(`/dashboard/org`);
}
