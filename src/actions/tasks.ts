"use server";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { TaskPriority, TaskStatus, RecurrenceUnit } from "@prisma/client";
import { addDays, addWeeks, addMonths, addYears } from "date-fns";

function calcNextDate(from: Date, unit: RecurrenceUnit, interval: number): Date {
  switch (unit) {
    case "DAYS":   return addDays(from, interval);
    case "WEEKS":  return addWeeks(from, interval);
    case "MONTHS": return addMonths(from, interval);
    case "YEARS":  return addYears(from, interval);
    default:       return addDays(from, interval);
  }
}
import { sendNotification, addWatcher } from "@/lib/notifications";

// --- SECURITY HELPER ---
async function checkPermission(orgSlug: string, requiredPerm: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Nicht eingeloggt");

  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    include: { members: { where: { userId: session.user.id }, include: { role: true } } }
  });

  if (!org || !org.members[0]) throw new Error("Kein Zugriff auf Organisation");
  
  const role = org.members[0].role;
  const isAdmin = role.isSystemRole && role.name === "Administrator";
  
  if (!isAdmin && !role.permissions.includes(requiredPerm)) {
    throw new Error(`Fehlende Berechtigung: ${requiredPerm}`);
  }

  return { org, user: session.user };
}

// --- TASKS (CRUD & LOGIK) ---

export async function createTask(orgSlug: string, data: {
  title: string;
  description?: string;
  forestId: string;
  priority: TaskPriority;
  scheduledDate?: Date;
  scheduledEndDate?: Date;
  dueDate?: Date;
  assigneeId?: string;
  lat?: number;
  lng?: number;
  poiId?: string;
  linkedPolygonId?: string;
  linkedPolygonType?: string;
}) {
  const { org, user } = await checkPermission(orgSlug, "tasks:create");

  const forest = await prisma.forest.findUnique({ where: { id: data.forestId } });
  if (!forest || forest.organizationId !== org.id) throw new Error("Wald nicht gefunden");

  const newTask = await prisma.task.create({
    data: {
      title: data.title,
      description: data.description,
      priority: data.priority,
      dueDate: data.dueDate,
      status: "OPEN",
      forestId: data.forestId,
      assigneeId: data.assigneeId || null,
      creatorId: user.id,
      scheduledDate: data.scheduledDate,      
      scheduledEndDate: data.scheduledEndDate,
      
      poiId: data.poiId || null,
      linkedPolygonId: data.poiId ? null : (data.linkedPolygonId || null),
      linkedPolygonType: data.poiId ? null : (data.linkedPolygonType || null),
      lat: (data.poiId || data.linkedPolygonId) ? null : data.lat,
      lng: (data.poiId || data.linkedPolygonId) ? null : data.lng,
      
      watchers: { connect: { id: user.id } }
    }
  });

  if (data.assigneeId) {
    await sendNotification({
      type: "ASSIGNED",
      taskId: newTask.id,
      actorId: user.id,
      title: "Neue Aufgabe zugewiesen",
      forceRecipients: [data.assigneeId]
    });
    await addWatcher(newTask.id, data.assigneeId);
  }
  
  revalidatePath(`/dashboard/org/${orgSlug}/calendar`);
  revalidatePath(`/dashboard/org/${orgSlug}/tasks`);
  revalidatePath(`/dashboard/org/${orgSlug}/map`); // Karte auch updaten
  
  return { success: true };
}

export async function updateTaskStatus(orgSlug: string, taskId: string, newStatus: TaskStatus) {
  const { org, user } = await checkPermission(orgSlug, "tasks:edit");

  const task = await prisma.task.findUnique({ where: { id: taskId }, include: { forest: true } });
  if (!task || task.forest.organizationId !== org.id) throw new Error("Nicht gefunden");

  await prisma.task.update({
    where: { id: taskId },
    data: { status: newStatus }
  });

  // Benachrichtigung an Watcher
  await sendNotification({
    type: "STATUS_CHANGE",
    taskId,
    actorId: user.id,
    title: `Status geändert auf ${newStatus}`,
  });

  revalidatePath(`/dashboard/org/${orgSlug}/tasks`);
  revalidatePath(`/dashboard/org/${orgSlug}/map`);
  return { success: true };
}

