"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { SCIENTIFIC_NAMES, calcKgFromM3 } from "@/lib/eudr-helpers";
import { submitDdsToApi, EUDR_ENDPOINTS, type EudrApiConfig } from "@/lib/eudr-soap";
import { toEudrGeoJson, serializeEudrGeoJson, validateForEudr } from "@/lib/eudr-geojson";

async function getOrgIdForSlug(slug: string, userId: string): Promise<string> {
  const membership = await prisma.membership.findFirst({
    where: { userId, organization: { slug } },
    select: { organizationId: true },
  });
  if (!membership) throw new Error("Kein Zugriff");
  return membership.organizationId;
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

export async function createDds(
  orgSlug: string,
  data: {
    activityType: string;
    internalNote?: string;
    product: {
      hsCode: string;
      description?: string;
      treeSpecies?: string;
      quantityM3?: number;
      countryOfHarvest: string;
      forestId?: string;
    };
  }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Nicht eingeloggt");
  const orgId = await getOrgIdForSlug(orgSlug, session.user.id);

  const { product } = data;
  const quantityKg = product.treeSpecies && product.quantityM3
    ? calcKgFromM3(product.treeSpecies, product.quantityM3)
    : undefined;
  const scientificName = product.treeSpecies ? SCIENTIFIC_NAMES[product.treeSpecies] : undefined;

  const statement = await prisma.dueDiligenceStatement.create({
    data: {
      orgId,
      activityType: data.activityType,
      internalNote: data.internalNote,
      products: {
        create: {
          hsCode:           product.hsCode,
          description:      product.description,
          treeSpecies:      product.treeSpecies,
          scientificName,
          quantityM3:       product.quantityM3,
          quantityKg,
          countryOfHarvest: product.countryOfHarvest,
          forestId:         product.forestId,
        },
      },
    },
    include: { products: true },
  });

  revalidatePath(`/dashboard/org/${orgSlug}/biomass`);
  return { success: true, id: statement.id };
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export async function updateDds(
  id: string,
  orgSlug: string,
  data: {
    internalNote?: string;
    status?: string;
    referenceNumber?: string;
    harvestStartDate?: string | null;
    harvestEndDate?: string | null;
    product?: {
      hsCode?: string;
      description?: string;
      treeSpecies?: string;
      quantityM3?: number;
      countryOfHarvest?: string;
    };
  }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Nicht eingeloggt");
  await getOrgIdForSlug(orgSlug, session.user.id);

  const { product, harvestStartDate, harvestEndDate, ...stmtData } = data;

  await prisma.dueDiligenceStatement.update({
    where: { id },
    data: {
      ...stmtData,
      harvestStartDate: harvestStartDate ? new Date(harvestStartDate) : harvestStartDate === null ? null : undefined,
      harvestEndDate:   harvestEndDate   ? new Date(harvestEndDate)   : harvestEndDate   === null ? null : undefined,
    },
  });

  if (product) {
    const existing = await prisma.eudrProduct.findFirst({ where: { statementId: id } });
    const quantityKg = product.treeSpecies && product.quantityM3
      ? calcKgFromM3(product.treeSpecies, product.quantityM3)
      : undefined;
    const scientificName = product.treeSpecies ? SCIENTIFIC_NAMES[product.treeSpecies] : undefined;

    if (existing) {
      await prisma.eudrProduct.update({
        where: { id: existing.id },
        data: { ...product, ...(quantityKg !== undefined && { quantityKg }), ...(scientificName && { scientificName }) },
      });
    }
  }

  revalidatePath(`/dashboard/org/${orgSlug}/biomass`);
  return { success: true };
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function deleteDds(id: string, orgSlug: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Nicht eingeloggt");
  await getOrgIdForSlug(orgSlug, session.user.id);

  const stmt = await prisma.dueDiligenceStatement.findUnique({ where: { id } });
  if (!stmt) throw new Error("Nicht gefunden");
  if (stmt.status !== "DRAFT") throw new Error("Nur Entwürfe können gelöscht werden");

  await prisma.dueDiligenceStatement.delete({ where: { id } });
  revalidatePath(`/dashboard/org/${orgSlug}/biomass`);
  return { success: true };
}

// ─── SUBMIT TO API ──────────────────────────────────────────────────────────

export async function submitDdsViaApi(
  id: string,
  orgSlug: string
): Promise<{ referenceNumber: string; verificationNumber?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Nicht eingeloggt");
  const orgId = await getOrgIdForSlug(orgSlug, session.user.id);

  // Load DDS + org settings in parallel
  const [stmt, org] = await Promise.all([
    prisma.dueDiligenceStatement.findUnique({
      where: { id },
      include: { products: true },
    }),
    prisma.organization.findUnique({
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
    }),
  ]);

  if (!stmt) throw new Error("Sorgfaltserklärung nicht gefunden");
  if (stmt.status !== "DRAFT")
    throw new Error("Nur Entwürfe können eingereicht werden");
  if (!org?.eudrApiEnabled)
    throw new Error("EUDR-API ist nicht aktiviert. Bitte unter Einstellungen → EUDR konfigurieren.");
  if (!org.eudrApiUsername || !org.eudrApiPassword)
    throw new Error("EUDR-API Zugangsdaten fehlen. Bitte unter Einstellungen → EUDR eintragen.");

  const env = (org.eudrApiEnvironment ?? "ACCEPTANCE") as "ACCEPTANCE" | "PRODUCTION";
  const config: EudrApiConfig = {
    url: org.eudrApiUrl ?? EUDR_ENDPOINTS[env],
    username: org.eudrApiUsername,
    password: org.eudrApiPassword,
    clientId: org.eudrApiClientId ?? "eudr-test",
    environment: env,
  };

  // Build product payloads with GeoJSON
  const eudrProducts = await Promise.all(
    stmt.products.map(async (p) => {
      let geoJsonString = "{}";

      if (p.forestId) {
        const forest = await prisma.forest.findUnique({
          where: { id: p.forestId },
          select: { geoJson: true, areaHa: true, name: true },
        });
        if (forest?.geoJson) {
          const errors = validateForEudr(forest.geoJson);
          if (errors.length > 0) {
            throw new Error(
              `GeoJSON für Wald ungültig: ${errors.join("; ")}`
            );
          }
          const eudrGeo = toEudrGeoJson(forest.geoJson, {
            productionPlace: forest.name ?? undefined,
            producerCountry: org.country?.substring(0, 2).toUpperCase() ?? "DE",
            areaHa: forest.areaHa ?? undefined,
          });
          geoJsonString = serializeEudrGeoJson(eudrGeo);
        }
      }

      return {
        hsCode: p.hsCode,
        description: p.description ?? undefined,
        scientificName: p.scientificName ?? undefined,
        quantityKg: p.quantityKg ?? undefined,
        countryOfHarvest: p.countryOfHarvest,
        geoJsonString,
        harvestStartDate: stmt.harvestStartDate?.toISOString().split("T")[0],
        harvestEndDate:   stmt.harvestEndDate?.toISOString().split("T")[0],
      };
    })
  );

  const result = await submitDdsToApi(config, {
    activityType: stmt.activityType,
    products: eudrProducts,
    operatorName: org.legalName ?? undefined,
    operatorCountry: org.country?.substring(0, 2).toUpperCase() ?? "DE",
    eoriNumber: org.eoriNumber ?? undefined,
    internalNote: stmt.internalNote ?? undefined,
  });

  // Persist API response
  await prisma.dueDiligenceStatement.update({
    where: { id },
    data: {
      status: "SUBMITTED",
      referenceNumber: result.referenceNumber,
      verificationNumber: result.verificationNumber,
      tracesNtId: result.tracesNtId,
      submittedAt: new Date(),
    },
  });

  revalidatePath(`/dashboard/org/${orgSlug}/biomass`);
  return {
    referenceNumber: result.referenceNumber,
    verificationNumber: result.verificationNumber,
  };
}
