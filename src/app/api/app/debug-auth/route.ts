import { NextResponse } from 'next/server';
import { getApiUser } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  const result: Record<string, unknown> = {
    hasAuthHeader: !!authHeader,
    headerPrefix: authHeader?.slice(0, 15) || null,
  };

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString()
      );
      result.keycloakSub = payload.sub;
      result.email = payload.email || payload.preferred_username || '';
      result.tokenExp = payload.exp ? new Date(payload.exp * 1000).toISOString() : null;

      if (payload.sub) {
        const user = await prisma.user.findFirst({
          where: { keycloakId: payload.sub },
          select: { id: true, email: true, firstName: true },
        });
        result.userFoundByKeycloakId = !!user;
        result.userId = user?.id || null;
      }

      if (!result.userFoundByKeycloakId && result.email) {
        const user = await prisma.user.findFirst({
          where: { email: result.email as string },
          select: { id: true, email: true, keycloakId: true },
        });
        result.userFoundByEmail = !!user;
        result.userEmailId = user?.id || null;
        result.userKeycloakIdInDb = user?.keycloakId || null;
      }
    } catch (err: any) {
      result.tokenDecodeError = err.message;
    }
  }

  // Also try the full getApiUser flow
  const apiUser = await getApiUser(req);
  result.apiUserResult = apiUser;

  return NextResponse.json(result);
}
