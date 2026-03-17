import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getForestOwners } from "@/actions/forest-owners";
import { OwnersClient } from "../../settings/owners/_components/OwnersClient";

export default async function OwnersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/api/auth/signin/keycloak");

  const org = await prisma.organization.findUnique({ where: { slug } });
  if (!org) redirect("/dashboard");

  const owners = await getForestOwners(org.id);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Waldbesitzer</h3>
        <p className="text-sm text-slate-500 mt-1">
          Verwalten Sie die Eigentümer der Wälder in Ihrer Organisation. Ein Besitzer kann
          mehreren Wäldern zugewiesen werden.
        </p>
      </div>
      <OwnersClient organizationId={org.id} initialOwners={owners} />
    </div>
  );
}
