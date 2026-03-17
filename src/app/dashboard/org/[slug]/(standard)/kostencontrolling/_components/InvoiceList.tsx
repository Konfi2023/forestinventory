"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Send, CheckCircle, Trash2 } from "lucide-react";
import { updateInvoiceStatus, deleteInvoice } from "@/actions/invoices";

type Invoice = {
  id: string;
  invoiceNumber: string;
  forestOwnerName: string;
  status: "DRAFT" | "SENT" | "PAID" | "CANCELLED";
  totalAmount: number;
  currency: string;
  note: string | null;
  periodFrom: string | null;
  periodTo: string | null;
  issuedAt: string | null;
  createdAt: string;
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Entwurf", SENT: "Versendet", PAID: "Bezahlt", CANCELLED: "Storniert",
};
const STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  SENT: "bg-blue-100 text-blue-700",
  PAID: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-600",
};

function fmtEur(n: number) {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function InvoiceRow({ inv }: { inv: Invoice }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function act(fn: () => Promise<void>) {
    startTransition(async () => {
      try { await fn(); router.refresh(); }
      catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Fehler"); }
    });
  }

  const periodLabel = inv.periodFrom && inv.periodTo
    ? `${new Date(inv.periodFrom).toLocaleDateString("de-DE", { day: "2-digit", month: "short" })} – ${new Date(inv.periodTo).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })}`
    : new Date(inv.createdAt).toLocaleDateString("de-DE");

  return (
    <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 items-center px-5 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition">
      <div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded ${STATUS_COLOR[inv.status]}`}>
          {STATUS_LABEL[inv.status]}
        </span>
      </div>
      <div>
        <p className="text-sm font-medium text-slate-800">{inv.invoiceNumber}</p>
        <p className="text-xs text-slate-400">{inv.forestOwnerName} · {periodLabel}</p>
        {inv.note && <p className="text-xs text-slate-400 italic">{inv.note}</p>}
      </div>
      <span className="text-sm font-mono font-medium text-slate-800">{fmtEur(inv.totalAmount)}</span>

      {/* Aktionen */}
      <div className="flex items-center gap-1">
        {inv.status === "DRAFT" && (
          <button
            onClick={() => act(() => updateInvoiceStatus(inv.id, "SENT"))}
            disabled={isPending}
            title="Als versendet markieren"
            className="p-1.5 rounded hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition"
          >
            <Send size={14} />
          </button>
        )}
        {inv.status === "SENT" && (
          <button
            onClick={() => act(() => updateInvoiceStatus(inv.id, "PAID"))}
            disabled={isPending}
            title="Als bezahlt markieren"
            className="p-1.5 rounded hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition"
          >
            <CheckCircle size={14} />
          </button>
        )}
        {inv.status === "DRAFT" && (
          <button
            onClick={() => { if (confirm("Rechnung löschen?")) act(() => deleteInvoice(inv.id)); }}
            disabled={isPending}
            title="Löschen"
            className="p-1.5 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

export function InvoiceList({ invoices }: { invoices: Invoice[] }) {
  if (invoices.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-400">
        Noch keine Rechnungen erstellt
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-5 py-2 bg-slate-50 border-b border-slate-100 text-xs font-medium text-slate-500 uppercase tracking-wide">
        <span>Status</span>
        <span>Rechnung</span>
        <span className="text-right">Betrag</span>
        <span />
      </div>
      {invoices.map(inv => <InvoiceRow key={inv.id} inv={inv} />)}
    </div>
  );
}
