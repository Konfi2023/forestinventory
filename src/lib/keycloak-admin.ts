/**
 * Keycloak Admin API helpers (server-side only)
 */

function getBaseAndRealm() {
  const issuer = process.env.KEYCLOAK_ISSUER!;
  return {
    base: issuer.split("/realms/")[0],
    realm: issuer.split("/realms/")[1],
  };
}

async function getAdminToken(): Promise<string | null> {
  const { base } = getBaseAndRealm();
  try {
    const res = await fetch(`${base}/realms/master/protocol/openid-connect/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: "admin-cli",
        grant_type: "password",
        username: process.env.KEYCLOAK_ADMIN_USER ?? "admin",
        password: process.env.KEYCLOAK_ADMIN_PASSWORD ?? "admin",
      }),
    });
    if (!res.ok) {
      console.error(`[keycloak-admin] Admin token failed: ${res.status}`);
      return null;
    }
    const { access_token } = await res.json();
    return access_token as string;
  } catch (err) {
    console.error("[keycloak-admin] getAdminToken error:", err);
    return null;
  }
}

export async function deleteKeycloakUser(keycloakId: string): Promise<void> {
  try {
    const { base, realm } = getBaseAndRealm();
    const token = await getAdminToken();
    if (!token) throw new Error("Admin token failed");

    const delRes = await fetch(`${base}/admin/realms/${realm}/users/${keycloakId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!delRes.ok && delRes.status !== 404) {
      throw new Error(`Keycloak delete failed: ${delRes.status}`);
    }
    console.log(`[keycloak-admin] Deleted user ${keycloakId}`);
  } catch (err) {
    console.error("[keycloak-admin] deleteKeycloakUser error:", err);
  }
}

/**
 * Prüft ob eine E-Mail-Adresse bereits in Keycloak registriert ist.
 * Gibt false zurück wenn die Admin-API nicht erreichbar ist (fail-open).
 */
export async function checkKeycloakUserExists(email: string): Promise<boolean> {
  try {
    const { base, realm } = getBaseAndRealm();
    const token = await getAdminToken();
    if (!token) return false;

    const res = await fetch(
      `${base}/admin/realms/${realm}/users?email=${encodeURIComponent(email)}&exact=true`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return false;
    const users = await res.json();
    return Array.isArray(users) && users.length > 0;
  } catch {
    return false;
  }
}

/**
 * Markiert die E-Mail eines Nutzers in Keycloak als verifiziert und
 * entfernt alle ausstehenden Required Actions (z.B. VERIFY_EMAIL).
 * Wird für eingeladene Nutzer aufgerufen — der Einladungslink selbst
 * bestätigt implizit die E-Mail.
 */
export async function markEmailVerified(keycloakId: string): Promise<void> {
  try {
    const { base, realm } = getBaseAndRealm();
    const token = await getAdminToken();
    if (!token) return;

    await fetch(`${base}/admin/realms/${realm}/users/${keycloakId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ emailVerified: true, requiredActions: [] }),
    });
    console.log(`[keycloak-admin] Email verified for ${keycloakId}`);
  } catch (err) {
    console.error("[keycloak-admin] markEmailVerified error:", err);
  }
}
