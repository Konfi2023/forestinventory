"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { createOperation } from "@/actions/operations";
import { OperationType } from "@prisma/client";

const TYPE_LABELS: Record<OperationType, string> = {
  HARVEST:     "Einschlag",
  PLANTING:    "Aufforstung",
  MAINTENANCE: "Pflegemaßnahme",
  PLANNING:    "Planung",
  MONITORING:  "Monitoring",
};

interface Props {
  forests: { id: string; name: string }[];
  orgSlug: string;
}

export function NewOperationDialog({ forests, orgSlug }: Props) {
  const [open, setOpen]     = useState(false);
  const [saving, setSaving] = useState(false);

  const [title,    setTitle]    = useState("");
  const [forestId, setForestId] = useState(forests[0]?.id ?? "");
  const [year,     setYear]     = useState(new Date().getFullYear());
  const [type,     setType]     = useState<OperationType>("HARVEST");
  const [desc,     setDesc]     = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !forestId) { toast.error("Titel und Wald sind Pflichtfelder"); return; }
    setSaving(true);
    try {
      const res = await createOperation(orgSlug, { forestId, title, year, type, description: desc || undefined });
      if (!res.success) throw new Error("Fehler");
      toast.success("Maßnahme angelegt");
      setOpen(false);
      setTitle(""); setDesc("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white gap-1">
          <Plus size={15} /> Neue Maßnahme
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Neue Maßnahme anlegen</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Titel *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="z.B. Wintereinschlag Abteilung Nord" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Wald *</Label>
              <select value={forestId} onChange={e => setForestId(e.target.value)}
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm bg-white">
                {forests.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Jahr</Label>
              <Input type="number" value={year} onChange={e => setYear(parseInt(e.target.value))}
                min={2000} max={2100} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Typ</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.entries(TYPE_LABELS) as [OperationType, string][]).map(([val, lbl]) => (
                <button key={val} type="button" onClick={() => setType(val)}
                  className={`text-xs px-2 py-1.5 rounded-lg border transition-colors ${
                    type === val ? "border-amber-500 bg-amber-50 text-amber-700 font-medium" : "border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Beschreibung (optional)</Label>
            <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Kurzbeschreibung der Maßnahme" />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Abbrechen</Button>
            <Button type="submit" size="sm" disabled={saving} className="bg-amber-600 hover:bg-amber-700 text-white">
              {saving && <Loader2 size={14} className="animate-spin mr-1" />} Anlegen
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
