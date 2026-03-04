import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { OrgActions } from "./_components/OrgActions";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { requireSystemAdmin } from "@/lib/admin-auth";
import Link from "next/link";
import { Eye, Trash2 } from "lucide-react";

// Neu: Import der LÖSCH-Logik und des Modals
import { deleteOrganization } from "@/actions/admin";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";

export default async function AdminOrgsPage({
  searchParams,
}: {
  searchParams?: Promise<{ query?: string }>;
}) {
  // 1. Authentifizierung & Admin-Email holen (für das Lösch-Modal)
  const session = await requireSystemAdmin();
  const adminEmail = session.user?.email || "";
  
  // 2. Suchparameter verarbeiten
  const params = await searchParams;
  const query = params?.query || "";

  // 3. Organisationen laden (mit Filter)
  const orgs = await prisma.organization.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { slug: { contains: query, mode: 'insensitive' } },
      ]
    },
    include: {
      _count: { select: { members: true, forests: true } }
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold">Organisationen</h2>
            <p className="text-sm text-muted-foreground">Verwaltung aller Mandanten im System.</p>
        </div>
        <AdminSearch placeholder="Name oder Slug suchen..." />
      </div>

      <div className="bg-white rounded-md border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name / Slug</TableHead>
              <TableHead>Mitglieder</TableHead>
              <TableHead>Wälder</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orgs.map((org) => (
              <TableRow key={org.id}>
                <TableCell>
                  <div className="font-medium">{org.name}</div>
                  <div className="text-xs text-slate-500 font-mono">{org.slug}</div>
                </TableCell>
                <TableCell>{org._count.members}</TableCell>
                <TableCell>{org._count.forests}</TableCell>
                <TableCell>
                  <Badge 
                    variant="outline" 
                    className={
                        org.subscriptionStatus === 'ACTIVE' ? "bg-green-50 text-green-700 border-green-200" : 
                        org.subscriptionStatus === 'SUSPENDED' ? "bg-red-50 text-red-700 border-red-200" : ""
                    }
                  >
                    {org.subscriptionStatus || 'FREE'}
                  </Badge>
                </TableCell>
                
                {/* AKTIONEN SPALTE */}
                <TableCell className="text-right">
                   <div className="flex items-center justify-end gap-2">
                        {/* 1. Detailansicht */}
                        <Link href={`/admin/organizations/${org.id}`}>
                            <Button variant="ghost" size="sm" title="Details & Mitglieder ansehen">
                                <Eye className="w-4 h-4 text-slate-500" />
                            </Button>
                        </Link>
                        
                        {/* 2. Status ändern (Sperren/Aktivieren) */}
                        <OrgActions orgId={org.id} currentStatus={org.subscriptionStatus || 'FREE'} />

                        {/* 3. Löschen mit Sicherheits-Modal */}
                        <DeleteConfirmDialog 
                            trigger={
                                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" title="Organisation unwiderruflich löschen">
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            }
                            title={`Organisation "${org.name}" wirklich löschen?`}
                            description="ACHTUNG: Dies löscht ALLE Daten (Benutzerzuordnungen, Wälder, Logs, Bestände) dieser Organisation unwiderruflich. Um DSGVO-konform zu löschen, bestätigen Sie diesen Vorgang bitte mit Ihrer Admin-E-Mail."
                            confirmString={adminEmail}
                            onConfirm={async () => {
                                "use server";
                                await deleteOrganization(org.id);
                            }}
                        />
                   </div>
                </TableCell>
              </TableRow>
            ))}
            
            {/* Fallback bei leerer Liste */}
            {orgs.length === 0 && (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        Keine Organisationen gefunden.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}