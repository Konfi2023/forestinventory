"use client";

import { useState } from "react";
import { Plus, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { createDds } from "@/actions/eudr";
import { HS_CODE_OPTIONS, SCIENTIFIC_NAMES } from "@/lib/eudr-helpers";
import { TREE_SPECIES } from "@/lib/tree-species";

const ACTIVITY_LABELS: Record<string, string> = {
  DOMESTIC: "Inverkehrbringen (Domestic)",
  IMPORT:   "Einfuhr (Import)",
  EXPORT:   "Ausfuhr (Export)",
};

const EU_COUNTRIES = [
  { code: "DE", label: "Deutschland" }, { code: "AT", label: "Österreich" },
  { code: "CH", label: "Schweiz" },     { code: "FR", label: "Frankreich" },
  { code: "PL", label: "Polen" },       { code: "CZ", label: "Tschechien" },
  { code: "SK", label: "Slowakei" },    { code: "HU", label: "Ungarn" },
  { code: "RO", label: "Rumänien" },    { code: "SE", label: "Schweden" },
  { code: "FI", label: "Finnland" },    { code: "OTHER", label: "Sonstiges" },
];

interface Props {
  orgSlug: string;
  defaultActivityType: string;
  forests: { id: string; name: string }[];
}

export function NewDdsDialog({ orgSlug, defaultActivityType, forests }: Props) {
  const [open, setOpen]       = useState(false);
  const [saving, setSaving]   = useState(false);

  // Formular-State
  const [activityType, setActivityType] = useState(defaultActivityType);
  const [note, setNote]                 = useState("");
  const [hsCode, setHsCode]             = useState("4403");
  const [description, setDescription]   = useState("");
  const [species, setSpecies]           = useState("");
  const [quantityM3, setQuantityM3]     = useState("");
  const [country, setCountry]           = useState("DE");
  const [forestId, setForestId]         = useState("");

  const scientificName = species ? SCIENTIFIC_NAMES[species] : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hsCode) { toast.error("Bitte HS-Code auswählen"); return; }
    setSaving(true);
    try {
      const res = await createDds(orgSlug, {
        activityType,
        internalNote: note || undefined,
        product: {
          hsCode,
          description: description || undefined,
          treeSpecies: species || undefined,
          quantityM3: quantityM3 ? parseFloat(quantityM3) : undefined,
          countryOfHarvest: country,
          forestId: forestId || undefined,
        },
      });
      if (!res.success) throw new Error("Fehler beim Erstellen");
      toast.success("DDS-Entwurf erstellt");
      setOpen(false);
      // Reset
      setNote(""); setDescription(""); setSpecies(""); setQuantityM3(""); setForestId("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus size={13} /> Neue DDS
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText size={16} className="text-emerald-600" />
            Neue Sorgfaltserklärung (DDS)
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">

          {/* Aktivitätstyp */}
          <div className="space-y-1.5">
            <Label>Aktivitätstyp</Label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(ACTIVITY_LABELS).map(([val, lbl]) => (
                <button
                  key={val} type="button"
                  onClick={() => setActivityType(val)}
                  className={`text-xs px-2 py-2 rounded-lg border transition-colors ${
                    activityType === val
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 font-medium"
                      : "border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Produkt */}
          <div className="space-y-3 bg-slate-50 rounded-lg p-3 border border-slate-200">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Produkt</p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">HS-Code *</Label>
                <select
                  value={hsCode}
                  onChange={e => setHsCode(e.target.value)}
                  required
                  className="w-full text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white"
                >
                  {HS_CODE_OPTIONS.map(opt => (
                    <option key={opt.code} value={opt.code}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Baumart</Label>
                <select
                  value={species}
                  onChange={e => setSpecies(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white"
                >
                  <option value="">— wählen —</option>
                  {TREE_SPECIES.map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {scientificName && (
              <p className="text-[10px] text-slate-500 italic">
                Wissenschaftl. Name: <strong>{scientificName}</strong>
              </p>
            )}

            <div className="space-y-1">
              <Label className="text-xs">Beschreibung (optional)</Label>
              <Input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="z.B. Fichtenstammholz B/C"
                className="text-xs h-8"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Menge (m³)</Label>
                <Input
                  type="number" min="0" step="0.1"
                  value={quantityM3}
                  onChange={e => setQuantityM3(e.target.value)}
                  placeholder="z.B. 45.5"
                  className="text-xs h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Herkunftsland</Label>
                <select
                  value={country}
                  onChange={e => setCountry(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white h-8"
                >
                  {EU_COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Wald-Verknüpfung */}
          {forests.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs">Wald (optional)</Label>
              <select
                value={forestId}
                onChange={e => setForestId(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white"
              >
                <option value="">— Wald wählen —</option>
                {forests.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Interne Notiz */}
          <div className="space-y-1">
            <Label className="text-xs">Interne Notiz (optional)</Label>
            <Input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="z.B. Wintereinschlag 2026, Abteilung Nord"
              className="text-xs h-8"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button type="submit" size="sm" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {saving ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
              Als Entwurf speichern
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
