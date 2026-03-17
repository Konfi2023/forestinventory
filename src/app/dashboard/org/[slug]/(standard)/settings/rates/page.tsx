import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getRateCategories } from "@/actions/rate-categories";
import { RatesClient } from "./_components/RatesClient";

export default async function RatesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return redirect("/api/auth/signin/keycloak");

  const org = await prisma.organization.findUnique({ where: { slug } });
  if (!org) return notFound();

  const categories = await getRateCategories(org.id);

  return (
    <RatesClient
      organizationId={org.id}
      initialCategories={categories.map((c) => ({
        id: c.id,
        name: c.name,
        key: c.key,
        hourlyRate: Number(c.hourlyRate),
        color: c.color ?? "#94a3b8",
        sortOrder: c.sortOrder,
        isBuiltIn: c.isBuiltIn,
      }))}
    />
  );
}
