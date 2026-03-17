"use server";

import { prisma } from "@/lib/prisma";
import { requireSystemAdmin } from "@/lib/admin-auth";
import { testEudrConnection, EUDR_ENDPOINTS, type EudrApiConfig } from "@/lib/eudr-soap";
import { revalidatePath } from "next/cache";

export async function adminSaveTracesConfig(
  orgId: string,
  data: {
    eudrApiEnabled: boolean;
    eudrApiEnvironment: string;
    eudrApiUrl?: string;
    eudrApiUsername?: string;
    eudrApiPassword?: string;
    eudrApiClientId?: string;
  }
) {
  await requireSystemAdmin();

  await prisma.organization.update({
    where: { id: orgId },
    data: {
      eudrApiEnabled: data.eudrApiEnabled,
      eudrApiEnvironment: data.eudrApiEnvironment,
      eudrApiUrl: data.eudrApiUrl || null,
      eudrApiUsername: data.eudrApiUsername || null,
      eudrApiPassword: data.eudrApiPassword || null,
      eudrApiClientId: data.eudrApiClientId || "eudr-test",
    },
  });

  revalidatePath("/admin/traces");
  return { success: true };
}

export async function adminTestTracesConnection(
  orgId: string,
  overrides: {
    eudrApiEnvironment: string;
    eudrApiUrl?: string;
    eudrApiUsername?: string;
    eudrApiPassword?: string;
    eudrApiClientId?: string;
  }
): Promise<{ ok: boolean; message: string; responseMs?: number }> {
  await requireSystemAdmin();

  const env = (overrides.eudrApiEnvironment ?? "ACCEPTANCE") as "ACCEPTANCE" | "PRODUCTION";

  const config: EudrApiConfig = {
    url: overrides.eudrApiUrl || EUDR_ENDPOINTS[env],
    username: overrides.eudrApiUsername ?? "",
    password: overrides.eudrApiPassword ?? "",
    clientId: overrides.eudrApiClientId ?? "eudr-test",
    environment: env,
  };

  if (!config.username || !config.password) {
    return { ok: false, message: "Benutzername oder Passwort fehlen." };
  }

  return testEudrConnection(config);
}
