import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const SENDER_EMAIL = process.env.RESEND_FROM || "onboarding@resend.dev";
const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

type NotifParams = {
  type: "ASSIGNED" | "STATUS_CHANGE" | "COMMENT" | "MENTION";
  taskId: string;
  actorId: string;
  title: string;
  message?: string;
  forceRecipients?: string[];
};

export async function sendNotification({ type, taskId, actorId, title, message, forceRecipients }: NotifParams) {
  // 1. Task laden inkl. Org-Slug für den Link
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      watchers: true,
      assignee: true,
      forest: {
        include: { organization: true } // WICHTIG: Wir brauchen den Slug
      }
    }
  });

  if (!task) return;

  // 2. Empfänger ermitteln (Logik bleibt gleich)
  const recipientIds = new Set<string>();
  if (forceRecipients && forceRecipients.length > 0) {
    forceRecipients.forEach(id => recipientIds.add(id));
  } else {
    task.watchers.forEach(u => recipientIds.add(u.id));
    if (task.assigneeId) recipientIds.add(task.assigneeId);
  }
  recipientIds.delete(actorId); // Anti-Spam: Sich selbst entfernen

  if (recipientIds.size === 0) return;

  // 3. Datenbank-Einträge & E-Mail
  const recipients = await prisma.user.findMany({
    where: { id: { in: Array.from(recipientIds) } }
  });

  // DB Benachrichtigungen erstellen
  await prisma.notification.createMany({
    data: recipients.map(user => ({
      userId: user.id,
      actorId,
      taskId,
      type,
      title,
      message
    }))
  });

  // 4. Der "Magische Link"
  // ?taskId=... sorgt dafür, dass das Frontend das Ticket öffnet
  const deepLink = `${BASE_URL}/dashboard/org/${task.forest.organization.slug}/tasks?taskId=${task.id}`;

  // Emails senden
  recipients.forEach(user => {
    if (!user.email) return;

    resend.emails.send({
      from: SENDER_EMAIL,
      to: user.email,
      subject: `[ForestDB] ${title}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #166534;">${title}</h2>
          <p>Es gibt Neuigkeiten zur Aufgabe <strong>"${task.title}"</strong> im Bestand <em>${task.forest.name}</em>:</p>
          
          <blockquote style="border-left: 4px solid #ddd; padding-left: 10px; margin: 20px 0; color: #555;">
            ${message || 'Keine Details.'}
          </blockquote>

          <a href="${deepLink}" style="background-color: #166534; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Aufgabe öffnen
          </a>
          
          <p style="font-size: 12px; color: #888; margin-top: 30px;">
            Dieser Link öffnet die App oder den Browser direkt beim Ticket.
          </p>
        </div>
      `
    }).catch(err => console.error("Email error", err));
  });
}

// addWatcher bleibt unverändert...
export async function addWatcher(taskId: string, userId: string) {
    // ... (Code wie vorher)
    const exists = await prisma.task.findFirst({
        where: { id: taskId, watchers: { some: { id: userId } } }
    });
    if (!exists) {
        await prisma.task.update({
            where: { id: taskId },
            data: { watchers: { connect: { id: userId } } }
        });
    }
}