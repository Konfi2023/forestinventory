"use client";

import { useState } from "react";
import {
  ChevronDown, ChevronUp, Trees, Boxes, ShoppingCart,
  Loader2, Trash2, TrendingUp, Scale, ClipboardCheck,
  Pencil, Check, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { deleteOperation, updateOperation } from "@/actions/operations";
import { LogPileSection } from "./LogPileSection";
import { TimberSaleSection } from "./TimberSaleSection";
import { OperationStatus, OperationType } from "@prisma/client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const TYPE_LABELS: Record<OperationType, string> = {
  HARVEST: "Einschlag", PLANTING: "Aufforstung", MAINTENANCE: "Pflege",
  PLANNING: "Planung", MONITORING: "Monitoring",
};

const STATUS_CONFIG: Record<OperationStatus, { label: string; bg: string; text: string; border: string }> = {
  PLANNED:     { label: "Geplant",       bg: "bg-slate-100",    text: "text-slate-600",    border: "border-slate-300"  },
  IN_PROGRESS: { label: "Laufend",       bg: "bg-blue-50",      text: "text-blue-700",     border: "border-blue-300"   },
  COMPLETED:   { label: "Abgeschlossen", bg: "bg-emerald-50",   text: "text-emerald-700",  border: "border-emerald-300"},
  CANCELLED:   { label: "Abgebrochen",   bg: "bg-red-50",       text: "text-red-700",      border: "border-red-300"    },
  ON_HOLD:     { label: "Pausiert",      bg: "bg-amber-50",     text: "text-amber-700",    border: "border-amber-300"  },
};

const STATUS_ORDER: OperationStatus[] = ["PLANNED", "IN_PROGRESS", "COMPLETED", "ON_HOLD"];

interface Props {
  operation: any;
  logPilePois: any[];
  orgSlug: string;
}

