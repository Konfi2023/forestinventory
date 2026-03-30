import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { TREE_SPECIES } from '@/lib/tree-species';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const VALID_IDS = TREE_SPECIES.map(s => s.id).join(', ');

const SYSTEM_PROMPT = `Du bist ein Experte für mitteleuropäische Dendrologie und Forstinventur.
Analysiere das Foto eines Baumes und bestimme:

1. **Baumart** (species): Anhand von Rinde, Blattform, Wuchsform, Habitus.
   Gib die ID aus dieser Liste zurück: ${VALID_IDS}
   Wenn du dir unsicher bist, gib die wahrscheinlichste Art und eine Konfidenz an.

2. **BHD** (diameterCm): Brusthöhendurchmesser in cm, geschätzt anhand der Stammdicke im Foto.
   Nutze Proportionen (z.B. Handbreite ~10 cm, Stammfoto-Kontext) für eine grobe Schätzung.
   Wenn keine Einschätzung möglich ist, gib null zurück.

3. **Höhe** (heightM): Geschätzte Baumhöhe in Metern, falls im Foto erkennbar. Sonst null.

4. **Gesundheitszustand** (health): HEALTHY, DAMAGED oder DEAD.
   Bei Schäden: damageType angeben (z.B. "Borkenkäfer", "Trockenheit", "Sturm", "Pilzbefall").

Antworte ausschließlich als JSON:
{
  "species": "SPECIES_ID",
  "speciesConfidence": 0.0-1.0,
  "speciesLabel": "Deutscher Name",
  "diameterCm": number | null,
  "heightM": number | null,
  "health": "HEALTHY" | "DAMAGED" | "DEAD",
  "damageType": string | null,
  "reasoning": "Kurze Begründung (1-2 Sätze) für die Artbestimmung"
}`;

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
            { type: 'text', text: 'Analysiere diesen Baum. Bestimme Baumart, BHD und Gesundheitszustand.' },
          ],
        },
      ],
    });

    const content = response.choices[0].message.content;
    if (!content) {
      return NextResponse.json({ error: 'Keine Antwort von KI' }, { status: 500 });
    }

    const result = JSON.parse(content);

    // Validate species ID
    if (result.species && !TREE_SPECIES.some(s => s.id === result.species)) {
      result.species = 'OTHER';
      result.speciesConfidence = 0;
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[ai/tree-analysis]', err);
    return NextResponse.json(
      { error: err?.message || 'KI-Analyse fehlgeschlagen' },
      { status: 500 },
    );
  }
}
