"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { testEudrConnection, EUDR_ENDPOINTS, type EudrApiConfig } from "@/lib/eudr-soap";

async function getOrgId(slug: string, userId: string): Promise<string> {
  const m = await prisma.membership.findFirst({
    where: { userId, organization: { slug } },
    select: { organizationId: true },
  });
  if (!m) throw new Error("Kein Zugriff");
  return m.organizationId;
}

// ─── Load settings ─────────────────────────────────────────────────────────

export async function getEudrSettings(orgSlug: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Nicht eingeloggt");
  const orgId = await getOrgId(orgSlug, session.user.id);

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      eudrApiUrl: true,
      eudrApiUsername: true,
      eudrApiPassword: true,
      eudrApiClientId: true,
      eudrApiEnvironment: true,
      eudrApiEnabled: true,
      eudrActivityType: true,
      eoriNumber: true,
      legalName: true,
      country: true,
    },
  });

  return org;
}

// ─── Save API settings ──────────────────────────────────────────────────────

export async function saveEudrApiSettings(
  orgSlug: string,
  data: {
    eudrApiUrl?: string;
    eudrApiUsername?: string;
    eudrApiPassword?: string;
    eudrApiClientId?: string;
    eudrApiEnvironment?: string;
    eudrApiEnabled?: boolean;
    eudrActivityType?: string;
    eoriNumber?: string;
  }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Nicht eingeloggt");
  const orgId = await getOrgId(orgSlug, session.user.id);

  await prisma.organization.update({
    where: { id: orgId },
    data,
  });

  revalidatePath(`/dashboard/org/${orgSlug}/settings/eudr`);
  revalidatePath(`/dashboard/org/${orgSlug}/biomass`);
  return { success: true };
}

// ─── Test connection ────────────────────────────────────────────────────────

export async function testEudrApiConnection(
  orgSlug: string,
  overrides?: Partial<EudrApiConfig>
): Promise<{ ok: boolean; message: string; responseMs?: number }> {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Nicht eingeloggt");
  const orgId = await getOrgId(orgSlug, session.user.id);

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      eudrApiUrl: true,
      eudrApiUsername: true,
      eudrApiPassword: true,
      eudrApiClientId: true,
      eudrApiEnvironment: true,
    },
  });

  const env = (overrides?.environment ?? org?.eudrApiEnvironment ?? "ACCEPTANCE") as
    | "ACCEPTANCE"
    | "PRODUCTION";

  const config: EudrApiConfig = {
    url:
      overrides?.url ??
      org?.eudrApiUrl ??
      EUDR_ENDPOINTS[env],
    username: overrides?.username ?? org?.eudrApiUsername ?? "",
    password: overrides?.password ?? org?.eudrApiPassword ?? "",
    clientId: overrides?.clientId ?? org?.eudrApiClientId ?? "eudr-test",
    environment: env,
  };

  if (!config.username || !config.password) {
    return {
      ok: false,
      message: "Benutzername oder Passwort fehlen — bitte zuerst speichern.",
    };
  }

  return testEudrConnection(config);
}
