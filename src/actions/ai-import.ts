"use server";

import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type ExtractedOwner = {
  name: string;
  email?: string;
  phone?: string;
  street?: string;
  zip?: string;
  city?: string;
  notes?: string;
};

const SYSTEM_PROMPT = `Du bist ein Datenextraktions-Assistent. Extrahiere aus dem folgenden Inhalt alle Personen oder Organisationen, die als Waldbesitzer infrage kommen.
Gib das Ergebnis als JSON zurück im Format:
{ "owners": [ { "name": "...", "email": "...", "phone": "...", "street": "...", "zip": "...", "city": "...", "notes": "..." } ] }
Regeln:
- "name" ist Pflicht (Vor- und Nachname zusammen, oder Firmenname)
- Fehlende Felder weglassen (nicht als leerer String)
- Telefonnummern so übernehmen wie sie stehen
- Wenn Vor- und Nachname getrennt stehen, zusammenfügen
- Wenn unklar ob etwas eine Straße oder eine Notiz ist, lieber als "notes" speichern
- Wenn mehrere Personen erkannt werden, alle als separate Einträge zurückgeben`;

async function callGptText(text: string): Promise<ExtractedOwner[]> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: text },
    ],
  });
  const content = response.choices[0].message.content;
  if (!content) throw new Error("Keine Antwort von KI");
  const parsed = JSON.parse(content);
  if (!Array.isArray(parsed.owners)) throw new Error("Unerwartetes Antwortformat");
  return parsed.owners.filter((o: any) => typeof o.name === "string" && o.name.trim());
}

async function callGptImage(base64: string, mimeType: string): Promise<ExtractedOwner[]> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${base64}`, detail: "high" },
          },
          { type: "text", text: "Extrahiere alle Waldbesitzer aus diesem Bild." },
        ],
      },
    ],
  });
  const content = response.choices[0].message.content;
  if (!content) throw new Error("Keine Antwort von KI");
  const parsed = JSON.parse(content);
  if (!Array.isArray(parsed.owners)) throw new Error("Unerwartetes Antwortformat");
  return parsed.owners.filter((o: any) => typeof o.name === "string" && o.name.trim());
}

export async function extractOwnersFromFile(formData: FormData): Promise<ExtractedOwner[]> {
  const file = formData.get("file") as File | null;
  if (!file) throw new Error("Keine Datei erhalten");

  const fileName = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  // --- CSV / TXT ---
  if (fileName.endsWith(".csv") || fileName.endsWith(".txt")) {
    const text = buffer.toString("utf-8");
    return callGptText(text);
  }

  // --- Excel ---
  if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    return callGptText(csv);
  }

  // --- PDF ---
  if (fileName.endsWith(".pdf")) {
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    if (!data.text.trim()) throw new Error("PDF enthält keinen lesbaren Text (gescanntes PDF nicht unterstützt)");
    return callGptText(data.text);
  }

  // --- Bilder ---
  if (fileName.match(/\.(jpg|jpeg|png|webp)$/)) {
    const mimeType = fileName.endsWith(".png") ? "image/png"
      : fileName.endsWith(".webp") ? "image/webp"
      : "image/jpeg";
    const base64 = buffer.toString("base64");
    return callGptImage(base64, mimeType);
  }

  throw new Error("Dateityp nicht unterstützt. Erlaubt: CSV, Excel, PDF, JPG, PNG");
}

// Text-Extraktion bleibt als Fallback
export async function extractOwnersFromText(text: string): Promise<ExtractedOwner[]> {
  if (!text.trim()) throw new Error("Kein Text eingegeben");
  return callGptText(text);
}
