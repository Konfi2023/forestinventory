import { prisma } from "@/lib/prisma";
import { RoleMatrix } from "@/components/admin/RoleMatrix";
import { CreateRoleDialog } from "@/components/admin/CreateRoleDialog";
import { notFound } from "next/navigation";

export default async function RolesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  // WICHTIG für Next.js 15: params müssen awaited werden
  const { slug } = await params;

  // 1. Organisation finden
  const org = await prisma.organization.findUnique({
    where: { slug },
  });

  if (!org) return notFound();

  // 2. Alle Rollen laden
  // Wir sortieren so, dass Systemrollen (wie Administrator) zuerst kommen,
  // danach die eigenen Rollen alphabetisch.
  const roles = await prisma.role.findMany({
    where: { organizationId: org.id },
    orderBy: [
      { isSystemRole: "desc" }, // Systemrollen (true) zuerst
      { name: "asc" },          // Danach alphabetisch
    ],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Rollen & Rechte</h2>
          <p className="text-muted-foreground">
            Definieren Sie, wer welche Aktionen in <strong>{org.name}</strong> ausführen darf.
          </p>
        </div>
        
        {/* Der Dialog zum Erstellen neuer Rollen */}
        <CreateRoleDialog orgSlug={slug} />
      </div>

      {/* Die Matrix-Tabelle zur Rechteverwaltung */}
      <RoleMatrix roles={roles} orgSlug={slug} />
    </div>
  );
}