import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPresignedReadUrl } from "@/lib/storage";

// GET /api/images/poi?key=poi-images/abc/xyz.jpg
// Gibt eine zeitlich begrenzte, signierte Lese-URL zurück.
// Der Client nutzt diese als <img src="..."> – sie läuft nach 1 Stunde ab.
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const key = req.nextUrl.searchParams.get("key");
    if (!key || !key.startsWith("poi-images/")) {
      return NextResponse.json({ error: "Ungültiger Key" }, { status: 400 });
    }

    const url = await getPresignedReadUrl(key);

    // Im Produktionsbetrieb mit S3 leiten wir direkt weiter – kein Bild-Traffic
    // durch den Next.js-Server.
    return NextResponse.redirect(url, { status: 302 });
  } catch (error: any) {
    console.error("[images/poi]", error);
    return NextResponse.json(
      { error: error.message ?? "Interner Fehler" },
      { status: 500 }
    );
  }
}
