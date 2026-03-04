// src/app/admin/users/page.tsx
import { prisma } from "@/lib/prisma";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireSystemAdmin } from "@/lib/admin-auth";
import { Check, X, Pencil, Trash2 } from "lucide-react";

// Komponenten importieren
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { EditUserDialog } from "@/components/admin/EditUserDialog"; // Code unten
import { deleteUser } from "@/actions/admin";

export default async function AdminUsersPage({ searchParams }: { searchParams?: Promise<{ query?: string }> }) {
  const session = await requireSystemAdmin();
  const adminEmail = session.user?.email || "";
  
  const params = await searchParams;
  const query = params?.query || "";

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: query, mode: 'insensitive' } },
        { lastName: { contains: query, mode: 'insensitive' } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 50, 
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Benutzerverwaltung</h2>
        <AdminSearch placeholder="Name oder E-Mail suchen..." />
      </div>

      <div className="bg-white rounded-md border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>E-Mail</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Admin</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.firstName} {user.lastName}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  {user.onboardingComplete ? 
                    <Badge variant="outline" className="text-green-600 bg-green-50">Fertig</Badge> : 
                    <Badge variant="outline" className="text-amber-600 bg-amber-50">Neu</Badge>
                  }
                </TableCell>
                <TableCell className="text-center">
                   {user.isSystemAdmin ? <Check className="w-4 h-4 mx-auto text-green-600" /> : <X className="w-4 h-4 mx-auto text-slate-300" />}
                </TableCell>
                <TableCell className="text-right flex justify-end gap-2">
                  
                  {/* EDIT BUTTON */}
                  <EditUserDialog user={user} />

                  {/* DELETE BUTTON */}
                  <DeleteConfirmDialog 
                    trigger={
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    }
                    title={`Benutzer "${user.email}" löschen?`}
                    description="Dieser Vorgang löscht den Benutzer aus der Datenbank. DSGVO-Konformität: Alle personenbezogenen Daten werden entfernt."
                    confirmString={adminEmail}
                    onConfirm={async () => {
                      "use server";
                      await deleteUser(user.id);
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}