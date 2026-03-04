"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadFile, deleteFile } from "@/lib/storage";
import { revalidatePath } from "next/cache";

// Hilfsfunktion für Rechte
async function checkPermission() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  return session.user;
}

export async function uploadTaskImage(orgSlug: string, taskId: string, formData: FormData) {
  await checkPermission(); // Hier könnte man noch tasks:edit prüfen

  const file = formData.get("file") as File;
  if (!file) throw new Error("Keine Datei");

  // 1. Datei physisch speichern
  const { url, key } = await uploadFile(file, "tasks");

  // 2. DB Eintrag
  await prisma.image.create({
    data: {
      name: file.name,
      url: url,
      s3Key: key,
      taskId: taskId,
      // forestId lassen wir hier null, da es direkt am Task hängt
    }
  });

  revalidatePath(`/dashboard/org/${orgSlug}/tasks`);
  return { success: true };
}

export async function deleteTaskImage(orgSlug: string, imageId: string) {
  await checkPermission();

  const image = await prisma.image.findUnique({ where: { id: imageId } });
  if (!image) throw new Error("Bild nicht gefunden");

  // 1. Datei löschen
  await deleteFile(image.s3Key);

  // 2. DB Eintrag löschen
  await prisma.image.delete({ where: { id: imageId } });

  revalidatePath(`/dashboard/org/${orgSlug}/tasks`);
  return { success: true };
}

export async function uploadTaskDocument(orgSlug: string, taskId: string, formData: FormData) {
  // Rechte prüfen (optional)
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const file = formData.get("file") as File;
  if (!file) throw new Error("Keine Datei");

  // 1. Physisch speichern (gleiche Funktion wie bei Bildern)
  const { url, key } = await uploadFile(file, "docs");

  // 2. DB Eintrag in 'Document' Tabelle
  await prisma.document.create({
    data: {
      name: file.name,
      url: url,
      s3Key: key,
      type: file.type,
      category: "ATTACHMENT",
      taskId: taskId
    }
  });

  revalidatePath(`/dashboard/org/${orgSlug}/tasks`);
  return { success: true };
}

export async function deleteTaskDocument(orgSlug: string, docId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const doc = await prisma.document.findUnique({ where: { id: docId } });
  if (!doc) throw new Error("Dokument nicht gefunden");

  // 1. Datei löschen
  await deleteFile(doc.s3Key);

  // 2. DB Eintrag löschen
  await prisma.document.delete({ where: { id: docId } });

  revalidatePath(`/dashboard/org/${orgSlug}/tasks`);
  return { success: true };
}