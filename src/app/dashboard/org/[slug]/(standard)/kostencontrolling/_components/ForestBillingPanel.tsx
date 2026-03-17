"use client";

import { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Eye, FileText, Download, Loader2, Check, CheckCircle } from "lucide-react";
import { createForestInvoice, peekNextInvoiceNumber } from "@/actions/reports";
import { updateInvoiceStatus, deleteInvoice } from "@/actions/invoices";
import { InvoicePreviewModal } from "./InvoicePreviewModal";
import type { InvoiceLineItem } from "@/lib/pdf/types";
import type { ForestBillingData } from "@/actions/reports";

function fmtEur(n: number) {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}
function fmtH(mins: number) {
  const h = Math.floor(mins / 60); const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Entwurf", SENT: "Versendet", PAID: "Bezahlt", CANCELLED: "Storniert",
};
const STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  SENT:  "bg-blue-100 text-blue-700",
  PAID:  "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-600",
};

const UNITS = ["Pauschal", "Stunden", "Meter", "m²", "Stück", "km", "t", "fm", "rm"];

type LineItem = {
  id: string;
  timeEntryIds: string[];
  title: string;
  description: string;
  unit: string;
  qty: number;
  unitPrice: number;
};

function buildInitialItems(data: ForestBillingData): LineItem[] {
  return data.billableTasks.map((task) => {
    const hasRate  = task.hourlyRate !== null && task.hourlyRate > 0;
    const hours    = task.totalMinutes / 60;
    return {
      id:           `task-${task.taskId}`,
      timeEntryIds: task.timeEntryIds,
      title:        task.taskTitle,
      description:  "",
      unit:         hasRate ? "Stunden" : "Pauschal",
      qty:          hasRate ? Math.round(hours * 100) / 100 : 1,
      unitPrice:    hasRate ? (task.hourlyRate ?? 0) : Math.round(task.totalAmount * 100) / 100,
    };
  });
}

function lineItemAmount(item: LineItem): number {
  return Math.round(item.qty * item.unitPrice * 100) / 100;
}

function toPreviewItems(items: LineItem[]): InvoiceLineItem[] {
  return items.map((item, i) => {
    const amount = lineItemAmount(item);
    const qtyStr = item.unit === "Stunden"
      ? fmtH(Math.round(item.qty * 60))
      : `${item.qty.toLocaleString("de-DE")} ${item.unit}`;
    const rateStr = item.unit === "Pauschal"
      ? "pauschal"
      : `${item.unitPrice.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €/${item.unit}`;
    const desc = item.description
      ? `${item.title}\n${item.description}`
      : item.title;
    return { pos: String(i + 1).padStart(2, "0"), desc, qty: qtyStr, rate: rateStr, amount };
  });
}

type VatRateOption = {
  id: string;
  countryCode: string;
  countryName: string;
  rate: number;
  label: string;
  isDefault: boolean;
};

interface Props {
  data: ForestBillingData;
  orgId: string;
  orgSlug: string;
  vatRates: VatRateOption[];
}

const DRAFT_KEY = (forestId: string) => `forestInvoiceDraft_${forestId}`;

type DraftState = { items: LineItem[]; selectedVatId: string };

