import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getVatRates } from "@/actions/vat-rates";
import { VatRatesClient } from "./_components/VatRatesClient";

export default async function VatPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return redirect("/api/auth/signin/keycloak");

  const org = await prisma.organization.findUnique({ where: { slug } });
  if (!org) return notFound();

  const vatRates = await getVatRates(org.id);

  return (
    <VatRatesClient
      orgSlug={slug}
      initialRates={vatRates}
    />
  );
}
