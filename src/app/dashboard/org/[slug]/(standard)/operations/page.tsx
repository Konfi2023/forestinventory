import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { getAccessibleForests } from "@/lib/forest-access";
import { PackageOpen } from "lucide-react";
import { OperationList } from "./_components/OperationList";

export default async function OperationsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return redirect('/api/auth/signin/keycloak');

  const org = await prisma.organization.findUnique({ where: { slug } });
  if (!org) return notFound();

  const accessible = await getAccessibleForests(org.id, session.user.id);
  const accessibleIds = accessible.map(f => f.id);

  const forests = await prisma.forest.findMany({
    where: { id: { in: accessibleIds } },
    select: { id: true, name: true, color: true },
    orderBy: { name: "asc" },
  });

  // Load LOG_PILE POIs for each accessible forest (for picker in dialog)
  const logPilePois = await prisma.forestPoi.findMany({
    where: { forestId: { in: accessibleIds }, type: "LOG_PILE" },
    select: {
      id: true, name: true, lat: true, lng: true, forestId: true, note: true,
      forest: { select: { name: true } },
      logPile: { select: { volumeFm: true, logLength: true, treeSpecies: true, woodType: true, qualityClass: true } },
      operationLogPiles: { select: { id: true } },
    },
    orderBy: { id: "asc" },
  });

  const operationsRaw = await prisma.operation.findMany({
    where: { forestId: { in: accessibleIds } },
    include: {
      forest: { select: { id: true, name: true, color: true } },
      logPiles: {
        orderBy: { createdAt: "asc" },
        include: { timberSale: { select: { id: true, buyerName: true, status: true } } },
      },
      timberSales: {
        orderBy: { createdAt: "desc" },
        include: {
          logPiles: { select: { id: true, name: true, estimatedAmount: true, measuredAmount: true, treeSpecies: true, status: true } },
          transportTickets: { orderBy: { pickupDate: "asc" } },
        },
      },
    },
    orderBy: [{ year: "desc" }, { createdAt: "desc" }],
  });

  // Prisma Decimal → number (nicht serialisierbar über Server/Client-Grenze)
  const operations = operationsRaw.map(op => ({
    ...op,
    timberSales: op.timberSales.map(sale => ({
      ...sale,
      pricePerUnit: sale.pricePerUnit != null ? Number(sale.pricePerUnit) : null,
    })),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <PackageOpen className="text-amber-600" size={24} />
            Maßnahmen & Holzverkauf
          </h2>
          <p className="text-muted-foreground mt-1">
            Einschlagsmaßnahmen, Polter-Verwaltung und Holzverkäufe
          </p>
        </div>
      </div>

      <OperationList
        operations={operations as any}
        forests={forests}
        logPilePois={logPilePois as any}
        orgSlug={slug}
      />
    </div>
  );
}
