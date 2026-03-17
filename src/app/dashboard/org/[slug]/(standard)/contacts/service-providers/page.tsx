import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getServiceProviders } from "@/actions/service-providers";
import { ServiceProvidersClient } from "../../settings/service-providers/_components/ServiceProvidersClient";

export default async function ServiceProvidersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/api/auth/signin/keycloak");

  const org = await prisma.organization.findUnique({ where: { slug } });
  if (!org) redirect("/dashboard");

  const providers = await getServiceProviders(org.id);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Dienstleister</h3>
        <p className="text-sm text-slate-500 mt-1">
          Verwalten Sie externe Dienstleister wie Forstunternehmer, Gutachter oder Sägewerke,
          die für Ihre Organisation tätig sind.
        </p>
      </div>
      <ServiceProvidersClient organizationId={org.id} initialProviders={providers} />
    </div>
  );
}
