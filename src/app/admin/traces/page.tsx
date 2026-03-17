import { requireSystemAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { TracesAdminPanel } from "./_components/TracesAdminPanel";

export const metadata = { title: "TRACES NT API – Admin" };

export default async function TracesAdminPage() {
  await requireSystemAdmin();

  const orgs = await prisma.organization.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      eudrApiEnabled: true,
      eudrApiEnvironment: true,
      eudrApiUrl: true,
      eudrApiUsername: true,
      eudrApiPassword: true,
      eudrApiClientId: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">TRACES NT API</h1>
        <p className="text-sm text-slate-500 mt-1">
          SOAP-Verbindungseinstellungen pro Organisation für die EU-Entwaldungsverordnung (EUDR).
        </p>
      </div>
      <TracesAdminPanel orgs={orgs} />
    </div>
  );
}
