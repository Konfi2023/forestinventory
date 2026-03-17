// src/actions/invites.ts
"use server";

import { authOptions } from "@/lib/auth";
import { ensureDbUser } from "@/lib/ensure-user";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { Resend } from "resend";

// Resend initialisieren
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Lädt einen neuen Benutzer ein oder aktualisiert eine bestehende Einladung.
 */
export async function inviteUser(orgSlug: string, email: string, roleId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Nicht eingeloggt");

  // 1. Berechtigung & Organisation prüfen
  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    include: {
      members: {
        where: { userId: session.user.id },
        include: { role: true },
      },
      plan: true,
      _count: { select: { members: true } },
    },
  });

  if (!org || !org.members[0]) throw new Error("Kein Zugriff auf diese Organisation");

  const myRole = org.members[0].role;
  const isAdmin = myRole.name === "Administrator";

  // Prüfen: Hat der User das Recht 'users:invite' ODER ist er Admin?
  if (!myRole.permissions.includes("users:invite") && !isAdmin) {
    throw new Error("Keine Berechtigung zum Einladen.");
  }

  // Nutzer-Limit prüfen
  const maxUsers = org.customUserLimit ?? org.plan?.maxUsers ?? null;
  if (maxUsers !== null && org._count.members >= maxUsers) {
    throw new Error(
      `Ihr Paket erlaubt maximal ${maxUsers} Benutzer. Bitte upgraden Sie Ihr Abonnement.`
    );
  }

  // 2. Prüfen, ob der User bereits ein echtes Mitglied ist
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const existingMembership = await prisma.membership.findFirst({
      where: { userId: existingUser.id, organizationId: org.id }
    });
    if (existingMembership) {
      throw new Error("Dieser Benutzer ist bereits Mitglied der Organisation.");
    }
  }

  // 3. Neuen Token generieren
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 Tage gültig

  // 4. Prüfen, ob bereits eine offene Einladung für diese Email existiert (DUPLIKAT-CHECK)
  const existingInvite = await prisma.invite.findFirst({
    where: {
      organizationId: org.id,
      email: email
    }
  });

  if (existingInvite) {
    // UPDATE: Wenn schon eingeladen, aktualisieren wir den Token und das Datum
    console.log(`🔄 Aktualisiere bestehende Einladung für ${email}`);
    await prisma.invite.update({
      where: { id: existingInvite.id },
      data: {
        token,
        expiresAt,
        roleId, // Falls man die Rolle korrigieren wollte
        inviterId: session.user.id,
        status: "PENDING"
      }
    });
  } else {
    // CREATE: Ganz neue Einladung
    console.log(`💾 Erstelle neue Einladung für ${email}`);
    await prisma.invite.create({
      data: {
        email,
        token,
        expiresAt,
        organizationId: org.id,
        roleId: roleId,
        inviterId: session.user.id,
        status: "PENDING"
      }
    });
  }

  // 5. E-Mail via Resend senden
  const inviteLink = `${process.env.NEXTAUTH_URL}/invite/${token}`;
  const sender = process.env.RESEND_FROM!; // Aus .env

  try {
    await resend.emails.send({
      from: sender,
      to: email,
      subject: `Einladung zu ${org.name}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Hallo!</h2>
          <p>Du wurdest eingeladen, der Organisation <strong>${org.name}</strong> beizutreten.</p>
          <p>Klicke auf den Button unten, um die Einladung anzunehmen:</p>
          <a href="${inviteLink}" style="display: inline-block; padding: 12px 24px; background-color: #16a34a; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Einladung annehmen
          </a>
          <p style="margin-top: 20px; color: #666; font-size: 12px;">Dieser Link ist 7 Tage gültig.</p>
        </div>
      `
    });
    console.log("✅ E-Mail erfolgreich an Resend übergeben.");
  } catch (error: any) {
    console.error("❌ Fehler beim E-Mail Versand:", error);
    // Wir werfen den Fehler NICHT weiter, damit die DB-Operation nicht rollbackt. 
    // Der User sieht in der UI "Erfolgreich", auch wenn Mail fehlschlägt (Link ist ja generiert).
    // Alternativ: throw error;
  }

  revalidatePath(`/dashboard/org/${orgSlug}/users`);
  return { success: true };
}

/**
 * Zieht eine Einladung zurück (löscht sie).
 */
