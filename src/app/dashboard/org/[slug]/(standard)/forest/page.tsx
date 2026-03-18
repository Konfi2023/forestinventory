import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { getAccessibleForests } from "@/lib/forest-access";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Pencil, Trash2, Trees } from "lucide-react";
import { ForestDialog } from "./_components/ForestDialog";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog"; // Wir recyclen den Dialog
import { deleteForest } from "@/actions/forest";

export default async function ForestPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return redirect('/api/auth/signin/keycloak');

  const org = await prisma.organization.findUnique({
    where: { slug },
    include: {
      members: { include: { role: true, user: true } } // Members für den Dialog laden
    }
  });
  if (!org) return notFound();

  // WICHTIG: Wir laden nur die Wälder, die der User sehen darf!
  const forests = await getAccessibleForests(org.id, session.user.id);

  // Um im Dialog auch die grantedUsers anzuzeigen, müssen wir diese Relation evtl nachladen 
  // oder getAccessibleForests anpassen. Der Einfachheit halber laden wir hier für die Anzeige
  // die Details noch nach, falls getAccessibleForests nur Basisdaten liefert.
  // Da Prisma aber keine "Partial Lazy Loading" in Listen kann, holen wir uns für den Dialog
  // die "grantedUsers" idealerweise direkt mit. 
  // -> Quick Fix: Wir machen eine zweite Query im Dialog oder laden es hier via include in getAccessibleForests (müsste man anpassen).
  // Hier der pragmatische Weg: Wir holen für die Anzeige alle Forests nochmal mit 'grantedUsers', 
  // aber filtern sie mit der ID-Liste aus dem Access-Check.
  
  const accessibleIds = forests.map(f => f.id);
  const forestsWithDetails = await prisma.forest.findMany({
    where: { id: { in: accessibleIds } },
    include: { grantedUsers: true, _count: { select: { tasks: true } } },
    orderBy: { name: 'asc' }
  });

  // Rechte prüfen für "Erstellen" Button
  const myRole = org.members.find(m => m.userId === session.user.id)?.role;
  const canEdit = myRole?.name === "Administrator" || myRole?.permissions.includes("forest:edit");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold tracking-tight">Waldbestände</h2>
            <p className="text-muted-foreground">Übersicht Ihrer Reviere und Flächen.</p>
        </div>
        {canEdit && (
            <ForestDialog 
                orgSlug={slug} 
                members={org.members}
            />
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {forestsWithDetails.map((forest) => (
            <Card key={forest.id} className="group hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <Trees className="h-5 w-5 text-green-600" />
                        {forest.name}
                    </CardTitle>
                    {canEdit && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ForestDialog 
                                orgSlug={slug}
                                members={org.members}
                                forest={forest}
                                trigger={
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-blue-600">
                                        <Pencil size={14} />
                                    </Button>
                                }
                            />
                            <DeleteConfirmDialog 
                                trigger={
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-600">
                                        <Trash2 size={14} />
                                    </Button>
                                }
                                title={`Wald "${forest.name}" löschen?`}
                                description="Dies löscht alle Geodaten, Aufgaben und Historie dieses Bestandes."
                                confirmString="LÖSCHEN"
                                onConfirm={async () => {
                                    "use server";
                                    await deleteForest(forest.id, slug);
                                }}
                            />
                        </div>
                    )}
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-slate-500 mb-4 flex flex-col gap-1">
                        {forest.location && (
                            <div className="flex items-center gap-1">
                                <MapPin size={12} /> {forest.location}
                            </div>
                        )}
                        <div className="flex items-center justify-between mt-2">
                            <span className="bg-slate-100 px-2 py-1 rounded text-xs font-mono">
                                {forest.areaHa ? `${forest.areaHa} ha` : 'Keine Fläche'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {forest._count.tasks} Aufgaben
                            </span>
                        </div>
                    </div>
                    
                    {/* User Avatare */}
                    <div className="border-t pt-3 flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground uppercase">Zugriff:</span>
                        <div className="flex -space-x-2 overflow-hidden">
                            {/* Admins zeigen wir hier nicht explizit an, nur die "Granted Users" */}
                            {forest.grantedUsers.length > 0 ? forest.grantedUsers.map(u => (
                                <div key={u.id} className="h-6 w-6 rounded-full bg-blue-100 border border-white flex items-center justify-center text-[9px] font-bold text-blue-700" title={u.email}>
                                    {u.lastName?.[0]}
                                </div>
                            )) : (
                                <span className="text-xs text-slate-400 italic">Nur Admins</span>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        ))}
      </div>
    </div>
  );
}