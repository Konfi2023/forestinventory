"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Shield, ShieldCheck, ShieldAlert,
  Eye, EyeOff, Loader2, CheckCircle2, XCircle,
  Wifi, Save, Info, ExternalLink, FlaskConical, Zap, HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { saveEudrApiSettings, testEudrApiConnection } from "@/actions/eudr-settings";
import { EUDR_ENDPOINTS } from "@/lib/eudr-soap";

const ACTIVITY_TYPES = [
  {
    value: "DOMESTIC",
    label: "Inverkehrbringen (Domestic)",
    desc: "Holz aus EU-Wäldern erstmals auf den EU-Markt bringen — typisch für europäische Waldbesitzer und Forstbetriebe.",
  },
  {
    value: "IMPORT",
    label: "Einfuhr (Import)",
    desc: "Holzprodukte aus Drittländern importieren. EORI-Nummer erforderlich.",
  },
  {
    value: "EXPORT",
    label: "Ausfuhr (Export)",
    desc: "Holzprodukte in Drittländer exportieren. EORI-Nummer erforderlich.",
  },
];

function EoriTooltip() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="text-slate-400 hover:text-slate-600 transition-colors"
      >
        <HelpCircle size={14} />
      </button>
      {open && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 z-50 bg-slate-800 text-white text-xs rounded-lg p-3 shadow-xl">
          <p className="font-semibold mb-1">Was ist eine EORI-Nummer?</p>
          <p className="text-slate-300 leading-relaxed">
            Economic Operators Registration and Identification — EU-weite Kennung für Unternehmen,
            die Waren über EU-Außengrenzen bewegen. Beim Import/Export Pflichtfeld.
          </p>
          <p className="text-slate-400 mt-2">
            Format: Länderkürzel + Ziffern, z.B.{" "}
            <span className="font-mono text-white">DE123456789</span>
          </p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
        </div>
      )}
    </div>
  );
}

interface OrgData {
  slug: string;
  eudrActivityType: string | null;
  eoriNumber: string | null;
  eudrApiUrl: string | null;
  eudrApiUsername: string | null;
  eudrApiPassword: string | null;
  eudrApiClientId: string | null;
  eudrApiEnvironment: string | null;
  eudrApiEnabled: boolean;
}

interface Props {
  organization: OrgData;
}

