import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "crypto";

/**
 * Speichert eine Datei. 
 * DEV: Lokal im Dateisystem public/uploads
 * PROD: Hier würde der S3 Upload stehen
 */
export async function uploadFile(file: File, folder: string = "general"): Promise<{ url: string; key: string }> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop();
  const uniqueName = `${randomUUID()}.${ext}`;
  
  // Pfad-Logik für lokalen Speicher
  const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
  
  // Ordner erstellen falls nicht existent
  try {
    await fs.access(uploadDir);
  } catch {
    await fs.mkdir(uploadDir, { recursive: true });
  }

  const filePath = path.join(uploadDir, uniqueName);
  await fs.writeFile(filePath, buffer);

  // URL für den Browser zurückgeben
  return {
    url: `/uploads/${folder}/${uniqueName}`,
    key: `${folder}/${uniqueName}` // Für S3 wäre das der Key
  };
}

/**
 * Löscht eine Datei
 */
export async function deleteFile(key: string) {
  // S3 Implementierung wäre hier: await s3.deleteObject(...)
  
  // Lokale Implementierung:
  const filePath = path.join(process.cwd(), "public", "uploads", key);
  try {
    await fs.unlink(filePath);
  } catch (e) {
    console.error("Fehler beim Löschen der Datei:", e);
  }
}