export function OperationCard({ operation, logPilePois, orgSlug }: Props) {
  const [open,    setOpen]    = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [desc, setDesc] = useState(operation.description ?? "");
  const [savingDesc, setSavingDesc] = useState(false);

  const cfg    = STATUS_CONFIG[operation.status as OperationStatus] ?? STATUS_CONFIG.PLANNED;
  const forest = operation.forest;

  // ── KPI Berechnung ────────────────────────────────────────────────────────
  const piles = operation.logPiles as any[];
  const sales = operation.timberSales as any[];

  const totalEstFm  = piles.reduce((s: number, p: any) => s + (p.estimatedAmount ?? 0), 0);
  const totalMeasFm = piles.reduce((s: number, p: any) => s + (p.measuredAmount ?? 0), 0);
  const totalFm     = piles.reduce((s: number, p: any) => s + (p.measuredAmount ?? p.estimatedAmount ?? 0), 0);

  const soldFm = piles
    .filter((p: any) => p.status === "SOLD" || p.status === "COLLECTED")
    .reduce((s: number, p: any) => s + (p.measuredAmount ?? p.estimatedAmount ?? 0), 0);

  const collectedFm = piles
    .filter((p: any) => p.status === "COLLECTED")
    .reduce((s: number, p: any) => s + (p.measuredAmount ?? p.estimatedAmount ?? 0), 0);

  const totalRevenue = sales.reduce((s: number, sale: any) => {
    if (!sale.pricePerUnit) return s;
    const saleM3 = (sale.logPiles ?? []).reduce(
      (x: number, p: any) => x + (p.measuredAmount ?? p.estimatedAmount ?? 0), 0
    );
    return s + saleM3 * Number(sale.pricePerUnit);
  }, 0);

  const soldPct = totalFm > 0 ? Math.round((soldFm / totalFm) * 100) : 0;
  const collectedPct = totalFm > 0 ? Math.round((collectedFm / totalFm) * 100) : 0;

  const handleStatusChange = async (status: OperationStatus) => {
    setUpdatingStatus(true);
    try {
      await updateOperation(orgSlug, operation.id, { status });
      toast.success(`Status: ${STATUS_CONFIG[status].label}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSaveDesc = async () => {
    setSavingDesc(true);
    try {
      await updateOperation(orgSlug, operation.id, { description: desc || undefined });
      toast.success("Beschreibung gespeichert");
      setEditingDesc(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingDesc(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteOperation(orgSlug, operation.id);
      toast.success("Maßnahme gelöscht");
    } catch (e: any) {
      toast.error(e.message);
      setDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50/70 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: forest?.color ?? "#10b981" }}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                {operation.year}
              </span>
              <p className="font-semibold text-sm text-slate-800">{operation.title}</p>
              <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
                {TYPE_LABELS[operation.type as OperationType] ?? operation.type}
              </span>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                {cfg.label}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
              <Trees size={10} /> {forest?.name ?? "—"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-4">
          <span className="hidden sm:flex items-center gap-2 text-[10px] text-slate-400">
            <span className="flex items-center gap-0.5"><Boxes size={10} /> {piles.length}</span>
            <span className="flex items-center gap-0.5"><ShoppingCart size={10} /> {sales.length}</span>
          </span>
          {open ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
        </div>
      </div>

      {/* ── KPI-Leiste (immer sichtbar) ────────────────────────────────────── */}
      <div className="grid grid-cols-4 divide-x divide-slate-100 border-t border-slate-100 bg-slate-50/40">
        {/* Gesamt fm */}
        <div className="px-3 py-2">
          <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-0.5">
            <Scale size={9} /> Gesamt (fm)
          </div>
          <div className="text-sm font-bold text-slate-800 font-mono">
            {totalFm > 0 ? totalFm.toFixed(1) : "—"}
          </div>
          {totalEstFm > 0 && totalMeasFm === 0 && (
            <div className="text-[9px] text-slate-400">geschätzt</div>
          )}
          {totalEstFm > 0 && totalMeasFm > 0 && totalEstFm !== totalMeasFm && (
            <div className="text-[9px] text-slate-400">gesch. {totalEstFm.toFixed(1)}</div>
          )}
        </div>

        {/* Vermessen */}
        <div className="px-3 py-2">
          <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-0.5">
            <ClipboardCheck size={9} /> Vermessen
          </div>
          <div className={`text-sm font-bold font-mono ${totalMeasFm > 0 ? "text-blue-700" : "text-slate-300"}`}>
            {totalMeasFm > 0 ? totalMeasFm.toFixed(1) : "—"}
          </div>
          {totalMeasFm > 0 && totalFm > 0 && (
            <div className="text-[9px] text-blue-400">
              {Math.round((totalMeasFm / totalFm) * 100)} % d. Ges.
            </div>
          )}
        </div>

        {/* Verkauft / Abgefahren */}
        <div className="px-3 py-2">
          <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-0.5">
            <TrendingUp size={9} /> Verkauft
          </div>
          <div className={`text-sm font-bold font-mono ${soldFm > 0 ? "text-amber-700" : "text-slate-300"}`}>
            {soldFm > 0 ? `${soldFm.toFixed(1)}` : "—"}
          </div>
          {soldFm > 0 && totalFm > 0 && (
            <div className="text-[9px] text-amber-500">{soldPct} % abgeschlossen</div>
          )}
        </div>

        {/* Erlös */}
        <div className="px-3 py-2">
          <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-0.5">
            <ShoppingCart size={9} /> Erlös
          </div>
          <div className={`text-sm font-bold ${totalRevenue > 0 ? "text-emerald-700" : "text-slate-300"}`}>
            {totalRevenue > 0
              ? totalRevenue.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })
              : "—"}
          </div>
          {sales.length > 0 && (
            <div className="text-[9px] text-slate-400">{sales.length} Verkauf{sales.length !== 1 ? "käufe" : ""}</div>
          )}
        </div>
      </div>

      {/* ── Fortschrittsbalken ─────────────────────────────────────────────── */}
      {totalFm > 0 && (
        <div className="px-4 py-1.5 border-t border-slate-100 bg-white">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="relative h-full">
                {/* Verkauft (amber) */}
                <div
                  className="absolute inset-y-0 left-0 bg-amber-400 rounded-full transition-all"
                  style={{ width: `${soldPct}%` }}
                />
                {/* Abgefahren (emerald, oben) */}
                {collectedPct > 0 && (
                  <div
                    className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${collectedPct}%` }}
                  />
                )}
              </div>
            </div>
            <span className="text-[10px] text-slate-400 font-mono shrink-0 min-w-[28px] text-right">
              {soldPct > 0 ? `${soldPct} %` : ""}
            </span>
          </div>
        </div>
      )}

      {/* ── Body (aufklappbar) ─────────────────────────────────────────────── */}
      {open && (
        <div className="border-t border-slate-100 divide-y divide-slate-100">
          {/* Beschreibung */}
          <div className="px-4 py-2 bg-slate-50/50 group/desc">
            {editingDesc ? (
              <div className="flex items-start gap-2">
                <textarea
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  rows={2}
                  placeholder="Beschreibung / Hinweise zur Maßnahme ..."
                  className="flex-1 text-xs border border-slate-200 rounded-md px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white"
                  autoFocus
                />
                <div className="flex flex-col gap-1">
                  <button
                    onClick={handleSaveDesc}
                    disabled={savingDesc}
                    className="p-1.5 rounded bg-amber-600 text-white hover:bg-amber-700 transition-colors"
                  >
                    {savingDesc ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                  </button>
                  <button
                    onClick={() => { setEditingDesc(false); setDesc(operation.description ?? ""); }}
                    className="p-1.5 rounded border border-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X size={11} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2 min-h-[1.5rem]">
                <p
                  className={`text-xs flex-1 ${desc ? "text-slate-500 italic" : "text-slate-300"}`}
                  onClick={() => setEditingDesc(true)}
                >
                  {desc || "Beschreibung hinzufügen ..."}
                </p>
                <button
                  onClick={() => setEditingDesc(true)}
                  className="opacity-0 group-hover/desc:opacity-100 p-1 rounded text-slate-300 hover:text-amber-600 hover:bg-amber-50 transition-all shrink-0"
                  title="Beschreibung bearbeiten"
                >
                  <Pencil size={11} />
                </button>
              </div>
            )}
          </div>

          {/* Polter */}
          <LogPileSection
            logPiles={piles}
            operationId={operation.id}
            forestId={operation.forestId}
            logPilePois={logPilePois}
            orgSlug={orgSlug}
          />

          {/* Holzverkäufe */}
          <TimberSaleSection
            timberSales={sales}
            logPiles={piles}
            operationId={operation.id}
            orgSlug={orgSlug}
            forestName={forest?.name}
            operationTitle={operation.title}
            operationYear={operation.year}
          />

          {/* Footer: Status + Löschen */}
          <div className="px-4 py-2.5 flex items-center justify-between bg-slate-50/50 gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-slate-400 font-medium mr-1">Status:</span>
              {STATUS_ORDER.map(s => {
                const c = STATUS_CONFIG[s];
                const active = operation.status === s;
                return (
                  <button
                    key={s}
                    disabled={updatingStatus}
                    onClick={async (e) => { e.stopPropagation(); await handleStatusChange(s); }}
                    className={`text-[10px] px-2.5 py-1 rounded-full border font-medium transition-all ${
                      active
                        ? `${c.bg} ${c.text} ${c.border} border shadow-sm`
                        : "border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600 bg-white"
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
            <Button
              variant="ghost" size="sm"
              onClick={() => setConfirmDelete(true)} disabled={deleting}
              className="text-red-400 hover:text-red-600 hover:bg-red-50 h-7 px-2 text-xs ml-auto"
            >
              {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              <span className="ml-1 hidden sm:inline">Löschen</span>
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Maßnahme "${operation.title}" löschen?`}
        description="Alle Polter werden ebenfalls gelöscht."
        confirmLabel="Löschen"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
