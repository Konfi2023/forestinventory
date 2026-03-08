"use client";

import { useState } from "react";
import {
  Boxes, Plus, Loader2, Trash2, MapPin, ExternalLink, Trees,
  Pencil, Check, ChevronDown, Scale, Ruler,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { createLogPile, deleteLogPile, updateLogPile } from "@/actions/operations";
import { upsertPoiLogPile } from "@/actions/poi";
import { PolterStatus, WoodType } from "@prisma/client";
import { TREE_SPECIES } from "@/lib/tree-species";

// ─── Konstanten ──────────────────────────────────────────────────────────────

const STATUS_CFG: Record<PolterStatus, { label: string; bg: string; text: string; dot: string }> = {
  PILED:     { label: "Gepoltert",  bg: "bg-slate-100",   text: "text-slate-600",   dot: "bg-slate-400"   },
  MEASURED:  { label: "Vermessen",  bg: "bg-blue-50",     text: "text-blue-700",    dot: "bg-blue-500"    },
  SOLD:      { label: "Verkauft",   bg: "bg-amber-50",    text: "text-amber-700",   dot: "bg-amber-500"   },
  COLLECTED: { label: "Abgefahren", bg: "bg-emerald-50",  text: "text-emerald-700", dot: "bg-emerald-500" },
};
const STATUS_ORDER: PolterStatus[] = ["PILED", "MEASURED", "SOLD", "COLLECTED"];

const WOOD_TYPE_LABELS: Record<WoodType, string> = {
  LOG: "Stammholz", INDUSTRIAL: "Industrieholz", ENERGY: "Energieholz", PULP: "Papierholz",
};
const WOOD_TYPE_SHORT: Record<WoodType, string> = {
  LOG: "Stammh.", INDUSTRIAL: "Industrie", ENERGY: "Energie", PULP: "Papier",
};

type Mode = "CHOOSE" | "FROM_MAP" | "MANUAL";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  logPiles: any[];
  operationId: string;
  forestId: string;
  logPilePois: any[];
  orgSlug: string;
}

// ─── Edit Dialog ──────────────────────────────────────────────────────────────

