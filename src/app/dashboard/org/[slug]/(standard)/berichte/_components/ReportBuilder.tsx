"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { sendReport } from "@/actions/reports";
import {
  FileText, Receipt, Send, Download, Loader2,
  Calendar, User, Mail, MessageSquare, Eye,
} from "lucide-react";

type ForestOwner = {
  id: string;
  name: string;
  email: string | null;
  forests: { id: string; name: string }[];
};

interface Props {
  orgId: string;
  orgSlug: string;
  forestOwners: ForestOwner[];
}

function isoToGerman(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// Preset month ranges
function getMonthRange(offset: number): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + offset; // may be negative
  const first = new Date(y, m, 1);
  const last  = new Date(y, m + 1, 0);
  return {
    from: first.toISOString().slice(0, 10),
    to:   last.toISOString().slice(0, 10),
  };
}

const MONTH_PRESETS = [
  { label: "Dieser Monat",   ...getMonthRange(0)  },
  { label: "Letzter Monat",  ...getMonthRange(-1) },
  { label: "Vormonat -2",    ...getMonthRange(-2) },
  { label: "Vormonat -3",    ...getMonthRange(-3) },
];

export function ReportBuilder({ orgId, orgSlug, forestOwners }: Props) {
  const [ownerId, setOwnerId]           = useState(forestOwners[0]?.id ?? "");
  const [from, setFrom]                 = useState(getMonthRange(-1).from);
  const [to, setTo]                     = useState(getMonthRange(-1).to);
  const [includeActivity, setActivity]  = useState(true);
  const [includeInvoice, setInvoice]    = useState(false);
  const [invoiceNumber, setInvNum]      = useState("");
  const [sendEmail, setSendEmail]       = useState(false);
  const [emailSubject, setSubject]      = useState("");
  const [emailMessage, setMessage]      = useState("");
  const [isPending, startTransition]    = useTransition();

  const owner = forestOwners.find((o) => o.id === ownerId);

  function buildDownloadUrl(type: string) {
    const p = new URLSearchParams({
      orgId,
      forestOwnerId: ownerId,
      from,
      to,
      type,
      ...(invoiceNumber ? { invoiceNumber } : {}),
    });
    return `/api/reports/download?${p.toString()}`;
  }

  function handleSend() {
    if (!ownerId) { toast.error("Bitte einen Waldbesitzer wählen"); return; }
    if (!from || !to) { toast.error("Bitte Zeitraum angeben"); return; }
    if (!includeActivity && !includeInvoice) {
      toast.error("Bitte mindestens einen Dokumenttyp wählen");
      return;
    }

    startTransition(async () => {
      const result = await sendReport({
        orgId,
        forestOwnerId: ownerId,
        from,
        to,
        sendEmail,
        includeInvoice,
        includeActivityReport: includeActivity,
        invoiceNumber: invoiceNumber || undefined,
        emailSubject: emailSubject || undefined,
        emailMessage: emailMessage || undefined,
      });

      if (result.success) {
        const action = sendEmail ? "Dokumente erstellt & E-Mail versendet" : "Dokumente erfolgreich erstellt";
        toast.success(action);
        // Refresh page to show new docs in archive
        window.location.reload();
      } else {
        toast.error(result.error ?? "Fehler beim Erstellen der Dokumente");
      }
    });
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="font-semibold text-slate-800">Bericht erstellen</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Tätigkeitsnachweis und/oder Rechnung für einen Waldbesitzer
        </p>
      </div>

      <div className="p-5 space-y-5">
        {/* Waldbesitzer */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wide">
            <User size={12} className="inline mr-1" />Waldbesitzer
          </label>
          <select
            value={ownerId}
            onChange={(e) => setOwnerId(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {forestOwners.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          {owner && (
            <p className="text-xs text-slate-400 mt-1">
              {owner.forests.length} Wald/Wälder ·{" "}
              {owner.email ? (
                <span className="text-green-700">{owner.email}</span>
              ) : (
                <span className="text-amber-600">Keine E-Mail hinterlegt</span>
              )}
            </p>
          )}
        </div>

        {/* Zeitraum */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wide">
            <Calendar size={12} className="inline mr-1" />Zeitraum
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {MONTH_PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => { setFrom(p.from); setTo(p.to); }}
                className={`text-xs px-3 py-1.5 rounded-md border transition ${
                  from === p.from && to === p.to
                    ? "bg-green-700 text-white border-green-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <span className="text-slate-400 text-sm">–</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        {/* Dokumenttypen */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-2 uppercase tracking-wide">
            Dokumente
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setActivity(!includeActivity)}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 transition text-left ${
                includeActivity
                  ? "border-green-600 bg-green-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className={`p-2 rounded-lg ${includeActivity ? "bg-green-100" : "bg-slate-100"}`}>
                <FileText size={18} className={includeActivity ? "text-green-700" : "text-slate-400"} />
              </div>
              <div>
                <p className={`text-sm font-medium ${includeActivity ? "text-green-800" : "text-slate-700"}`}>
                  Tätigkeitsnachweis
                </p>
                <p className="text-xs text-slate-400">Detaillierte Zeiterfassung</p>
              </div>
            </button>

            <button
              onClick={() => setInvoice(!includeInvoice)}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 transition text-left ${
                includeInvoice
                  ? "border-green-600 bg-green-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className={`p-2 rounded-lg ${includeInvoice ? "bg-green-100" : "bg-slate-100"}`}>
                <Receipt size={18} className={includeInvoice ? "text-green-700" : "text-slate-400"} />
              </div>
              <div>
                <p className={`text-sm font-medium ${includeInvoice ? "text-green-800" : "text-slate-700"}`}>
                  Rechnung
                </p>
                <p className="text-xs text-slate-400">§ 14 UStG konform</p>
              </div>
            </button>
          </div>

          {includeInvoice && (
            <div className="mt-3">
              <label className="block text-xs text-slate-500 mb-1">Rechnungsnummer (optional)</label>
              <input
                type="text"
                placeholder="RE-2025-0001"
                value={invoiceNumber}
                onChange={(e) => setInvNum(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          )}
        </div>

        {/* E-Mail senden toggle */}
        <div>
          <button
            onClick={() => setSendEmail(!sendEmail)}
            className={`flex items-center gap-3 w-full p-3 rounded-xl border-2 transition text-left ${
              sendEmail
                ? "border-green-600 bg-green-50"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className={`p-2 rounded-lg ${sendEmail ? "bg-green-100" : "bg-slate-100"}`}>
              <Mail size={18} className={sendEmail ? "text-green-700" : "text-slate-400"} />
            </div>
            <div className="flex-1">
              <p className={`text-sm font-medium ${sendEmail ? "text-green-800" : "text-slate-700"}`}>
                Per E-Mail versenden
              </p>
              <p className="text-xs text-slate-400">
                {owner?.email
                  ? `Wird an ${owner.email} geschickt`
                  : "Keine E-Mail hinterlegt – nur speichern"}
              </p>
            </div>
            <div className={`w-4 h-4 rounded-full border-2 ${sendEmail ? "bg-green-600 border-green-600" : "border-slate-300"}`} />
          </button>

          {sendEmail && (
            <div className="mt-3 space-y-2">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Betreff</label>
                <input
                  type="text"
                  placeholder={`Abrechnung ${isoToGerman(from)} – ${isoToGerman(to)}`}
                  value={emailSubject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1 flex items-center gap-1">
                  <MessageSquare size={11} />Nachricht (optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Persönliche Nachricht..."
                  value={emailMessage}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Preview / Download — always visible when inputs are valid */}
        {ownerId && from && to && (includeActivity || includeInvoice) && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
              <Eye size={12} /> Vorschau & Download
            </p>
            <div className="flex flex-wrap gap-2">
              {includeActivity && (
                <a
                  href={buildDownloadUrl("ACTIVITY_REPORT")}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:border-green-400 hover:text-green-700 hover:bg-green-50 transition"
                >
                  <FileText size={14} />
                  Tätigkeitsnachweis
                  <Download size={12} className="text-slate-400" />
                </a>
              )}
              {includeInvoice && (
                <a
                  href={buildDownloadUrl("INVOICE")}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:border-green-400 hover:text-green-700 hover:bg-green-50 transition"
                >
                  <Receipt size={14} />
                  Rechnung
                  <Download size={12} className="text-slate-400" />
                </a>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Öffnet eine Live-Vorschau — Änderungen oben werden sofort übernommen.
            </p>
          </div>
        )}

        {/* Action button */}
        <button
          onClick={handleSend}
          disabled={isPending || !ownerId}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-700 text-white rounded-xl font-semibold text-sm hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {isPending ? (
            <><Loader2 size={16} className="animate-spin" /> Wird erstellt…</>
          ) : sendEmail ? (
            <><Send size={16} /> Erstellen & versenden</>
          ) : (
            <><FileText size={16} /> Dokumente erstellen & speichern</>
          )}
        </button>
      </div>
    </div>
  );
}
