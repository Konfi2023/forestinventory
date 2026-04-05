"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone"; // <--- Die Magie
import { Button } from "@/components/ui/button";
import { Paperclip, Loader2, FileText, Trash2, Download, File as FileIcon, UploadCloud } from "lucide-react";
import { uploadTaskImage, uploadTaskDocument, deleteTaskImage, deleteTaskDocument } from "@/actions/files";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface Props {
  orgSlug: string;
  taskId: string;
  images: any[];
  documents: any[];
  onUpdate: () => void;
}

export function AttachmentsSection({ orgSlug, taskId, images, documents, onUpdate }: Props) {
  const t = useTranslations("Tasks");
  const [uploadingCount, setUploadingCount] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'image' | 'document' } | null>(null);

  // --- DROP HANDLER ---
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploadingCount(prev => prev + acceptedFiles.length);
    let successCount = 0;

    for (const file of acceptedFiles) {
        try {
            if (file.type.startsWith("image/")) {
                // Upload via API Route (kein Server Action Body-Limit)
                const fd = new FormData();
                fd.append("file", file);
                const res = await fetch(`/api/app/tasks/${taskId}/image`, { method: 'POST', body: fd });
                if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || t('uploadFailed')); }
                successCount++;
            } else {
                const formData = new FormData();
                formData.append("file", file);
                await uploadTaskDocument(orgSlug, taskId, formData);
                successCount++;
            }
        } catch (e: any) {
            console.error("Upload error:", e);
            toast.error(t("errorFile", { name: file.name, message: e?.message || t("errorUnknown") }));
        } finally {
            setUploadingCount(prev => prev - 1);
        }
    }

    if (successCount > 0) {
        toast.success(successCount > 1 ? t("filesUploadedPlural", { count: successCount }) : t("filesUploaded", { count: successCount }));
        onUpdate();
    }
  }, [orgSlug, taskId, onUpdate]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  // --- DELETE HANDLER ---
  const handleDelete = async (id: string, type: 'image' | 'document') => {
    try {
        if(type === 'image') await deleteTaskImage(orgSlug, id);
        else await deleteTaskDocument(orgSlug, id);
        
        toast.success(t("deleted"));
        onUpdate();
    } catch(e) {
        toast.error(t("errorDeletingFile"));
    }
  };

  // Wir kombinieren beide Listen für die Anzeige (optional: sortieren nach Datum)
  // Hier zeigen wir erst Bilder, dann Dokumente.
  const hasFiles = images.length > 0 || documents.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
        <Paperclip size={16} />
        {t("attachmentsAndFiles")}
      </div>

      {/* 1. DATEI GRID (Wenn Dateien da sind) */}
      {hasFiles && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            
            {/* Bilder rendern */}
            {images.map((img) => (
                <div key={img.id} className="relative group aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={img.url}
                        alt={img.name}
                        className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    {/* Hover Actions */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <a href={img.url} target="_blank" rel="noopener noreferrer">
                            <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full opacity-80 hover:opacity-100"><Download size={14}/></Button>
                        </a>
                        <Button 
                            size="icon" variant="destructive" className="h-8 w-8 rounded-full opacity-80 hover:opacity-100"
                            onClick={() => setDeleteTarget({ id: img.id, type: 'image' })}
                        >
                            <Trash2 size={14} />
                        </Button>
                    </div>
                </div>
            ))}

            {/* Dokumente rendern */}
            {documents.map((doc) => (
                <div key={doc.id} className="relative group aspect-square bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col items-center justify-center p-2 text-center hover:border-blue-300 transition-colors">
                    <div className="bg-orange-50 p-3 rounded-full mb-2 group-hover:scale-110 transition-transform">
                        <FileText className="text-orange-500 w-6 h-6" />
                    </div>
                    <span className="text-[10px] text-slate-600 font-medium line-clamp-2 break-all w-full leading-tight">
                        {doc.name}
                    </span>
                    
                    {/* Hover Actions */}
                    <div className="absolute inset-0 bg-white/90 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[1px]">
                        <a href={doc.url} target="_blank" rel="noopener noreferrer">
                            <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full border shadow-sm"><Download size={14}/></Button>
                        </a>
                        <Button 
                            size="icon" variant="ghost" className="h-8 w-8 rounded-full text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => setDeleteTarget({ id: doc.id, type: 'document' })}
                        >
                            <Trash2 size={14} />
                        </Button>
                    </div>
                </div>
            ))}
          </div>
      )}

      {/* 2. DROPZONE (Immer sichtbar, entweder klein oder groß) */}
      <div 
        {...getRootProps()} 
        className={cn(
            "border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer flex flex-col items-center justify-center text-center gap-2",
            isDragActive ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50",
            !hasFiles ? "py-10" : "py-4" // Kompakter wenn schon Dateien da sind
        )}
      >
        <input {...getInputProps()} />
        
        {uploadingCount > 0 ? (
            <div className="flex flex-col items-center text-muted-foreground animate-pulse">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <span className="text-xs">{t("uploading")}</span>
            </div>
        ) : (
            <>
                <div className={cn("p-3 rounded-full bg-slate-100 text-slate-400", isDragActive && "bg-blue-100 text-blue-500")}>
                    <UploadCloud size={24} />
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-700">
                        {isDragActive ? t("dropHere") : t("clickOrDrop")}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                        {t("fileHint")}
                    </p>
                </div>
            </>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        title={t("deleteFile")}
        confirmLabel={t("deleteLabel")}
        destructive
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id, deleteTarget.type).finally(() => setDeleteTarget(null))}
      />
    </div>
  );
}