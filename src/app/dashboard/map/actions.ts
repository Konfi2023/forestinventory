'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { unstable_noStore as noStore } from 'next/cache';

export async function getMapDataBySlug(slug: string) {
  // 1. Caching deaktivieren (WICHTIG für Live-Daten & schnelles Löschen)
  noStore();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Nicht eingeloggt");

    // 2. Org & Eigene Mitgliedschaft prüfen
    const org = await prisma.organization.findUnique({
      where: { slug },
      include: { 
        members: { 
          // Wir laden hier nur UNSEREN eigenen Eintrag, um die Rolle zu prüfen
          where: { userId: session.user.id },
          include: { role: true } 
        } 
      }
    });

    if (!org || !org.members[0]) throw new Error("Kein Zugriff auf diese Organisation");
    
    const myMembership = org.members[0];
    const myRole = myMembership.role;
    const organizationId = org.id;
    
    // --- BERECHTIGUNGEN ERMITTELN ---
    const isAdmin = myRole.name === "Administrator";
    const permissions = isAdmin ? ['*'] : myRole.permissions;
    
    if (!isAdmin && !permissions.includes("forest:view")) {
        throw new Error("Keine Berechtigung, Karte zu sehen.");
    }

    // 3. WÄLDER LADEN
    const forests = await prisma.forest.findMany({
      where: { organizationId },
      include: {
        // Wir laden direkt die Unter-Objekte mit, damit wir sie im Frontend haben
        paths: true,
        pois: {
          include: {
            vehicle: true,
            tree: true,
            logPile: true,
            operationLogPiles: {
              include: { operation: { select: { id: true, title: true } } },
            },
          },
        },
        plantings: true,
        maintenance: true,
        calamities: {
          include: {
            operation: { select: { id: true, title: true } },
          },
        },
        habitats: true,
        hunting: true,
        grantedUsers: { select: { id: true } },
        biomassSnapshots: { orderBy: { date: 'desc' }, take: 10 }
      }
    });

    // 4. TASKS LADEN
    const tasks = await prisma.task.findMany({
      where: {
        forest: { organizationId },
        status: { not: 'DONE' }
      },
      include: {
        forest: { select: { name: true } },
        assignee: true,
        // WICHTIG: POI DATEN LADEN!
        // Damit wir wissen, wo der Task liegt, wenn er an einem Icon hängt
        poi: {
            select: {
                id: true,
                lat: true,
                lng: true,
                name: true
            }
        }
      }
    });

    // 5. MITGLIEDER LADEN
    const allMembers = await prisma.membership.findMany({
        where: { organizationId },
        include: { user: true, role: true }
    });

    const members = allMembers.map(m => ({
        id: m.user.id,
        email: m.user.email,
        firstName: m.user.firstName,
        lastName: m.user.lastName,
        role: m.role.name
    }));

    return { 
        forests, 
        tasks, 
        members, 
        currentUserId: session.user.id,
        orgSlug: slug,
        permissions
    };

  } catch (error) {
    console.error("Map Data Fetch Error:", error);
    return { 
        forests: [], 
        tasks: [], 
        members: [], 
        currentUserId: "", 
        orgSlug: slug, 
        permissions: [] 
    };
  }
}