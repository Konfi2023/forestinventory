"use client";

import { useState } from "react";
import {
  Wifi, WifiOff, Save, Loader2, ChevronDown, ChevronUp,
  Eye, EyeOff, FlaskConical, CheckCircle2, XCircle, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { adminSaveTracesConfig, adminTestTracesConnection } from "@/actions/admin-traces";
import { EUDR_ENDPOINTS } from "@/lib/eudr-soap";

interface OrgTracesData {
  id: string;
  name: string;
  slug: string;
  eudrApiEnabled: boolean;
  eudrApiEnvironment: string | null;
  eudrApiUrl: string | null;
  eudrApiUsername: string | null;
  eudrApiPassword: string | null;
  eudrApiClientId: string | null;
}

interface Props {
  orgs: OrgTracesData[];
}

function OrgTracesCard({ org }: { org: OrgTracesData }) {
  const [expanded, setExpanded] = useState(false);
  const [enabled, setEnabled] = useState(org.eudrApiEnabled);
  const [env, setEnv] = useState(org.eudrApiEnvironment ?? "ACCEPTANCE");
  const [apiUrl, setApiUrl] = useState(org.eudrApiUrl ?? "");
  const [username, setUsername] = useState(org.eudrApiUsername ?? "");
  const [password, setPassword] = useState(org.eudrApiPassword ?? "");
  const [clientId, setClientId] = useState(org.eudrApiClientId ?? "eudr-test");
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; responseMs?: number } | null>(null);

  const defaultUrl = EUDR_ENDPOINTS[env as "ACCEPTANCE" | "PRODUCTION"];

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminSaveTracesConfig(org.id, {
        eudrApiEnabled: enabled,
        eudrApiEnvironment: env,
        eudrApiUrl: apiUrl || undefined,
        eudrApiUsername: username || undefined,
        eudrApiPassword: password || undefined,
        eudrApiClientId: clientId || undefined,
      });
      toast.success(`${org.name}: Einstellungen gespeichert`);
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
      const result = await adminTestTracesConnection(org.id, {
        eudrApiEnvironment: env,
        eudrApiUrl: apiUrl || undefined,
        eudrApiUsername: username || undefined,
        eudrApiPassword: password || undefined,
        eudrApiClientId: clientId || undefined,
      });
      setTestResult(result);
    } catch (e: unknown) {
      setTestResult({ ok: false, message: e instanceof Error ? e.message : "Verbindungsfehler" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header row */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {enabled
            ? <Wifi size={16} className="text-emerald-500" />
            : <WifiOff size={16} className="text-slate-400" />
          }
          <span className="font-semibold text-slate-800 text-sm">{org.name}</span>
          <span className="text-xs text-slate-400 font-mono">{org.slug}</span>
          {enabled && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${
              env === "PRODUCTION"
                ? "bg-red-100 text-red-700"
                : "bg-amber-100 text-amber-700"
            }`}>
              {env === "PRODUCTION" ? "PROD" : "TEST"}
            </span>
          )}
          {!enabled && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide bg-slate-100 text-slate-400">
              Deaktiviert
            </span>
          )}
        </div>
        {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>

      {/* Expanded config form */}
      {expanded && (
        <div className="border-t border-slate-100 p-4 space-y-4">

          {/* Enable toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setEnabled(v => !v)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                enabled ? "bg-emerald-500" : "bg-slate-300"
              }`}
            >
              <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                enabled ? "translate-x-4" : "translate-x-1"
              }`} />
            </button>
            <Label className="text-xs font-semibold cursor-pointer" onClick={() => setEnabled(v => !v)}>
              TRACES NT API aktiviert
            </Label>
          </div>

          {/* Environment */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Umgebung</Label>
            <div className="flex gap-2">
              {(["ACCEPTANCE", "PRODUCTION"] as const).map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => { setEnv(e); setApiUrl(""); }}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
                    env === e
                      ? e === "PRODUCTION"
                        ? "bg-red-600 text-white border-red-600"
                        : "bg-amber-500 text-white border-amber-500"
                      : "bg-white text-slate-600 border-slate-300 hover:border-slate-400"
                  }`}
                >
                  {e === "PRODUCTION" ? "Produktion" : "Testumgebung (Acceptance)"}
                </button>
              ))}
            </div>
          </div>

          {/* API URL */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              SOAP-Endpunkt-URL
              <span className="ml-2 text-[10px] font-normal text-slate-400">(leer = Standardwert)</span>
            </Label>
            <Input
              value={apiUrl}
              onChange={e => setApiUrl(e.target.value)}
              placeholder={defaultUrl}
              className="font-mono text-xs"
            />
            <p className="text-[10px] text-slate-400">Standard: {defaultUrl}</p>
          </div>

          {/* Credentials */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Benutzername</Label>
              <Input
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="off"
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Passwort</Label>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="text-sm pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>

          {/* Client ID */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">WebServiceClientId</Label>
            <Input
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              placeholder="eudr-test"
              className="font-mono text-sm"
            />
          </div>

          {/* Test result banner */}
          {testResult && (
            <div className={`flex items-start gap-2 p-3 rounded-lg text-xs ${
              testResult.ok
                ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                : "bg-red-50 border border-red-200 text-red-800"
            }`}>
              {testResult.ok
                ? <CheckCircle2 size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                : <XCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
              }
              <div>
                <p className="font-semibold">{testResult.ok ? "Verbindung erfolgreich" : "Verbindung fehlgeschlagen"}</p>
                <p className="mt-0.5 opacity-80">{testResult.message}</p>
                {testResult.responseMs && (
                  <p className="mt-0.5 opacity-60">{testResult.responseMs} ms</p>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={testing || saving}
              className="text-xs"
            >
              {testing
                ? <><Loader2 size={13} className="animate-spin mr-1.5" />Teste…</>
                : <><FlaskConical size={13} className="mr-1.5" />Verbindung testen</>
              }
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={saving || testing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
            >
              {saving
                ? <><Loader2 size={13} className="animate-spin mr-1.5" />Speichern…</>
                : <><Save size={13} className="mr-1.5" />Speichern</>
              }
            </Button>

            {env === "PRODUCTION" && enabled && (
              <span className="ml-auto flex items-center gap-1 text-[11px] text-red-600 font-semibold">
                <Zap size={12} /> Produktionsumgebung — Änderungen wirken sofort
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function TracesAdminPanel({ orgs }: Props) {
  if (orgs.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
        Keine Organisationen vorhanden.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orgs.map(org => (
        <OrgTracesCard key={org.id} org={org} />
      ))}
    </div>
  );
}
