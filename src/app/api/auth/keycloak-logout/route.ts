import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  const rawCallback = req.nextUrl.searchParams.get("callbackUrl") ?? "/";
  const baseUrl = process.env.NEXTAUTH_URL ?? "https://forest-inventory.eu";
  const postLogoutUri = encodeURIComponent(
    rawCallback.startsWith("http") ? rawCallback : `${baseUrl}${rawCallback}`
  );

  const issuer = process.env.KEYCLOAK_ISSUER!;

  if (token?.idToken) {
    return NextResponse.json({
      url: `${issuer}/protocol/openid-connect/logout?id_token_hint=${token.idToken}&post_logout_redirect_uri=${postLogoutUri}`,
    });
  }

  // No id_token — fall back to plain redirect
  return NextResponse.json({ url: rawCallback });
}
