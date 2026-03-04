import { prisma } from "@/lib/prisma";
import { RecurrenceUnit, TaskSchedule } from "@prisma/client";
import { addDays, addWeeks, addMonths, addYears } from "date-fns";

/**
 * Berechnet das nächste Datum basierend auf Intervall und Einheit
 */
function calculateNextDate(currentDate: Date, unit: RecurrenceUnit, interval: number): Date {
  switch (unit) {
    case "DAYS": return addDays(currentDate, interval);
    case "WEEKS": return addWeeks(currentDate, interval);
    case "MONTHS": return addMonths(currentDate, interval);
    case "YEARS": return addYears(currentDate, interval);
    default: return addDays(currentDate, interval);
  }
}

/**
 * Der Generator: Erzeugt Aufgaben für fällige Serien
 * Dies sollte idealerweise von einem Cron-Job (z.B. Vercel Cron) 1x täglich aufgerufen werden.
 */
export async function generateRecurringTasks() {
  const now = new Date();

  // 1. Finde alle aktiven Serien, die fällig sind (nextRunAt <= heute)
  const dueSchedules = await prisma.taskSchedule.findMany({
    where: {
      active: true,
      nextRunAt: { lte: now },
      OR: [
        { endDate: null },
        { endDate: { gte: now } }
      ]
    }
  });

  console.log(`🔄 Prüfe Serien: ${dueSchedules.length} fällig.`);

  for (const schedule of dueSchedules) {
    // Transaction: Aufgabe erstellen UND Serie updaten (atomar)
    await prisma.$transaction(async (tx) => {
      
      // A. Aufgabe erstellen
      await tx.task.create({
        data: {
          title: schedule.title,
          description: schedule.description,
          priority: schedule.priority,
          forestId: schedule.forestId,
          assigneeId: schedule.assigneeId,
          creatorId: schedule.creatorId,
          scheduleId: schedule.id,
          status: "OPEN",
          dueDate: schedule.nextRunAt, // Fälligkeit ist das Berechnungsdatum
        }
      });

      // B. Nächstes Datum berechnen
      const nextDate = calculateNextDate(schedule.nextRunAt, schedule.unit, schedule.interval);

      // C. Serie aktualisieren
      await tx.taskSchedule.update({
        where: { id: schedule.id },
        data: {
          lastGeneratedAt: new Date(),
          nextRunAt: nextDate
        }
      });
    });
  }
}