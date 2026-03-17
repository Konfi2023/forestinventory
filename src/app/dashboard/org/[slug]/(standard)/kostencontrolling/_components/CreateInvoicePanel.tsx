"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { FileText, Plus } from "lucide-react";
import { createInvoice } from "@/actions/invoices";
import type { OwnerRow } from "./OwnerCostTable";

interface Props {
  organizationId: string;
  ownerRows: OwnerRow[];
}

function fmtEur(n: number) {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

export function CreateInvoicePanel({ organizationId, ownerRows }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const [note, setNote] = useState("");
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());

  const unbilledOwners = ownerRows.filter(r => r.unbilledCost > 0 && r.ownerId !== "__none__");
  const selectedOwner  = ownerRows.find(r => r.ownerId === selectedOwnerId);

  const allUnbilledEntries = selectedOwner?.forests
    .flatMap(f => f.entries.filter(e => !e.billed)) ?? [];

  function toggleEntry(id: string) {
    setSelectedEntryIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedEntryIds(new Set(allUnbilledEntries.map(e => e.id)));
  }

  function selectNone() {
    setSelectedEntryIds(new Set());
  }

  // Waldbesitzer wechseln → Auswahl zurücksetzen
  function changeOwner(id: string) {
    setSelectedOwnerId(id);
    setSelectedEntryIds(new Set(
      ownerRows.find(r => r.ownerId === id)?.forests
        .flatMap(f => f.entries.filter(e => !e.billed))
        .map(e => e.id) ?? []
    ));
  }

  const selectedTotal = allUnbilledEntries
    .filter(e => selectedEntryIds.has(e.id))
    .reduce((s, e) => s + e.cost, 0);

  function submit() {
    if (!selectedOwnerId || selectedEntryIds.size === 0) {
      toast.error("Bitte Waldbesitzer und mindestens einen Eintrag wählen");
      return;
    }
    startTransition(async () => {
      try {
        const inv = await createInvoice(organizationId, selectedOwnerId, [...selectedEntryIds], selectedTotal, note || undefined);
        toast.success(`Rechnung ${inv.invoiceNumber} erstellt`);
        setSelectedOwnerId("");
        setSelectedEntryIds(new Set());
        setNote("");
        router.refresh();
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Fehler");
      }
    });
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden h-fit">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
        <Plus size={16} className="text-slate-400" />
        <h3 className="font-semibold text-slate-800 text-sm">Rechnung erstellen</h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Waldbesitzer wählen */}
        <div>
          <label className="text-xs font-medium text-slate-500 block mb-1.5">Waldbesitzer</label>
          <select
            value={selectedOwnerId}
            onChange={e => changeOwner(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-slate-400"
          >
            <option value="">Waldbesitzer wählen …</option>
            {unbilledOwners.map(r => (
              <option key={r.ownerId} value={r.ownerId}>
                {r.ownerName} ({r.forests.flatMap(f => f.entries.filter(e => !e.billed)).length} Einträge)
              </option>
            ))}
          </select>
        </div>

        {/* Einträge wählen */}
        {selectedOwner && allUnbilledEntries.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-500">Einträge ({allUnbilledEntries.length})</label>
              <div className="flex gap-2 text-[11px] text-slate-400">
                <button onClick={selectAll} className="hover:text-slate-600">Alle</button>
                <button onClick={selectNone} className="hover:text-slate-600">Keine</button>
              </div>
            </div>
            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-48 overflow-y-auto">
              {allUnbilledEntries.map(e => (
                <label key={e.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedEntryIds.has(e.id)}
                    onChange={() => toggleEntry(e.id)}
                    className="rounded border-slate-300 text-slate-900"
                  />
                  <span className="flex-1 text-xs text-slate-600">
                    {new Date(e.startTime).toLocaleDateString("de-DE", { day: "2-digit", month: "short" })}
                    {" · "}{Math.round((e.durationMinutes ?? 0) / 60 * 10) / 10}h
                  </span>
                  <span className="text-xs font-mono text-slate-700">{fmtEur(e.cost)}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Notiz */}
        {selectedOwnerId && (
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1.5">Notiz (optional)</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-slate-400 resize-none"
              placeholder="z.B. Waldpflegearbeiten März 2025"
            />
          </div>
        )}

        {/* Summe + Button */}
        {selectedEntryIds.size > 0 && (
          <div className="bg-slate-50 rounded-lg p-3 flex items-center justify-between">
            <span className="text-xs text-slate-500">{selectedEntryIds.size} Einträge</span>
            <span className="text-sm font-bold text-slate-900">{fmtEur(selectedTotal)}</span>
          </div>
        )}

        <button
          onClick={submit}
          disabled={isPending || !selectedOwnerId || selectedEntryIds.size === 0}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileText size={15} />
          {isPending ? "Wird erstellt …" : "Rechnung erstellen"}
        </button>
      </div>
    </div>
  );
}
