import { NextRequest } from 'next/server';

const TOKEN_URL =
  'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token';

let cachedToken: { token: string; exp: number } | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.exp > now) return cachedToken.token;

  const clientId     = process.env.CDSE_CLIENT_ID;
  const clientSecret = process.env.CDSE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing CDSE_CLIENT_ID / CDSE_CLIENT_SECRET in .env');
  }

  const body = new URLSearchParams();
  body.set('grant_type', 'client_credentials');
  body.set('client_id', clientId);
  body.set('client_secret', clientSecret);

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) throw new Error(`Token error ${res.status}: ${await res.text()}`);

  const json = await res.json();
  const expiresIn = Number(json.expires_in ?? 3600);

  cachedToken = {
    token: json.access_token,
    exp: now + (expiresIn - 60) * 1000,
  };

  return cachedToken.token;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  try {
    const { instanceId } = await params;

    const upstream = new URL(
      `https://sh.dataspace.copernicus.eu/ogc/wms/${instanceId}`
    );
    req.nextUrl.searchParams.forEach((v, k) => upstream.searchParams.set(k, v));

    // Cache-Strategie: historische Kacheln (mit TIME) sind unveränderlich → 1 Jahr
    const reqType = (req.nextUrl.searchParams.get('REQUEST') || '').toLowerCase();
    const hasTime = req.nextUrl.searchParams.has('TIME');
    let cacheControl = 'public, max-age=300';
    if (reqType === 'getcapabilities') cacheControl = 'public, max-age=86400';
    else if (reqType === 'getmap' && hasTime) cacheControl = 'public, max-age=31536000, immutable';

    const token = await getAccessToken();

    const upstreamRes = await fetch(upstream.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!upstreamRes.ok) {
      const errorBody = await upstreamRes.text();
      console.error('[WMS Proxy] Upstream error', upstreamRes.status, errorBody);
      return new Response(`Upstream Error: ${upstreamRes.statusText}\n\n${errorBody}`, {
        status: upstreamRes.status,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: {
        'Content-Type': upstreamRes.headers.get('content-type') ?? 'image/png',
        'Cache-Control': cacheControl,
      },
    });
  } catch (error: any) {
    console.error('[WMS Proxy]', error.message);
    return new Response(error.message, { status: 500 });
  }
}
