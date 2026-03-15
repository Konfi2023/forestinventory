import { prisma } from "@/lib/prisma";
import { UserTable } from "@/components/admin/UserTable";
import { InviteUserDialog } from "@/components/admin/InviteUserDialog";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function UsersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  
  const session = await getServerSession(authOptions);
  if (!session?.user) return redirect("/api/auth/signin");

  const org = await prisma.organization.findUnique({
    where: { slug },
  });

  if (!org) return notFound();

  const myMembership = await prisma.membership.findFirst({
    where: { userId: session.user.id, organizationId: org.id },
    include: { role: true },
  });

  if (!myMembership) return notFound();

  const canInvite =
    myMembership.role.name === "Administrator" ||
    myMembership.role.permissions.includes("users:invite");

  // 1. Mitglieder inkl. accessibleForests laden
  const members = await prisma.membership.findMany({
    where: { organizationId: org.id },
    include: {
      user: {
        include: { accessibleForests: true } // <--- WICHTIG
      },
      role: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // 2. Alle Wälder laden (für den Dialog)
  const forests = await prisma.forest.findMany({
    where: { organizationId: org.id },
    select: { id: true, name: true }
  });

  const invites = await prisma.invite.findMany({
    where: { organizationId: org.id, status: "PENDING" },
    include: { role: true },
    orderBy: { createdAt: "desc" }
  });

  const availableRoles = await prisma.role.findMany({
    where: { organizationId: org.id },
    orderBy: [{ isSystemRole: "desc" }, { name: "asc" }],
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Benutzerverwaltung</h2>
          <p className="text-muted-foreground">
            Verwalten Sie Zugriffe, Mitglieder und offene Einladungen.
          </p>
        </div>
        
        {canInvite && (
          <InviteUserDialog
            orgSlug={slug}
            availableRoles={availableRoles}
          />
        )}
      </div>

      <UserTable 
        members={members} 
        invites={invites}
        availableRoles={availableRoles}
        orgSlug={slug}
        currentUserId={session.user.id}
        currentUserRole={myMembership.role}
        forests={forests} // <--- NEU: Übergeben
      />
    </div>
  );
}