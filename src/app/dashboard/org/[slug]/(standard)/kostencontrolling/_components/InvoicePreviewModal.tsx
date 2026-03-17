"use client";

import { useState, useEffect, useRef } from "react";
import { X, Loader2 } from "lucide-react";
import type { InvoiceLineItem } from "@/lib/pdf/types";

interface Props {
  open: boolean;
  onClose: () => void;
  orgId: string;
  forestOwnerId: string;
  from: string;
  to: string;
  invoiceNumber: string;
  lineItems: InvoiceLineItem[];
  vatRate?: number;
  vatLabel?: string;
}

export function InvoicePreviewModal({
  open, onClose, orgId, forestOwnerId, from, to, invoiceNumber, lineItems, vatRate, vatLabel,
}: Props) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const prevUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    setPdfUrl(null);

    const body = { orgId, forestOwnerId, from, to, invoiceNumber: invoiceNumber || undefined, lineItems, vatRate, vatLabel };

    fetch("/api/reports/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
        prevUrlRef.current = url;
        setPdfUrl(url);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [open, orgId, forestOwnerId, from, to, invoiceNumber, lineItems]);

  useEffect(() => {
    if (!open && prevUrlRef.current) {
      URL.revokeObjectURL(prevUrlRef.current);
      prevUrlRef.current = null;
      setPdfUrl(null);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="font-semibold text-slate-800">Rechnungsvorschau</h3>
            {invoiceNumber && (
              <p className="text-xs text-slate-400 mt-0.5">Rechnungs-Nr.: {invoiceNumber}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* PDF viewer */}
        <div className="flex-1 relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
              <div className="flex flex-col items-center gap-3 text-slate-400">
                <Loader2 size={28} className="animate-spin" />
                <p className="text-sm">PDF wird generiert…</p>
              </div>
            </div>
          )}
          {pdfUrl && (
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0"
              title="Rechnungsvorschau"
            />
          )}
        </div>
      </div>
    </div>
  );
}