export async function assignTask(orgSlug: string, taskId: string, assigneeId: string | null) {
  const { org, user } = await checkPermission(orgSlug, "tasks:assign");

  const task = await prisma.task.update({
    where: { id: taskId },
    data: { assigneeId }
  });

  if (assigneeId) {
    await sendNotification({
      type: "ASSIGNED",
      taskId,
      actorId: user.id,
      title: "Dir wurde eine Aufgabe zugewiesen",
      forceRecipients: [assigneeId]
    });
    await addWatcher(taskId, assigneeId);
  }

  revalidatePath(`/dashboard/org/${orgSlug}/tasks`);
  return { success: true };
}

export async function updateTaskContent(orgSlug: string, taskId: string, data: {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: Date | null;
  estimatedTime?: number | null;
  lat?: number | null;
  lng?: number | null;
  poiId?: string | null;
  linkedPolygonId?: string | null;
  linkedPolygonType?: string | null;
}) {
  const { org, user } = await checkPermission(orgSlug, "tasks:edit");

  // 1. Validierung: Existiert der Task und gehört zur Org?
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { forest: true }
  });

  if (!task || task.forest.organizationId !== org.id) throw new Error("Nicht gefunden");

  // 2. Update durchführen
  await prisma.task.update({
    where: { id: taskId },
    data: data
  });

  // 3. Benachrichtigung senden
  let changeMessage = "Details der Aufgabe wurden bearbeitet";

  if (data.priority) {
    changeMessage = `Priorität wurde auf ${data.priority} geändert`;
  } else if (data.dueDate !== undefined) {
    changeMessage = data.dueDate 
      ? `Fälligkeitsdatum auf den ${data.dueDate.toLocaleDateString('de-DE')} gesetzt` 
      : "Fälligkeitsdatum wurde entfernt";
  } else if (data.estimatedTime !== undefined) {
    changeMessage = `Geschätzter Aufwand wurde aktualisiert`;
  } else if (data.title) {
    changeMessage = `Titel geändert zu: "${data.title}"`;
  } else if (data.description) {
    changeMessage = "Beschreibung wurde aktualisiert";
  } else if (data.poiId) {
    changeMessage = "Aufgabe wurde einem Objekt zugewiesen";
  } else if (data.lat && data.lng) {
    changeMessage = "Standort auf der Karte wurde verschoben";
  }

  await sendNotification({
    type: "STATUS_CHANGE", 
    taskId,
    actorId: user.id, 
    title: "Aufgabe aktualisiert",
    message: changeMessage
  });

  revalidatePath(`/dashboard/org/${orgSlug}/tasks`);
  revalidatePath(`/dashboard/org/${orgSlug}/map`);
  return { success: true };
}

export async function deleteTask(orgSlug: string, taskId: string) {
  const { org } = await checkPermission(orgSlug, "tasks:delete");
  
  const task = await prisma.task.findUnique({ where: { id: taskId }, include: { forest: true } });
  if (!task || task.forest.organizationId !== org.id) throw new Error("Nicht gefunden");

  await prisma.task.delete({ where: { id: taskId } });
  
  revalidatePath(`/dashboard/org/${orgSlug}/tasks`);
  revalidatePath(`/dashboard/org/${orgSlug}/map`);
  return { success: true };
}

/**
 * Holt ALLES zu einem Task (für Live-Updates)
 */
