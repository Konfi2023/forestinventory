"use client";

import { useState } from "react";
import { ShoppingCart, Plus, Loader2, Trash2, FileText, ShieldCheck, ShieldAlert, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { createTimberSale, deleteTimberSale, updateTimberSale } from "@/actions/operations";
import { TimberSaleStatus } from "@prisma/client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TransportTicketSection } from "./TransportTicketSection";

const SALE_STATUS: Record<TimberSaleStatus, { label: string; bg: string; text: string }> = {
  DRAFT:           { label: "Entwurf",       bg: "bg-slate-100",    text: "text-slate-600"    },
  NEGOTIATION:     { label: "Verhandlung",   bg: "bg-blue-50",      text: "text-blue-700"     },
  CONTRACT_SIGNED: { label: "Kontrakt",      bg: "bg-amber-50",     text: "text-amber-700"    },
  COMPLETED:       { label: "Abgeschl.",     bg: "bg-emerald-50",   text: "text-emerald-700"  },
  CANCELLED:       { label: "Storniert",     bg: "bg-red-50",       text: "text-red-700"      },
};
const STATUS_ORDER: TimberSaleStatus[] = ["DRAFT", "NEGOTIATION", "CONTRACT_SIGNED", "COMPLETED", "CANCELLED"];

interface Props {
  timberSales: any[];
  logPiles: any[];
  operationId: string;
  orgSlug: string;
  forestName?: string;
  operationTitle?: string;
  operationYear?: number;
}

function NewSaleDialog({ logPiles, operationId, orgSlug }: { logPiles: any[]; operationId: string; orgSlug: string }) {
  const [open,    setOpen]    = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [buyer,   setBuyer]   = useState("");
  const [contract,setContract]= useState("");
  const [price,   setPrice]   = useState("");
  const [selected,setSelected]= useState<string[]>([]);

  const availablePiles = logPiles.filter(p => p.status === "PILED" || p.status === "MEASURED");

  const togglePile = (id: string) =>
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const totalM3 = logPiles
    .filter(p => selected.includes(p.id))
    .reduce((s, p) => s + (p.measuredAmount ?? p.estimatedAmount ?? 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyer) { toast.error("Käufer ist ein Pflichtfeld"); return; }
    setSaving(true);
    try {
      await createTimberSale(orgSlug, {
        buyerName: buyer,
        contractNumber: contract || undefined,
        pricePerUnit: price ? parseFloat(price) : undefined,
        operationId,
        logPileIds: selected.length ? selected : undefined,
      });
      toast.success("Holzverkauf angelegt");
      setOpen(false);
      setBuyer(""); setContract(""); setPrice(""); setSelected([]);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 border-dashed border-slate-300 text-slate-600 hover:border-emerald-400 hover:text-emerald-700">
          <Plus size={12} /> Verkauf anlegen
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Holzverkauf erstellen</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Käufer / Sägewerk *</Label>
              <Input value={buyer} onChange={e => setBuyer(e.target.value)} placeholder="z.B. Sägewerk Müller" required className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label>Vertragsnummer</Label>
              <Input value={contract} onChange={e => setContract(e.target.value)} placeholder="optional" className="h-8 text-sm" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Preis pro fm (€)</Label>
            <Input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="z.B. 85.00" className="h-8 text-sm" />
          </div>

          {availablePiles.length > 0 && (
            <div className="space-y-1.5">
              <Label className="flex items-center justify-between">
                Polter zuordnen
                {totalM3 > 0 && <span className="text-xs font-mono text-amber-600">{totalM3.toFixed(1)} fm ausgewählt</span>}
              </Label>
              <div className="space-y-1 max-h-36 overflow-y-auto border border-slate-200 rounded-lg p-2">
                {availablePiles.map((p: any) => (
                  <label key={p.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-slate-50 px-1 rounded">
                    <input type="checkbox" checked={selected.includes(p.id)} onChange={() => togglePile(p.id)}
                      className="accent-amber-600" />
                    <span className="text-xs text-slate-700">{p.name ?? "Polter"}</span>
                    {p.treeSpecies && <span className="text-[10px] text-slate-400">{p.treeSpecies}</span>}
                    {(p.measuredAmount ?? p.estimatedAmount) && (
                      <span className="text-[10px] font-mono text-slate-500 ml-auto">{p.measuredAmount ?? p.estimatedAmount} fm</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5 text-xs text-emerald-800">
            <FileText size={13} className="shrink-0 mt-0.5 text-emerald-600" />
            <span>
              Nach dem Anlegen können Sie im <strong>Biomasse-Monitor → EUDR</strong> eine
              Sorgfaltserklärung (DDS) für diesen Verkauf erstellen.
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Abbrechen</Button>
            <Button type="submit" size="sm" disabled={saving} className="bg-amber-600 hover:bg-amber-700 text-white">
              {saving && <Loader2 size={13} className="animate-spin mr-1" />} Anlegen
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── EUDR-Referenz Inline-Editor per Verkauf ─────────────────────────────────

function EudrSaleRow({ saleId, eudrReference: initial, orgSlug }: {
  saleId: string;
  eudrReference: string | null;
  orgSlug: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue]     = useState(initial ?? "");
  const [saving, setSaving]   = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateTimberSale(orgSlug, saleId, { eudrReference: value || null });
      toast.success("EUDR-Referenz gespeichert");
      setEditing(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const hasRef = !!initial;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 text-xs border-t ${hasRef ? "border-emerald-100 bg-emerald-50/40" : "border-amber-100 bg-amber-50/30"}`}>
      {hasRef
        ? <ShieldCheck size={11} className="text-emerald-600 shrink-0" />
        : <ShieldAlert size={11} className="text-amber-500 shrink-0" />
      }
      <span className={`text-[10px] font-medium shrink-0 ${hasRef ? "text-emerald-700" : "text-amber-600"}`}>
        EUDR-Referenz (EU 2023/1115)
      </span>

      {editing ? (
        <>
          <input
            autoFocus
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="z.B. DE-DE-20261234567890"
            className="flex-1 text-[11px] font-mono border border-slate-200 rounded px-2 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400 min-w-0"
          />
          <button onClick={handleSave} disabled={saving}
            className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 shrink-0">
            {saving ? <Loader2 size={9} className="animate-spin" /> : <Check size={9} />}
          </button>
          <button onClick={() => { setEditing(false); setValue(initial ?? ""); }}
            className="p-1 rounded border border-slate-200 text-slate-400 hover:text-slate-600 shrink-0">
            <X size={9} />
          </button>
        </>
      ) : (
        <>
          {hasRef
            ? <span className="font-mono text-[11px] text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">{initial}</span>
            : <span className="text-[10px] text-amber-500 italic">Noch nicht eingetragen — für alle Lieferscheine dieses Verkaufs erforderlich</span>
          }
          <button onClick={() => setEditing(true)}
            className="ml-auto p-1 rounded text-slate-300 hover:text-slate-600 hover:bg-slate-100 shrink-0">
            <Pencil size={9} />
          </button>
        </>
      )}
    </div>
  );
}

export function TimberSaleSection({ timberSales, logPiles, operationId, orgSlug, forestName, operationTitle, operationYear }: Props) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; buyer: string } | null>(null);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteTimberSale(orgSlug, id);
      toast.success("Verkauf gelöscht");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeleting(null);
      setDeleteTarget(null);
    }
  };

  const handleStatusChange = async (id: string, status: TimberSaleStatus) => {
    setUpdatingStatus(id);
    try {
      await updateTimberSale(orgSlug, id, { status });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUpdatingStatus(null);
    }
  };

  // Gesamterlös über alle Verkäufe
  const totalRevenue = timberSales.reduce((sum: number, sale: any) => {
    if (!sale.pricePerUnit) return sum;
    const saleM3 = (sale.logPiles ?? []).reduce(
      (x: number, p: any) => x + (p.measuredAmount ?? p.estimatedAmount ?? 0), 0
    );
    return sum + saleM3 * Number(sale.pricePerUnit);
  }, 0);

  return (
    <div className="px-4 py-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <ShoppingCart size={13} className="text-emerald-600" />
          <span className="text-xs font-semibold text-slate-700">Holzverkäufe</span>
          {timberSales.length > 0 && (
            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
              {timberSales.length}
            </span>
          )}
          {totalRevenue > 0 && (
            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-1.5 py-0.5 rounded-full font-mono">
              {totalRevenue.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
            </span>
          )}
        </div>
        <NewSaleDialog logPiles={logPiles} operationId={operationId} orgSlug={orgSlug} />
      </div>

      {timberSales.length === 0 ? (
        <p className="text-xs text-slate-400 italic py-1 text-center">Noch keine Holzverkäufe erfasst.</p>
      ) : (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          {/* Tabellen-Header */}
          <div className="grid grid-cols-[2fr_1.2fr_1fr_1fr_1fr_1.5fr_auto] gap-0 bg-slate-50 border-b border-slate-200 px-3 py-1.5">
            {["Käufer / Vertrag", "Polter", "fm", "€/fm", "Gesamt", "Status", ""].map((h, i) => (
              <span key={i} className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{h}</span>
            ))}
          </div>

          {/* Zeilen */}
          {timberSales.map((sale: any) => {
            const cfg = SALE_STATUS[sale.status as TimberSaleStatus] ?? SALE_STATUS.DRAFT;
            const saleM3 = (sale.logPiles ?? []).reduce(
              (s: number, p: any) => s + (p.measuredAmount ?? p.estimatedAmount ?? 0), 0
            );
            const revenue = sale.pricePerUnit && saleM3 > 0
              ? saleM3 * Number(sale.pricePerUnit)
              : null;

            return (
              <div key={sale.id} className="border-b border-slate-100 last:border-b-0">
                <div className="grid grid-cols-[2fr_1.2fr_1fr_1fr_1fr_1.5fr_auto] gap-0 px-3 py-2 text-xs hover:bg-slate-50/50 transition-colors items-center group">

                  {/* Käufer + Vertrag */}
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 truncate">{sale.buyerName}</p>
                    {sale.contractNumber && (
                      <p className="text-[10px] text-slate-400 font-mono">#{sale.contractNumber}</p>
                    )}
                  </div>

                  {/* Polter-Anzahl */}
                  <span className="text-slate-600">
                    {(sale.logPiles ?? []).length > 0
                      ? `${(sale.logPiles ?? []).length} Polter`
                      : <span className="text-slate-300">—</span>}
                  </span>

                  {/* Menge (fm) */}
                  <span className={`font-mono ${saleM3 > 0 ? "text-slate-700 font-semibold" : "text-slate-300"}`}>
                    {saleM3 > 0 ? saleM3.toFixed(1) : "—"}
                  </span>

                  {/* Preis/fm */}
                  <span className={`font-mono ${sale.pricePerUnit ? "text-slate-600" : "text-slate-300"}`}>
                    {sale.pricePerUnit ? `${Number(sale.pricePerUnit).toFixed(2)}` : "—"}
                  </span>

                  {/* Gesamterlös */}
                  <span className={`font-semibold ${revenue ? "text-emerald-700" : "text-slate-300"}`}>
                    {revenue
                      ? revenue.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })
                      : "—"}
                  </span>

                  {/* Status Dropdown */}
                  <div className="relative">
                    <select
                      value={sale.status}
                      onChange={e => handleStatusChange(sale.id, e.target.value as TimberSaleStatus)}
                      disabled={updatingStatus === sale.id}
                      className={`text-[10px] pl-1.5 pr-4 py-1 rounded-full border-0 font-medium appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-400 ${cfg.bg} ${cfg.text}`}
                    >
                      {STATUS_ORDER.map(s => (
                        <option key={s} value={s}>{SALE_STATUS[s].label}</option>
                      ))}
                    </select>
                    {updatingStatus === sale.id
                      ? <Loader2 size={8} className="absolute right-1 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />
                      : null}
                  </div>

                  {/* Löschen */}
                  <div className="flex items-center justify-end pl-2">
                    <button
                      onClick={() => setDeleteTarget({ id: sale.id, buyer: sale.buyerName })}
                      disabled={deleting === sale.id}
                      className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                      title="Löschen"
                    >
                      {deleting === sale.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                    </button>
                  </div>
                </div>

                {/* EUDR-Referenz auf Verkaufsebene */}
                <EudrSaleRow
                  saleId={sale.id}
                  eudrReference={sale.eudrReference ?? null}
                  orgSlug={orgSlug}
                />

                {/* Lieferscheine pro Verkauf */}
                <TransportTicketSection
                  tickets={sale.transportTickets ?? []}
                  timberSaleId={sale.id}
                  buyerName={sale.buyerName}
                  totalSoldFm={saleM3}
                  saleEudrReference={sale.eudrReference ?? null}
                  orgSlug={orgSlug}
                  forestName={forestName}
                  operationTitle={operationTitle}
                  operationYear={operationYear}
                  contractNumber={sale.contractNumber}
                />
              </div>
            );
          })}

          {/* Summenzeile */}
          {timberSales.length > 1 && totalRevenue > 0 && (
            <div className="grid grid-cols-[2fr_1.2fr_1fr_1fr_1fr_1.5fr_auto] gap-0 px-3 py-1.5 bg-emerald-50/60 border-t border-emerald-100 items-center">
              <span className="text-[10px] font-semibold text-slate-500 col-span-4">Gesamt</span>
              <span className="text-xs font-bold text-emerald-700 col-span-2">
                {totalRevenue.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
              </span>
              <span />
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        title={`Verkauf an "${deleteTarget?.buyer}" löschen?`}
        description="Die zugeordneten Polter werden wieder freigegeben."
        confirmLabel="Löschen"
        destructive
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
      />
    </div>
  );
}