export function EudrSettingsForm({ organization }: Props) {
  const orgSlug = organization.slug;

  // ── Grundeinstellungen
  const [activity, setActivity] = useState(organization.eudrActivityType ?? "DOMESTIC");
  const [eori,     setEori]     = useState(organization.eoriNumber ?? "");

  // ── API-Verbindung
  const initEnv = (organization.eudrApiEnvironment as "ACCEPTANCE" | "PRODUCTION") ?? "ACCEPTANCE";
  const [env,        setEnv]        = useState<"ACCEPTANCE" | "PRODUCTION">(initEnv);
  const [apiUrl,     setApiUrl]     = useState(organization.eudrApiUrl || EUDR_ENDPOINTS[initEnv]);
  const [username,   setUsername]   = useState(organization.eudrApiUsername ?? "");
  const [password,   setPassword]   = useState(organization.eudrApiPassword ?? "");
  const [clientId,   setClientId]   = useState(organization.eudrApiClientId ?? "eudr-test");
  const [enabled,    setEnabled]    = useState(organization.eudrApiEnabled);

  const [showPw,     setShowPw]     = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [testing,    setTesting]    = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; responseMs?: number } | null>(null);

  const needsEori = activity === "IMPORT" || activity === "EXPORT";

  function handleEnvChange(newEnv: "ACCEPTANCE" | "PRODUCTION") {
    setEnv(newEnv);
    if (newEnv === "ACCEPTANCE") setClientId("eudr-test");
    if (apiUrl === EUDR_ENDPOINTS[env] || !apiUrl) {
      setApiUrl(EUDR_ENDPOINTS[newEnv]);
    }
  }

  const handleSave = async () => {
    setSaving(true);
    setTestResult(null);
    try {
      await saveEudrApiSettings(orgSlug, {
        eudrActivityType:  activity,
        eoriNumber:        eori     || undefined,
        eudrApiUrl:        apiUrl   || undefined,
        eudrApiUsername:   username || undefined,
        eudrApiPassword:   password || undefined,
        eudrApiClientId:   clientId || undefined,
        eudrApiEnvironment: env,
        eudrApiEnabled:    enabled,
      });
      toast.success("Einstellungen gespeichert");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testEudrApiConnection(orgSlug, {
        url:         apiUrl   || undefined,
        username:    username || undefined,
        password:    password || undefined,
        clientId:    clientId || undefined,
        environment: env,
      });
      setTestResult(result);
    } catch (e: unknown) {
      setTestResult({ ok: false, message: e instanceof Error ? e.message : String(e) });
    } finally {
      setTesting(false);
    }
  };

  const isApiConfigured = !!username && !!password && !!apiUrl;

  return (
    <div className="space-y-6">

      {/* ── Grundeinstellungen ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
          <Shield size={15} className="text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-800">Grundeinstellungen</h2>
        </div>
        <div className="p-4 space-y-4">

          {/* Aktivitätstyp */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Aktivitätstyp</Label>
            <div className="space-y-2">
              {ACTIVITY_TYPES.map(opt => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    activity === opt.value
                      ? "border-emerald-400 bg-emerald-50"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="activityType"
                    value={opt.value}
                    checked={activity === opt.value}
                    onChange={() => setActivity(opt.value)}
                    className="mt-0.5 accent-emerald-600"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{opt.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* EORI-Nummer */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              EORI-Nummer
              <EoriTooltip />
              {!needsEori && (
                <span className="text-[10px] font-normal text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">optional</span>
              )}
              {needsEori && <span className="text-red-500 text-xs">*</span>}
            </Label>
            <Input
              value={eori}
              onChange={e => setEori(e.target.value)}
              placeholder="DE123456789012345"
              className={`font-mono text-sm ${needsEori && !eori ? "border-amber-300" : ""}`}
            />
          </div>
        </div>
      </div>

      {/* ── API-Verbindung ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wifi size={15} className="text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-800">TRACES NT API-Verbindung</h2>
            <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">ab 2027</span>
          </div>
          {/* Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs text-slate-500">Aktiviert</span>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={() => setEnabled(e => !e)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                enabled ? "bg-emerald-500" : "bg-slate-300"
              }`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                enabled ? "translate-x-4" : "translate-x-1"
              }`} />
            </button>
          </label>
        </div>

        <div className="p-4 space-y-4">

          {/* Umgebung */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Umgebung</Label>
            <div className="flex gap-2">
              <button type="button" onClick={() => handleEnvChange("ACCEPTANCE")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                  env === "ACCEPTANCE"
                    ? "border-amber-400 bg-amber-50 text-amber-800"
                    : "border-slate-200 text-slate-500 hover:border-slate-300"
                }`}>
                <FlaskConical size={14} />Acceptance (Test)
              </button>
              <button type="button" onClick={() => handleEnvChange("PRODUCTION")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                  env === "PRODUCTION"
                    ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 text-slate-500 hover:border-slate-300"
                }`}>
                <Zap size={14} />Production (Live)
              </button>
            </div>
            {env === "ACCEPTANCE" && (
              <p className="text-[11px] text-amber-700 bg-amber-50 rounded px-2 py-1 border border-amber-200">
                Test-Umgebung: DDS-Einreichungen haben keine Rechtswirkung.
                WebServiceClientId: <code className="font-mono">eudr-test</code>
              </p>
            )}
            {env === "PRODUCTION" && (
              <p className="text-[11px] text-emerald-700 bg-emerald-50 rounded px-2 py-1 border border-emerald-200">
                Produktiv-Umgebung: Eingereichte DDS sind rechtsverbindlich.
                Nur aktivieren, wenn Credentials von der EU-Kommission vorliegen.
              </p>
            )}
          </div>

          {/* Endpoint URL */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Endpunkt-URL <span className="text-slate-400 font-normal">(auto-befüllt, anpassbar)</span>
            </Label>
            <Input
              value={apiUrl}
              onChange={e => setApiUrl(e.target.value)}
              placeholder={EUDR_ENDPOINTS[env]}
              className="font-mono text-xs"
            />
          </div>

          {/* Benutzername */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Benutzername</Label>
            <Input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="TRACES NT Benutzername"
              autoComplete="off"
            />
          </div>

          {/* Passwort */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Passwort</Label>
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="TRACES NT Passwort"
                autoComplete="new-password"
                className="pr-10"
              />
              <button type="button" onClick={() => setShowPw(s => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* WebServiceClientId */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">WebServiceClientId</Label>
            <Input
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              placeholder="eudr-test"
              className="font-mono text-sm"
            />
            <p className="text-[11px] text-slate-400">
              Acceptance: <code className="font-mono">eudr-test</code> · Production: von EU-Kommission nach Registrierung
            </p>
          </div>

          {/* Verbindungstest */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={handleTest}
              disabled={testing || !username || !password} className="w-full">
              {testing
                ? <><Loader2 size={13} className="animate-spin mr-1.5" />Verbindung wird getestet…</>
                : <><Wifi size={13} className="mr-1.5" />Verbindung testen (Echo)</>
              }
            </Button>

            {testResult && (
              <div className={`flex items-start gap-2 p-3 rounded-lg text-xs ${
                testResult.ok
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                  : "bg-red-50 border border-red-200 text-red-800"
              }`}>
                {testResult.ok
                  ? <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
                  : <XCircle size={13} className="mt-0.5 shrink-0" />
                }
                <span>{testResult.message}</span>
              </div>
            )}

            {(!username || !password) && (
              <p className="text-[11px] text-slate-400 text-center">
                Benutzername und Passwort eintragen, um die Verbindung zu testen.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Info-Box ────────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-blue-200 bg-blue-50">
        <Info size={15} className="text-blue-600 mt-0.5 shrink-0" />
        <div className="space-y-1.5 text-xs text-blue-800">
          <p className="font-semibold">Credentials erhalten</p>
          <p>
            Registrierung als IT-Dienstleister beim EU-Portal TRACES NT.
            Nach Genehmigung erhalten Sie Benutzername, Passwort und WebServiceClientId
            für die Produktionsumgebung.
          </p>
          <a href="https://webgate.ec.europa.eu/tracesnt/login"
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium underline underline-offset-2 hover:text-blue-900">
            TRACES NT Portal öffnen <ExternalLink size={11} />
          </a>
        </div>
      </div>

      {/* ── Status-Banner ───────────────────────────────────────────────────── */}
      <div className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${
        enabled && isApiConfigured
          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
          : "bg-slate-50 border-slate-200 text-slate-600"
      }`}>
        {enabled && isApiConfigured
          ? <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-600" />
          : <ShieldAlert size={16} className="mt-0.5 shrink-0 text-slate-400" />
        }
        <span className="text-xs">
          {enabled && isApiConfigured
            ? "API aktiviert — automatische Einreichung bei TRACES NT ab 2027 möglich."
            : !enabled
              ? "API deaktiviert — DDS werden manuell eingereicht (Referenznummer manuell eintragen)."
              : "API aktiviert, aber Zugangsdaten fehlen noch. Bitte Benutzername und Passwort eingeben."
          }
        </span>
      </div>

      {/* ── Speichern ───────────────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6">
          {saving
            ? <><Loader2 size={14} className="animate-spin mr-1.5" />Speichern…</>
            : <><Save size={14} className="mr-1.5" />Einstellungen speichern</>
          }
        </Button>
      </div>

    </div>
  );
}