export async function getTaskDetails(orgSlug: string, taskId: string) {
  const { org } = await checkPermission(orgSlug, "tasks:view");

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assignee: true,
      creator: true,
      forest: true,
      schedule: true,
      watchers: { select: { id: true, firstName: true, lastName: true, email: true } },
      timeEntries: {
        include: { user: true },
        orderBy: { startTime: 'desc' }
      },
      comments: {
        include: { user: true },
        orderBy: { createdAt: 'desc' }
      },
      images: { orderBy: { createdAt: 'desc' } },
      documents: { orderBy: { createdAt: 'desc' } },
      poi: true
    }
  });

  if (!task) return null;

  // Verlinktes Polygon-Objekt auflösen (kein echter FK, daher manuell)
  let linkedPolygon: { id: string; name: string; type: string } | null = null;
  if (task.linkedPolygonId && task.linkedPolygonType) {
    switch (task.linkedPolygonType) {
      case 'PLANTING': {
        const obj = await prisma.forestPlanting.findUnique({ where: { id: task.linkedPolygonId }, select: { id: true, treeSpecies: true, description: true } });
        if (obj) linkedPolygon = { id: obj.id, name: obj.description || obj.treeSpecies, type: 'PLANTING' };
        break;
      }
      case 'CALAMITY': {
        const obj = await prisma.forestCalamity.findUnique({ where: { id: task.linkedPolygonId }, select: { id: true, cause: true, description: true } });
        if (obj) linkedPolygon = { id: obj.id, name: obj.description || obj.cause || 'Kalamität', type: 'CALAMITY' };
        break;
      }
      case 'HUNTING': {
        const obj = await prisma.forestHunting.findUnique({ where: { id: task.linkedPolygonId }, select: { id: true, name: true } });
        if (obj) linkedPolygon = { id: obj.id, name: obj.name || 'Jagdrevier', type: 'HUNTING' };
        break;
      }
      case 'PATH':
      case 'ROAD':
      case 'SKID_TRAIL':
      case 'WATER': {
        const PATH_LABELS: Record<string, string> = { ROAD: 'LKW-Weg', SKID_TRAIL: 'Rückegasse', WATER: 'Gewässer' };
        const obj = await prisma.forestPath.findUnique({ where: { id: task.linkedPolygonId }, select: { id: true, name: true, type: true } });
        if (obj) linkedPolygon = { id: obj.id, name: obj.name || PATH_LABELS[obj.type] || obj.type, type: task.linkedPolygonType! };
        break;
      }
    }
  }

  return { ...task, linkedPolygon };
}

// --- COMMENTS (MIT MENTIONS & REGELN) ---

export async function addTaskComment(orgSlug: string, taskId: string, content: string) {
  const { org, user } = await checkPermission(orgSlug, "tasks:view");

  const newComment = await prisma.taskComment.create({
    data: { content, taskId, userId: user.id },
    include: { user: true } 
  });

  const dbUser = newComment.user;
  const authorName = dbUser.firstName 
    ? dbUser.firstName 
    : dbUser.email.split('@')[0];

  await addWatcher(taskId, user.id);

  const mentionIds: string[] = [];
  const members = await prisma.membership.findMany({
    where: { organizationId: org.id },
    include: { user: true }
  });

  members.forEach(m => {
    const fullName = `${m.user.firstName} ${m.user.lastName}`;
    if (content.includes(`@${fullName}`) || (m.user.firstName && content.includes(`@${m.user.firstName}`))) {
      if (m.user.id !== user.id) mentionIds.push(m.user.id);
    }
  });

  if (mentionIds.length > 0) {
    await sendNotification({
      type: "MENTION",
      taskId,
      actorId: user.id,
      title: `${authorName} hat dich erwähnt`,
      message: content,
      forceRecipients: mentionIds
    });
    await Promise.all(mentionIds.map(id => addWatcher(taskId, id)));
  } else {
    await sendNotification({
      type: "COMMENT",
      taskId,
      actorId: user.id,
      title: `Neuer Kommentar von ${authorName}`,
      message: content
    });
  }

  revalidatePath(`/dashboard/org/${orgSlug}/tasks`);
  return { success: true, comment: newComment };
}

export async function deleteTaskComment(orgSlug: string, commentId: string) {
  const { user } = await checkPermission(orgSlug, "tasks:view");

  const comment = await prisma.taskComment.findUnique({ where: { id: commentId } });
  if (!comment) throw new Error("Nicht gefunden");

  if (comment.userId !== user.id) throw new Error("Nicht autorisiert");

  const latestComment = await prisma.taskComment.findFirst({
    where: { taskId: comment.taskId },
    orderBy: { createdAt: 'desc' }
  });

  if (latestComment?.id !== commentId) throw new Error("Nur der aktuellste Kommentar darf gelöscht werden");

  await prisma.taskComment.delete({ where: { id: commentId } });
  return { success: true };
}