export async function revokeInvite(orgSlug: string, inviteId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Nicht eingeloggt");

  // Berechtigung prüfen (Quick check via Org-Zugehörigkeit)
  // Sauberer wäre hier wieder der explizite Permission-Check wie oben, 
  // aber Admins dürfen es implizit via DB-Constraint meist eh.
  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    include: { members: { where: { userId: session.user.id }, include: { role: true } } }
  });
  
  const myRole = org?.members[0]?.role;
  const isAdmin = myRole?.name === "Administrator";

  if (!myRole?.permissions.includes("users:invite") && !isAdmin) {
    throw new Error("Keine Berechtigung zum Verwalten von Einladungen.");
  }

  await prisma.invite.delete({
    where: { id: inviteId }
  });

  revalidatePath(`/dashboard/org/${orgSlug}/users`);
  return { success: true };
}

/**
 * Sendet eine bestehende Einladung erneut (aktualisiert Token).
 */
export async function resendInvite(orgSlug: string, inviteId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Nicht eingeloggt");

  // 1. Invite und Org holen
  const invite = await prisma.invite.findUnique({
    where: { id: inviteId },
    include: { organization: true, role: true }
  });

  if (!invite) throw new Error("Einladung nicht gefunden");

  // Berechtigung prüfen (User muss Teil der Org sein)
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, organizationId: invite.organizationId },
    include: { role: true }
  });

  if (!membership) throw new Error("Kein Zugriff");
  const isAdmin = membership.role.name === "Administrator";
  if (!membership.role.permissions.includes("users:invite") && !isAdmin) {
    throw new Error("Keine Berechtigung.");
  }

  // 2. Token erneuern
  const newToken = crypto.randomBytes(32).toString("hex");
  const newExpires = new Date();
  newExpires.setDate(newExpires.getDate() + 7);

  await prisma.invite.update({
    where: { id: inviteId },
    data: {
      token: newToken,
      expiresAt: newExpires,
      status: "PENDING"
    }
  });

  // 3. E-Mail erneut senden
  const inviteLink = `${process.env.NEXTAUTH_URL}/invite/${newToken}`;
  const sender = process.env.RESEND_FROM!;

  try {
    await resend.emails.send({
      from: sender,
      to: invite.email,
      subject: `Erinnerung: Einladung zu ${invite.organization.name}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Erinnerung</h2>
          <p>Hier ist eine neue Einladung, da die alte eventuell abgelaufen ist.</p>
          <p>Du wurdest eingeladen als <strong>${invite.role.name}</strong>.</p>
          <a href="${inviteLink}" style="display: inline-block; padding: 12px 24px; background-color: #16a34a; color: white; text-decoration: none; border-radius: 6px;">
            Einladung annehmen
          </a>
        </div>
      `
    });
  } catch (error) {
    console.error("Fehler beim Resend:", error);
    throw new Error("Konnte E-Mail nicht senden.");
  }

  revalidatePath(`/dashboard/org/${orgSlug}/users`);
  return { success: true };
}

export async function acceptDashboardInvite(inviteId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Nicht eingeloggt");

  // 1. Invite laden & prüfen
  const invite = await prisma.invite.findUnique({
    where: { id: inviteId },
    include: { organization: true }
  });

  if (!invite) throw new Error("Einladung nicht gefunden");
  
  // Sicherheitscheck: Gehört die Einladung mir?
  if (invite.email.toLowerCase() !== session.user.email.toLowerCase()) {
    throw new Error("Diese Einladung ist nicht für Sie bestimmt.");
  }

  // DSGVO: User erst jetzt anlegen — Mitgliedschaft ist die Rechtsgrundlage
  const userId = await ensureDbUser(session);

  // 2. Mitgliedschaft erstellen
  await prisma.membership.create({
    data: {
      userId,
      organizationId: invite.organizationId,
      roleId: invite.roleId,
    }
  });

  // 3. Einladung löschen
  await prisma.invite.delete({ where: { id: inviteId } });

  // 4. Redirect zur neuen Org
  return { success: true, redirectSlug: invite.organization.slug };
}

/**
 * Einladung ablehnen
 */
export async function declineDashboardInvite(inviteId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Nicht eingeloggt");

  const invite = await prisma.invite.findUnique({ where: { id: inviteId } });
  if (!invite) throw new Error("Einladung nicht gefunden");

  if (invite.email.toLowerCase() !== session.user.email.toLowerCase()) {
    throw new Error("Nicht autorisiert");
  }

  await prisma.invite.delete({ where: { id: inviteId } });

  revalidatePath("/dashboard");
  return { success: true };
}