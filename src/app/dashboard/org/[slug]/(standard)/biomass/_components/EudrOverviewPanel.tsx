"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ShieldCheck, ShieldAlert, ArrowRight,
  CheckCircle2, Circle, Leaf, Radio, FileText,
  Clock, Send, CheckCheck, XCircle, ShoppingCart,
  ChevronDown, ChevronUp, Trash2, Loader2, Save, Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { updateDds, deleteDds, submitDdsViaApi } from "@/actions/eudr";
import { NewDdsDialog } from "./NewDdsDialog";
import { TREE_SPECIES, getSpeciesLabel } from "@/lib/tree-species";
import { HS_CODE_OPTIONS } from "@/lib/eudr-helpers";

const ACTIVITY_LABELS: Record<string, string> = {
  DOMESTIC: "Inverkehrbringen (Domestic)",
  IMPORT:   "Einfuhr (Import)",
  EXPORT:   "Ausfuhr (Export)",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  DRAFT:     { label: "Entwurf",    color: "bg-slate-100 text-slate-600",   icon: <Clock size={11} /> },
  SUBMITTED: { label: "Eingereicht", color: "bg-blue-100 text-blue-700",    icon: <Send size={11} /> },
  ACCEPTED:  { label: "Akzeptiert", color: "bg-emerald-100 text-emerald-700", icon: <CheckCheck size={11} /> },
  RETRACTED: { label: "Zurückgezogen", color: "bg-red-100 text-red-700",    icon: <XCircle size={11} /> },
};

interface DdsItem {
  id: string;
  status: string;
  activityType: string;
  internalNote: string | null;
  referenceNumber: string | null;
  verificationNumber: string | null;
  createdAt: Date;
  submittedAt: Date | null;
  harvestStartDate: Date | null;
  harvestEndDate: Date | null;
  products: { id: string; hsCode: string; description: string | null; treeSpecies: string | null; quantityM3: number | null; countryOfHarvest: string }[];
}

interface Forest {
  id: string;
  name: string;
}

interface SaleItem {
  id: string;
  buyerName: string;
  contractNumber: string | null;
  status: string;
  eudrReference: string | null;
  createdAt: Date;
  forestName: string | null;
  operationTitle: string | null;
  operationYear: number | null;
  totalFm: number;
  species: string;
  ticketCount: number;
}

interface Props {
  orgSlug: string;
  eudrActivityType?: string | null;
  eoriNumber?: string | null;
  trackedPolygons: number;
  apiEnabled: boolean;
  apiConfigured: boolean;
  statements: DdsItem[];
  timberSales: SaleItem[];
  forests: Forest[];
}

// ─── Aufklappbarer DDS-Eintrag ────────────────────────────────────────────────

const STATUS_ORDER_FLOW = ["DRAFT", "SUBMITTED", "ACCEPTED", "RETRACTED"] as const;
const STATUS_FLOW_LABELS: Record<string, string> = {
  DRAFT:     "Entwurf",
  SUBMITTED: "Eingereicht",
  ACCEPTED:  "Akzeptiert",
  RETRACTED: "Zurückgezogen",
};

const EU_COUNTRIES: { code: string; label: string }[] = [
  { code: "DE", label: "Deutschland" }, { code: "AT", label: "Österreich" },
  { code: "CH", label: "Schweiz" },     { code: "FR", label: "Frankreich" },
  { code: "PL", label: "Polen" },       { code: "CZ", label: "Tschechien" },
  { code: "SK", label: "Slowakei" },    { code: "HU", label: "Ungarn" },
  { code: "RO", label: "Rumänien" },    { code: "SE", label: "Schweden" },
  { code: "FI", label: "Finnland" },    { code: "OTHER", label: "Sonstiges" },
];

