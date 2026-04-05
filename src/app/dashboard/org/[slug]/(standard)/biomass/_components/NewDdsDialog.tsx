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
import { useTranslations } from "next-intl";

const ACTIVITY_KEYS: Record<string, string> = {
  DOMESTIC: "actDomestic",
  IMPORT:   "actImport",
  EXPORT:   "actExport",
};

const EU_COUNTRY_CODES = ["DE","AT","CH","FR","PL","CZ","SK","HU","RO","SE","FI","OTHER"] as const;

const COUNTRY_KEYS: Record<string, string> = {
  DE: "countryDE", AT: "countryAT", CH: "countryCH", FR: "countryFR",
  PL: "countryPL", CZ: "countryCZ", SK: "countrySK", HU: "countryHU",
  RO: "countryRO", SE: "countrySE", FI: "countryFI", OTHER: "countryOther",
};

interface Props {
  orgSlug: string;
  defaultActivityType: string;
  forests: { id: string; name: string }[];
}

export function NewDdsDialog({ orgSlug, defaultActivityType, forests }: Props) {
  const t = useTranslations('Biomass');
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
    if (!hsCode) { toast.error(t('hsCodeRequired')); return; }
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
      if (!res.success) throw new Error(t('createError'));
      toast.success(t('ddsCreated'));
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
          <Plus size={13} /> {t('newDds')}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText size={16} className="text-emerald-600" />
            {t('newDdsTitle')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">

          {/* Aktivitätstyp */}
          <div className="space-y-1.5">
            <Label>{t('activityType')}</Label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(ACTIVITY_KEYS).map(([val, key]) => (
                <button
                  key={val} type="button"
                  onClick={() => setActivityType(val)}
                  className={`text-xs px-2 py-2 rounded-lg border transition-colors ${
                    activityType === val
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 font-medium"
                      : "border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  {t(key)}
                </button>
              ))}
            </div>
          </div>

          {/* Produkt */}
          <div className="space-y-3 bg-slate-50 rounded-lg p-3 border border-slate-200">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{t('product')}</p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{t('hsCode')}</Label>
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
                <Label className="text-xs">{t('treeSpecies')}</Label>
                <select
                  value={species}
                  onChange={e => setSpecies(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white"
                >
                  <option value="">{t('selectSpecies')}</option>
                  {TREE_SPECIES.map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {scientificName && (
              <p className="text-[10px] text-slate-500 italic">
                {t('scientificName')} <strong>{scientificName}</strong>
              </p>
            )}

            <div className="space-y-1">
              <Label className="text-xs">{t('descriptionLabel')}</Label>
              <Input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={t('descriptionPlaceholder')}
                className="text-xs h-8"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{t('quantityM3')}</Label>
                <Input
                  type="number" min="0" step="0.1"
                  value={quantityM3}
                  onChange={e => setQuantityM3(e.target.value)}
                  placeholder={t('quantityPlaceholder')}
                  className="text-xs h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('countryOfHarvest')}</Label>
                <select
                  value={country}
                  onChange={e => setCountry(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white h-8"
                >
                  {EU_COUNTRY_CODES.map(code => (
                    <option key={code} value={code}>{t(COUNTRY_KEYS[code])}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Wald-Verknüpfung */}
          {forests.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs">{t('forest')}</Label>
              <select
                value={forestId}
                onChange={e => setForestId(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white"
              >
                <option value="">{t('selectForest')}</option>
                {forests.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Interne Notiz */}
          <div className="space-y-1">
            <Label className="text-xs">{t('internalNote')}</Label>
            <Input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={t('notePlaceholder')}
              className="text-xs h-8"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" size="sm" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {saving ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
              {t('saveAsDraft')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
