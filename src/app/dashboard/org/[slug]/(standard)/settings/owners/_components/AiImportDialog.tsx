"use client";

import { useState, useTransition, useRef } from "react";
import { extractOwnersFromFile, type ExtractedOwner } from "@/actions/ai-import";
import { createForestOwner } from "@/actions/forest-owners";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Sparkles, Loader2, Check, Mail, Phone, MapPin,
  UploadCloud, FileText, FileSpreadsheet, Image, X,
} from "lucide-react";

type Owner = ExtractedOwner & { _selected: boolean };

const ACCEPTED = ".csv,.xlsx,.xls,.pdf,.jpg,.jpeg,.png,.webp";

function FileIcon({ name }: { name: string }) {
  if (name.match(/\.(jpg|jpeg|png|webp)$/i)) return <Image className="w-8 h-8 text-blue-400" />;
  if (name.match(/\.(xlsx|xls)$/i)) return <FileSpreadsheet className="w-8 h-8 text-green-600" />;
  return <FileText className="w-8 h-8 text-slate-400" />;
}

export function AiImportDialog({
  organizationId,
  onImported,
}: {
  organizationId: string;
  onImported: (owners: any[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"upload" | "preview">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [candidates, setCandidates] = useState<Owner[]>([]);
  const [isExtracting, startExtract] = useTransition();
  const [isSaving, startSave] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleOpen() {
    setStep("upload");
    setFile(null);
    setCandidates([]);
    setOpen(false);
    // small timeout so dialog state resets before reopening
    setTimeout(() => setOpen(true), 10);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }

  function handleExtract() {
    if (!file) return;
    startExtract(async () => {
      try {
        const fd = new FormData();
        fd.append("file", file);
        const result = await extractOwnersFromFile(fd);
        if (result.length === 0) {
          toast.warning("Keine Waldbesitzer erkannt");
          return;
        }
        setCandidates(result.map((o) => ({ ...o, _selected: true })));
        setStep("preview");
      } catch (err: any) {
        toast.error(err.message || "Extraktion fehlgeschlagen");
      }
    });
  }

  function handleImport() {
    const selected = candidates.filter((c) => c._selected);
    if (selected.length === 0) { toast.warning("Keine Einträge ausgewählt"); return; }
    startSave(async () => {
      const created: any[] = [];
      let failed = 0;
      for (const c of selected) {
        try {
          const { _selected, ...data } = c;
          const owner = await createForestOwner(organizationId, data);
          created.push({ ...owner, forests: [] });
        } catch { failed++; }
      }
      onImported(created);
      toast.success(`${created.length} Waldbesitzer importiert${failed > 0 ? `, ${failed} fehlgeschlagen` : ""}`);
      setOpen(false);
    });
  }

  function toggle(idx: number) {
    setCandidates((prev) => prev.map((c, i) => i === idx ? { ...c, _selected: !c._selected } : c));
  }

  function updateField(idx: number, field: keyof ExtractedOwner, value: string) {
    setCandidates((prev) => prev.map((c, i) => i === idx ? { ...c, [field]: value || undefined } : c));
  }

  const selectedCount = candidates.filter((c) => c._selected).length;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 shrink-0"
        onClick={handleOpen}
        title="Waldbesitzer per KI aus Datei importieren"
      >
        <Sparkles className="w-4 h-4 text-violet-500" /> KI-Import
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-500" />
              KI-Import: Waldbesitzer aus Datei
            </DialogTitle>
          </DialogHeader>

          {/* ── SCHRITT 1: Upload ── */}
          {step === "upload" && (
            <>
              <div className="flex-1 space-y-4 overflow-y-auto py-2">
                {/* Dropzone */}
                <div
                  onClick={() => inputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors ${
                    isDragging
                      ? "border-violet-400 bg-violet-50"
                      : file
                      ? "border-green-400 bg-green-50"
                      : "border-slate-200 hover:border-slate-300 bg-slate-50"
                  }`}
                >
                  {file ? (
                    <>
                      <FileIcon name={file.name} />
                      <p className="font-medium text-sm text-slate-800">{file.name}</p>
                      <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(0)} KB</p>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                        className="absolute top-3 right-3 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <UploadCloud className={`w-10 h-10 ${isDragging ? "text-violet-400" : "text-slate-300"}`} />
                      <div className="text-center">
                        <p className="text-sm font-medium text-slate-700">Datei hier ablegen oder klicken</p>
                        <p className="text-xs text-slate-400 mt-1">CSV, Excel, PDF, JPG, PNG — bis 10 MB</p>
                      </div>
                    </>
                  )}
                </div>

                <input
                  ref={inputRef}
                  type="file"
                  accept={ACCEPTED}
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); e.target.value = ""; }}
                />

                {/* Format-Hinweise */}
                <div className="grid grid-cols-3 gap-2 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg px-3 py-2">
                    <FileSpreadsheet className="w-4 h-4 text-green-600 shrink-0" />
                    <span>CSV / Excel — beliebige Spaltenstruktur</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg px-3 py-2">
                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>PDF — Mitgliederlisten, Schreiben</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg px-3 py-2">
                    <Image className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>Foto — handgeschriebene Listen</span>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Abbrechen</Button>
                <Button
                  onClick={handleExtract}
                  disabled={!file || isExtracting}
                  className="gap-2"
                >
                  {isExtracting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> KI analysiert…</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Analysieren</>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}

          {/* ── SCHRITT 2: Vorschau ── */}
          {step === "preview" && (
            <>
              <div className="flex-1 overflow-y-auto space-y-2 py-2">
                <p className="text-sm text-slate-500">
                  {candidates.length} Einträge erkannt. Prüfen, ggf. bearbeiten und unerwünschte Einträge abwählen.
                </p>
                {candidates.map((c, idx) => (
                  <div
                    key={idx}
                    className={`border rounded-lg p-3 space-y-2 transition-colors ${
                      c._selected ? "border-green-200 bg-green-50/50" : "border-slate-200 bg-slate-50 opacity-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggle(idx)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                          c._selected ? "bg-green-600 border-green-600" : "border-slate-300"
                        }`}
                      >
                        {c._selected && <Check className="w-3 h-3 text-white" />}
                      </button>
                      <input
                        className="font-medium text-sm bg-transparent border-b border-transparent hover:border-slate-300 focus:border-green-500 focus:outline-none px-0.5 flex-1"
                        value={c.name}
                        onChange={(e) => updateField(idx, "name", e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 pl-7">
                      {(["email", "phone", "street", "zip", "city", "notes"] as const).map((field) => {
                        const value = c[field] ?? "";
                        if (!value) return null;
                        const icon = field === "email" ? <Mail className="w-3 h-3 shrink-0" />
                          : field === "phone" ? <Phone className="w-3 h-3 shrink-0" />
                          : <MapPin className="w-3 h-3 shrink-0" />;
                        return (
                          <div key={field} className="flex items-center gap-1.5 text-xs text-slate-500">
                            {icon}
                            <input
                              className="flex-1 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-green-500 focus:outline-none px-0.5 text-slate-700"
                              placeholder={field}
                              value={value}
                              onChange={(e) => updateField(idx, field, e.target.value)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <DialogFooter className="gap-2">
                <Button variant="ghost" onClick={() => setStep("upload")}>Zurück</Button>
                <Button variant="ghost" onClick={() => setOpen(false)}>Abbrechen</Button>
                <Button onClick={handleImport} disabled={selectedCount === 0 || isSaving} className="gap-2">
                  {isSaving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Importiere…</>
                  ) : (
                    <><Check className="w-4 h-4" /> {selectedCount} importieren</>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
