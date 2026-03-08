import { NextRequest, NextResponse } from 'next/server';
import { runHealthCheck } from '@/lib/health-check';

export const runtime    = 'nodejs';
export const maxDuration = 60;

// GET /api/cron/health  — Bearer-gesichert
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const result = await runHealthCheck();
    return NextResponse.json({
      success: true,
      overall: result.overall,
      runAt:   result.runAt,
      id:      result.id,
      report:  result.report,
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
