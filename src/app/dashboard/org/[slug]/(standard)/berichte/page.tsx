import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ReportBuilder } from "./_components/ReportBuilder";
import { DocumentArchive } from "./_components/DocumentArchive";
import { getDocuments } from "@/actions/reports";

export default async function BerichtePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/api/auth/signin/keycloak");

  const { slug } = await params;

  const org = await prisma.organization.findUniqueOrThrow({
    where: { slug },
    select: {
      id: true,
      name: true,
      legalName: true,
      billingEmail: true,
      iban: true,
      bic: true,
      bankName: true,
      isKleinunternehmer: true,
      defaultPaymentDays: true,
      vatId: true,
    },
  });

  const forestOwners = await prisma.forestOwner.findMany({
    where: { organizationId: org.id },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      forests: {
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      },
    },
  });

  const rawDocuments = await getDocuments(org.id);

  // Serialize dates for client
  const documents = rawDocuments.map((d) => ({
    ...d,
    periodFrom: d.periodFrom?.toISOString() ?? null,
    periodTo: d.periodTo?.toISOString() ?? null,
    sentAt: d.sentAt?.toISOString() ?? null,
    createdAt: d.createdAt.toISOString(),
  }));

  return (
    <div className="flex-1 overflow-auto bg-slate-50 h-full">
      <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-8">

        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Berichte</h1>
          <p className="text-sm text-slate-500 mt-1">
            Tätigkeitsnachweise und Rechnungen erstellen, per E-Mail versenden und archivieren
          </p>
        </div>

        {/* Warn if org has no billing info */}
        {!org.iban && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
            <strong>Hinweis:</strong> IBAN und Bankverbindung sind noch nicht hinterlegt.{" "}
            <a
              href={`/dashboard/org/${slug}/settings`}
              className="underline font-medium"
            >
              Jetzt in Administration eingeben
            </a>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Report builder */}
          <div className="lg:col-span-3">
            <ReportBuilder
              orgId={org.id}
              orgSlug={slug}
              forestOwners={forestOwners}
            />
          </div>

          {/* Right: quick stats */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Rechnungskonfiguration</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Absender</dt>
                  <dd className="font-medium text-slate-800 truncate max-w-[160px]">
                    {org.legalName || org.name}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">IBAN</dt>
                  <dd className={`font-mono text-xs ${org.iban ? "text-slate-800" : "text-slate-400"}`}>
                    {org.iban ?? "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">USt-IdNr.</dt>
                  <dd className={`text-slate-800 ${!org.vatId && "text-slate-400"}`}>
                    {org.vatId ?? "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Zahlungsziel</dt>
                  <dd className="text-slate-800">{org.defaultPaymentDays} Tage</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Kleinunternehmer</dt>
                  <dd className="text-slate-800">{org.isKleinunternehmer ? "Ja (§ 19 UStG)" : "Nein"}</dd>
                </div>
              </dl>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-1">Waldbesitzer</h3>
              <p className="text-2xl font-bold text-slate-900">{forestOwners.length}</p>
              <p className="text-xs text-slate-400 mt-0.5">im System hinterlegt</p>
            </div>
          </div>
        </div>

        {/* Document archive */}
        <DocumentArchive
          orgId={org.id}
          documents={documents}
          forestOwners={forestOwners.map((o) => ({ id: o.id, name: o.name }))}
        />
      </div>
    </div>
  );
}
