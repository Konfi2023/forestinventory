import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { CalendarView } from "./_components/CalendarView";
import { SubscribeCalendarDialog } from "./_components/SubscribeCalendarDialog"; // Import!

export default async function CalendarPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user) return redirect("/api/auth/signin");

  const org = await prisma.organization.findUnique({
    where: { slug },
    include: {
      members: { include: { user: true } }
    }
  });

  if (!org) return notFound();

  // Wälder laden
  const forests = await prisma.forest.findMany({
    where: { organizationId: org.id },
    select: { id: true, name: true, geoJson: true },
    orderBy: { name: 'asc' }
  });

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold tracking-tight">Kalender</h2>
            <p className="text-muted-foreground">Übersicht aller Aufgaben und Termine.</p>
        </div>
        
        {/* HIER IST DER BUTTON */}
        <SubscribeCalendarDialog />
      </div>

      <div className="flex-1 overflow-hidden">
        <CalendarView 
            orgSlug={slug}
            currentUserId={session.user.id}
            members={org.members.map(m => m.user)}
            forests={forests}
        />
      </div>
    </div>
  );
}