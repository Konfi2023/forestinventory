import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/app/inventory/trees/:poiId/ai-analysis
 * Persistiert AI-Analyse-Ergebnisse (Baum- oder Kronenanalyse) für einen Baum-POI.
 * Wird nach dem Speichern des Baumes aufgerufen, wenn poiId bekannt ist.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: poiId } = await params;
  if (!poiId) {
    return NextResponse.json({ error: 'poiId required' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { analysisType, data } = body as {
      analysisType: 'TREE_PHOTO' | 'CROWN_PHOTO';
      data: Record<string, any>;
    };

    if (!analysisType || !data) {
      return NextResponse.json({ error: 'analysisType and data required' }, { status: 400 });
    }

    if (analysisType === 'TREE_PHOTO') {
      await prisma.aiTreeAnalysis.create({
        data: {
          poiId,
          analysisType: 'TREE_PHOTO',
          scientificName: data.scientificName ?? null,
          speciesId: data.speciesId ?? null,
          speciesLabel: data.speciesLabel ?? null,
          speciesConfidence: data.speciesConfidence ?? null,
          diameterCm: data.diameterCm != null ? Math.round(Number(data.diameterCm)) : null,
          heightM: data.heightM != null ? Math.round(Number(data.heightM)) : null,
          health: data.health ?? null,
          damageType: data.damageType ?? null,
          reasoning: data.reasoning ?? null,
          aiModel: 'gpt-4o',
          source: 'GPT4O_VISION',
          confidence: data.speciesConfidence ?? null,
        },
      });
    } else {
      await prisma.aiTreeAnalysis.create({
        data: {
          poiId,
          analysisType: 'CROWN_PHOTO',
          crownDefoliation: data.crownDefoliation ?? null,
          crownCondition: data.crownCondition ?? null,
          crownForm: data.crownForm ?? null,
          health: data.health ?? null,
          damageType: data.damageType ?? null,
          damageSeverity: data.damageSeverity ?? null,
          reasoning: data.reasoning ?? null,
          aiModel: 'gpt-4o',
          source: 'GPT4O_VISION',
          confidence: data.crownCondition != null ? data.crownCondition / 100 : null,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[ai-analysis persist]', err);
    return NextResponse.json({ error: err?.message ?? 'Failed to persist' }, { status: 500 });
  }
}
