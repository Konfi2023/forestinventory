"use client";

import { useState } from "react";
import {
  Truck, Plus, Loader2, Trash2, Pencil, Check, X,
  Printer, Mail, FileCheck, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { createTransportTicket, updateTransportTicket, deleteTransportTicket } from "@/actions/operations";

// ─── Typen ─────────────────────────────────────────────────────────────────

interface Ticket {
  id: string;
  ticketNumber: string;
  plateNumber: string | null;
  driverName: string | null;
  carrierName: string | null;
  pickupDate: Date | string;
  forestAmount: number | null;
  forestUnit: string | null;
  factoryAmount: number;
  factoryUnit: string;
  eudrReference: string | null;
  note: string | null;
  createdAt: Date | string;
}

interface Props {
  tickets: Ticket[];
  timberSaleId: string;
  buyerName: string;
  /** Summe der verkauften fm (für Vorschlagswert Werksmaß) */
  totalSoldFm: number;
  /** EUDR-Referenznummer vom Holzverkauf — wird auf allen Lieferscheinen angezeigt */
  saleEudrReference?: string | null;
  orgSlug: string;
  /** Wald + Operation für den Lieferschein-Druck */
  forestName?: string;
  operationTitle?: string;
  operationYear?: number;
  contractNumber?: string | null;
}

// ─── Hilfsfunktionen ───────────────────────────────────────────────────────

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatAmt(v: number | null | undefined, unit?: string | null) {
  if (!v) return "—";
  return `${v.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 3 })} ${unit ?? "fm"}`;
}

function diffLabel(forest: number | null, factory: number): string | null {
  if (!forest) return null;
  const d = factory - forest;
  const pct = ((d / forest) * 100).toFixed(1);
  const sign = d >= 0 ? "+" : "";
  return `${sign}${d.toFixed(2)} fm (${sign}${pct} %)`;
}

// ─── Lieferschein drucken ──────────────────────────────────────────────────

function printTicket(ticketId: string) {
  window.open(`/api/transport-ticket/${ticketId}`, "_blank");
}

// ─── E-Mail via mailto ─────────────────────────────────────────────────────

function emailTicket(ticket: Ticket, buyerName: string, forestName?: string) {
  const diff = ticket.forestAmount
    ? `\nDifferenz: ${diffLabel(ticket.forestAmount, ticket.factoryAmount)}`
    : "";

  const body = [
    `Lieferschein Nr. ${ticket.ticketNumber}`,
    `Abfuhrdatum: ${formatDate(ticket.pickupDate)}`,
    ``,
    `Wald: ${forestName ?? "—"}`,
    `Käufer/Empfänger: ${buyerName}`,
    ``,
    `Fahrer: ${ticket.driverName ?? "—"}  |  Kennzeichen: ${ticket.plateNumber ?? "—"}`,
    ticket.carrierName ? `Spediteur: ${ticket.carrierName}` : "",
    ``,
    `Waldmaß: ${formatAmt(ticket.forestAmount, ticket.forestUnit)}`,
    `Werksmaß: ${formatAmt(ticket.factoryAmount, ticket.factoryUnit)}${diff}`,
    ``,
    ticket.eudrReference
      ? `EUDR-Referenz (EU 2023/1115): ${ticket.eudrReference}`
      : "EUDR-Referenz: nicht eingetragen",
    ticket.note ? `\nBemerkungen: ${ticket.note}` : "",
  ].filter(Boolean).join("\n");

  const subject = encodeURIComponent(`Holz-Lieferschein ${ticket.ticketNumber}`);
  const encodedBody = encodeURIComponent(body);
  window.location.href = `mailto:?subject=${subject}&body=${encodedBody}`;
}

// ─── Ticket-Formular ───────────────────────────────────────────────────────

function TicketForm({
  initial,
  timberSaleId,
  totalSoldFm,
  saleEudrReference,
  orgSlug,
  onSaved,
  onCancel,
}: {
  initial?: Ticket;
  timberSaleId: string;
  totalSoldFm: number;
  saleEudrReference?: string | null;
  orgSlug: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [saving, setSaving] = useState(false);

  const [ticketNumber, setTicketNumber] = useState(
    initial?.ticketNumber ?? `LS-${new Date().getFullYear()}-`
  );
  const [pickupDate, setPickupDate] = useState(
    initial?.pickupDate ? new Date(initial.pickupDate).toISOString().split("T")[0] : today
  );
  const [plateNumber, setPlateNumber] = useState(initial?.plateNumber ?? "");
  const [driverName,  setDriverName]  = useState(initial?.driverName  ?? "");
  const [carrierName, setCarrierName] = useState(initial?.carrierName ?? "");
  const [forestAmount, setForestAmount] = useState(initial?.forestAmount?.toString() ?? "");
  const [forestUnit,   setForestUnit]   = useState(initial?.forestUnit ?? "fm");
  const [factoryAmount, setFactoryAmount] = useState(
    initial?.factoryAmount?.toString() ?? totalSoldFm.toFixed(3)
  );
  const [factoryUnit, setFactoryUnit] = useState(initial?.factoryUnit ?? "fm");
  const [note, setNote] = useState(initial?.note ?? "");

  const handleSave = async () => {
    if (!ticketNumber || !factoryAmount) {
      toast.error("Lieferschein-Nr. und Werksmaß sind Pflichtfelder");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ticketNumber,
        pickupDate,
        plateNumber:    plateNumber  || undefined,
        driverName:     driverName   || undefined,
        carrierName:    carrierName  || undefined,
        forestAmount:   forestAmount ? parseFloat(forestAmount)  : undefined,
        forestUnit:     forestUnit   || "fm",
        factoryAmount:  parseFloat(factoryAmount),
        factoryUnit:    factoryUnit  || "fm",
        note:           note          || undefined,
      };

      if (initial) {
        await updateTransportTicket(orgSlug, initial.id, payload);
        toast.success("Lieferschein aktualisiert");
      } else {
        await createTransportTicket(orgSlug, { timberSaleId, ...payload });
        toast.success("Lieferschein erfasst");
      }
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 py-1">
      {/* Zeile 1: Nr + Datum */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Lieferschein-Nr. *</Label>
          <Input value={ticketNumber} onChange={e => setTicketNumber(e.target.value)}
            placeholder="LS-2026-001" className="h-8 text-sm font-mono" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Abfuhrdatum *</Label>
          <Input type="date" value={pickupDate} onChange={e => setPickupDate(e.target.value)}
            className="h-8 text-sm" />
        </div>
      </div>

      {/* Zeile 2: LKW + Fahrer */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Kennzeichen</Label>
          <Input value={plateNumber} onChange={e => setPlateNumber(e.target.value)}
            placeholder="z.B. FRG-XY 123" className="h-8 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Fahrer</Label>
          <Input value={driverName} onChange={e => setDriverName(e.target.value)}
            placeholder="Name des Fahrers" className="h-8 text-sm" />
        </div>
      </div>

      {/* Zeile 3: Spediteur */}
      <div className="space-y-1.5">
        <Label className="text-xs">Spediteur / Frachtführer</Label>
        <Input value={carrierName} onChange={e => setCarrierName(e.target.value)}
          placeholder="z.B. Holztransport Müller GmbH" className="h-8 text-sm" />
      </div>

      {/* Zeile 4: Mengen */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Waldmaß (Forstmaß)</Label>
          <div className="flex gap-1.5">
            <Input type="number" step="0.001" value={forestAmount}
              onChange={e => setForestAmount(e.target.value)}
              placeholder="0.000" className="h-8 text-sm flex-1 font-mono" />
            <select value={forestUnit} onChange={e => setForestUnit(e.target.value)}
              className="h-8 text-xs border border-slate-200 rounded-md px-1.5 bg-white">
              {["fm", "rm", "srm"].map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-blue-700">Werksmaß (maßgeblich) *</Label>
          <div className="flex gap-1.5">
            <Input type="number" step="0.001" value={factoryAmount}
              onChange={e => setFactoryAmount(e.target.value)}
              placeholder="0.000" className="h-8 text-sm flex-1 font-mono font-semibold" />
            <select value={factoryUnit} onChange={e => setFactoryUnit(e.target.value)}
              className="h-8 text-xs border border-slate-200 rounded-md px-1.5 bg-white">
              {["fm", "rm", "srm"].map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* EUDR-Referenz — vom Holzverkauf geerbt, hier nur Anzeige */}
      <div className={`space-y-1 rounded-lg p-3 border ${saleEudrReference ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
        <p className={`text-xs font-semibold flex items-center gap-1.5 ${saleEudrReference ? "text-emerald-800" : "text-amber-700"}`}>
          <FileCheck size={11} />
          EUDR-Referenznummer (Verordnung EU 2023/1115)
        </p>
        {saleEudrReference
          ? <p className="font-mono text-sm text-emerald-900">{saleEudrReference}</p>
          : <p className="text-[10px] text-amber-700">Noch nicht eingetragen — bitte über das <strong>Schild-Icon ↑ oberhalb</strong> dieser Sektion eintragen (einmalig pro Verkauf).</p>
        }
      </div>

      {/* Notiz */}
      <div className="space-y-1.5">
        <Label className="text-xs">Bemerkungen</Label>
        <Input value={note} onChange={e => setNote(e.target.value)}
          placeholder="z.B. Feuchtholz, Teilladung, Sonderbedingungen ..." className="h-8 text-sm" />
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Abbrechen</Button>
        <Button size="sm" onClick={handleSave} disabled={saving}
          className="bg-emerald-700 hover:bg-emerald-800 text-white">
          {saving && <Loader2 size={13} className="animate-spin mr-1" />}
          {initial ? "Speichern" : "Lieferschein erfassen"}
        </Button>
      </div>
    </div>
  );
}

// ─── Haupt-Komponente ──────────────────────────────────────────────────────

export function TransportTicketSection({
  tickets, timberSaleId, buyerName, totalSoldFm, saleEudrReference, orgSlug,
  forestName, operationTitle, operationYear, contractNumber,
}: Props) {
  const [open, setOpen]             = useState(false);
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [deleting, setDeleting]     = useState<string | null>(null);

  const totalFactoryM3 = tickets.reduce((s, t) => s + t.factoryAmount, 0);
  const totalForestM3  = tickets.reduce((s, t) => s + (t.forestAmount ?? 0), 0);

  const handleDelete = async (id: string, nr: string) => {
    if (!confirm(`Lieferschein "${nr}" wirklich löschen?`)) return;
    setDeleting(id);
    try {
      await deleteTransportTicket(orgSlug, id);
      toast.success("Lieferschein gelöscht");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="border-t border-slate-100">
      {/* Toggle-Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2 hover:bg-slate-50/60 transition-colors group"
      >
        <div className="flex items-center gap-2">
          <Truck size={12} className="text-slate-400" />
          <span className="text-xs text-slate-500 font-medium">
            Abfuhrscheine / Lieferscheine
          </span>
          {tickets.length > 0 && (
            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
              {tickets.length}
            </span>
          )}
          {totalFactoryM3 > 0 && (
            <span className="text-[10px] font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-full">
              {totalFactoryM3.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 3 })} fm Werksmaß
            </span>
          )}
          {totalFactoryM3 > 0 && totalForestM3 > 0 && (
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
              totalFactoryM3 < totalForestM3 * 0.97
                ? "text-red-600 bg-red-50"
                : "text-slate-400 bg-slate-50"
            }`}>
              {diffLabel(totalForestM3, totalFactoryM3)}
            </span>
          )}
        </div>
        <span className="text-[10px] text-slate-400 group-hover:text-slate-600 transition">
          {open ? "▲ schließen" : "▼ anzeigen"}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-3 space-y-2">

          {/* Fehlende EUDR-Warnung — nur wenn Lieferscheine vorhanden aber keine Referenz am Verkauf */}
          {tickets.length > 0 && !saleEudrReference && (
            <div className="flex items-start gap-2 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertCircle size={11} className="shrink-0 mt-0.5" />
              EUDR-Referenznummer fehlt — bitte direkt am Holzverkauf eintragen (gilt dann für alle Lieferscheine).
            </div>
          )}

          {tickets.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-3">
              Noch keine Abfuhrscheine erfasst.
            </p>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-[1.5fr_1fr_1.5fr_1.2fr_1.2fr_1.5fr_auto] gap-0 bg-slate-50 border-b border-slate-200 px-3 py-1.5">
                {["Schein-Nr.", "Datum", "LKW / Fahrer", "Waldmaß", "Werksmaß", "EUDR-Ref.", ""].map((h, i) => (
                  <span key={i} className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{h}</span>
                ))}
              </div>

              {tickets.map(ticket => {
                const isEditing = editingId === ticket.id;
                const diff = ticket.forestAmount ? diffLabel(ticket.forestAmount, ticket.factoryAmount) : null;
                const isNegDiff = diff && diff.startsWith("-") && parseFloat(diff) < -3;

                return (
                  <div key={ticket.id}>
                    <div className={`grid grid-cols-[1.5fr_1fr_1.5fr_1.2fr_1.2fr_1.5fr_auto] gap-0 px-3 py-2 text-xs border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 transition-colors items-center group ${isEditing ? "bg-blue-50/30" : ""}`}>
                      {/* Schein-Nr */}
                      <div className="font-mono font-semibold text-slate-800 truncate">{ticket.ticketNumber}</div>

                      {/* Datum */}
                      <div className="text-slate-600">{formatDate(ticket.pickupDate)}</div>

                      {/* LKW + Fahrer */}
                      <div className="min-w-0">
                        {ticket.plateNumber && (
                          <p className="font-mono text-slate-700 text-[11px]">{ticket.plateNumber}</p>
                        )}
                        {ticket.driverName && (
                          <p className="text-[10px] text-slate-400 truncate">{ticket.driverName}</p>
                        )}
                        {ticket.carrierName && (
                          <p className="text-[10px] text-slate-400 truncate">{ticket.carrierName}</p>
                        )}
                        {!ticket.plateNumber && !ticket.driverName && (
                          <span className="text-slate-300">—</span>
                        )}
                      </div>

                      {/* Waldmaß */}
                      <span className={`font-mono ${ticket.forestAmount ? "text-slate-600" : "text-slate-300"}`}>
                        {formatAmt(ticket.forestAmount, ticket.forestUnit)}
                      </span>

                      {/* Werksmaß + Diff */}
                      <div>
                        <span className="font-mono font-semibold text-blue-700">
                          {formatAmt(ticket.factoryAmount, ticket.factoryUnit)}
                        </span>
                        {diff && (
                          <p className={`text-[10px] font-mono ${isNegDiff ? "text-red-500" : "text-slate-400"}`}>
                            {diff}
                          </p>
                        )}
                      </div>

                      {/* EUDR-Ref (vom Verkauf geerbt) */}
                      <div className="min-w-0">
                        {saleEudrReference ? (
                          <span className="font-mono text-[10px] text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded truncate block">
                            {saleEudrReference}
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-500 flex items-center gap-0.5">
                            <AlertCircle size={9} /> fehlt
                          </span>
                        )}
                      </div>

                      {/* Aktionen */}
                      <div className="flex items-center gap-1 justify-end pl-2">
                        <button
                          onClick={() => printTicket(ticket.id)}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          title="Drucken / PDF"
                        >
                          <Printer size={11} />
                        </button>
                        <button
                          onClick={() => emailTicket(ticket, buyerName, forestName)}
                          className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Per E-Mail senden"
                        >
                          <Mail size={11} />
                        </button>
                        <button
                          onClick={() => setEditingId(isEditing ? null : ticket.id)}
                          className={`p-1 rounded transition-colors ${isEditing ? "text-blue-600 bg-blue-100" : "text-slate-400 hover:text-blue-600 hover:bg-blue-50"}`}
                          title="Bearbeiten"
                        >
                          <Pencil size={11} />
                        </button>
                        <button
                          onClick={() => handleDelete(ticket.id, ticket.ticketNumber)}
                          disabled={deleting === ticket.id}
                          className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Löschen"
                        >
                          {deleting === ticket.id
                            ? <Loader2 size={11} className="animate-spin" />
                            : <Trash2 size={11} />}
                        </button>
                      </div>
                    </div>

                    {/* Inline-Edit */}
                    {isEditing && (
                      <div className="px-4 py-3 bg-blue-50/40 border-b border-blue-100">
                        <TicketForm
                          initial={ticket}
                          timberSaleId={timberSaleId}
                          totalSoldFm={totalSoldFm}
                          saleEudrReference={saleEudrReference}
                          orgSlug={orgSlug}
                          onSaved={() => setEditingId(null)}
                          onCancel={() => setEditingId(null)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Summenzeile */}
              {tickets.length > 1 && (
                <div className="grid grid-cols-[1.5fr_1fr_1.5fr_1.2fr_1.2fr_1.5fr_auto] gap-0 px-3 py-1.5 bg-blue-50/60 border-t border-blue-100 items-center">
                  <span className="text-[10px] font-semibold text-slate-500 col-span-3">Gesamt</span>
                  <span className="text-[10px] font-mono text-slate-600">
                    {totalForestM3 > 0 ? formatAmt(totalForestM3) : "—"}
                  </span>
                  <span className="text-xs font-bold font-mono text-blue-700">
                    {formatAmt(totalFactoryM3)}
                  </span>
                  <span className="col-span-2" />
                </div>
              )}
            </div>
          )}

          {/* Neuer Lieferschein */}
          <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"
                className="h-7 text-xs gap-1.5 border-dashed border-slate-300 text-slate-600 hover:border-emerald-500 hover:text-emerald-700 w-full mt-1">
                <Plus size={11} /> Abfuhrschein / Lieferschein erfassen
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Truck size={16} className="text-emerald-600" />
                  Abfuhrschein erfassen
                </DialogTitle>
              </DialogHeader>
              <TicketForm
                timberSaleId={timberSaleId}
                totalSoldFm={totalSoldFm}
                saleEudrReference={saleEudrReference}
                orgSlug={orgSlug}
                onSaved={() => setNewDialogOpen(false)}
                onCancel={() => setNewDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
