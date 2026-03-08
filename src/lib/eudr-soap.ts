/**
 * EUDR TRACES NT SOAP Client
 *
 * API: Verordnung EU 2023/1115 — TRACES NT EUDR EcoSystem Service
 * Spec: EUDR API EO Specifications v1.4 / EUDR API Development Options v1.0
 *
 * Environments:
 *   Acceptance: https://acceptance.eudr.webcloud.ec.europa.eu/tracesnt/services/eudrEcoSystemService
 *   Production:  https://eudr.webcloud.ec.europa.eu/tracesnt/services/eudrEcoSystemService
 *
 * Auth: HTTP Basic (username + password)
 * WebServiceClientId: Passed as SOAP header element
 *   - Acceptance test value: "eudr-test"
 *   - Production: Issued by EU Commission upon registration
 */

export const EUDR_ENDPOINTS = {
  ACCEPTANCE:
    "https://acceptance.eudr.webcloud.ec.europa.eu/tracesnt/services/eudrEcoSystemService",
  PRODUCTION:
    "https://eudr.webcloud.ec.europa.eu/tracesnt/services/eudrEcoSystemService",
} as const;

export interface EudrApiConfig {
  url: string;
  username: string;
  password: string;
  clientId: string;
  environment: "ACCEPTANCE" | "PRODUCTION";
}

export interface EudrProduct {
  hsCode: string;
  description?: string;
  scientificName?: string;
  quantityKg?: number;
  countryOfHarvest: string;
  geoJsonString: string;
  harvestStartDate?: string; // ISO date
  harvestEndDate?: string;
}

export interface EudrDdsPayload {
  activityType: string; // DOMESTIC | IMPORT | EXPORT
  products: EudrProduct[];
  operatorName?: string;
  operatorCountry?: string;
  eoriNumber?: string;
  internalNote?: string;
}

export interface EudrSubmitResult {
  referenceNumber: string;
  verificationNumber?: string;
  tracesNtId?: string;
  raw?: string;
}

// ─── XML helpers ─────────────────────────────────────────────────────────────

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function optTag(tag: string, value: string | undefined): string {
  if (!value) return "";
  return `<eudr:${tag}>${escapeXml(value)}</eudr:${tag}>`;
}

function basicAuth(username: string, password: string): string {
  return "Basic " + Buffer.from(`${username}:${password}`).toString("base64");
}

// ─── SOAP envelope builders ───────────────────────────────────────────────────

function buildEchoEnvelope(clientId: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:eudr="urn:eudr:ec:europa:eu:service:v1">
  <soapenv:Header>
    <eudr:WebServiceClientId>${escapeXml(clientId)}</eudr:WebServiceClientId>
  </soapenv:Header>
  <soapenv:Body>
    <eudr:Echo>
      <eudr:message>ping</eudr:message>
    </eudr:Echo>
  </soapenv:Body>
</soapenv:Envelope>`;
}

function buildSubmitEnvelope(config: EudrApiConfig, dds: EudrDdsPayload): string {
  const products = dds.products
    .map(
      (p) => `
        <eudr:product>
          <eudr:hsCode>${escapeXml(p.hsCode)}</eudr:hsCode>
          ${optTag("description", p.description)}
          ${optTag("scientificName", p.scientificName)}
          ${p.quantityKg != null ? `<eudr:quantity>${p.quantityKg.toFixed(3)}</eudr:quantity><eudr:quantityUnit>KGM</eudr:quantityUnit>` : ""}
          <eudr:countryOfHarvest>${escapeXml(p.countryOfHarvest)}</eudr:countryOfHarvest>
          ${optTag("harvestStartDate", p.harvestStartDate)}
          ${optTag("harvestEndDate", p.harvestEndDate)}
          <eudr:geoInformation>${escapeXml(p.geoJsonString)}</eudr:geoInformation>
        </eudr:product>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:eudr="urn:eudr:ec:europa:eu:service:v1">
  <soapenv:Header>
    <eudr:WebServiceClientId>${escapeXml(config.clientId)}</eudr:WebServiceClientId>
  </soapenv:Header>
  <soapenv:Body>
    <eudr:SubmitDueDiligenceStatement>
      <eudr:statement>
        <eudr:activityType>${escapeXml(dds.activityType)}</eudr:activityType>
        ${optTag("operatorName", dds.operatorName)}
        ${optTag("operatorCountry", dds.operatorCountry)}
        ${optTag("eoriNumber", dds.eoriNumber)}
        ${optTag("internalNote", dds.internalNote)}
        <eudr:products>
          ${products}
        </eudr:products>
      </eudr:statement>
    </eudr:SubmitDueDiligenceStatement>
  </soapenv:Body>
</soapenv:Envelope>`;
}

function buildGetDdsEnvelope(clientId: string, referenceNumber: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:eudr="urn:eudr:ec:europa:eu:service:v1">
  <soapenv:Header>
    <eudr:WebServiceClientId>${escapeXml(clientId)}</eudr:WebServiceClientId>
  </soapenv:Header>
  <soapenv:Body>
    <eudr:GetDDSInfo>
      <eudr:referenceNumber>${escapeXml(referenceNumber)}</eudr:referenceNumber>
    </eudr:GetDDSInfo>
  </soapenv:Body>
</soapenv:Envelope>`;
}

