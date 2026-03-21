import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { getAccessibleForests } from "@/lib/forest-access";
import { Grid3x3 } from "lucide-react";
import { ForsteinrichtungClient } from "./_components/ForsteinrichtungClient";

export default async function ForsteinrichtungPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return redirect("/api/auth/signin/keycloak");

  const org = await prisma.organization.findUnique({ where: { slug } });
  if (!org) return notFound();

  const accessible = await getAccessibleForests(org.id, session.user.id);
  const accessibleIds = accessible.map((f) => f.id);

  const forests = await prisma.forest.findMany({
    where: { id: { in: accessibleIds } },
    include: {
      compartments: {
        orderBy: [{ number: "asc" }, { name: "asc" }],
      },
      pois: {
        where: { type: "TREE" },
        include: { tree: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
          <Grid3x3 size={20} className="text-emerald-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Forsteinrichtung</h1>
          <p className="text-sm text-slate-500">
            Abteilungsweise Bestandserfassung · Forsteinrichtungsblatt
          </p>
        </div>
      </div>

      <ForsteinrichtungClient forests={forests} orgSlug={slug} />
    </div>
  );
}
