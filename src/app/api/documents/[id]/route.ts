import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "node:fs/promises";
import path from "node:path";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const doc = await prisma.orgDocument.findUnique({
    where: { id },
    select: { organizationId: true, storageKey: true, title: true },
  });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const member = await prisma.membership.findFirst({
    where: { userId: session.user.id, organizationId: doc.organizationId },
  });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const safeFilename = doc.title.replace(/[^\w\s\-\.äöüÄÖÜß]/g, "_").trim() + ".pdf";

  // Try local disk first
  const localPath = path.join(process.cwd(), "public", "uploads", doc.storageKey);
  try {
    const buf = await fs.readFile(localPath);
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(safeFilename)}`,
        "Content-Length": String(buf.length),
      },
    });
  } catch {
    // Not on local disk — try S3
  }

  // S3 fallback: stream content directly (never redirect, download attr needs same-origin)
  if (process.env.AWS_S3_BUCKET && process.env.AWS_ACCESS_KEY_ID) {
    try {
      const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");
      const client = new S3Client({
        region: process.env.AWS_REGION ?? "eu-central-1",
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });
      const res = await client.send(new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: doc.storageKey,
      }));
      if (res.Body) {
        const bytes = await res.Body.transformToByteArray();
        return new NextResponse(bytes, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(safeFilename)}`,
            "Content-Length": String(bytes.length),
          },
        });
      }
    } catch {
      // S3 also failed
    }
  }

  return NextResponse.json({ error: "Datei nicht gefunden" }, { status: 404 });
}
