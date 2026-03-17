"use client";

import { useState, useTransition } from "react";
import {
  createForestOwner,
  updateForestOwner,
  deleteForestOwner,
} from "@/actions/forest-owners";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronUp,
  User, Mail, Phone, MapPin, Trees, Search,
  Download, X,
} from "lucide-react";
import { AiImportDialog } from "./AiImportDialog";

type Forest = { id: string; name: string; areaHa: number | null };
type Owner = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  street: string | null;
  zip: string | null;
  city: string | null;
  notes: string | null;
  forests: Forest[];
};

const EMPTY_FORM = {
  name: "", email: "", phone: "", street: "", zip: "", city: "", notes: "",
};

const CSV_HEADERS = ["name", "email", "phone", "street", "zip", "city", "notes"];

function exportCsv(owners: Owner[]) {
  const rows = owners.map((o) =>
    CSV_HEADERS.map((h) => {
      const val = (o as any)[h] ?? "";
      // Escape quotes and wrap in quotes if contains comma/newline/quote
      const str = String(val).replace(/"/g, '""');
      return /[,"\n]/.test(str) ? `"${str}"` : str;
    }).join(",")
  );
  const csv = [CSV_HEADERS.join(","), ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "waldbesitzer.csv";
  a.click();
  URL.revokeObjectURL(url);
}


export function OwnersClient({
  organizationId,
  initialOwners,
}: {
  organizationId: string;
  initialOwners: Owner[];
}) {
  const [owners, setOwners] = useState<Owner[]>(initialOwners);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isPending, startTransition] = useTransition();
  const filtered = query.trim()
    ? owners.filter((o) =>
        [o.name, o.email, o.phone, o.city, o.street]
          .some((v) => v?.toLowerCase().includes(query.toLowerCase()))
      )
    : owners;

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(owner: Owner) {
    setEditingId(owner.id);
    setForm({
      name: owner.name,
      email: owner.email ?? "",
      phone: owner.phone ?? "",
      street: owner.street ?? "",
      zip: owner.zip ?? "",
      city: owner.city ?? "",
      notes: owner.notes ?? "",
    });
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = {
      name: form.name,
      email: form.email || undefined,
      phone: form.phone || undefined,
      street: form.street || undefined,
      zip: form.zip || undefined,
      city: form.city || undefined,
      notes: form.notes || undefined,
    };

    startTransition(async () => {
      try {
        if (editingId) {
          const updated = await updateForestOwner(editingId, data);
          setOwners((prev) =>
            prev.map((o) => (o.id === editingId ? { ...o, ...updated } : o))
          );
          toast.success("Waldbesitzer aktualisiert");
        } else {
          const created = await createForestOwner(organizationId, data);
          setOwners((prev) => [...prev, { ...created, forests: [] }]);
          toast.success("Waldbesitzer angelegt");
        }
        setShowForm(false);
        setEditingId(null);
      } catch (err: any) {
        toast.error(err.message || "Fehler beim Speichern");
      }
    });
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`„${name}" wirklich löschen?`)) return;
    startTransition(async () => {
      try {
        await deleteForestOwner(id);
        setOwners((prev) => prev.filter((o) => o.id !== id));
        toast.success("Waldbesitzer gelöscht");
      } catch (err: any) {
        toast.error(err.message || "Fehler beim Löschen");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Toolbar: Suche + Neu + Import + Export */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Suchen nach Name, E-Mail, Ort…"
            className="pl-8 pr-8"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {!showForm && (
          <Button size="sm" onClick={openCreate} className="gap-1.5 shrink-0">
            <Plus className="w-4 h-4" /> Hinzufügen
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 shrink-0"
          onClick={() => exportCsv(owners)}
          disabled={owners.length === 0}
          title="Alle Waldbesitzer als CSV exportieren"
        >
          <Download className="w-4 h-4" /> Export
        </Button>

        <AiImportDialog
          organizationId={organizationId}
          onImported={(newOwners) => setOwners((prev) => [...prev, ...newOwners])}
        />
      </div>

      {/* Formular direkt unter der Toolbar (oben) */}
      {showForm && !editingId && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 space-y-3"
        >
          <p className="font-medium text-sm text-slate-900">Neuer Waldbesitzer</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-slate-500 mb-1 block">Name *</label>
              <Input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Max Mustermann" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">E-Mail</label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="max@example.de" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Telefon</label>
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+49 123 456789" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Straße & Hausnummer</label>
              <Input value={form.street} onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))} placeholder="Musterstraße 1" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">PLZ</label>
                <Input value={form.zip} onChange={(e) => setForm((f) => ({ ...f, zip: e.target.value }))} placeholder="12345" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-slate-500 mb-1 block">Ort</label>
                <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="Musterstadt" />
              </div>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-500 mb-1 block">Notiz</label>
              <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Interne Notizen..." rows={2} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => { setShowForm(false); setEditingId(null); }}>Abbrechen</Button>
            <Button type="submit" size="sm" disabled={isPending}>{isPending ? "Speichern…" : "Speichern"}</Button>
          </div>
        </form>
      )}

      {/* Ergebnis-Hinweis bei Suche */}
      {query && (
        <p className="text-xs text-slate-500">
          {filtered.length} von {owners.length} Waldbesitzern
        </p>
      )}

      {/* Leere Liste */}
      {owners.length === 0 && !showForm && (
        <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-200">
          <User className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Noch keine Waldbesitzer angelegt.</p>
          <p className="text-xs text-slate-400 mt-1">
            Manuell hinzufügen oder per CSV importieren.
          </p>
        </div>
      )}

      {query && filtered.length === 0 && owners.length > 0 && (
        <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
          <p className="text-sm text-slate-500">Keine Treffer für „{query}"</p>
        </div>
      )}

      {/* Liste */}
      {filtered.map((owner) => {
        const isExpanded = expandedId === owner.id;
        const totalHa = owner.forests.reduce((sum, f) => sum + (f.areaHa ?? 0), 0);

        return (
          <div key={owner.id} className="bg-white border border-slate-200 rounded-lg shadow-sm">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-green-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 text-sm">{owner.name}</p>
                <p className="text-xs text-slate-500 truncate">
                  {[owner.email, owner.phone].filter(Boolean).join(" · ") || "Keine Kontaktdaten"}
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
                <Trees className="w-3.5 h-3.5" />
                <span>{owner.forests.length} Waldfläche{owner.forests.length !== 1 ? "n" : ""}</span>
                {totalHa > 0 && <span className="ml-1">· {totalHa.toFixed(1)} ha</span>}
              </div>
              <div className="flex items-center gap-1 ml-2">
                <Button variant="ghost" size="sm" onClick={() => openEdit(owner)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-600 hover:bg-red-50"
                  onClick={() => handleDelete(owner.id, owner.name)}
                  disabled={isPending}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedId(isExpanded ? null : owner.id)}
                >
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-slate-100 px-4 py-3 grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-slate-600 bg-slate-50 rounded-b-lg">
                {owner.street && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{owner.street}, {owner.zip} {owner.city}</span>
                  </div>
                )}
                {owner.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <a href={`mailto:${owner.email}`} className="hover:underline text-green-700">{owner.email}</a>
                  </div>
                )}
                {owner.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{owner.phone}</span>
                  </div>
                )}
                {owner.notes && (
                  <div className="col-span-2 text-slate-500 text-xs mt-1 italic">{owner.notes}</div>
                )}
                {owner.forests.length > 0 && (
                  <div className="col-span-2 mt-2">
                    <p className="text-xs font-medium text-slate-500 mb-1">Zugewiesene Wälder:</p>
                    <div className="flex flex-wrap gap-1">
                      {owner.forests.map((f) => (
                        <span key={f.id} className="inline-flex items-center gap-1 bg-green-50 text-green-800 text-xs px-2 py-0.5 rounded-full border border-green-200">
                          <Trees className="w-3 h-3" />
                          {f.name}{f.areaHa ? ` (${f.areaHa.toFixed(1)} ha)` : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Edit-Formular (erscheint am Ende der Liste beim Bearbeiten) */}
      {showForm && editingId && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 space-y-3"
        >
          <p className="font-medium text-sm text-slate-900">Waldbesitzer bearbeiten</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-slate-500 mb-1 block">Name *</label>
              <Input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Max Mustermann" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">E-Mail</label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="max@example.de" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Telefon</label>
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+49 123 456789" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Straße & Hausnummer</label>
              <Input value={form.street} onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))} placeholder="Musterstraße 1" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">PLZ</label>
                <Input value={form.zip} onChange={(e) => setForm((f) => ({ ...f, zip: e.target.value }))} placeholder="12345" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-slate-500 mb-1 block">Ort</label>
                <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="Musterstadt" />
              </div>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-500 mb-1 block">Notiz</label>
              <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Interne Notizen..." rows={2} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => { setShowForm(false); setEditingId(null); }}>Abbrechen</Button>
            <Button type="submit" size="sm" disabled={isPending}>{isPending ? "Speichern…" : "Speichern"}</Button>
          </div>
        </form>
      )}

    </div>
  );
}
