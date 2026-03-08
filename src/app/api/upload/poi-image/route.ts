import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getPresignedUploadUrl,
  generatePoiImageKey,
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE_BYTES,
} from "@/lib/storage";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { poiId, contentType, contentLength } = body;

    if (!poiId || typeof poiId !== "string") {
      return NextResponse.json({ error: "poiId fehlt" }, { status: 400 });
    }

    if (!ALLOWED_IMAGE_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: "Ungültiger Dateityp. Erlaubt: JPEG, PNG, WebP, HEIC" },
        { status: 400 }
      );
    }

    if (typeof contentLength === "number" && contentLength > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Datei zu groß. Maximum: 10 MB" },
        { status: 400 }
      );
    }

    const key = generatePoiImageKey(poiId, contentType);
    const uploadUrl = await getPresignedUploadUrl(key, contentType);

    return NextResponse.json({ uploadUrl, key });
  } catch (error: any) {
    console.error("[upload/poi-image]", error);
    // Kein Stack-Trace an den Client
    return NextResponse.json(
      { error: error.message ?? "Interner Fehler" },
      { status: 500 }
    );
  }
}
