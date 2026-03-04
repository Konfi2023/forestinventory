import { prisma } from "@/lib/prisma";
import { createEvents } from "ics";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) return new NextResponse("Missing Token", { status: 401 });

  // 1. User via Token finden
  const user = await prisma.user.findUnique({
    where: { calendarToken: token }
  });

  if (!user) return new NextResponse("Invalid Token", { status: 401 });

  // 2. Alle Tasks für diesen User holen (über alle Orgs hinweg oder spezifisch)
  // Hier: Wir holen alle Tasks aus Organisationen, wo der User Mitglied ist.
  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    select: { organizationId: true }
  });
  const orgIds = memberships.map(m => m.organizationId);

  const tasks = await prisma.task.findMany({
    where: {
      forest: { organizationId: { in: orgIds } },
      scheduledDate: { not: null },
      status: { not: 'DONE' } // Nur offene? Oder alle? iCal zeigt meist alles.
    },
    include: { forest: true }
  });

  // 3. Events laden
  const events = await prisma.event.findMany({
    where: { organizationId: { in: orgIds } }
  });

  // 4. iCal Format bauen
  const icalEvents: any[] = [];

  // Tasks
  tasks.forEach(t => {
    if (!t.scheduledDate) return;
    const start = new Date(t.scheduledDate);
    // Dauer berechnen oder Standard 1h
    const end = t.scheduledEndDate || new Date(start.getTime() + 60 * 60 * 1000);
    
    icalEvents.push({
      start: [start.getFullYear(), start.getMonth() + 1, start.getDate(), start.getHours(), start.getMinutes()],
      end: [end.getFullYear(), end.getMonth() + 1, end.getDate(), end.getHours(), end.getMinutes()],
      title: `[T] ${t.title} (${t.forest.name})`,
      description: t.description || "",
      status: 'CONFIRMED',
      busyStatus: 'BUSY'
    });
  });

  // Termine
  events.forEach(e => {
    const start = new Date(e.start);
    // Bei ganztägig ist das Format anders, aber ics lib handhabt arrays gut.
    // Vereinfacht:
    const end = e.end || new Date(start.getTime() + 60 * 60 * 1000);

    icalEvents.push({
      start: [start.getFullYear(), start.getMonth() + 1, start.getDate(), start.getHours(), start.getMinutes()],
      end: [end.getFullYear(), end.getMonth() + 1, end.getDate(), end.getHours(), end.getMinutes()],
      title: `[E] ${e.title}`,
      description: e.description || "",
      status: 'CONFIRMED',
      busyStatus: 'BUSY'
    });
  });

  const { error, value } = createEvents(icalEvents);

  if (error) {
    console.error(error);
    return new NextResponse("Error generating iCal", { status: 500 });
  }

  return new NextResponse(value, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="forest-calendar.ics"`,
    },
  });
}