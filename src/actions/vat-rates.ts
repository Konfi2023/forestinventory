"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const DEFAULT_VAT_RATES = [
  { countryCode: "DE", countryName: "Deutschland", rate: 19.0, label: "Normalsatz (19 %)", isDefault: true },
  { countryCode: "DE", countryName: "Deutschland", rate: 7.0, label: "Ermäßigter Satz (7 %)", isDefault: false },
  { countryCode: "AT", countryName: "Österreich", rate: 20.0, label: "Normalsatz (20 %)", isDefault: false },
  { countryCode: "AT", countryName: "Österreich", rate: 10.0, label: "Ermäßigter Satz (10 %)", isDefault: false },
  { countryCode: "CH", countryName: "Schweiz", rate: 8.1, label: "Normalsatz (8,1 %)", isDefault: false },
  { countryCode: "FR", countryName: "Frankreich", rate: 20.0, label: "Normalsatz (20 %)", isDefault: false },
];

async function getOrgId(slug: string): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const org = await prisma.organization.findUnique({ where: { slug }, select: { id: true } });
  return org?.id ?? null;
}

export async function getVatRates(orgId: string) {
  // Lazy-seed defaults if none exist
  const count = await prisma.vatRate.count({ where: { organizationId: orgId } });
  if (count === 0) {
    await prisma.vatRate.createMany({
      data: DEFAULT_VAT_RATES.map((r) => ({ ...r, organizationId: orgId, rate: r.rate })),
    });
  }

  const rates = await prisma.vatRate.findMany({
    where: { organizationId: orgId },
    orderBy: [{ countryCode: "asc" }, { rate: "desc" }],
  });

  return rates.map((r) => ({
    id: r.id,
    countryCode: r.countryCode,
    countryName: r.countryName,
    rate: Number(r.rate),
    label: r.label,
    isDefault: r.isDefault,
    isActive: r.isActive,
  }));
}

export async function createVatRate(orgSlug: string, data: {
  countryCode: string;
  countryName: string;
  rate: number;
  label: string;
  isDefault: boolean;
}) {
  const orgId = await getOrgId(orgSlug);
  if (!orgId) throw new Error("Unauthorized");

  // If new entry is default, unset others in same country
  if (data.isDefault) {
    await prisma.vatRate.updateMany({
      where: { organizationId: orgId, countryCode: data.countryCode, isDefault: true },
      data: { isDefault: false },
    });
  }

  await prisma.vatRate.create({
    data: { ...data, organizationId: orgId },
  });

  revalidatePath(`/dashboard/org/${orgSlug}/settings`);
}

export async function updateVatRate(orgSlug: string, id: string, data: {
  countryCode?: string;
  countryName?: string;
  rate?: number;
  label?: string;
  isDefault?: boolean;
  isActive?: boolean;
}) {
  const orgId = await getOrgId(orgSlug);
  if (!orgId) throw new Error("Unauthorized");

  const existing = await prisma.vatRate.findFirst({ where: { id, organizationId: orgId } });
  if (!existing) throw new Error("Not found");

  if (data.isDefault && data.countryCode) {
    await prisma.vatRate.updateMany({
      where: { organizationId: orgId, countryCode: data.countryCode, isDefault: true, id: { not: id } },
      data: { isDefault: false },
    });
  }

  await prisma.vatRate.update({ where: { id }, data });

  revalidatePath(`/dashboard/org/${orgSlug}/settings`);
}

export async function deleteVatRate(orgSlug: string, id: string) {
  const orgId = await getOrgId(orgSlug);
  if (!orgId) throw new Error("Unauthorized");

  await prisma.vatRate.deleteMany({ where: { id, organizationId: orgId } });

  revalidatePath(`/dashboard/org/${orgSlug}/settings`);
}