export async function editTaskComment(orgSlug: string, commentId: string, newContent: string) {
  const { user } = await checkPermission(orgSlug, "tasks:view");

  const comment = await prisma.taskComment.findUnique({ where: { id: commentId } });
  if (!comment) throw new Error("Nicht gefunden");
  if (comment.userId !== user.id) throw new Error("Nicht autorisiert");

  const latestComment = await prisma.taskComment.findFirst({
    where: { taskId: comment.taskId },
    orderBy: { createdAt: 'desc' }
  });

  if (latestComment?.id !== commentId) throw new Error("Nur der aktuellste Kommentar ist bearbeitbar");

  const updated = await prisma.taskComment.update({
    where: { id: commentId },
    data: { content: newContent },
    include: { user: true }
  });

  return { success: true, comment: updated };
}

// --- WATCHERS ---

export async function toggleWatcher(orgSlug: string, taskId: string) {
  const { user, org } = await checkPermission(orgSlug, "tasks:view");

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { watchers: { where: { id: user.id } }, forest: true }
  });

  if (!task || task.forest.organizationId !== org.id) throw new Error("Task nicht gefunden");

  const isWatching = task.watchers.length > 0;

  if (isWatching) {
    await prisma.task.update({
      where: { id: taskId },
      data: { watchers: { disconnect: { id: user.id } } }
    });
  } else {
    await prisma.task.update({
      where: { id: taskId },
      data: { watchers: { connect: { id: user.id } } }
    });
  }

  revalidatePath(`/dashboard/org/${orgSlug}/tasks`);
  return { success: true, isWatching: !isWatching };
}

// --- ZEITERFASSUNG ---

export async function logWorkTime(orgSlug: string, taskId: string, minutes: number, description: string) {
  const { user, org } = await checkPermission(orgSlug, "time:track");

  const task = await prisma.task.findUnique({ where: { id: taskId }, include: { forest: true } });
  if (!task || task.forest.organizationId !== org.id) throw new Error("Task nicht gefunden");

  await prisma.timeEntry.create({
    data: {
      taskId,
      userId: user.id,
      durationMinutes: minutes,
      description,
      startTime: new Date(),
      category: "MANUAL_WORK"
    }
  });

  revalidatePath(`/dashboard/org/${orgSlug}/tasks`);
  return { success: true };
}

// --- SCHEDULES (WIEDERKEHRENDE) ---

export async function createTaskSchedule(orgSlug: string, data: {
  title: string;
  description?: string;
  forestId: string;
  priority: TaskPriority;
  assigneeId?: string;
  startDate: Date;
  endDate?: Date;
  interval: number;
  unit: RecurrenceUnit;
}) {
  const { org, user } = await checkPermission(orgSlug, "schedules:manage");

  const forest = await prisma.forest.findUnique({ where: { id: data.forestId } });
  if (!forest || forest.organizationId !== org.id) throw new Error("Wald nicht gefunden");

  const secondRunAt = calcNextDate(data.startDate, data.unit, data.interval);

  await prisma.$transaction(async (tx) => {
    const schedule = await tx.taskSchedule.create({
      data: {
        title: data.title,
        description: data.description,
        priority: data.priority,
        forestId: data.forestId,
        assigneeId: data.assigneeId || null,
        creatorId: user.id,
        active: true,
        startDate: data.startDate,
        endDate: data.endDate,
        interval: data.interval,
        unit: data.unit,
        nextRunAt: secondRunAt, // Cron überspringt ersten Termin — wir erzeugen ihn sofort
        lastGeneratedAt: new Date(),
      }
    });

    // Ersten Task sofort erzeugen → sofort im Kanban sichtbar
    await tx.task.create({
      data: {
        title: data.title,
        description: data.description,
        priority: data.priority,
        forestId: data.forestId,
        assigneeId: data.assigneeId || null,
        creatorId: user.id,
        scheduleId: schedule.id,
        status: "OPEN",
        dueDate: data.startDate,
      }
    });
  });

  revalidatePath(`/dashboard/org/${orgSlug}/tasks`);
  return { success: true };
}