function EditLogPileDialog({ pile, orgSlug, onClose }: { pile: any; orgSlug: string; onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  const [name,        setName]        = useState(pile.name ?? "");
  const [species,     setSpecies]     = useState(pile.treeSpecies ?? "");
  const [woodType,    setWoodType]    = useState<WoodType>(pile.woodType ?? "LOG");
  const [quality,     setQuality]     = useState(pile.qualityClass ?? "");
  const [estimated,   setEstimated]   = useState(pile.estimatedAmount?.toString() ?? "");
  const [measured,    setMeasured]    = useState(pile.measuredAmount?.toString() ?? "");
  const [logLength,   setLogLength]   = useState(pile.logLength?.toString() ?? "");
  const [note,        setNote]        = useState(pile.note ?? "");

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateLogPile(orgSlug, pile.id, {
        name:            name            || undefined,
        treeSpecies:     species         || undefined,
        woodType:        woodType        || undefined,
        qualityClass:    quality         || undefined,
        estimatedAmount: estimated       ? parseFloat(estimated)  : undefined,
        measuredAmount:  measured        ? parseFloat(measured)   : undefined,
        logLength:       logLength       ? parseFloat(logLength)  : undefined,
        note:            note            || undefined,
      });
      toast.success("Polter aktualisiert");
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Zeile 1: Bezeichnung + Baumart */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-600">Bezeichnung</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="z.B. Polter A1" className="h-8 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-600">Baumart</Label>
          <select value={species} onChange={e => setSpecies(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-md px-2 py-1.5 bg-white h-8">
            <option value="">— wählen —</option>
            {TREE_SPECIES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {/* Zeile 2: Holzart + Güte */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-600">Holzart / Sortiment</Label>
          <select value={woodType} onChange={e => setWoodType(e.target.value as WoodType)}
            className="w-full text-sm border border-slate-200 rounded-md px-2 py-1.5 bg-white h-8">
            {(Object.entries(WOOD_TYPE_LABELS) as [WoodType, string][]).map(([k, v]) =>
              <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-600">Güteklasse</Label>
          <select value={quality} onChange={e => setQuality(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-md px-2 py-1.5 bg-white h-8">
            <option value="">—</option>
            {["A","B","C","D","IL","E"].map(q => <option key={q} value={q}>{q}</option>)}
          </select>
        </div>
      </div>

      {/* Zeile 3: Mengen */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-600 flex items-center gap-1">
            <Scale size={10} /> Geschätzt (fm)
          </Label>
          <Input type="number" step="0.1" value={estimated} onChange={e => setEstimated(e.target.value)}
            placeholder="0.0" className="h-8 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-600 flex items-center gap-1">
            <Check size={10} className="text-blue-500" /> Vermessen (fm)
          </Label>
          <Input type="number" step="0.1" value={measured} onChange={e => setMeasured(e.target.value)}
            placeholder="0.0" className="h-8 text-sm font-medium" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-600 flex items-center gap-1">
            <Ruler size={10} /> Länge (m)
          </Label>
          <Input type="number" step="0.1" value={logLength} onChange={e => setLogLength(e.target.value)}
            placeholder="5.0" className="h-8 text-sm" />
        </div>
      </div>

      {/* Notiz */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-slate-600">Notiz / Besonderheiten</Label>
        <Input value={note} onChange={e => setNote(e.target.value)}
          placeholder="z.B. Käferholz, Abrücktransport geplant ..." className="h-8 text-sm" />
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>Abbrechen</Button>
        <Button size="sm" onClick={handleSave} disabled={saving} className="bg-amber-600 hover:bg-amber-700 text-white">
          {saving && <Loader2 size={13} className="animate-spin mr-1" />} Speichern
        </Button>
      </div>
    </div>
  );
}

// ─── New Pile Dialog ──────────────────────────────────────────────────────────

function NewLogPileDialog({ operationId, forestId, logPilePois, orgSlug }: {
  operationId: string; forestId: string; logPilePois: any[]; orgSlug: string;
}) {
  const [open, setOpen]     = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode]     = useState<Mode>("CHOOSE");

  // FROM_MAP state
  const [selectedPoiId, setSelectedPoiId] = useState("");
  const [species,     setSpecies]     = useState("");
  const [woodType,    setWoodType]    = useState<WoodType>("LOG");
  const [quality,     setQuality]     = useState("B");
  const [amount,      setAmount]      = useState("");
  const [logLength,   setLogLength]   = useState("");
  const [note,        setNote]        = useState("");

  // MANUAL state
  const [name,      setName]      = useState("");
  const [lat,       setLat]       = useState("");
  const [lng,       setLng]       = useState("");
  const [mSpecies,  setMSpecies]  = useState("");
  const [mWoodType, setMWoodType] = useState<WoodType>("LOG");
  const [mQuality,  setMQuality]  = useState("B");
  const [mAmount,   setMAmount]   = useState("");
  const [mLength,   setMLength]   = useState("");
  const [mNote,     setMNote]     = useState("");

  const availablePois    = logPilePois;
  const alreadyLinkedIds = new Set(logPilePois.filter(p => p.operationLogPiles.length > 0).map((p: any) => p.id));
  const selectedPoi      = logPilePois.find((p: any) => p.id === selectedPoiId);

  const reset = () => {
    setMode("CHOOSE");
    setSelectedPoiId(""); setSpecies(""); setAmount(""); setLogLength(""); setNote("");
    setName(""); setLat(""); setLng(""); setMSpecies(""); setMAmount(""); setMLength(""); setMNote("");
  };

  const handleClose = (v: boolean) => { if (!v) reset(); setOpen(v); };

  const handlePoiSelect = (id: string) => {
    setSelectedPoiId(id);
    const poi = logPilePois.find((p: any) => p.id === id);
    if (poi?.logPile) {
      if (poi.logPile.treeSpecies)  setSpecies(poi.logPile.treeSpecies);
      if (poi.logPile.woodType)     setWoodType(poi.logPile.woodType as WoodType);
      if (poi.logPile.qualityClass) setQuality(poi.logPile.qualityClass);
      if (poi.logPile.volumeFm)     setAmount(poi.logPile.volumeFm.toString());
      if (poi.logPile.logLength)    setLogLength(poi.logPile.logLength.toString());
    }
  };

  const handleFromMap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPoiId) { toast.error("Bitte einen Polter wählen"); return; }
    setSaving(true);
    try {
      await createLogPile(orgSlug, {
        operationId, forestPoiId: selectedPoiId,
        name: selectedPoi?.name ?? undefined,
        treeSpecies: species || undefined, woodType,
        qualityClass: quality || undefined,
        estimatedAmount: amount    ? parseFloat(amount)    : undefined,
        logLength:       logLength ? parseFloat(logLength) : undefined,
        note: note || undefined,
      });
      await upsertPoiLogPile(selectedPoiId, {
        volumeFm:    amount    ? parseFloat(amount)    : null,
        logLength:   logLength ? parseFloat(logLength) : null,
        treeSpecies: species   || null, woodType, qualityClass: quality || null,
        notes: note || undefined,
      }, orgSlug);
      toast.success("Polter verknüpft");
      handleClose(false);
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const handleManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lat || !lng) { toast.error("GPS-Koordinaten erforderlich"); return; }
    setSaving(true);
    try {
      await createLogPile(orgSlug, {
        operationId, name: name || undefined,
        lat: parseFloat(lat), lng: parseFloat(lng),
        treeSpecies: mSpecies || undefined, woodType: mWoodType,
        qualityClass: mQuality || undefined,
        estimatedAmount: mAmount ? parseFloat(mAmount) : undefined,
        logLength:       mLength ? parseFloat(mLength) : undefined,
        note: mNote || undefined,
      });
      toast.success("Polter angelegt");
      handleClose(false);
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const handleGps = () => {
    navigator.geolocation?.getCurrentPosition(
      pos => { setLat(pos.coords.latitude.toFixed(6)); setLng(pos.coords.longitude.toFixed(6)); },
      () => toast.error("GPS nicht verfügbar")
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 border-dashed border-slate-300 text-slate-600 hover:border-amber-400 hover:text-amber-700">
          <Plus size={12} /> Polter erfassen
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Polter erfassen</DialogTitle></DialogHeader>

        {mode === "CHOOSE" && (
          <div className="space-y-2.5 mt-2">
            <button onClick={() => setMode("FROM_MAP")}
              className="w-full flex items-start gap-3 p-4 rounded-xl border-2 border-slate-200 hover:border-amber-400 hover:bg-amber-50/40 transition-all text-left group">
              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 group-hover:bg-amber-200">
                <MapPin size={18} className="text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Aus Karte wählen</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {availablePois.length > 0 ? `${availablePois.length} Polter-Marker verfügbar` : "Bestehende Polter verknüpfen"}
                </p>
              </div>
            </button>

            <a href={`/dashboard/org/${orgSlug}/map`}
              className="w-full flex items-start gap-3 p-4 rounded-xl border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition-all text-left group">
              <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 group-hover:bg-blue-200">
                <ExternalLink size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Neu auf Karte einzeichnen</p>
                <p className="text-xs text-slate-500 mt-0.5">Zur Karte wechseln, Polter-Marker setzen, dann hier verknüpfen</p>
              </div>
            </a>

            <button onClick={() => setMode("MANUAL")}
              className="w-full flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all text-left">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <Trees size={18} className="text-slate-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">GPS / Koordinaten manuell</p>
                <p className="text-xs text-slate-400 mt-0.5">Koordinaten per GPS-Button oder Eingabe</p>
              </div>
            </button>
          </div>
        )}

        {mode === "FROM_MAP" && (
          <form onSubmit={handleFromMap} className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Polter auswählen *</Label>
              {availablePois.length === 0 ? (
                <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3 border border-slate-200">
                  Noch keine Polter-Marker.{" "}
                  <a href={`/dashboard/org/${orgSlug}/map`} className="text-blue-600 hover:underline">Auf Karte anlegen →</a>
                </div>
              ) : (
                <div className="space-y-1 max-h-44 overflow-y-auto border border-slate-200 rounded-lg p-2">
                  {availablePois.map((p: any) => {
                    const linked = alreadyLinkedIds.has(p.id);
                    return (
                      <label key={p.id} className={`flex items-center gap-2.5 py-1.5 px-2 rounded-md cursor-pointer transition-colors ${
                        selectedPoiId === p.id ? "bg-amber-50 border border-amber-200" : linked ? "opacity-40 cursor-default" : "hover:bg-slate-50"
                      }`}>
                        <input type="radio" name="poi" value={p.id} checked={selectedPoiId === p.id}
                          onChange={() => !linked && handlePoiSelect(p.id)} disabled={linked} className="accent-amber-600" />
                        <MapPin size={11} className="text-amber-500 shrink-0" />
                        <span className="text-xs text-slate-700 font-medium flex-1 truncate">{p.name ?? "Unbenannter Polter"}</span>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">{p.lat?.toFixed(4)}, {p.lng?.toFixed(4)}</span>
                        {p.logPile?.volumeFm && <span className="text-[10px] font-mono text-slate-500 shrink-0">{p.logPile.volumeFm} fm</span>}
                        {linked && <span className="text-[10px] text-slate-400 italic shrink-0">zugewiesen</span>}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedPoiId && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1"><Label className="text-xs">Holzart</Label>
                  <select value={woodType} onChange={e => setWoodType(e.target.value as WoodType)}
                    className="w-full text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white h-8">
                    {(Object.entries(WOOD_TYPE_LABELS) as [WoodType, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="space-y-1"><Label className="text-xs">Baumart</Label>
                  <select value={species} onChange={e => setSpecies(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white h-8">
                    <option value="">— wählen —</option>
                    {TREE_SPECIES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1"><Label className="text-xs">Menge gesch. (fm)</Label>
                  <Input type="number" step="0.1" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.0" className="h-8 text-xs" />
                </div>
                <div className="space-y-1"><Label className="text-xs">Stammlänge (m)</Label>
                  <Input type="number" step="0.1" value={logLength} onChange={e => setLogLength(e.target.value)} placeholder="5.0" className="h-8 text-xs" />
                </div>
                <div className="space-y-1"><Label className="text-xs">Güteklasse</Label>
                  <select value={quality} onChange={e => setQuality(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white h-8">
                    {["A","B","C","D","IL","E"].map(q => <option key={q} value={q}>{q}</option>)}
                  </select>
                </div>
                <div className="space-y-1"><Label className="text-xs">Notiz</Label>
                  <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Hinweise..." className="h-8 text-xs" />
                </div>
              </div>
            )}

            <div className="flex justify-between pt-2 border-t border-slate-100">
              <Button type="button" variant="ghost" size="sm" onClick={() => setMode("CHOOSE")}>← Zurück</Button>
              <Button type="submit" size="sm" disabled={saving || !selectedPoiId} className="bg-amber-600 hover:bg-amber-700 text-white">
                {saving && <Loader2 size={13} className="animate-spin mr-1" />} Verknüpfen
              </Button>
            </div>
          </form>
        )}

        {mode === "MANUAL" && (
          <form onSubmit={handleManual} className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Bezeichnung</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="z.B. A1" className="h-8 text-xs" />
              </div>
              <div className="space-y-1"><Label className="text-xs">Baumart</Label>
                <select value={mSpecies} onChange={e => setMSpecies(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white h-8">
                  <option value="">— wählen —</option>
                  {TREE_SPECIES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              <div className="space-y-1"><Label className="text-xs">Holzart</Label>
                <select value={mWoodType} onChange={e => setMWoodType(e.target.value as WoodType)}
                  className="w-full text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white h-8">
                  {(Object.entries(WOOD_TYPE_LABELS) as [WoodType, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="space-y-1"><Label className="text-xs">Güteklasse</Label>
                <select value={mQuality} onChange={e => setMQuality(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white h-8">
                  {["A","B","C","D","IL","E"].map(q => <option key={q} value={q}>{q}</option>)}
                </select>
              </div>
              <div className="space-y-1"><Label className="text-xs">Menge gesch. (fm)</Label>
                <Input type="number" step="0.1" value={mAmount} onChange={e => setMAmount(e.target.value)} placeholder="0.0" className="h-8 text-xs" />
              </div>
              <div className="space-y-1"><Label className="text-xs">Stammlänge (m)</Label>
                <Input type="number" step="0.1" value={mLength} onChange={e => setMLength(e.target.value)} placeholder="5.0" className="h-8 text-xs" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center justify-between">
                GPS-Position *
                <button type="button" onClick={handleGps} className="text-[10px] text-blue-600 hover:text-blue-800 flex items-center gap-0.5">
                  <MapPin size={10} /> Aktuellen Standort
                </button>
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Input value={lat} onChange={e => setLat(e.target.value)} placeholder="Breitengrad" className="h-8 text-xs" />
                <Input value={lng} onChange={e => setLng(e.target.value)} placeholder="Längengrad" className="h-8 text-xs" />
              </div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Notiz</Label>
              <Input value={mNote} onChange={e => setMNote(e.target.value)} placeholder="Hinweise..." className="h-8 text-xs" />
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-100">
              <Button type="button" variant="ghost" size="sm" onClick={() => setMode("CHOOSE")}>← Zurück</Button>
              <Button type="submit" size="sm" disabled={saving} className="bg-amber-600 hover:bg-amber-700 text-white">
                {saving && <Loader2 size={13} className="animate-spin mr-1" />} Speichern
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Section ─────────────────────────────────────────────────────────────

export function LogPileSection({ logPiles, operationId, forestId, logPilePois, orgSlug }: Props) {
  const [deleting,  setDeleting]  = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const totalEst      = logPiles.reduce((s: number, p: any) => s + (p.estimatedAmount ?? 0), 0);
  const totalMeasured = logPiles.reduce((s: number, p: any) => s + (p.measuredAmount ?? 0), 0);
  const totalFm       = logPiles.reduce((s: number, p: any) => s + (p.measuredAmount ?? p.estimatedAmount ?? 0), 0);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Polter "${name}" wirklich löschen?`)) return;
    setDeleting(id);
    try {
      await deleteLogPile(orgSlug, id);
      toast.success("Polter gelöscht");
    } catch (e: any) { toast.error(e.message); } finally { setDeleting(null); }
  };

  const handleStatusChange = async (id: string, status: PolterStatus) => {
    setUpdatingStatus(id);
    try {
      await updateLogPile(orgSlug, id, { status });
    } catch (e: any) { toast.error(e.message); } finally { setUpdatingStatus(null); }
  };

  return (
    <div className="px-4 py-3 space-y-3">
      {/* Kopfzeile */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Boxes size={14} className="text-amber-500" />
          <span className="text-xs font-semibold text-slate-700">Polterinventar</span>
          {logPiles.length > 0 && (
            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
              {logPiles.length} Polter
            </span>
          )}
          {totalFm > 0 && (
            <span className="text-[10px] font-mono font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full">
              {totalFm.toFixed(1)} fm
            </span>
          )}
          {totalMeasured > 0 && totalMeasured !== totalFm && (
            <span className="text-[10px] text-blue-600 font-mono bg-blue-50 px-1.5 py-0.5 rounded-full">
              {totalMeasured.toFixed(1)} fm vermessen
            </span>
          )}
        </div>
        <NewLogPileDialog operationId={operationId} forestId={forestId} logPilePois={logPilePois} orgSlug={orgSlug} />
      </div>

      {/* Tabelle */}
      {logPiles.length === 0 ? (
        <p className="text-xs text-slate-400 italic py-2 text-center">Noch keine Polter erfasst.</p>
      ) : (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          {/* Tabellen-Header */}
          <div className="grid grid-cols-[2fr_1.5fr_1fr_1.2fr_1.2fr_1fr_1.5fr_auto] gap-0 bg-slate-50 border-b border-slate-200 px-3 py-1.5">
            {["Bezeichnung", "Baumart", "Güte", "Gesch. fm", "Verif. fm", "Länge", "Status", ""].map((h, i) => (
              <span key={i} className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{h}</span>
            ))}
          </div>

          {/* Zeilen */}
          {logPiles.map((pile: any) => {
            const cfg    = STATUS_CFG[pile.status as PolterStatus] ?? STATUS_CFG.PILED;
            const isEdit = editingId === pile.id;
            const species = TREE_SPECIES.find(s => s.id === pile.treeSpecies);

            return (
              <div key={pile.id}>
                {/* Hauptzeile */}
                <div className={`grid grid-cols-[2fr_1.5fr_1fr_1.2fr_1.2fr_1fr_1.5fr_auto] gap-0 px-3 py-2 text-xs border-b border-slate-100 hover:bg-slate-50/60 transition-colors items-center ${isEdit ? "bg-amber-50/30" : ""}`}>
                  {/* Bezeichnung */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    {pile.forestPoiId && <MapPin size={9} className="text-amber-400 shrink-0" />}
                    <span className="font-medium text-slate-800 truncate">{pile.name ?? "Polter"}</span>
                    {pile.timberSale && (
                      <span className="text-[9px] text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded shrink-0 truncate max-w-[60px]">
                        {pile.timberSale.buyerName}
                      </span>
                    )}
                  </div>

                  {/* Baumart + Holzart */}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-slate-700">{species?.label ?? pile.treeSpecies ?? "—"}</span>
                    {pile.woodType && <span className="text-[9px] text-slate-400">{WOOD_TYPE_SHORT[pile.woodType as WoodType] ?? pile.woodType}</span>}
                  </div>

                  {/* Güte */}
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded font-bold text-xs ${
                    pile.qualityClass === "A" ? "bg-green-100 text-green-700"
                    : pile.qualityClass === "B" ? "bg-blue-100 text-blue-700"
                    : pile.qualityClass === "C" ? "bg-amber-100 text-amber-700"
                    : pile.qualityClass === "D" ? "bg-orange-100 text-orange-700"
                    : pile.qualityClass ? "bg-slate-100 text-slate-600" : "text-slate-300"
                  }`}>
                    {pile.qualityClass || "—"}
                  </span>

                  {/* Geschätzt fm */}
                  <span className={`font-mono ${pile.estimatedAmount ? "text-slate-600" : "text-slate-300"}`}>
                    {pile.estimatedAmount ? `${pile.estimatedAmount.toFixed(1)}` : "—"}
                  </span>

                  {/* Vermessen fm */}
                  <span className={`font-mono font-semibold ${pile.measuredAmount ? "text-blue-700" : "text-slate-300"}`}>
                    {pile.measuredAmount ? `${pile.measuredAmount.toFixed(1)}` : "—"}
                  </span>

                  {/* Länge */}
                  <span className={`font-mono ${pile.logLength ? "text-slate-600" : "text-slate-300"}`}>
                    {pile.logLength ? `${pile.logLength}m` : "—"}
                  </span>

                  {/* Status Dropdown */}
                  <div className="relative">
                    <select
                      value={pile.status}
                      onChange={e => handleStatusChange(pile.id, e.target.value as PolterStatus)}
                      disabled={updatingStatus === pile.id}
                      className={`text-[10px] pl-1.5 pr-4 py-1 rounded-full border-0 font-medium appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-400 ${cfg.bg} ${cfg.text}`}
                    >
                      {STATUS_ORDER.map(s => (
                        <option key={s} value={s}>{STATUS_CFG[s].label}</option>
                      ))}
                    </select>
                    {updatingStatus === pile.id
                      ? <Loader2 size={8} className="absolute right-1 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />
                      : <ChevronDown size={8} className={`absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none ${cfg.text}`} />
                    }
                  </div>

                  {/* Aktionen */}
                  <div className="flex items-center gap-1 justify-end pl-2">
                    <button
                      onClick={() => setEditingId(isEdit ? null : pile.id)}
                      className={`p-1 rounded transition-colors ${isEdit ? "text-amber-600 bg-amber-100" : "text-slate-400 hover:text-amber-600 hover:bg-amber-50"}`}
                      title="Bearbeiten"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      onClick={() => handleDelete(pile.id, pile.name ?? "Polter")}
                      disabled={deleting === pile.id}
                      className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Löschen"
                    >
                      {deleting === pile.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                    </button>
                  </div>
                </div>

                {/* Edit-Panel (inline aufklappbar) */}
                {isEdit && (
                  <div className="px-4 py-3 bg-amber-50/40 border-b border-amber-100">
                    <EditLogPileDialog pile={pile} orgSlug={orgSlug} onClose={() => setEditingId(null)} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
