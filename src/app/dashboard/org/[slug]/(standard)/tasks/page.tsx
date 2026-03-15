import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";

// UI Components
import { CreateTaskDialog } from "./_components/CreateTaskDialog"; 
import { ManageSchedulesDialog } from "./_components/ManageSchedulesDialog";

// Das interaktive Board
import { TaskBoard } from "./_components/TaskBoard";

export default async function TasksPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ taskId?: string }>;
}) {
  const { slug } = await params;
  const { taskId } = await searchParams;
  
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return redirect('/api/auth/signin/keycloak');
  }

  // 1. Organisation laden
  const org = await prisma.organization.findUnique({
    where: { slug },
    include: {
      members: {
        where: { userId: session.user.id },
        include: { role: true }
      },
      forests: { select: { id: true, name: true } }
    }
  });

  if (!org || !org.members[0]) return notFound();

  // 2. Berechtigungen prüfen
  const myRole = org.members[0].role;
  const permissions = myRole.permissions;
  const isAdmin = myRole.name === "Administrator";

  const canCreate = isAdmin || permissions.includes("tasks:create");
  const canView = isAdmin || permissions.includes("tasks:view");
  const canManageSchedules = isAdmin || permissions.includes("schedules:manage");

  if (!canView) {
    return (
        <div className="flex h-[50vh] items-center justify-center text-muted-foreground">
            Keine Berechtigung, Aufgaben zu sehen.
        </div>
    );
  }

  // 3. Daten für das Board laden
  const tasks = await prisma.task.findMany({
    where: { forest: { organizationId: org.id } },
    include: {
      assignee: true,
      creator: true,
      forest: true,
      schedule: true,
      poi: true,
      comments: {
        include: { user: true },
        orderBy: { createdAt: 'desc' }
      },
      timeEntries: {
        include: { user: true },
        orderBy: { startTime: 'desc' },
      },
    },
    orderBy: [
        { priority: 'desc' }, 
        { dueDate: 'asc' }
    ]
  });
  
  // 4. Wälder für den Filter laden (NEU)
  const allForests = await prisma.forest.findMany({
    where: { organizationId: org.id },
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  });
  
  const members = await prisma.membership.findMany({
    where: { organizationId: org.id },
    include: { user: true }
  });

  return (
    <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Aufgaben & Planung</h2>
        </div>
        
        <div className="flex items-center gap-2">
            {canManageSchedules && (
                <ManageSchedulesDialog 
                    orgSlug={slug}
                    forests={org.forests}
                    members={members.map(m => m.user)}
                />
            )}

            {canCreate && (
                <CreateTaskDialog 
                    orgSlug={slug} 
                    forests={org.forests} 
                    members={members.map(m => m.user)} 
                />
            )}
        </div>
      </div>

      <TaskBoard 
         initialTasks={tasks} 
         orgSlug={slug} 
         members={members.map(m => m.user)} 
         currentUserId={session.user.id} 
         defaultOpenTaskId={taskId}
         forests={allForests} // <--- NEU: Übergeben
      />
    </div>
  );
}