function buildRetractEnvelope(clientId: string, referenceNumber: string, reason?: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:eudr="urn:eudr:ec:europa:eu:service:v1">
  <soapenv:Header>
    <eudr:WebServiceClientId>${escapeXml(clientId)}</eudr:WebServiceClientId>
  </soapenv:Header>
  <soapenv:Body>
    <eudr:RetractDueDiligenceStatement>
      <eudr:referenceNumber>${escapeXml(referenceNumber)}</eudr:referenceNumber>
      ${optTag("reason", reason)}
    </eudr:RetractDueDiligenceStatement>
  </soapenv:Body>
</soapenv:Envelope>`;
}

// ─── XML response parser ──────────────────────────────────────────────────────

function extractTag(xml: string, tag: string): string | undefined {
  // Matches both namespaced and plain tags
  const patterns = [
    new RegExp(`<[^>]*:${tag}[^>]*>([^<]*)<`),
    new RegExp(`<${tag}[^>]*>([^<]*)<`),
  ];
  for (const re of patterns) {
    const m = xml.match(re);
    if (m) return m[1].trim();
  }
  return undefined;
}

function checkSoapFault(xml: string): void {
  if (xml.includes("Fault") || xml.includes("faultstring")) {
    const msg =
      extractTag(xml, "faultstring") ||
      extractTag(xml, "message") ||
      "Unbekannter SOAP-Fehler";
    throw new Error(`SOAP Fault: ${msg}`);
  }
}

// ─── SOAP calls ───────────────────────────────────────────────────────────────

async function soapCall(
  config: EudrApiConfig,
  envelope: string,
  soapAction?: string
): Promise<string> {
  const headers: Record<string, string> = {
    "Content-Type": "text/xml; charset=utf-8",
    Authorization: basicAuth(config.username, config.password),
  };
  if (soapAction) headers["SOAPAction"] = soapAction;

  const res = await fetch(config.url, {
    method: "POST",
    headers,
    body: envelope,
  });

  const text = await res.text();

  if (!res.ok) {
    const fault = extractTag(text, "faultstring") || extractTag(text, "message");
    throw new Error(
      `HTTP ${res.status}: ${fault || res.statusText}`
    );
  }

  checkSoapFault(text);
  return text;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Tests the connection by calling the Echo operation.
 * Returns { ok: true } on success or { ok: false, message } on failure.
 */
export async function testEudrConnection(
  config: EudrApiConfig
): Promise<{ ok: boolean; message: string; responseMs?: number }> {
  const t0 = Date.now();
  try {
    const envelope = buildEchoEnvelope(config.clientId);
    const xml = await soapCall(config, envelope);
    const responseMs = Date.now() - t0;

    // Any non-fault response is considered success
    const echoed = extractTag(xml, "return") || extractTag(xml, "message") || "pong";
    return {
      ok: true,
      message: `Verbindung erfolgreich (${responseMs} ms). Antwort: "${echoed}"`,
      responseMs,
    };
  } catch (err: unknown) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Submits a Due Diligence Statement to TRACES NT.
 * Returns the reference number and verification number on success.
 */
export async function submitDdsToApi(
  config: EudrApiConfig,
  dds: EudrDdsPayload
): Promise<EudrSubmitResult> {
  const envelope = buildSubmitEnvelope(config, dds);
  const xml = await soapCall(config, envelope, "submitDueDiligenceStatement");

  const referenceNumber = extractTag(xml, "referenceNumber");
  if (!referenceNumber) {
    throw new Error(
      "API-Antwort enthält keine Referenznummer. Bitte Einreichung in TRACES NT prüfen. Rohantwort: " +
        xml.substring(0, 500)
    );
  }

  return {
    referenceNumber,
    verificationNumber: extractTag(xml, "verificationNumber"),
    tracesNtId: extractTag(xml, "id") || extractTag(xml, "statementId"),
    raw: xml,
  };
}

/**
 * Retrieves the current status of a DDS from TRACES NT.
 */
export async function getDdsInfo(
  config: EudrApiConfig,
  referenceNumber: string
): Promise<{ status: string; raw: string }> {
  const envelope = buildGetDdsEnvelope(config.clientId, referenceNumber);
  const xml = await soapCall(config, envelope);
  const status = extractTag(xml, "status") || "UNKNOWN";
  return { status, raw: xml };
}

/**
 * Retracts (withdraws) a previously submitted DDS.
 */
export async function retractDds(
  config: EudrApiConfig,
  referenceNumber: string,
  reason?: string
): Promise<void> {
  const envelope = buildRetractEnvelope(config.clientId, referenceNumber, reason);
  await soapCall(config, envelope);
}
