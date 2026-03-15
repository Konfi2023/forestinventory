/**
 * Keycloak Admin API helpers (server-side only)
 */

export async function deleteKeycloakUser(keycloakId: string): Promise<void> {
  try {
    const issuer = process.env.KEYCLOAK_ISSUER!;
    const base = issuer.split("/realms/")[0];
    const realm = issuer.split("/realms/")[1];

    const tokenRes = await fetch(
      `${base}/realms/master/protocol/openid-connect/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: "admin-cli",
          grant_type: "password",
          username: process.env.KEYCLOAK_ADMIN_USER ?? "admin",
          password: process.env.KEYCLOAK_ADMIN_PASSWORD ?? "admin",
        }),
      }
    );
    if (!tokenRes.ok) throw new Error(`Admin token failed: ${tokenRes.status}`);
    const { access_token } = await tokenRes.json();

    const delRes = await fetch(
      `${base}/admin/realms/${realm}/users/${keycloakId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );
    if (!delRes.ok && delRes.status !== 404) {
      throw new Error(`Keycloak delete failed: ${delRes.status}`);
    }
    console.log(`[keycloak-admin] Deleted user ${keycloakId}`);
  } catch (err) {
    console.error("[keycloak-admin] deleteKeycloakUser error:", err);
  }
}