function loadDraft(forestId: string, data: ForestBillingData, defaultVatId: string): DraftState {
  try {
    const raw = localStorage.getItem(DRAFT_KEY(forestId));
    if (raw) {
      const parsed: DraftState = JSON.parse(raw);
      if (Array.isArray(parsed.items) && parsed.items.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return { items: buildInitialItems(data), selectedVatId: defaultVatId };
}

export function ForestBillingPanel({ data, orgId, vatRates }: Props) {
  const router = useRouter();
  const [showPreview, setPreview]    = useState(false);
  const [isPending, startTransition] = useTransition();

  // VAT: find default or first, or null for Kleinunternehmer
  const defaultVat    = vatRates.find((r) => r.isDefault) ?? vatRates[0] ?? null;
  const defaultVatId  = defaultVat?.id ?? "__none__";

  // Restore from localStorage on first render
  const [items, setItems]               = useState<LineItem[]>(() => loadDraft(data.forestId, data, defaultVatId).items);
  const [selectedVatId, setSelectedVatId] = useState<string>(() => loadDraft(data.forestId, data, defaultVatId).selectedVatId);
  const selectedVat = vatRates.find((r) => r.id === selectedVatId) ?? null;

  // Persist draft on every change
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY(data.forestId), JSON.stringify({ items, selectedVatId }));
    } catch { /* ignore */ }
  }, [items, selectedVatId, data.forestId]);

  // Pre-fetch next invoice number for preview
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState<string>("");
  useEffect(() => {
    peekNextInvoiceNumber(orgId).then(setNextInvoiceNumber).catch(() => {});
  }, [orgId]);

  // Guard against double-submit
  const [submitted, setSubmitted] = useState(false);

  const netTotal       = items.reduce((s, i) => s + lineItemAmount(i), 0);
  const vatRate        = selectedVat ? selectedVat.rate / 100 : 0;
  const vatAmount      = Math.round(netTotal * vatRate * 100) / 100;
  const grossTotal     = Math.round((netTotal + vatAmount) * 100) / 100;
  const allEntryIds    = items.flatMap((i) => i.timeEntryIds);
  const previewItems   = toPreviewItems(items);

  const now  = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const to   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

  // ── Item mutations ─────────────────────────────────────────────────────────

  function update<K extends keyof LineItem>(id: string, key: K, value: LineItem[K]) {
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, [key]: value } : it));
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        timeEntryIds: [],
        title: "Neue Position",
        description: "",
        unit: "Pauschal",
        qty: 1,
        unitPrice: 0,
      },
    ]);
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  // ── Create invoice ─────────────────────────────────────────────────────────

  function handleCreate() {
    if (items.length === 0) { toast.error("Mindestens eine Position erforderlich."); return; }
    if (!data.ownerId) {
      toast.error("Kein Waldbesitzer dem Wald zugeordnet. Bitte in den Waldeinstellungen hinterlegen.");
      return;
    }
    startTransition(async () => {
      const result = await createForestInvoice({
        orgId,
        forestId: data.forestId,
        forestOwnerId: data.ownerId!,
        from, to,
        timeEntryIds: allEntryIds,
        lineItems: previewItems,
        totalAmount: grossTotal,
        vatRate: selectedVat ? selectedVat.rate : null,
        vatLabel: selectedVat ? selectedVat.label : null,
      });
      if (result.success) {
        try { localStorage.removeItem(DRAFT_KEY(data.forestId)); } catch { /* ignore */ }
        setSubmitted(true);
        toast.success("Rechnung erfolgreich erstellt");
        router.refresh();
      } else {
        toast.error(result.error ?? "Fehler");
      }
    });
  }

  // ── Invoice history row ────────────────────────────────────────────────────

  function InvoiceRow({ inv }: { inv: ForestBillingData["invoices"][0] }) {
    const [busy, run] = useTransition();
    const href        = inv.documentId ? `/api/documents/${inv.documentId}` : null;
    const period      = inv.periodFrom && inv.periodTo
      ? `${new Date(inv.periodFrom).toLocaleDateString("de-DE", { day: "2-digit", month: "short" })} – ${new Date(inv.periodTo).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })}`
      : new Date(inv.createdAt).toLocaleDateString("de-DE");

    return (
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50">
        <span className={`text-xs font-medium px-2 py-0.5 rounded shrink-0 ${STATUS_COLOR[inv.status]}`}>
          {STATUS_LABEL[inv.status]}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800">{inv.invoiceNumber}</p>
          <p className="text-xs text-slate-400">{period}</p>
        </div>
        <span className="text-sm font-mono text-slate-700 shrink-0">{fmtEur(inv.totalAmount)}</span>
        <div className="flex items-center gap-1 shrink-0">
          {href && (
            <a href={href} download rel="noreferrer"
              className="p-1.5 text-slate-400 hover:text-green-700 hover:bg-green-50 rounded transition" title="PDF herunterladen">
              <Download size={13} />
            </a>
          )}
          {inv.status === "DRAFT" && (
            <button disabled={busy} title="Als versendet markieren"
              onClick={() => run(async () => { try { await updateInvoiceStatus(inv.id, "SENT"); router.refresh(); } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Fehler"); } })}
              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition">
              <Check size={13} />
            </button>
          )}
          {inv.status === "SENT" && (
            <button disabled={busy} title="Als bezahlt markieren"
              onClick={() => run(async () => { try { await updateInvoiceStatus(inv.id, "PAID"); router.refresh(); } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Fehler"); } })}
              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition">
              <CheckCircle size={13} />
            </button>
          )}
          {inv.status === "DRAFT" && (
            <button disabled={busy} title="Löschen"
              onClick={() => { if (!confirm("Rechnung löschen?")) return; run(async () => { try { await deleteInvoice(inv.id); router.refresh(); } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Fehler"); } }); }}
              className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition">
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="bg-white border-2 border-green-200 rounded-2xl overflow-hidden shadow-sm">

        {/* Header */}
        <div className="px-6 py-4 bg-green-50 border-b border-green-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-green-900 text-base">Abrechnung: {data.forestName}</h3>
            <p className="text-xs text-green-700 mt-0.5">
              {data.ownerName
                ? `${data.ownerName}${data.ownerEmail ? ` · ${data.ownerEmail}` : ""}`
                : <span className="text-amber-600">Kein Waldbesitzer zugeordnet</span>}
            </p>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div>
              <p className="text-xs text-amber-600 font-semibold uppercase tracking-wide">Abrechenbar</p>
              <p className="font-bold text-amber-800">{fmtH(data.billableMinutes)} · {fmtEur(data.billableAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wide">Abgerechnet</p>
              <p className="font-bold text-emerald-800">{fmtH(data.billedMinutes)} · {fmtEur(data.billedAmount)}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">

          {/* Line items table */}
          <div>
            {/* Column headers */}
            <div className="grid grid-cols-[2fr_2fr_120px_80px_110px_36px] gap-2 px-2 pb-1.5 border-b border-slate-200 mb-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Titel</span>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Beschreibung</span>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Einheit</span>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide text-right">Menge</span>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide text-right">Preis/Einh.</span>
              <span />
            </div>

            {/* Rows */}
            <div className="space-y-1">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[2fr_2fr_120px_80px_110px_36px] gap-2 items-center px-2 py-1.5 rounded-lg hover:bg-slate-50 group"
                >
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) => update(item.id, "title", e.target.value)}
                    placeholder="Titel"
                    className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
                  />
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => update(item.id, "description", e.target.value)}
                    placeholder="Beschreibung (optional)"
                    className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 bg-white text-slate-500"
                  />
                  <select
                    value={item.unit}
                    onChange={(e) => update(item.id, "unit", e.target.value)}
                    className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
                  >
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.qty}
                    onChange={(e) => update(item.id, "qty", parseFloat(e.target.value) || 0)}
                    className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.unitPrice}
                    onChange={(e) => update(item.id, "unitPrice", parseFloat(e.target.value) || 0)}
                    className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
                  />
                  <button
                    onClick={() => removeItem(item.id)}
                    className="flex items-center justify-center w-8 h-8 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition opacity-0 group-hover:opacity-100"
                    title="Position entfernen"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add row + total */}
            <div className="mt-2 flex items-start justify-between gap-4 pt-3 border-t border-slate-100">
              <button
                onClick={addItem}
                className="flex items-center gap-1.5 text-sm text-green-700 hover:text-green-800 hover:bg-green-50 px-3 py-1.5 rounded-lg border border-green-200 hover:border-green-300 transition shrink-0"
              >
                <Plus size={14} /> Position hinzufügen
              </button>

              {/* VAT + totals */}
              <div className="flex flex-col items-end gap-1.5 text-sm">
                {/* VAT selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Mehrwertsteuer:</span>
                  <select
                    value={selectedVatId}
                    onChange={(e) => setSelectedVatId(e.target.value)}
                    className="border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
                  >
                    <option value="__none__">Keine MwSt. (Kleinunternehmer)</option>
                    {vatRates.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label} – {r.countryName}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Breakdown */}
                <div className="w-64 space-y-0.5 text-right">
                  <div className="flex justify-between text-slate-500">
                    <span>Nettobetrag</span>
                    <span className="tabular-nums">{fmtEur(netTotal)}</span>
                  </div>
                  {selectedVat ? (
                    <div className="flex justify-between text-slate-500">
                      <span>zzgl. {selectedVat.rate.toLocaleString("de-DE", { minimumFractionDigits: 1 })} % MwSt.</span>
                      <span className="tabular-nums">{fmtEur(vatAmount)}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-slate-400 text-xs">
                      <span>Gem. § 19 UStG keine MwSt.</span>
                      <span>–</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-0.5 mt-0.5 text-base">
                    <span>Gesamtbetrag</span>
                    <span className="tabular-nums">{fmtEur(grossTotal)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions row */}
          <div className="flex flex-wrap items-end gap-3 pt-3 border-t border-slate-200">
            <div className="flex-1 min-w-[180px]">
              <p className="text-xs text-slate-400">
                Die Rechnungsnummer wird automatisch und fortlaufend vergeben (RE-{new Date().getFullYear()}-XXXX).
              </p>
            </div>
            <button
              onClick={() => setPreview(true)}
              disabled={items.length === 0}
              className="flex items-center gap-2 px-4 py-2 border-2 border-green-600 text-green-700 rounded-xl font-semibold text-sm hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <Eye size={15} /> Vorschau
            </button>
            <button
              onClick={handleCreate}
              disabled={isPending || submitted || items.length === 0 || !data.ownerId}
              className="flex items-center gap-2 px-5 py-2 bg-green-700 text-white rounded-xl font-semibold text-sm hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isPending
                ? <><Loader2 size={15} className="animate-spin" /> Wird erstellt…</>
                : submitted
                  ? <><CheckCircle size={15} /> Rechnung erstellt</>
                  : <><FileText size={15} /> Rechnung erstellen</>}
            </button>
            {!data.ownerId && (
              <p className="text-xs text-amber-600 w-full">
                Kein Waldbesitzer zugeordnet – Rechnungserstellung nicht möglich.
              </p>
            )}
            <button
              onClick={() => {
                if (!confirm("Entwurf zurücksetzen? Alle manuellen Änderungen gehen verloren.")) return;
                try { localStorage.removeItem(DRAFT_KEY(data.forestId)); } catch { /* ignore */ }
                setItems(buildInitialItems(data));
                setSelectedVatId(defaultVatId);
              }}
              className="text-xs text-slate-400 hover:text-slate-600 transition ml-auto"
            >
              Entwurf zurücksetzen
            </button>
          </div>
        </div>

        {/* Invoice history */}
        {data.invoices.length > 0 && (
          <div className="border-t border-slate-200">
            <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Rechnungshistorie ({data.invoices.length})
              </h4>
            </div>
            {data.invoices.map((inv) => <InvoiceRow key={inv.id} inv={inv} />)}
          </div>
        )}
      </div>

      <InvoicePreviewModal
        open={showPreview}
        onClose={() => setPreview(false)}
        orgId={orgId}
        forestOwnerId={data.ownerId ?? ""}
        from={from}
        to={to}
        invoiceNumber={nextInvoiceNumber}
        lineItems={previewItems}
        vatRate={selectedVat ? selectedVat.rate : undefined}
        vatLabel={selectedVat ? selectedVat.label : undefined}
      />
    </>
  );
}
