/**
 * POST /api/forsteinrichtung/import
 *
 * Liest ein hochgeladenes Bild oder PDF einer bestehenden Forsteinrichtung
 * per GPT-4o Vision aus und gibt strukturierte Abteilungsdaten zurück.
 *
 * Body: multipart/form-data
 *   file    – Bild (JPEG/PNG/WebP) oder PDF-Seite als Bild
 *   orgSlug – Organisationsslug
 *
 * Response: { compartments: ExtractedCompartment[] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `Du bist ein Experte für Forsteinrichtung. Analysiere das Bild eines Forsteinrichtungsblatts, einer Bestandsbeschreibung oder einer Abteilungstabelle.

Extrahiere alle Abteilungen (Bestände) die du erkennst. Für jede Abteilung extrahiere so viele Felder wie erkennbar:

- number: Abteilungsnummer (z.B. "101a", "4/3", "A1")
- name: Name der Abteilung falls vorhanden
- areaHa: Fläche in Hektar (Dezimalzahl)
- standAge: Alter des Bestands in Jahren (ganze Zahl)
- developmentStage: Entwicklungsstufe (Blöße / Verjüngung / Dickung / Stangenholz / Baumholz I / Baumholz II / Baumholz III / Altholz / Plenterwald)
- mainSpecies: Array von Hauptbaumarten mit Prozent: [{"species": "SPRUCE", "percent": 80}]
  Baumartkürzel: SPRUCE=Fichte, PINE=Kiefer, DOUGLAS=Douglasie, LARCH=Lärche, FIR=Weißtanne,
  OAK=Stieleiche, SESSION_OAK=Traubeneiche, BEECH=Rotbuche, ASH=Esche, SYCAMORE=Bergahorn,
  MAPLE=Ahorn, BIRCH=Birke, ALDER=Schwarzerle, POPLAR=Pappel
- sideSpecies: Nebenbaumarten analog zu mainSpecies
- yieldClass: Ertragsklasse/Bonität als Zahl (1.0 bis 5.0)
- volumePerHa: Vorrat in m³/ha
- incrementPerHa: Zuwachs in m³/ha/a
- stockingDegree: Bestockungsgrad (z.B. 0.8 oder 1.0)
- soilType: Bodentyp (freier Text)
- waterBalance: Wasserhaushalt
- exposition: Exposition (N/NO/O/SO/S/SW/W/NW/eben)
- slopeClass: Hangneigung
- protectionStatus: Schutzstatus (FFH, NSG, etc.)
- maintenanceStatus: Pflegezustand
- note: Sonstige Bemerkungen

Antworte NUR mit einem validen JSON-Array. Kein erklärender Text davor oder danach.
Format: [{"number": "...", "name": "...", ...}, ...]

Falls du nichts erkennst, antworte mit: []`;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file    = formData.get('file') as File | null;
  const orgSlug = formData.get('orgSlug') as string | null;

  if (!file || !orgSlug) {
    return NextResponse.json({ error: 'file und orgSlug sind Pflichtfelder' }, { status: 400 });
  }

  // Verify membership
  const org = await prisma.organization.findUnique({ where: { slug: orgSlug }, select: { id: true } });
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });
  const member = await prisma.membership.findFirst({ where: { organizationId: org.id, userId: session.user.id } });
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Convert file to base64
  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString('base64');
  const mimeType = file.type || 'image/jpeg';

  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mimeType)) {
    return NextResponse.json({ error: 'Nur Bilder (JPEG, PNG, WebP) unterstützt. Für PDF: zuerst als Bild exportieren.' }, { status: 400 });
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 4096,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64}`, detail: 'high' },
            },
            { type: 'text', text: 'Bitte extrahiere alle Abteilungsdaten aus diesem Forsteinrichtungsblatt.' },
          ],
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? '[]';

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    const jsonStr = jsonMatch ? jsonMatch[0] : '[]';

    let compartments: any[] = [];
    try {
      compartments = JSON.parse(jsonStr);
    } catch {
      compartments = [];
    }

    // Sanitize: ensure arrays for species fields
    compartments = compartments.map((c: any) => ({
      ...c,
      mainSpecies: Array.isArray(c.mainSpecies) ? c.mainSpecies : [],
      sideSpecies: Array.isArray(c.sideSpecies) ? c.sideSpecies : [],
    }));

    return NextResponse.json({ compartments, tokensUsed: response.usage?.total_tokens ?? 0 });
  } catch (err: any) {
    console.error('Forsteinrichtung import error:', err);
    return NextResponse.json({ error: 'KI-Analyse fehlgeschlagen: ' + (err.message ?? 'Unbekannter Fehler') }, { status: 500 });
  }
}
