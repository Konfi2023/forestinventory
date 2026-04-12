import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Cache species list for 1 hour
let cachedSpecies: { id: string; scientificName: string; legacyId: string | null; commonNames: any }[] = [];
let cacheTime = 0;

async function getSpeciesList() {
  if (Date.now() - cacheTime < 3600_000 && cachedSpecies.length > 0) return cachedSpecies;
  cachedSpecies = await prisma.treeSpecies.findMany({
    select: { id: true, scientificName: true, legacyId: true, commonNames: true },
    orderBy: { scientificName: 'asc' },
  });
  cacheTime = Date.now();
  return cachedSpecies;
}

function buildSystemPrompt(speciesList: string) {
  return `Du bist ein Experte für Dendrologie und Forstinventur, weltweit.
Analysiere das Foto eines Baumes SEHR SORGFÄLTIG und bestimme:

1. **Baumart**: Bestimme anhand folgender Merkmale:
   - RINDE: Struktur (glatt, rissig, schuppig, gefurcht, streifig), Farbe, Muster
   - BLÄTTER/NADELN: Falls sichtbar — Form, Anordnung, Farbe
   - WUCHSFORM: Stammform, Verzweigung, Kronenform
   - HABITAT: Standort-Kontext (Wald, Park, Klima-Hinweise)

   Wichtige Rinden-Unterscheidungen:
   - Douglasie (Pseudotsuga menziesii): Sehr dicke, tief LÄNGSGEFURCHTE Korkrindenschuppen, rotbraun
   - Eiche (Quercus): Tief LÄNGSRISSIG, dunkelgrau-braun, aber KEINE Korkschuppen
   - Buche (Fagus sylvatica): Glatte silbergraue Rinde, auch bei alten Bäumen relativ glatt
   - Fichte (Picea abies): Dünn schuppig, rötlich-braun, bei Altbäumen plattig
   - Kiefer (Pinus sylvestris): Oberer Stamm orange-rötlich, unterer grob borkig

   Gib den WISSENSCHAFTLICHEN NAMEN zurück.
   Bevorzugt aus dieser Referenzliste (aber nicht darauf beschränkt):
${speciesList}

2. **BHD** (diameterCm): Brusthöhendurchmesser in cm (Stammdurchmesser in 1,3 m Höhe).
   Schätze anhand der Stammdicke im Foto.
   Typische Werte: Jungbaum 10-20 cm, mittelalter Baum 25-45 cm, Altbaum 50-80+ cm.
   Gib IMMER eine Schätzung als Zahl ab.

3. **Höhe** (heightM): Geschätzte Baumhöhe in Metern, falls erkennbar. Sonst null.

4. **Gesundheit** (health): HEALTHY, DAMAGED oder DEAD.

Antworte als JSON:
{
  "scientificName": "Genus species",
  "commonNameDe": "Deutscher Name",
  "commonNameEn": "English Name",
  "speciesConfidence": 0.0-1.0,
  "diameterCm": number,
  "heightM": number | null,
  "health": "HEALTHY" | "DAMAGED" | "DEAD",
  "damageType": string | null,
  "reasoning": "Begründung mit konkreten Merkmalen (Rinde, Blätter, Habitus)"
}

WICHTIG: Nenne in "reasoning" die konkreten visuellen Merkmale die zur Bestimmung geführt haben.
WICHTIG: diameterCm muss IMMER eine Zahl sein.
WICHTIG: diameterCm ist nur eine grobe Schätzung — die exakte Messung erfolgt separat.`;
}

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType, poiId } = await req.json();

    if (!imageBase64 || !mimeType) {
      return NextResponse.json({ error: 'imageBase64 und mimeType erforderlich' }, { status: 400 });
    }

    const allSpecies = await getSpeciesList();
    const speciesList = allSpecies
      .filter(s => s.scientificName !== 'Mixed Stand' && s.scientificName !== 'Other Species')
      .map(s => `   - ${s.scientificName} (${(s.commonNames as any)?.de ?? ''})`)
      .join('\n');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildSystemPrompt(speciesList) },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: 'high' } },
            { type: 'text', text: 'Analysiere diesen Baum SORGFÄLTIG. Achte besonders auf die Rindenstruktur. Bestimme Art (wissenschaftlicher Name), BHD und Gesundheit.' },
          ],
        },
      ],
    });

    const content = response.choices[0].message.content;
    if (!content) return NextResponse.json({ error: 'Keine Antwort von KI' }, { status: 500 });

    const aiResult = JSON.parse(content);

    // Match scientific name against database
    const sciName = (aiResult.scientificName ?? '').toLowerCase().trim();
    let match = allSpecies.find(s => s.scientificName.toLowerCase() === sciName);

    // Fuzzy: genus-only match
    if (!match && sciName) {
      const genus = sciName.split(' ')[0];
      match = allSpecies.find(s => s.scientificName.toLowerCase().startsWith(genus));
    }

    // Fuzzy: common name match (de/en)
    if (!match) {
      const deName = (aiResult.commonNameDe ?? '').toLowerCase();
      const enName = (aiResult.commonNameEn ?? '').toLowerCase();
      match = allSpecies.find(s => {
        const cn = s.commonNames as Record<string, string>;
        return (cn.de && cn.de.toLowerCase() === deName) || (cn.en && cn.en.toLowerCase() === enName);
      });
    }

    // Build response
    const speciesId = match?.id ?? null;
    const speciesLabel = match
      ? (match.commonNames as Record<string, string>).de ?? match.scientificName
      : aiResult.commonNameDe ?? aiResult.scientificName;

    const result = {
      speciesId,
      species: match?.legacyId ?? null, // legacy compatibility
      scientificName: aiResult.scientificName,
      speciesLabel,
      speciesConfidence: aiResult.speciesConfidence ?? null,
      diameterCm: aiResult.diameterCm != null ? Math.round(Number(aiResult.diameterCm)) : null,
      heightM: aiResult.heightM != null ? Math.round(Number(aiResult.heightM)) : null,
      health: aiResult.health ?? 'HEALTHY',
      damageType: aiResult.damageType ?? null,
      reasoning: aiResult.reasoning ?? null,
    };

    if (result.diameterCm != null && isNaN(result.diameterCm)) result.diameterCm = null;
    if (result.heightM != null && isNaN(result.heightM)) result.heightM = null;

    console.log('[ai/tree-analysis] Result:', JSON.stringify(result));

    // AI-Ergebnis persistieren, wenn poiId vorhanden
    if (poiId) {
      try {
        await prisma.aiTreeAnalysis.create({
          data: {
            poiId,
            analysisType: 'TREE_PHOTO',
            scientificName: aiResult.scientificName ?? null,
            speciesId: speciesId ?? null,
            speciesLabel: speciesLabel ?? null,
            speciesConfidence: aiResult.speciesConfidence ?? null,
            diameterCm: result.diameterCm,
            heightM: result.heightM,
            health: result.health,
            damageType: result.damageType,
            reasoning: result.reasoning,
            aiModel: 'gpt-4o',
            source: 'GPT4O_VISION',
            confidence: aiResult.speciesConfidence ?? null,
          },
        });
      } catch (e) {
        console.error('[ai/tree-analysis] Failed to persist:', e);
      }
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[ai/tree-analysis]', err);
    return NextResponse.json({ error: err?.message || 'KI-Analyse fehlgeschlagen' }, { status: 500 });
  }
}
