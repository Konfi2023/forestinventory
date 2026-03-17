"use server";

import { prisma } from "@/lib/prisma";
import { requireSystemAdmin } from "@/lib/admin-auth";
import { revalidatePath } from "next/cache";

export async function getPlans() {
  await requireSystemAdmin();
  return prisma.plan.findMany({
    orderBy: { displayOrder: "asc" },
    include: {
      _count: { select: { organizations: true } },
    },
  });
}

export async function updatePlanLimits(
  planId: string,
  maxHectares: number | null,
  maxUsers: number | null
) {
  await requireSystemAdmin();

  await prisma.plan.update({
    where: { id: planId },
    data: {
      maxHectares: maxHectares ?? null,
      maxUsers: maxUsers ?? null,
    },
  });

  revalidatePath("/admin/plans");
  return { success: true };
}

export async function setOrgCustomLimits(
  orgId: string,
  customAreaLimit: number | null,
  customUserLimit: number | null
) {
  await requireSystemAdmin();

  await prisma.organization.update({
    where: { id: orgId },
    data: {
      customAreaLimit: customAreaLimit ?? null,
      customUserLimit: customUserLimit ?? null,
    },
  });

  revalidatePath("/admin/organizations");
  return { success: true };
}
