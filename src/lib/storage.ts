import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "crypto";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// ---------------------------------------------------------------------------
// Konfiguration
// ---------------------------------------------------------------------------

const REGION = process.env.AWS_REGION ?? "eu-central-1";
const BUCKET = process.env.AWS_S3_BUCKET ?? "";
const IS_S3 = Boolean(BUCKET && process.env.AWS_ACCESS_KEY_ID);

// Presigned URLs laufen nach 1 Stunde ab – lang genug für eine UI-Session,
// kurz genug um unerwünschten dauerhaften Zugriff zu verhindern.
const READ_URL_EXPIRY_SECONDS = 3600;

// Upload-Fenster: 5 Minuten reichen für jeden vertretbaren Upload.
const UPLOAD_URL_EXPIRY_SECONDS = 300;

// Erlaubte MIME-Typen für Bilder
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

// Maximale Dateigröße: 10 MB
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

function s3Client(): S3Client {
  return new S3Client({
    region: REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

// ---------------------------------------------------------------------------
// Presigned Upload URL  (Client lädt direkt zu S3 hoch – kein Server-Traffic)
// ---------------------------------------------------------------------------

export async function getPresignedUploadUrl(
  key: string,
  contentType: string
): Promise<string> {
  if (!IS_S3) {
    throw new Error(
      "S3 ist nicht konfiguriert. Bitte AWS_S3_BUCKET, AWS_ACCESS_KEY_ID und AWS_SECRET_ACCESS_KEY in .env setzen."
    );
  }

  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(s3Client(), cmd, { expiresIn: UPLOAD_URL_EXPIRY_SECONDS });
}

// ---------------------------------------------------------------------------
// Presigned Read URL  (zeitlich begrenzt, setzt keinen öffentlichen Bucket voraus)
// ---------------------------------------------------------------------------

export async function getPresignedReadUrl(key: string): Promise<string> {
  if (!IS_S3) {
    // Im Dev-Betrieb ist der Key gleichzeitig der relative Pfad unter /uploads
    return `/uploads/${key}`;
  }

  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3Client(), cmd, { expiresIn: READ_URL_EXPIRY_SECONDS });
}

// ---------------------------------------------------------------------------
// Server-seitiger Upload  (für Fälle wo wir die Datei serverseitig verarbeiten,
// z.B. Dokumente die durch den Server laufen müssen)
// ---------------------------------------------------------------------------

export async function uploadFile(
  file: File,
  folder: string = "general"
): Promise<{ url: string; key: string }> {
  // Determine extension: prefer MIME type mapping for reliability (iPhone sends
  // heic/heif files sometimes with .jpg extension or no extension at all)
  const MIME_TO_EXT: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png',
    'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heic',
    'image/gif': 'gif',
  };
  const extFromMime = MIME_TO_EXT[file.type];
  const extFromName = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() : undefined;
  const ext = extFromMime ?? extFromName ?? 'jpg';
  const key = `${folder}/${randomUUID()}.${ext}`;

  if (IS_S3) {
    const buffer = Buffer.from(await file.arrayBuffer());
    await s3Client().send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: file.type,
      })
    );
    const url = await getPresignedReadUrl(key);
    return { url, key };
  }

  // --- Lokaler Fallback (nur für Entwicklung) ---
  const buffer = Buffer.from(await file.arrayBuffer());
  const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(path.join(uploadDir, path.basename(key)), buffer);
  return { url: `/uploads/${key}`, key };
}

// ---------------------------------------------------------------------------
// Datei löschen
// ---------------------------------------------------------------------------

export async function deleteFile(key: string): Promise<void> {
  if (IS_S3) {
    await s3Client().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    return;
  }

  const filePath = path.join(process.cwd(), "public", "uploads", key);
  try {
    await fs.unlink(filePath);
  } catch {
    // Datei existiert nicht mehr – kein Fehler
  }
}

// ---------------------------------------------------------------------------
// Schlüssel generieren  (einheitliches Format für POI-Bilder)
// ---------------------------------------------------------------------------

export function generatePoiImageKey(poiId: string, contentType: string): string {
  const ext = contentType === "image/png" ? "png"
    : contentType === "image/webp" ? "webp"
    : "jpg";
  return `poi-images/${poiId}/${randomUUID()}.${ext}`;
}
