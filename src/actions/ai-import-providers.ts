"use server";

import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type ExtractedServiceProvider = {
  name: string;
  email?: string;
  phone?: string;
  street?: string;
  zip?: string;
  city?: string;
  category?: string;
  notes?: string;
};

const SYSTEM_PROMPT = `Du bist ein Datenextraktions-Assistent. Extrahiere aus dem folgenden Inhalt alle Firmen oder Personen, die als Forstdienstleister infrage kommen (z.B. Forstunternehmer, Holzrücker, Pflanzentrupps, Gutachter, Sägewerke, Holzhändler, Maschinenringe).
Gib das Ergebnis als JSON zurück im Format:
{ "providers": [ { "name": "...", "email": "...", "phone": "...", "street": "...", "zip": "...", "city": "...", "category": "...", "notes": "..." } ] }
Regeln:
- "name" ist Pflicht (Firmenname oder Vor- und Nachname zusammen)
- Fehlende Felder weglassen (nicht als leerer String)
- "category" soll eine der folgenden Kategorien sein, wenn erkennbar: Forstunternehmer, Holzrücker, Pflanzentrupp, Gutachter, Sägewerk, Holzhändler, Maschinenring, Sonstiges
- Wenn mehrere Einträge erkannt werden, alle als separate Objekte zurückgeben`;

async function callGptText(text: string): Promise<ExtractedServiceProvider[]> {
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
  if (!Array.isArray(parsed.providers)) throw new Error("Unerwartetes Antwortformat");
  return parsed.providers.filter((p: any) => typeof p.name === "string" && p.name.trim());
}

async function callGptImage(base64: string, mimeType: string): Promise<ExtractedServiceProvider[]> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}`, detail: "high" } },
          { type: "text", text: "Extrahiere alle Forstdienstleister aus diesem Bild." },
        ],
      },
    ],
  });
  const content = response.choices[0].message.content;
  if (!content) throw new Error("Keine Antwort von KI");
  const parsed = JSON.parse(content);
  if (!Array.isArray(parsed.providers)) throw new Error("Unerwartetes Antwortformat");
  return parsed.providers.filter((p: any) => typeof p.name === "string" && p.name.trim());
}

export async function extractServiceProvidersFromFile(formData: FormData): Promise<ExtractedServiceProvider[]> {
  const file = formData.get("file") as File | null;
  if (!file) throw new Error("Keine Datei erhalten");

  const fileName = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (fileName.endsWith(".csv") || fileName.endsWith(".txt")) {
    return callGptText(buffer.toString("utf-8"));
  }
  if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return callGptText(XLSX.utils.sheet_to_csv(sheet));
  }
  if (fileName.endsWith(".pdf")) {
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    if (!data.text.trim()) throw new Error("PDF enthält keinen lesbaren Text");
    return callGptText(data.text);
  }
  if (fileName.match(/\.(jpg|jpeg|png|webp)$/)) {
    const mimeType = fileName.endsWith(".png") ? "image/png" : fileName.endsWith(".webp") ? "image/webp" : "image/jpeg";
    return callGptImage(buffer.toString("base64"), mimeType);
  }

  throw new Error("Dateityp nicht unterstützt. Erlaubt: CSV, Excel, PDF, JPG, PNG");
}
