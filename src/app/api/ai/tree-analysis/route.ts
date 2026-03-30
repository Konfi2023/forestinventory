import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { TREE_SPECIES } from '@/lib/tree-species';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Build explicit mapping for the prompt: "BEECH = Rotbuche"
const SPECIES_MAP = TREE_SPECIES
  .filter(s => s.id !== 'MIXED' && s.id !== 'OTHER')
  .map(s => `${s.id} = ${s.label}`)
  .join('\n');

const SYSTEM_PROMPT = `Du bist ein Experte für mitteleuropäische Dendrologie und Forstinventur.
Analysiere das Foto eines Baumes und bestimme:

1. **Baumart** (species): Anhand von Rinde, Blattform, Wuchsform, Habitus, Nadeln/Blätter.
   Du MUSST eine der folgenden IDs zurückgeben (NICHT den deutschen Namen):

${SPECIES_MAP}

   Bei Mischbestand: MIXED
   Bei unbekannt: OTHER

2. **BHD** (diameterCm): Brusthöhendurchmesser in cm (Durchmesser in 1,3 m Höhe).
   Schätze den Stammdurchmesser anhand der sichtbaren Stammdicke.
   Typische Werte: Jungbaum 10-20 cm, mittelalter Baum 25-45 cm, Altbaum 50-80+ cm.
   Gib IMMER eine Schätzung als Zahl ab, auch wenn unsicher. Lieber eine grobe Schätzung als null.

3. **Höhe** (heightM): Geschätzte Baumhöhe in Metern, falls im Foto erkennbar. Sonst null.

4. **Gesundheitszustand** (health): HEALTHY, DAMAGED oder DEAD.
   Bei Schäden: damageType angeben (z.B. "Borkenkäfer", "Trockenheit", "Sturm", "Pilzbefall").

Antworte ausschließlich als JSON:
{
  "species": "SPECIES_ID_AUS_OBIGER_LISTE",
  "speciesConfidence": 0.0-1.0,
  "speciesLabel": "Deutscher Name",
  "diameterCm": number,
  "heightM": number | null,
  "health": "HEALTHY" | "DAMAGED" | "DEAD",
  "damageType": string | null,
  "reasoning": "Kurze Begründung (1-2 Sätze)"
}

WICHTIG: "species" muss EXAKT eine der oben gelisteten IDs sein (z.B. "BEECH", nicht "Rotbuche").
WICHTIG: "diameterCm" muss IMMER eine Zahl sein, niemals null. Schätze im Zweifelsfall.`;

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64 || !mimeType) {
      return NextResponse.json({ error: 'imageBase64 und mimeType erforderlich' }, { status: 400 });
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
                detail: 'high',
              },
            },
            { type: 'text', text: 'Analysiere diesen Baum. Bestimme Baumart (als ID), BHD in cm und Gesundheitszustand.' },
          ],
        },
      ],
    });

    const content = response.choices[0].message.content;
    if (!content) {
      return NextResponse.json({ error: 'Keine Antwort von KI' }, { status: 500 });
    }

    const result = JSON.parse(content);

    // Validate & fix species ID — try fuzzy match if exact match fails
    if (result.species && !TREE_SPECIES.some(s => s.id === result.species)) {
      // Try case-insensitive match
      const upper = result.species.toUpperCase().replace(/[^A-Z_]/g, '');
      const byId = TREE_SPECIES.find(s => s.id === upper);
      if (byId) {
        result.species = byId.id;
      } else {
        // Try matching by German label
        const label = (result.species || result.speciesLabel || '').toLowerCase();
        const byLabel = TREE_SPECIES.find(s => s.label.toLowerCase() === label);
        if (byLabel) {
          result.species = byLabel.id;
          result.speciesLabel = byLabel.label;
        } else {
          // Partial label match
          const byPartial = TREE_SPECIES.find(s =>
            label.includes(s.label.toLowerCase()) || s.label.toLowerCase().includes(label)
          );
          if (byPartial) {
            result.species = byPartial.id;
            result.speciesLabel = byPartial.label;
          } else {
            result.species = 'OTHER';
            result.speciesConfidence = 0;
          }
        }
      }
    }

    // Ensure diameterCm is a number
    if (result.diameterCm != null) {
      result.diameterCm = Math.round(Number(result.diameterCm));
      if (isNaN(result.diameterCm)) result.diameterCm = null;
    }

    // Ensure heightM is a number
    if (result.heightM != null) {
      result.heightM = Math.round(Number(result.heightM));
      if (isNaN(result.heightM)) result.heightM = null;
    }

    // Fill speciesLabel if missing
    if (!result.speciesLabel && result.species) {
      result.speciesLabel = TREE_SPECIES.find(s => s.id === result.species)?.label ?? result.species;
    }

    console.log('[ai/tree-analysis] Result:', JSON.stringify(result));
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[ai/tree-analysis]', err);
    return NextResponse.json(
      { error: err?.message || 'KI-Analyse fehlgeschlagen' },
      { status: 500 },
    );
  }
}
