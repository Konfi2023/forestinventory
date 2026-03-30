import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  const orgSlug = req.nextUrl.searchParams.get('orgSlug');
  const lang = req.nextUrl.searchParams.get('lang') ?? 'de';
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit')) || 50, 100);

  // Resolve orgId for favorites
  let orgId: string | null = null;
  if (orgSlug) {
    const org = await prisma.organization.findUnique({ where: { slug: orgSlug }, select: { id: true } });
    orgId = org?.id ?? null;
  }

  // Get favorites for org
  const favorites = orgId
    ? await prisma.orgSpeciesFavorite.findMany({
        where: { organizationId: orgId },
        include: { species: true },
        orderBy: { usageCount: 'desc' },
        take: 20,
      })
    : [];

  // Search or list all
  let species;
  if (q.length >= 1) {
    species = await prisma.treeSpecies.findMany({
      where: {
        OR: [
          { scientificName: { contains: q, mode: 'insensitive' } },
          { genus: { contains: q, mode: 'insensitive' } },
          { family: { contains: q, mode: 'insensitive' } },
          // Search in JSON commonNames — Prisma string_contains on Json field
          { commonNames: { string_contains: q } },
        ],
      },
      orderBy: { scientificName: 'asc' },
      take: limit,
    });
  } else {
    species = await prisma.treeSpecies.findMany({
      orderBy: { scientificName: 'asc' },
      take: limit,
    });
  }

  const favIds = new Set(favorites.map(f => f.speciesId));

  return NextResponse.json({
    favorites: favorites.map(f => formatSpecies(f.species, lang, true, f.usageCount)),
    results: species.map(s => formatSpecies(s, lang, favIds.has(s.id), 0)),
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