export async function getTaskSchedules(orgSlug: string) {
  const { org } = await checkPermission(orgSlug, "schedules:manage");

  return await prisma.taskSchedule.findMany({
    where: { forest: { organizationId: org.id } },
    include: {
      forest: { select: { name: true } },
      creator: { select: { firstName: true, lastName: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
}

export async function toggleScheduleActive(orgSlug: string, scheduleId: string, isActive: boolean) {
  const { org } = await checkPermission(orgSlug, "schedules:manage");

  const schedule = await prisma.taskSchedule.findUnique({ where: { id: scheduleId }, include: { forest: true } });
  if (!schedule || schedule.forest.organizationId !== org.id) throw new Error("Nicht gefunden");

  await prisma.taskSchedule.update({
    where: { id: scheduleId },
    data: { active: isActive }
  });

  revalidatePath(`/dashboard/org/${orgSlug}/tasks`);
  return { success: true };
}

export async function deleteTaskSchedule(orgSlug: string, scheduleId: string) {
  const { org } = await checkPermission(orgSlug, "schedules:manage");

  const schedule = await prisma.taskSchedule.findUnique({ where: { id: scheduleId }, include: { forest: true } });
  if (!schedule || schedule.forest.organizationId !== org.id) throw new Error("Nicht gefunden");

  await prisma.taskSchedule.delete({ where: { id: scheduleId } });

  revalidatePath(`/dashboard/org/${orgSlug}/tasks`);
  return { success: true };
}

export async function updateTaskSchedule(orgSlug: string, scheduleId: string, data: {
  title: string;
  forestId: string;
  assigneeId?: string;
  interval: number;
  unit: RecurrenceUnit;
  priority: TaskPriority;
  endDate?: Date;
}) {
  const { org } = await checkPermission(orgSlug, "schedules:manage");

  const forest = await prisma.forest.findUnique({ where: { id: data.forestId } });
  if (!forest || forest.organizationId !== org.id) throw new Error("Wald nicht gefunden");

  await prisma.taskSchedule.update({
    where: { id: scheduleId },
    data: {
      title: data.title,
      forestId: data.forestId,
      assigneeId: data.assigneeId || null,
      interval: data.interval,
      unit: data.unit,
      priority: data.priority,
      endDate: data.endDate ?? null,
    }
  });

  revalidatePath(`/dashboard/org/${orgSlug}/tasks`);
  return { success: true };
}

export async function updateTaskScheduling(orgSlug: string, taskId: string, start: Date, end: Date | null) {
  const { org } = await checkPermission(orgSlug, "tasks:edit");

  await prisma.task.update({
    where: { id: taskId },
    data: {
      scheduledDate: start,
      scheduledEndDate: end
    }
  });

  revalidatePath(`/dashboard/org/${orgSlug}/calendar`);
  return { success: true };
}

export async function unscheduleTask(orgSlug: string, taskId: string) {
  const { org } = await checkPermission(orgSlug, "tasks:edit");

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { forest: true }
  });

  if (!task || task.forest.organizationId !== org.id) throw new Error("Nicht gefunden");

  await prisma.task.update({
    where: { id: taskId },
    data: {
      scheduledDate: null,
      scheduledEndDate: null
    }
  });

  revalidatePath(`/dashboard/org/${orgSlug}/calendar`);
  revalidatePath(`/dashboard/org/${orgSlug}/tasks`);
  return { success: true };
}

export async function getForestObjects(orgSlug: string, forestId: string) {
  const { org } = await checkPermission(orgSlug, "tasks:view");

  const forest = await prisma.forest.findUnique({
    where: { id: forestId, organizationId: org.id },
    select: {
      pois:       { select: { id: true, name: true, type: true } },
      plantings:  { select: { id: true, treeSpecies: true, description: true } },
      calamities: { select: { id: true, cause: true, description: true } },
      hunting:    { select: { id: true, name: true } },
      paths:      { select: { id: true, name: true, type: true } },
    }
  });
  if (!forest) return null;
  const { paths, ...rest } = forest;
  return {
    ...rest,
    roads:      paths.filter(p => p.type === 'ROAD'),
    skidTrails: paths.filter(p => p.type === 'SKID_TRAIL'),
    waters:     paths.filter(p => p.type === 'WATER'),
  };
}