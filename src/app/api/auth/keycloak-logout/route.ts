import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  const rawCallback = req.nextUrl.searchParams.get("callbackUrl") ?? "/";
  const baseUrl = process.env.NEXTAUTH_URL ?? "https://forest-manager.eu";
  const postLogoutUri = encodeURIComponent(
    rawCallback.startsWith("http") ? rawCallback : `${baseUrl}${rawCallback}`
  );

  const issuer = process.env.KEYCLOAK_ISSUER!;

  const clientId = process.env.KEYCLOAK_CLIENT_ID!;

  console.log("[keycloak-logout] token present:", !!token, "| idToken present:", !!token?.idToken, "| postLogoutUri:", postLogoutUri);

  if (token?.idToken) {
    const url = `${issuer}/protocol/openid-connect/logout?id_token_hint=${token.idToken}&post_logout_redirect_uri=${postLogoutUri}`;
    console.log("[keycloak-logout] url:", url.substring(0, 120) + "...");
    // Best case: id_token_hint tells Keycloak exactly who to log out
    return NextResponse.json({ url });
  }

  if (token) {
    // Fallback for sessions that predate id_token storage: client_id + post_logout_redirect_uri
    return NextResponse.json({
      url: `${issuer}/protocol/openid-connect/logout?client_id=${encodeURIComponent(clientId)}&post_logout_redirect_uri=${postLogoutUri}`,
    });
  }

  // No session at all — just redirect
  return NextResponse.json({ url: rawCallback });
}
