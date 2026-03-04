import { prisma } from "@/lib/prisma";
import { requireSystemAdmin } from "@/lib/admin-auth";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trash2, UserX } from "lucide-react";
import Link from "next/link";
import { revalidatePath } from "next/cache";

// Komponenten für Interaktion
import { EditMemberRoleDialog } from "@/components/admin/EditMemberRoleDialog";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";

export default async function AdminOrgDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // 1. Security Check & Admin Email für Bestätigung holen
  const session = await requireSystemAdmin();
  const adminEmail = session.user?.email || "";
  
  const { id } = await params;

  // 2. Organisation laden inkl. Mitglieder und Statistiken
  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: true,
          role: true,
        },
        orderBy: { role: { name: 'asc' } } // Sortiert Admins meist nach oben (alphabetisch)
      },
      _count: { select: { forests: true, members: true } }
    }
  });

  if (!org) return notFound();

  // 3. Verfügbare Rollen dieser Organisation laden (für das Dropdown)
  const availableRoles = await prisma.role.findMany({
    where: { organizationId: org.id },
    orderBy: { name: 'asc' }
  });

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center gap-4">
        <Link href="/admin/organizations">
            <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2"/> Zurück
            </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {org.name} 
            <Badge variant="outline" className="ml-2 font-mono font-normal text-slate-500">
                {org.slug}
            </Badge>
          </h1>
        </div>
      </div>

      {/* STATS KARTEN */}
      <div className="grid gap-6 md:grid-cols-3">
          <Card>
              <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{org.subscriptionStatus || 'FREE'}</div>
                  <p className="text-xs text-muted-foreground">
                    Erstellt am {new Date(org.createdAt).toLocaleDateString('de-DE')}
                  </p>
              </CardContent>
          </Card>
          <Card>
              <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Mitglieder</CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{org._count.members}</div>
                  <p className="text-xs text-muted-foreground">Aktive Zugänge</p>
              </CardContent>
          </Card>
          <Card>
              <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Wälder</CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{org._count.forests}</div>
                  <p className="text-xs text-muted-foreground">Erfasste Flurstücke/Bestände</p>
              </CardContent>
          </Card>
      </div>

      {/* MITGLIEDER LISTE */}
      <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Mitglieder verwalten</h3>
          </div>
          
          <div className="bg-white rounded-md border shadow-sm">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Rolle</TableHead>
                        <TableHead>Beigetreten am</TableHead>
                        <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {org.members.map((membership) => (
                        <TableRow key={membership.id}>
                            <TableCell className="font-medium">
                                {membership.user.firstName} {membership.user.lastName}
                            </TableCell>
                            <TableCell>{membership.user.email}</TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <Badge 
                                        variant="secondary" 
                                        className={membership.role.name === 'Administrator' ? "bg-purple-100 text-purple-700 hover:bg-purple-100" : ""}
                                    >
                                        {membership.role.name}
                                    </Badge>
                                </div>
                            </TableCell>
                            <TableCell className="text-slate-500 text-sm">
                                {new Date(membership.createdAt).toLocaleDateString('de-DE')}
                            </TableCell>
                            
                            {/* AKTIONEN: Rolle ändern & Rauswerfen */}
                            <TableCell className="text-right">
                                <div className="flex justify-end items-center gap-2">
                                    
                                    {/* 1. Rolle bearbeiten */}
                                    <EditMemberRoleDialog 
                                        membershipId={membership.id} 
                                        currentRoleId={membership.roleId} 
                                        roles={availableRoles} 
                                    />

                                    {/* 2. Mitglied entfernen */}
                                    <DeleteConfirmDialog 
                                        trigger={
                                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" title="Aus Organisation entfernen">
                                                <UserX className="w-4 h-4" />
                                            </Button>
                                        }
                                        title={`${membership.user.email} entfernen?`}
                                        description={`Soll dieser Benutzer wirklich aus der Organisation "${org.name}" entfernt werden? Der Benutzer-Account selbst bleibt bestehen.`}
                                        confirmString={adminEmail}
                                        onConfirm={async () => {
                                            "use server";
                                            // Inline Server Action für diesen spezifischen Fall
                                            await requireSystemAdmin(); // Doppelter Check zur Sicherheit
                                            
                                            await prisma.membership.delete({
                                                where: { id: membership.id }
                                            });
                                            
                                            revalidatePath(`/admin/organizations/${id}`);
                                        }}
                                    />
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                    {org.members.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                Diese Organisation hat noch keine Mitglieder.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
          </div>
      </div>
    </div>
  );
}