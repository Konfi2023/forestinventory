"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteDocument } from "@/actions/reports";
import {
  FileText, Receipt, Download, Trash2, Filter, Search,
  Calendar, ChevronDown,
} from "lucide-react";

type DocumentType = "INVOICE" | "ACTIVITY_REPORT" | "COMBINED" | "OTHER";

type Document = {
  id: string;
  type: DocumentType;
  title: string;
  storageKey: string;
  fileSize: number | null;
  periodFrom: string | null;
  periodTo: string | null;
  sentAt: string | null;
  sentTo: string | null;
  createdAt: string;
  forestOwner: { id: string; name: string } | null;
};

type ForestOwner = { id: string; name: string };

interface Props {
  orgId: string;
  documents: Document[];
  forestOwners: ForestOwner[];
}

const TYPE_LABELS: Record<DocumentType, string> = {
  INVOICE:         "Rechnung",
  ACTIVITY_REPORT: "Tätigkeitsnachweis",
  COMBINED:        "Kombiniert",
  OTHER:           "Sonstiges",
};

const TYPE_ICONS: Record<DocumentType, React.ReactNode> = {
  INVOICE:         <Receipt size={15} className="text-blue-600" />,
  ACTIVITY_REPORT: <FileText size={15} className="text-green-600" />,
  COMBINED:        <FileText size={15} className="text-purple-600" />,
  OTHER:           <FileText size={15} className="text-slate-400" />,
};

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function DownloadButton({ storageKey, title }: { storageKey: string; title: string }) {
  // Check if local (no S3) — key is relative path under /uploads
  const isLocal = !storageKey.startsWith("http");
  const href = isLocal ? `/uploads/${storageKey}` : storageKey;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      download={title}
      className="p-1.5 text-slate-400 hover:text-green-700 hover:bg-green-50 rounded-lg transition"
      title="Herunterladen"
    >
      <Download size={15} />
    </a>
  );
}

export function DocumentArchive({ orgId, documents: initialDocs, forestOwners }: Props) {
  const [docs, setDocs]               = useState(initialDocs);
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter]   = useState<string>("all");
  const [search, setSearch]           = useState("");
  const [isPending, startTransition]  = useTransition();
  const [deletingId, setDeletingId]   = useState<string | null>(null);

  const filtered = docs.filter((d) => {
    if (ownerFilter !== "all" && d.forestOwner?.id !== ownerFilter) return false;
    if (typeFilter !== "all" && d.type !== typeFilter) return false;
    if (search && !d.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function handleDelete(docId: string) {
    if (!confirm("Dokument aus dem Archiv löschen?")) return;
    setDeletingId(docId);
    startTransition(async () => {
      const result = await deleteDocument(docId, orgId);
      if (result.success) {
        setDocs((prev) => prev.filter((d) => d.id !== docId));
        toast.success("Dokument gelöscht");
      } else {
        toast.error("Fehler beim Löschen");
      }
      setDeletingId(null);
    });
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-slate-800">Dokumentenarchiv</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {docs.length} Dokument{docs.length !== 1 ? "e" : ""} gespeichert
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search size={14} className="text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Suchen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-sm border-none outline-none text-slate-700 placeholder-slate-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-500"
          >
            <option value="all">Alle Waldbesitzer</option>
            {forestOwners.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-500"
          >
            <option value="all">Alle Typen</option>
            <option value="INVOICE">Rechnung</option>
            <option value="ACTIVITY_REPORT">Tätigkeitsnachweis</option>
            <option value="COMBINED">Kombiniert</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-400">
          {docs.length === 0
            ? "Noch keine Dokumente erstellt. Erstellen Sie oben Ihren ersten Bericht."
            : "Keine Dokumente entsprechen dem Filter."}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Typ</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Titel</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Waldbesitzer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Zeitraum</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Versandt</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Größe</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Erstellt</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50 transition">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {TYPE_ICONS[doc.type]}
                      <span className="text-xs text-slate-500">{TYPE_LABELS[doc.type]}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-800 text-sm leading-snug line-clamp-1">{doc.title}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    {doc.forestOwner?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                    {doc.periodFrom && doc.periodTo
                      ? `${formatDate(doc.periodFrom)} – ${formatDate(doc.periodTo)}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {doc.sentAt ? (
                      <div>
                        <span className="text-green-700 font-medium">{formatDate(doc.sentAt)}</span>
                        {doc.sentTo && (
                          <p className="text-slate-400 text-[10px] truncate max-w-[120px]">{doc.sentTo}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400">Nicht versandt</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {formatBytes(doc.fileSize)}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                    {formatDate(doc.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <DownloadButton storageKey={doc.storageKey} title={doc.title} />
                      <button
                        onClick={() => handleDelete(doc.id)}
                        disabled={deletingId === doc.id}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                        title="Löschen"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
