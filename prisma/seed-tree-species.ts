import { PrismaClient } from '@prisma/client';
import speciesData from './data/tree-species.json';

const prisma = new PrismaClient();

async function main() {
  console.log(`Seeding ${speciesData.length} tree species...`);

  let created = 0;
  let updated = 0;

  for (const s of speciesData) {
    const result = await prisma.treeSpecies.upsert({
      where: { id: s.id },
      create: {
        id: s.id,
        scientificName: s.scientificName,
        family: s.family,
        genus: s.genus,
        category: s.category,
        color: s.color,
        legacyId: s.legacyId ?? null,
        commonNames: s.commonNames,
      },
      update: {
        scientificName: s.scientificName,
        family: s.family,
        genus: s.genus,
        category: s.category,
        color: s.color,
        legacyId: s.legacyId ?? null,
        commonNames: s.commonNames,
      },
    });
    if (result.createdAt.getTime() > Date.now() - 2000) created++;
    else updated++;
  }

  console.log(`Done: ${created} created, ${updated} updated`);

  // Backfill: ForestPoiTree.speciesId from legacy species string
  const backfilled = await prisma.$executeRaw`
    UPDATE "ForestPoiTree" t
    SET "speciesId" = ts.id
    FROM "TreeSpecies" ts
    WHERE t.species = ts."legacyId"
      AND t."speciesId" IS NULL
  `;
  console.log(`Backfilled ${backfilled} trees with speciesId`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
