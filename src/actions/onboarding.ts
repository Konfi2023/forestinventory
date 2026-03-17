"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureDbUser } from "@/lib/ensure-user";
import { ROLE_TEMPLATES } from "@/lib/permissions";
import { OrgType, SubscriptionStatus } from "@prisma/client";
import { TRIAL_DAYS } from "@/lib/pricing-config";

export type OnboardingData = {
  accountType: "PRIVATE" | "BUSINESS";
  orgName: string;
  legalName?: string;
  vatId?: string;
  billingEmail?: string;
  street?: string;
  zip?: string;
  city?: string;
  country?: string;
  planId?: string;
  planInterval?: "monthly" | "yearly";
  selectedPriceId?: string;
};

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[äöüß]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' }[c] || c))
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40);
}

async function findUniqueSlug(base: string): Promise<string> {
  let slug = base;
  let attempt = 0;
  while (true) {
    const existing = await prisma.organization.findUnique({ where: { slug } });
    if (!existing) return slug;
    attempt++;
    slug = `${base}-${attempt}`;
  }
}

async function createOrgWithTrial(data: OnboardingData, userId: string, userEmail: string | null) {
  const baseSlug = generateSlug(data.orgName);
  const slug = await findUniqueSlug(baseSlug);

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

  const orgType: OrgType =
    data.accountType === "PRIVATE" ? OrgType.PRIVATE_OWNER : OrgType.FORESTRY_COMPANY;

  await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        name: data.orgName,
        slug,
        orgType,
        legalName: data.legalName || data.orgName,
        billingEmail: data.billingEmail || userEmail || undefined,
        vatId: data.vatId || undefined,
        street: data.street || undefined,
        zip: data.zip || undefined,
        city: data.city || undefined,
        country: data.country || "Deutschland",
        subscriptionStatus: SubscriptionStatus.TRIAL,
        trialEndsAt,
        onboardingComplete: true,
        planId: data.planId || undefined,
        planInterval: data.planInterval || undefined,
      },
    });

    let adminRoleId = "";
    for (const template of Object.values(ROLE_TEMPLATES)) {
      const role = await tx.role.create({
        data: {
          name: template.name,
          description: template.description,
          permissions: template.permissions as string[],
          isSystemRole: true,
          organizationId: org.id,
        },
      });
      if (template.name === "Administrator") adminRoleId = role.id;
    }

    await tx.membership.create({
      data: { userId, organizationId: org.id, roleId: adminRoleId },
    });

    await tx.user.update({
      where: { id: userId },
      data: { lastActiveOrgId: org.id, onboardingComplete: true },
    });

    return org;
  });

  return slug;
}

/**
 * Start free trial — creates org with TRIAL status, no Stripe redirect
 */
export async function startTrial(data: OnboardingData): Promise<{ slug: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Nicht eingeloggt");

  const userId = await ensureDbUser(session);
  const slug = await createOrgWithTrial(data, userId, session.user.email || null);

  return { slug };
}

/**
 * Create an additional org for an already-logged-in user (no Stripe redirect)
 * Used by the "Neuen Betrieb anlegen" flow from the OrgSwitcher.
 */
export async function createAdditionalOrg(
  data: OnboardingData
): Promise<{ slug: string; checkoutUrl?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Nicht eingeloggt");

  // User already exists in DB — ensureDbUser just returns the id
  const userId = await ensureDbUser(session);
  const slug = await createOrgWithTrial(data, userId, session.user.email || null);

  if (data.selectedPriceId && data.planInterval) {
    const org = await prisma.organization.findUnique({ where: { slug } });
    if (org) {
      const { createCheckoutSession } = await import("./stripe-actions");
      const result = await createCheckoutSession(
        data.selectedPriceId,
        org.id,
        data.planInterval
      );
      return { slug, checkoutUrl: result.url || undefined };
    }
  }

  return { slug };
}

/**
 * Complete onboarding with payment — creates org and returns Stripe checkout URL
 */
export async function completeOnboarding(
  data: OnboardingData
): Promise<{ slug: string; checkoutUrl?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Nicht eingeloggt");

  const userId = await ensureDbUser(session);
  const slug = await createOrgWithTrial(data, userId, session.user.email || null);

  // If a price was selected, create Stripe checkout
  if (data.selectedPriceId && data.planInterval) {
    const org = await prisma.organization.findUnique({ where: { slug } });
    if (org) {
      // Dynamically import to avoid circular deps
      const { createCheckoutSession } = await import("./stripe-actions");
      const result = await createCheckoutSession(
        data.selectedPriceId,
        org.id,
        data.planInterval
      );
      return { slug, checkoutUrl: result.url || undefined };
    }
  }

  return { slug };
}