function DdsItem({
  stmt, orgSlug, apiEnabled, apiConfigured,
}: {
  stmt: DdsItem; orgSlug: string; apiEnabled: boolean; apiConfigured: boolean;
}) {
  const [open,        setOpen]        = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [deleting,    setDeleting]    = useState(false);
  const [submitting,  setSubmitting]  = useState(false);

  // Statement-Felder
  const [status, setStatus] = useState(stmt.status);
  const [refNum, setRefNum] = useState(stmt.referenceNumber ?? "");
  const [note,   setNote]   = useState(stmt.internalNote ?? "");

  // Harvest dates
  const toDateInput = (d: Date | null) =>
    d ? new Date(d).toISOString().split("T")[0] : "";
  const [harvestStart, setHarvestStart] = useState(toDateInput(stmt.harvestStartDate));
  const [harvestEnd,   setHarvestEnd]   = useState(toDateInput(stmt.harvestEndDate));

  // Produkt-Felder (editierbar)
  const p = stmt.products[0];
  const [hsCode,      setHsCode]      = useState(p?.hsCode ?? "4403");
  const [species,     setSpecies]     = useState(p?.treeSpecies ?? "");
  const [description, setDescription] = useState(p?.description ?? "");
  const [quantityM3,  setQuantityM3]  = useState(p?.quantityM3?.toString() ?? "");
  const [country,     setCountry]     = useState(p?.countryOfHarvest ?? "DE");

  const cfg   = STATUS_CONFIG[stmt.status] ?? STATUS_CONFIG.DRAFT;
  const label = p?.description
    || (p?.treeSpecies ? getSpeciesLabel(p.treeSpecies) : null)
    || `HS ${p?.hsCode ?? "—"}`;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDds(stmt.id, orgSlug, {
        status,
        referenceNumber:  refNum       || undefined,
        internalNote:     note         || undefined,
        harvestStartDate: harvestStart || null,
        harvestEndDate:   harvestEnd   || null,
        product: {
          hsCode,
          treeSpecies:      species     || undefined,
          description:      description || undefined,
          quantityM3:       quantityM3  ? parseFloat(quantityM3) : undefined,
          countryOfHarvest: country,
        },
      });
      toast.success("Sorgfaltserklärung aktualisiert");
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitApi = async () => {
    if (!confirm("Sorgfaltserklärung jetzt an TRACES NT (EUDR-API) einreichen?")) return;
    setSubmitting(true);
    try {
      const result = await submitDdsViaApi(stmt.id, orgSlug);
      toast.success(
        `Erfolgreich eingereicht! Referenznummer: ${result.referenceNumber}`,
        { duration: 8000 }
      );
      setOpen(false);
    } catch (e: any) {
      toast.error(`Einreichung fehlgeschlagen: ${e.message}`, { duration: 10000 });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Entwurf löschen?")) return;
    setDeleting(true);
    try {
      await deleteDds(stmt.id, orgSlug);
      toast.success("Entwurf gelöscht");
    } catch (e: any) {
      toast.error(e.message);
      setDeleting(false);
    }
  };

  return (
    <div>
      {/* Kopfzeile */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-slate-800 truncate">{label}</p>
            <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${cfg.color}`}>
              {cfg.icon} {cfg.label}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <p className="text-xs text-slate-400">{ACTIVITY_LABELS[stmt.activityType] ?? stmt.activityType}</p>
            {p?.quantityM3 && <p className="text-xs text-slate-400 font-mono">{p.quantityM3} m³</p>}
            {stmt.referenceNumber
              ? <p className="text-xs font-mono text-blue-600">{stmt.referenceNumber}</p>
              : stmt.status === "DRAFT"
                ? <p className="text-xs text-amber-500 italic">Referenznummer noch nicht eingetragen</p>
                : null
            }
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <p className="text-[10px] text-slate-400">
            {new Date(stmt.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" })}
          </p>
          {open ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </div>
      </button>

      {/* Aufgeklappter Edit-Bereich */}
      {open && (
        <div className="px-4 pb-4 pt-2 bg-slate-50/60 border-t border-slate-100 space-y-4">

          {/* Produktdaten */}
          <div className="space-y-3 bg-white border border-slate-200 rounded-lg p-3">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Produkt</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">HS-Code</Label>
                <select value={hsCode} onChange={e => setHsCode(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white h-8">
                  {HS_CODE_OPTIONS.map(opt => (
                    <option key={opt.code} value={opt.code}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Baumart</Label>
                <select value={species} onChange={e => setSpecies(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white h-8">
                  <option value="">— wählen —</option>
                  {TREE_SPECIES.map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Beschreibung</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)}
                placeholder="z.B. Fichtenstammholz B/C" className="text-xs h-8" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Menge (m³)</Label>
                <Input type="number" min="0" step="0.1" value={quantityM3}
                  onChange={e => setQuantityM3(e.target.value)}
                  placeholder="z.B. 45.5" className="text-xs h-8 font-mono" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Herkunftsland</Label>
                <select value={country} onChange={e => setCountry(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white h-8">
                  {EU_COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <div className="flex gap-1.5 flex-wrap">
              {STATUS_ORDER_FLOW.map(s => (
                <button key={s} type="button" onClick={() => setStatus(s)}
                  className={`text-[10px] px-2.5 py-1 rounded-full border font-medium transition-all ${
                    status === s
                      ? `${STATUS_CONFIG[s]?.color ?? ""} border-current`
                      : "border-slate-200 text-slate-400 hover:border-slate-300 bg-white"
                  }`}>
                  {STATUS_FLOW_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Erntedaten */}
          <div className="space-y-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-[10px] font-semibold text-amber-800 uppercase tracking-wide">
              Erntezeitraum <span className="text-amber-600">(für API-Einreichung)</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Erntebeginn</Label>
                <Input type="date" value={harvestStart} onChange={e => setHarvestStart(e.target.value)}
                  className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ernteende</Label>
                <Input type="date" value={harvestEnd} onChange={e => setHarvestEnd(e.target.value)}
                  className="h-8 text-xs" />
              </div>
            </div>
          </div>

          {/* Referenznummer */}
          <div className="space-y-1.5 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <Label className="text-xs font-semibold text-emerald-800">
              Referenznummer (aus TRACES NT)
            </Label>
            <Input value={refNum} onChange={e => setRefNum(e.target.value)}
              placeholder="z.B. DE-DE-20261234567890"
              className="h-8 text-sm font-mono bg-white" />
            <p className="text-[10px] text-emerald-700">
              Nach automatischer Einreichung wird diese Nummer hier gespeichert
              und gilt dann für alle Lieferscheine des zugehörigen Holzverkaufs.
              Manuelle Eingabe möglich, falls Einreichung außerhalb des Systems erfolgte.
            </p>
            {stmt.verificationNumber && (
              <p className="text-[10px] font-mono text-emerald-700 border-t border-emerald-200 pt-1 mt-1">
                Prüfnummer: <strong>{stmt.verificationNumber}</strong>
              </p>
            )}
          </div>

          {/* Interne Notiz */}
          <div className="space-y-1.5">
            <Label className="text-xs">Interne Notiz</Label>
            <Input value={note} onChange={e => setNote(e.target.value)}
              placeholder="z.B. Wintereinschlag 2026, Abteilung Nord" className="h-8 text-sm" />
          </div>

          {/* Buttons */}
          <div className="space-y-2 pt-1 border-t border-slate-200">
            {/* API submit (only for DRAFT + API configured) */}
            {stmt.status === "DRAFT" && apiEnabled && apiConfigured && (
              <Button
                size="sm" onClick={handleSubmitApi} disabled={submitting}
                className="w-full h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
              >
                {submitting
                  ? <><Loader2 size={12} className="animate-spin mr-1.5" />Wird eingereicht…</>
                  : <><Wifi size={12} className="mr-1.5" />An TRACES NT einreichen (API)</>
                }
              </Button>
            )}
            {stmt.status === "DRAFT" && apiEnabled && !apiConfigured && (
              <p className="text-[11px] text-amber-600 bg-amber-50 rounded px-2 py-1.5 border border-amber-200">
                API aktiviert, aber Zugangsdaten fehlen noch —{" "}
                <a href={`/dashboard/org/${orgSlug}/settings/eudr`} className="underline font-medium">
                  Einstellungen
                </a>
              </p>
            )}
            {stmt.status === "DRAFT" && !apiEnabled && (
              <p className="text-[11px] text-slate-400 bg-slate-50 rounded px-2 py-1.5 border border-slate-200">
                Manuell eingereicht? Referenznummer oben eintragen und Status auf "Eingereicht" setzen.
                Oder{" "}
                <a href={`/dashboard/org/${orgSlug}/settings/eudr`} className="underline text-slate-600">
                  API aktivieren
                </a>{" "}
                für automatische Einreichung ab 2027.
              </p>
            )}
            <div className="flex items-center justify-between">
              {stmt.status === "DRAFT" ? (
                <Button variant="ghost" size="sm" onClick={handleDelete} disabled={deleting}
                  className="text-red-400 hover:text-red-600 hover:bg-red-50 h-7 px-2 text-xs">
                  {deleting ? <Loader2 size={12} className="animate-spin mr-1" /> : <Trash2 size={12} className="mr-1" />}
                  Löschen
                </Button>
              ) : <span />}
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="h-7 text-xs">
                  Abbrechen
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}
                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                  {saving ? <Loader2 size={12} className="animate-spin mr-1" /> : <Save size={12} className="mr-1" />}
                  Speichern
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function EudrOverviewPanel({
  orgSlug, eudrActivityType, eoriNumber, trackedPolygons,
  apiEnabled, apiConfigured, statements, timberSales, forests,
}: Props) {
  const isConfigured = !!eudrActivityType;
  const needsEori = eudrActivityType === "IMPORT" || eudrActivityType === "EXPORT";
  const eoriOk = !needsEori || !!eoriNumber;

  const setupSteps = [
    {
      done: isConfigured,
      label: "Aktivitätstyp festgelegt",
      detail: eudrActivityType ? ACTIVITY_LABELS[eudrActivityType] ?? eudrActivityType : "Noch nicht konfiguriert",
    },
    {
      done: eoriOk,
      label: "EORI-Nummer",
      detail: eoriNumber
        ? eoriNumber
        : needsEori
          ? "Für Import/Export erforderlich — noch nicht hinterlegt"
          : "Nicht erforderlich für Domestic",
    },
    {
      done: trackedPolygons > 0,
      label: "Waldpolygone mit definierten Grenzen",
      detail: trackedPolygons > 0
        ? `${trackedPolygons} Wald${trackedPolygons !== 1 ? "flächen" : "fläche"} mit eingezeichneten Grenzen (maßgeblich für EUDR-Herkunftsnachweis)`
        : "Noch keine Waldgrenzen eingezeichnet — in der Karte das Waldpolygon zeichnen",
    },
    {
      done: apiEnabled && apiConfigured,
      label: "EUDR-API konfiguriert (TRACES NT)",
      detail: apiEnabled && apiConfigured
        ? "Zugangsdaten hinterlegt — automatische Einreichung ab 2027 möglich"
        : apiEnabled
          ? "API aktiviert, aber Zugangsdaten fehlen noch"
          : "Noch nicht konfiguriert — manuelle Einreichung erforderlich bis 2027",
    },
  ];

  const allDone = setupSteps.every(s => s.done);

  const draftCount     = statements.filter(s => s.status === "DRAFT").length;
  const submittedCount = statements.filter(s => s.status === "SUBMITTED").length;
  const acceptedCount  = statements.filter(s => s.status === "ACCEPTED").length;

  return (
    <div className="space-y-6">

      {/* Header Status */}
      <div className={`flex items-start gap-4 p-4 rounded-xl border ${
        allDone ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"
      }`}>
        {allDone
          ? <ShieldCheck size={24} className="text-emerald-600 mt-0.5 shrink-0" />
          : <ShieldAlert size={24} className="text-amber-600 mt-0.5 shrink-0" />
        }
        <div>
          <p className={`font-semibold text-sm ${allDone ? "text-emerald-800" : "text-amber-800"}`}>
            {allDone ? "Bereit für EUDR-Meldungen" : "Setup unvollständig"}
          </p>
          <p className={`text-xs mt-0.5 ${allDone ? "text-emerald-700" : "text-amber-700"}`}>
            {allDone
              ? "Alle Voraussetzungen erfüllt. Sorgfaltserklärungen können erstellt werden."
              : "Bitte schließen Sie die Setup-Schritte ab, bevor Sie DDS einreichen."
            }
          </p>
        </div>
        <Link
          href={`/dashboard/org/${orgSlug}/settings/eudr`}
          className={`ml-auto shrink-0 flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
            allDone
              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
              : "bg-amber-100 text-amber-700 hover:bg-amber-200"
          }`}
        >
          Einstellungen <ArrowRight size={12} />
        </Link>
      </div>

      {/* Statistik-Kacheln */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Entwürfe",     value: draftCount,     color: "text-slate-700"   },
          { label: "Eingereicht",  value: submittedCount, color: "text-blue-700"    },
          { label: "Akzeptiert",   value: acceptedCount,  color: "text-emerald-700" },
        ].map(item => (
          <div key={item.label} className="bg-white rounded-lg border border-slate-200 p-3 text-center shadow-sm">
            <p className={`text-2xl font-bold font-mono ${item.color}`}>{item.value}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>

      {/* DDS-Liste */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={15} className="text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-800">Sorgfaltserklärungen (DDS)</h3>
          </div>
          <NewDdsDialog
            orgSlug={orgSlug}
            defaultActivityType={eudrActivityType ?? "DOMESTIC"}
            forests={forests}
          />
        </div>

        {statements.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <FileText size={20} className="text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600">Noch keine DDS erstellt</p>
            <p className="text-xs text-slate-400 mt-1">
              Erstellen Sie Ihre erste Sorgfaltserklärung mit dem Button oben rechts.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {statements.map(stmt => (
              <DdsItem
                key={stmt.id}
                stmt={stmt}
                orgSlug={orgSlug}
                apiEnabled={apiEnabled}
                apiConfigured={apiConfigured}
              />
            ))}
          </div>
        )}
      </div>

      {/* Holzverkäufe mit EUDR-Status */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <ShoppingCart size={15} className="text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-800">Holzverkäufe — EUDR-Status</h3>
          {timberSales.length > 0 && (
            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full ml-1">
              {timberSales.filter(s => s.eudrReference).length}/{timberSales.length} mit Referenz
            </span>
          )}
        </div>

        {timberSales.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-slate-400">Noch keine Holzverkäufe erfasst.</p>
            <p className="text-xs text-slate-300 mt-1">
              Legen Sie Verkäufe unter <strong>Maßnahmen & Holzverkauf</strong> an.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {timberSales.map(sale => (
              <div key={sale.id} className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                <div className="shrink-0">
                  {sale.eudrReference
                    ? <ShieldCheck size={16} className="text-emerald-500" />
                    : <ShieldAlert size={16} className="text-amber-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-slate-800 truncate">{sale.buyerName}</p>
                    {sale.contractNumber && (
                      <span className="text-[10px] font-mono text-slate-400">#{sale.contractNumber}</span>
                    )}
                    {sale.forestName && (
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
                        {sale.forestName}{sale.operationYear ? ` · ${sale.operationYear}` : ""}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {sale.totalFm > 0 && (
                      <span className="text-xs text-slate-400 font-mono">{sale.totalFm.toFixed(1)} fm</span>
                    )}
                    {sale.species && (
                      <span className="text-xs text-slate-400">{sale.species}</span>
                    )}
                    {sale.ticketCount > 0 && (
                      <span className="text-xs text-slate-400">{sale.ticketCount} Lieferschein{sale.ticketCount !== 1 ? "e" : ""}</span>
                    )}
                    {sale.eudrReference
                      ? <span className="text-xs font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">{sale.eudrReference}</span>
                      : <span className="text-xs text-amber-500 italic">Referenznummer fehlt</span>
                    }
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 shrink-0">
                  {new Date(sale.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Setup-Checkliste (kompakt, falls nicht alles done) */}
      {!allDone && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">Setup-Checkliste</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {setupSteps.map((step, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                {step.done
                  ? <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                  : <Circle size={16} className="text-slate-300 mt-0.5 shrink-0" />
                }
                <div>
                  <p className={`text-sm font-medium ${step.done ? "text-slate-800" : "text-slate-500"}`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Geo-Intelligence Hinweis */}
      <div className="bg-slate-800 rounded-xl p-4 text-white">
        <div className="flex items-start gap-3">
          <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
            <Radio size={14} className="text-emerald-400" />
            <Leaf size={14} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold">Automatischer Entwaldungsnachweis</p>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Ihre Sentinel-1 SAR-Zeitreihen (Monitoring-Tab) dienen als maschinenlesbarer
              Entwaldungsbeweis für die DDS. Aktivieren Sie das SAR-Monitoring für Ihre
              Pflanz- und Kalamitätsflächen, um automatisch compliant zu sein.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
