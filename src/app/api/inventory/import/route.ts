/**
 * POST /api/inventory/import
 *
 * Analysiert eine CSV-Datei oder ein Foto von Inventurnotizen und
 * gibt strukturierte Baum- / Probekreisdaten zurück.
 *
 * Body: multipart/form-data
 *   file    – CSV (.csv, .txt) oder Bild (JPEG/PNG/WebP)
 *   orgSlug – Organisationsslug
 *
 * Response: { mode: 'plot'|'tree', plots?: PlotRow[], trees?: TreeRow[] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Typen ──────────────────────────────────────────────────────────────────────

export interface ImportTreeRow {
  species: string | null;
  diameter: number | null;   // BHD cm
  height: number | null;     // Höhe m
  age: number | null;        // Alter Jahre
  lat: number | null;
  lng: number | null;
}

export interface ImportPlotRow {
  name: string;
  lat: number | null;
  lng: number | null;
  radiusM: number;
  trees: ImportTreeRow[];
}

export interface ImportResult {
  mode: 'plot' | 'tree';
  plots: ImportPlotRow[];
  trees: ImportTreeRow[];
  tokensUsed: number;
  source: 'csv' | 'vision';
}

// ── Artenkürzel ────────────────────────────────────────────────────────────────

const SPECIES_MAP: Record<string, string> = {
  // Deutsch
  'fichte': 'SPRUCE', 'rottanne': 'SPRUCE', 'gewöhnliche fichte': 'SPRUCE',
  'kiefer': 'PINE', 'waldkiefer': 'PINE', 'föhre': 'PINE',
  'douglasie': 'DOUGLAS', 'douglastanne': 'DOUGLAS',
  'lärche': 'LARCH', 'europäische lärche': 'LARCH',
  'weißtanne': 'FIR', 'tanne': 'FIR', 'edeltanne': 'FIR',
  'rotbuche': 'BEECH', 'buche': 'BEECH',
  'stieleiche': 'OAK', 'eiche': 'OAK',
  'traubeneiche': 'SESSION_OAK',
  'esche': 'ASH',
  'bergahorn': 'SYCAMORE', 'ahorn': 'MAPLE',
  'birke': 'BIRCH', 'moorbirke': 'BIRCH',
  'schwarzerle': 'ALDER', 'erle': 'ALDER',
  'pappel': 'POPLAR', 'zitterpappel': 'POPLAR',
  // Kürzel
  'fi': 'SPRUCE', 'ki': 'PINE', 'dgl': 'DOUGLAS', 'lä': 'LARCH',
  'ta': 'FIR', 'bu': 'BEECH', 'ei': 'OAK', 'es': 'ASH',
  'bah': 'SYCAMORE', 'bi': 'BIRCH', 'el': 'ALDER',
};

function normalizeSpecies(raw: string): string {
  const key = raw.toLowerCase().trim();
  return SPECIES_MAP[key] ?? raw.toUpperCase().trim();
}

// ── CSV-Parser ─────────────────────────────────────────────────────────────────

function detectDelimiter(text: string): string {
  const counts = { ',': 0, ';': 0, '\t': 0 };
  for (const c of text.slice(0, 500)) {
    if (c in counts) counts[c as keyof typeof counts]++;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function parseNum(v: string): number | null {
  const n = parseFloat(v.replace(',', '.').trim());
  return isNaN(n) ? null : n;
}

function parseCsv(text: string): ImportResult {
  const delim = detectDelimiter(text);
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { mode: 'tree', plots: [], trees: [], tokensUsed: 0, source: 'csv' };

  const headers = lines[0].split(delim).map(h => h.trim().toLowerCase()
    .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss'));

  const col = (names: string[]) => names.map(n => headers.indexOf(n)).find(i => i >= 0) ?? -1;

  const iPlot    = col(['plot', 'probekreis', 'kreis', 'pk', 'plot-nr', 'plotname', 'plot_name']);
  const iSpecies = col(['baumart', 'art', 'species', 'baumartname', 'sp', 'baum']);
  const iBhd     = col(['bhd', 'dbh', 'durchmesser', 'd', 'diameter', 'd_cm', 'bhd_cm']);
  const iHeight  = col(['hoehe', 'hohe', 'h', 'height', 'h_m', 'hoehe_m']);
  const iAge     = col(['alter', 'age', 'a', 'alter_jahre']);
  const iLat     = col(['lat', 'breitengrad', 'latitude', 'y']);
  const iLng     = col(['lng', 'lon', 'laengengrad', 'longitude', 'x']);
  const iRadius  = col(['radius', 'r', 'radius_m', 'rm']);

  const rows = lines.slice(1).map(l => {
    const cells = l.split(delim).map(c => c.trim().replace(/^"|"$/g, ''));
    const get = (i: number) => (i >= 0 ? cells[i] ?? '' : '');
    return {
      plot:    get(iPlot),
      species: get(iSpecies),
      diameter: parseNum(get(iBhd)),
      height:   parseNum(get(iHeight)),
      age:      iAge >= 0 ? (parseNum(get(iAge)) != null ? Math.round(parseNum(get(iAge))!) : null) : null,
      lat:      parseNum(get(iLat)),
      lng:      parseNum(get(iLng)),
      radiusM:  parseNum(get(iRadius)) ?? 10,
    };
  }).filter(r => r.species || r.diameter);

  const hasPlots = iPlot >= 0 && rows.some(r => r.plot);

  if (hasPlots) {
    const plotMap = new Map<string, ImportPlotRow>();
    for (const r of rows) {
      const key = r.plot || 'Plot 1';
      if (!plotMap.has(key)) {
        plotMap.set(key, { name: key, lat: r.lat, lng: r.lng, radiusM: r.radiusM, trees: [] });
      }
      plotMap.get(key)!.trees.push({
        species: r.species ? normalizeSpecies(r.species) : null,
        diameter: r.diameter, height: r.height, age: r.age, lat: null, lng: null,
      });
    }
    return { mode: 'plot', plots: [...plotMap.values()], trees: [], tokensUsed: 0, source: 'csv' };
  }

  return {
    mode: 'tree',
    plots: [],
    trees: rows.map(r => ({
      species: r.species ? normalizeSpecies(r.species) : null,
      diameter: r.diameter, height: r.height, age: r.age, lat: r.lat, lng: r.lng,
    })),
    tokensUsed: 0,
    source: 'csv',
  };
}

// ── GPT-4o Vision Prompt ───────────────────────────────────────────────────────

const VISION_SYSTEM_PROMPT = `Du bist ein Experte für Forstinventur. Analysiere das Bild von handgeschriebenen oder gedruckten Inventurnotizen, Feldbüchern oder Baumlistentabellen.

Extrahiere alle Baum- und Probekreisdaten.

Erkenne ob es sich um:
A) Probekreis-Inventur handelt (Bäume sind Probekreisen/Plots zugeordnet) → mode = "plot"
B) Einzelbaumliste handelt (alle Bäume gleichwertig, ggf. mit GPS) → mode = "tree"

Für jeden Baum extrahiere soweit erkennbar:
- species: Baumart als Code (SPRUCE=Fichte/Fi, PINE=Kiefer/Ki, DOUGLAS=Douglasie/Dgl, LARCH=Lärche/Lä, FIR=Weißtanne/Ta, BEECH=Rotbuche/Bu, OAK=Stieleiche/Ei, SESSION_OAK=Traubeneiche, ASH=Esche/Es, SYCAMORE=Bergahorn/BAh, MAPLE=Ahorn, BIRCH=Birke/Bi, ALDER=Schwarzerle/El, POPLAR=Pappel)
- diameter: BHD/Durchmesser in cm (Dezimalzahl)
- height: Höhe in m (Dezimalzahl, null falls nicht vorhanden)
- age: Alter in Jahren (ganze Zahl, null falls nicht vorhanden)
- lat/lng: GPS-Koordinaten falls erkennbar (null sonst)

Für Probekreise:
- name: Probekreisbezeichnung (z. B. "P1", "Plot A", "01")
- radiusM: Radius in Metern (Standard 10 falls nicht angegeben)
- lat/lng: GPS-Koordinaten des Mittelpunkts falls erkennbar

Antworte NUR mit validem JSON:
{
  "mode": "plot" | "tree",
  "plots": [{ "name": "...", "lat": null, "lng": null, "radiusM": 10, "trees": [{ "species": "SPRUCE", "diameter": 35.0, "height": 22.0, "age": 80, "lat": null, "lng": null }] }],
  "trees": [{ "species": "SPRUCE", "diameter": 35.0, "height": null, "age": null, "lat": null, "lng": null }]
}

Bei mode="plot": trees-Array ist leer. Bei mode="tree": plots-Array ist leer.
Falls nichts erkennbar: { "mode": "tree", "plots": [], "trees": [] }`;

// ── Handler ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file    = formData.get('file') as File | null;
  const orgSlug = formData.get('orgSlug') as string | null;

  if (!file || !orgSlug) {
    return NextResponse.json({ error: 'file und orgSlug sind Pflichtfelder' }, { status: 400 });
  }

  const org = await prisma.organization.findUnique({ where: { slug: orgSlug }, select: { id: true } });
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });
  const member = await prisma.membership.findFirst({ where: { organizationId: org.id, userId: session.user.id } });
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const mimeType = file.type || '';
  const isImage  = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mimeType);
  const isCsv   = mimeType === 'text/csv' || mimeType === 'text/plain' || file.name.endsWith('.csv') || file.name.endsWith('.txt');

  try {
    // ── CSV-Pfad ───────────────────────────────────────────────────────────────
    if (isCsv) {
      const text = await file.text();
      const result = parseCsv(text);
      return NextResponse.json(result);
    }

    // ── Vision-Pfad ────────────────────────────────────────────────────────────
    if (isImage) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const base64 = buffer.toString('base64');

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 4096,
        messages: [
          { role: 'system', content: VISION_SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}`, detail: 'high' } },
              { type: 'text', text: 'Bitte extrahiere alle Inventurdaten aus diesem Bild.' },
            ],
          },
        ],
      });

      const raw = response.choices[0]?.message?.content ?? '{}';
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      let parsed: any = {};
      try { parsed = JSON.parse(jsonMatch?.[0] ?? '{}'); } catch { /* empty */ }

      const result: ImportResult = {
        mode:      parsed.mode === 'plot' ? 'plot' : 'tree',
        plots:     Array.isArray(parsed.plots)  ? parsed.plots  : [],
        trees:     Array.isArray(parsed.trees)  ? parsed.trees  : [],
        tokensUsed: response.usage?.total_tokens ?? 0,
        source:    'vision',
      };
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Nicht unterstütztes Format. Bitte CSV, JPEG, PNG oder WebP hochladen.' }, { status: 400 });

  } catch (err: any) {
    console.error('Inventory import error:', err);
    return NextResponse.json({ error: 'Analyse fehlgeschlagen: ' + (err.message ?? 'Unbekannter Fehler') }, { status: 500 });
  }
}
