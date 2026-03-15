import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { EudrSettingsForm } from "./_components/EudrSettingsForm";

export default async function EudrSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return redirect('/api/auth/signin/keycloak');

  const org = await prisma.organization.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      legalName: true,
      country: true,
      eudrActivityType: true,
      eoriNumber: true,
      eudrApiUrl: true,
      eudrApiUsername: true,
      eudrApiPassword: true,
      eudrApiClientId: true,
      eudrApiEnvironment: true,
      eudrApiEnabled: true,
    },
  });
  if (!org) return notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h3 className="text-lg font-medium">EUDR-Compliance & API</h3>
        <p className="text-sm text-muted-foreground">
          Einstellungen für die EU-Entwaldungsverordnung (Verordnung EU 2023/1115) und die
          Verbindung zu TRACES NT für automatische DDS-Einreichung. Gültig ab 1. Januar 2027.
        </p>
      </div>

      <EudrSettingsForm organization={org} />
    </div>
  );
}
