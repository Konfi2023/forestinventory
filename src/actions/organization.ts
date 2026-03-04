"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ROLE_TEMPLATES } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { OrgType } from "@prisma/client";
import { revalidatePath } from "next/cache";

// Typ-Definition für das Datenpaket
type CreateOrgData = {
  name: string;
  slug: string;
  orgType: OrgType;
  totalHectares?: number;
  legalName?: string;
  billingEmail?: string;
  vatId?: string;
  street?: string;
  zip?: string;
  city?: string;
  country?: string;
};

export async function createOrganization(data: CreateOrgData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Nicht eingeloggt");

  if (!data.name || !data.slug) throw new Error("Name und Slug sind Pflichtfelder");

  // 1. Check ob Slug vergeben
  const existing = await prisma.organization.findUnique({ where: { slug: data.slug } });
  if (existing) throw new Error("Dieser Kurzname (Slug) ist bereits vergeben.");

  // 2. Transaktion
  await prisma.$transaction(async (tx) => {
    // A. Org mit allen B2B Daten erstellen
    const org = await tx.organization.create({
      data: {
        name: data.name,
        slug: data.slug,
        orgType: data.orgType,
        totalHectares: data.totalHectares,
        legalName: data.legalName || data.name, // Fallback auf Rufnamen
        billingEmail: data.billingEmail || session.user.email,
        vatId: data.vatId,
        street: data.street,
        zip: data.zip,
        city: data.city,
        country: data.country,
        subscriptionStatus: "FREE"
      }
    });

    // B. Rollen erstellen
    let adminRoleId = "";
    for (const template of Object.values(ROLE_TEMPLATES)) {
      const role = await tx.role.create({
        data: {
          name: template.name,
          description: template.description,
          permissions: template.permissions,
          isSystemRole: true,
          organizationId: org.id
        }
      });
      if (template.name === "Administrator") adminRoleId = role.id;
    }

    // C. User hinzufügen
    await tx.membership.create({
      data: {
        userId: session.user.id,
        organizationId: org.id,
        roleId: adminRoleId
      }
    });
    
    // D. User updaten
    await tx.user.update({
      where: { id: session.user.id },
      data: { lastActiveOrgId: org.id, onboardingComplete: true }
    });
  });

  redirect(`/dashboard/org/${data.slug}`);
}

export async function updateOrganization(currentSlug: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Nicht eingeloggt");

  // 1. Berechtigung prüfen
  const org = await prisma.organization.findUnique({
    where: { slug: currentSlug },
    include: { members: { where: { userId: session.user.id }, include: { role: true } } }
  });

  if (!org || !org.members[0]) throw new Error("Kein Zugriff");
  
  const role = org.members[0].role;
  // Nur Admins dürfen Stammdaten ändern
  if (role.name !== "Administrator") {
    throw new Error("Nur Administratoren können diese Einstellungen ändern.");
  }

  // 2. Daten extrahieren
  const name = formData.get("name") as string;
  const legalName = formData.get("legalName") as string;
  const street = formData.get("street") as string;
  const zip = formData.get("zip") as string;
  const city = formData.get("city") as string;
  const vatId = formData.get("vatId") as string;
  const billingEmail = formData.get("billingEmail") as string;

  // 3. Update
  await prisma.organization.update({
    where: { id: org.id },
    data: {
      name,
      legalName,
      street,
      zip,
      city,
      vatId,
      billingEmail
    }
  });

  revalidatePath(`/dashboard/org/${currentSlug}/settings`);
  return { success: true };
}