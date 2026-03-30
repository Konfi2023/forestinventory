import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `Du bist ein Experte für Forstpathologie und Waldzustandserhebung (Level-I-Monitoring).
Analysiere das Kronenfoto eines Baumes und bestimme:

1. **Kronenverlichtung** (crownDefoliation): Anteil der fehlenden Belaubung in Prozent (0-100%).
   - 0-10%: Volle Belaubung, gesund
   - 11-25%: Leicht gelichtet (Warnstufe 1)
   - 26-60%: Mittel bis stark gelichtet (deutliche Schäden)
   - 61-99%: Stark gelichtet (absterbend)
   - 100%: Komplett kahl / abgestorben

2. **Kronenvitalität** (crownCondition): Anteil der vitalen, grünen Krone in Prozent (0-100%).
   Das Gegenteil der Verlichtung: 100% = volle Krone, 0% = komplett kahl.

3. **Gesundheitsstufe** (health): HEALTHY, DAMAGED, DEAD oder MARKED_FOR_FELLING
   - HEALTHY: Verlichtung ≤ 10%
   - DAMAGED: Verlichtung > 10%
   - DEAD: Kein Laub, abgestorben

4. **Schadmerkmale** (damageType): Falls Schäden sichtbar, beschreibe die Ursache:
   z.B. "Borkenkäfer", "Trockenheit", "Pilzbefall", "Sturmschaden", "Fraßschäden"

5. **Schadausmaß** (damageSeverity): 0-100%, wie stark der Baum insgesamt geschädigt ist.

6. **Artbestätigung** (speciesConfirmation): Falls Blätter/Nadeln erkennbar sind,
   gib den wissenschaftlichen Namen an. Falls nicht erkennbar, null.

7. **Kronenform** (crownForm): "SYMMETRISCH", "EINSEITIG", "STURMSCHADEN", "UNTERSTAENDIG"

Antworte als JSON:
{
  "crownDefoliation": 0-100,
  "crownCondition": 0-100,
  "health": "HEALTHY" | "DAMAGED" | "DEAD",
  "damageType": string | null,
  "damageSeverity": 0-100 | null,
  "speciesConfirmation": "Genus species" | null,
  "crownForm": string,
  "reasoning": "Beschreibung der sichtbaren Kronenmerkmale (1-2 Sätze)"
}

WICHTIG: Nenne in reasoning die konkreten visuellen Merkmale.
WICHTIG: crownDefoliation + crownCondition müssen zusammen 100% ergeben.`;

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
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: 'high' } },
            { type: 'text', text: 'Analysiere diese Baumkrone. Bestimme Kronenverlichtung, Gesundheitsstufe und Schadmerkmale.' },
          ],
        },
      ],
    });

    const content = response.choices[0].message.content;
    if (!content) return NextResponse.json({ error: 'Keine Antwort von KI' }, { status: 500 });

    const result = JSON.parse(content);

    // Validate and clamp values
    result.crownCondition = Math.max(0, Math.min(100, Math.round(Number(result.crownCondition) || 0)));
    result.crownDefoliation = Math.max(0, Math.min(100, Math.round(Number(result.crownDefoliation) || 0)));
    if (result.damageSeverity != null) {
      result.damageSeverity = Math.max(0, Math.min(100, Math.round(Number(result.damageSeverity))));
    }

    console.log('[ai/crown-analysis] Result:', JSON.stringify(result));
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[ai/crown-analysis]', err);
    return NextResponse.json({ error: err?.message || 'Kronenanalyse fehlgeschlagen' }, { status: 500 });
  }
}
