"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Holidays from "date-holidays"; // NEU

async function checkPermission(orgSlug: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  
  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    include: { members: { where: { userId: session.user.id } } }
  });
  
  if (!org || !org.members[0]) throw new Error("Kein Zugriff");
  return { org };
}

export async function getCalendarData(orgSlug: string, start: Date, end: Date) {
  const { org } = await checkPermission(orgSlug);

  // 1. Tasks laden
  const tasks = await prisma.task.findMany({
    where: {
      forest: { organizationId: org.id },
      scheduledDate: { gte: start, lte: end }
    },
    include: { forest: true, assignee: true }
  });

  // 2. Events laden
  const events = await prisma.event.findMany({
    where: {
      organizationId: org.id,
      start: { gte: start, lte: end }
    },
    include: { forest: true }
  });

  // 3. Feiertage berechnen (NEU)
  // Standard: Deutschland (DE). Später könnte man das Bundesland aus der Org-Adresse holen.
  const hd = new Holidays('DE'); 
  const years = new Set([start.getFullYear(), end.getFullYear()]);
  let holidays: any[] = [];

  years.forEach(year => {
    holidays = [...holidays, ...hd.getHolidays(year)];
  });

  // Filtern auf den Zeitraum
  const relevantHolidays = holidays.filter(h => {
    const hDate = new Date(h.date);
    return hDate >= start && hDate <= end;
  });

  // --- FORMATIERUNG ---

  const formattedHolidays = relevantHolidays.map(h => ({
    id: `holiday-${h.date}`,
    title: `🎉 ${h.name}`, // Der Name erscheint jetzt im Kalender
    start: h.date,
    allDay: true,
    // WICHTIG: Kein 'display: background' mehr!
    editable: false, // Nicht verschiebbar
    backgroundColor: '#fef9c3', // Helles Gelb (Tailwind yellow-100)
    borderColor: '#fde047',     // Gelber Rand
    textColor: '#854d0e',       // Dunkler Text (Tailwind yellow-800)
    extendedProps: {
      type: 'holiday' // Damit wir es im Frontend erkennen
    }
  }));

  const formattedTasks = tasks.map(t => ({
    id: t.id,
    title: t.title,
    start: t.scheduledDate,
    end: t.scheduledEndDate,
    allDay: !t.scheduledEndDate,
    backgroundColor: getTaskColor(t.priority),
    borderColor: getTaskColor(t.priority),
    extendedProps: {
      type: 'task',
      forestName: t.forest.name,
      status: t.status,
      dueDate: t.dueDate,
      assignee: t.assignee
    }
  }));

  const formattedEvents = events.map(e => ({
    id: e.id,
    title: e.title,
    start: e.start,
    end: e.end,
    allDay: e.allDay,
    backgroundColor: e.color || '#10b981',
    borderColor: e.color || '#10b981',
    extendedProps: {
      type: 'event',
      forestName: e.forest?.name,
      description: e.description
    }
  }));

  return [...formattedHolidays, ...formattedTasks, ...formattedEvents];
}

// ... getUnscheduledTasks und Helper ... (bleiben gleich)
export async function getUnscheduledTasks(orgSlug: string) {
    // (Code wie vorher, bitte nicht löschen!)
    const { org } = await checkPermission(orgSlug);
    // ...
    // Falls du den Code nicht mehr hast, sag Bescheid, ich poste ihn nochmal.
    // Aber ich nehme an, der Teil unten in der Datei bleibt bestehen.
    const tasks = await prisma.task.findMany({
        where: {
            forest: { organizationId: org.id },
            scheduledDate: null,
            status: { not: 'DONE' }
        },
        include: { forest: true, assignee: true }
    });
    return tasks.map(t => ({
        id: t.id,
        title: t.title,
        forestName: t.forest.name,
        priority: t.priority,
        duration: t.estimatedTime ? `0${Math.floor(t.estimatedTime / 60)}:${t.estimatedTime % 60}`.replace('00:', '0:') : '01:00',
        assignee: t.assignee
    }));
}

function getTaskColor(priority: string) {
  switch (priority) {
    case 'URGENT': return '#ef4444';
    case 'HIGH': return '#f97316';
    case 'MEDIUM': return '#3b82f6';
    default: return '#94a3b8';
  }
}

import { randomBytes } from "crypto";

export async function getICalLink() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  // User laden
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) throw new Error("User not found");

  let token = user.calendarToken;

  // Wenn noch kein Token da ist, erstellen wir eins
  if (!token) {
    token = randomBytes(16).toString("hex");
    await prisma.user.update({
      where: { id: user.id },
      data: { calendarToken: token }
    });
  }

  // URL zusammenbauen
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  return `${baseUrl}/api/calendar/feed?token=${token}`;
}

export async function resetICalToken() {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");
    
    const newToken = randomBytes(16).toString("hex");
    await prisma.user.update({
      where: { id: session.user.id },
      data: { calendarToken: newToken }
    });
    
    return { success: true };
}