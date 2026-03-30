import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  const orgSlug = req.nextUrl.searchParams.get('orgSlug');
  const lang = req.nextUrl.searchParams.get('lang') ?? 'de';
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit')) || 30, 100);

  // Resolve orgId for favorites
  let orgId: string | null = null;
  if (orgSlug) {
    const org = await prisma.organization.findUnique({ where: { slug: orgSlug }, select: { id: true } });
    orgId = org?.id ?? null;
  }

  // If no search query: return favorites + all species
  if (q.length < 1) {
    const favorites = orgId
      ? await prisma.orgSpeciesFavorite.findMany({
          where: { organizationId: orgId },
          include: { species: true },
          orderBy: { usageCount: 'desc' },
          take: 20,
        })
      : [];

    const all = await prisma.treeSpecies.findMany({
      orderBy: { scientificName: 'asc' },
      take: limit,
    });

    return NextResponse.json({
      favorites: favorites.map(f => formatSpecies(f.species, lang, true, f.usageCount)),
      results: all.map(s => formatSpecies(s, lang, false, 0)),
    });
  }

  // Search across scientificName and commonNames JSON
  const qLower = `%${q.toLowerCase()}%`;
  const species = await prisma.$queryRaw<any[]>`
    SELECT ts.*,
           osf."usageCount" as "favCount"
    FROM "TreeSpecies" ts
    LEFT JOIN "OrgSpeciesFavorite" osf
      ON osf."speciesId" = ts.id AND osf."organizationId" = ${orgId}
    WHERE ts."scientificName" ILIKE ${qLower}
       OR ts."commonNames"::text ILIKE ${qLower}
       OR ts.genus ILIKE ${qLower}
    ORDER BY
      osf."usageCount" DESC NULLS LAST,
      CASE WHEN ts."scientificName" ILIKE ${q + '%'} THEN 0 ELSE 1 END,
      ts."scientificName"
    LIMIT ${limit}
  `;

  return NextResponse.json({
    favorites: [],
    results: species.map((s: any) => formatSpecies(s, lang, (s.favCount ?? 0) > 0, s.favCount ?? 0)),
  });
}

function formatSpecies(s: any, lang: string, isFavorite: boolean, usageCount: number) {
  const names = (s.commonNames ?? {}) as Record<string, string>;
  return {
    id: s.id,
    scientificName: s.scientificName,
    label: names[lang] ?? names['en'] ?? names['de'] ?? s.scientificName,
    color: s.color,
    category: s.category,
    family: s.family,
    genus: s.genus,
    legacyId: s.legacyId,
    isFavorite,
    usageCount,
    commonNames: names,
  };
}
