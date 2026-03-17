"use client";

import { useState, useTransition } from "react";
import {
  createServiceProvider,
  updateServiceProvider,
  deleteServiceProvider,
} from "@/actions/service-providers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronUp,
  Building2, Mail, Phone, MapPin, Search, Download, X, Tag,
} from "lucide-react";
import { AiImportDialog } from "./AiImportDialog";

type Provider = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  street: string | null;
  zip: string | null;
  city: string | null;
  category: string | null;
  notes: string | null;
};

const EMPTY_FORM = {
  name: "", email: "", phone: "", street: "", zip: "", city: "", category: "", notes: "",
};

const CATEGORIES = [
  "Forstunternehmer", "Holzrücker", "Pflanzentrupp", "Gutachter",
  "Sägewerk", "Holzhändler", "Maschinenring", "Sonstiges",
];

function exportCsv(providers: Provider[]) {
  const headers = ["name", "email", "phone", "street", "zip", "city", "category", "notes"];
  const rows = providers.map((p) =>
    headers.map((h) => {
      const val = String((p as any)[h] ?? "").replace(/"/g, '""');
      return /[,"\n]/.test(val) ? `"${val}"` : val;
    }).join(",")
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "dienstleister.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function ServiceProvidersClient({
  organizationId,
  initialProviders,
}: {
  organizationId: string;
  initialProviders: Provider[];
}) {
  const [providers, setProviders] = useState<Provider[]>(initialProviders);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isPending, startTransition] = useTransition();

  const filtered = query.trim()
    ? providers.filter((p) =>
        [p.name, p.email, p.phone, p.city, p.category]
          .some((v) => v?.toLowerCase().includes(query.toLowerCase()))
      )
    : providers;

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(p: Provider) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      email: p.email ?? "",
      phone: p.phone ?? "",
      street: p.street ?? "",
      zip: p.zip ?? "",
      city: p.city ?? "",
      category: p.category ?? "",
      notes: p.notes ?? "",
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
      category: form.category || undefined,
      notes: form.notes || undefined,
    };
    startTransition(async () => {
      try {
        if (editingId) {
          const updated = await updateServiceProvider(editingId, data);
          setProviders((prev) => prev.map((p) => p.id === editingId ? { ...p, ...updated } : p));
          toast.success("Dienstleister aktualisiert");
        } else {
          const created = await createServiceProvider(organizationId, data);
          setProviders((prev) => [...prev, created]);
          toast.success("Dienstleister angelegt");
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
        await deleteServiceProvider(id);
        setProviders((prev) => prev.filter((p) => p.id !== id));
        toast.success("Dienstleister gelöscht");
      } catch (err: any) {
        toast.error(err.message || "Fehler beim Löschen");
      }
    });
  }

  const FormFields = () => (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2">
        <label className="text-xs text-slate-500 mb-1 block">Name / Firma *</label>
        <Input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Forstbetrieb Müller GmbH" />
      </div>
      <div>
        <label className="text-xs text-slate-500 mb-1 block">Kategorie</label>
        <select
          value={form.category}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">— Kategorie wählen —</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs text-slate-500 mb-1 block">E-Mail</label>
        <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="info@example.de" />
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
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Suchen nach Name, Kategorie, Ort…"
            className="pl-8 pr-8"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {!showForm && (
          <Button size="sm" onClick={openCreate} className="gap-1.5 shrink-0">
            <Plus className="w-4 h-4" /> Hinzufügen
          </Button>
        )}
        <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => exportCsv(providers)} disabled={providers.length === 0} title="Als CSV exportieren">
          <Download className="w-4 h-4" /> Export
        </Button>
        <AiImportDialog
          organizationId={organizationId}
          onImported={(newProviders) => setProviders((prev) => [...prev, ...newProviders])}
        />
      </div>

      {query && (
        <p className="text-xs text-slate-500">{filtered.length} von {providers.length} Dienstleistern</p>
      )}

      {/* Neu-Formular oben */}
      {showForm && !editingId && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 space-y-3">
          <p className="font-medium text-sm text-slate-900">Neuer Dienstleister</p>
          <FormFields />
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => { setShowForm(false); setEditingId(null); }}>Abbrechen</Button>
            <Button type="submit" size="sm" disabled={isPending}>{isPending ? "Speichern…" : "Speichern"}</Button>
          </div>
        </form>
      )}

      {/* Leere Liste */}
      {providers.length === 0 && !showForm && (
        <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-200">
          <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Noch keine Dienstleister angelegt.</p>
          <p className="text-xs text-slate-400 mt-1">Manuell hinzufügen oder per KI-Import.</p>
        </div>
      )}

      {query && filtered.length === 0 && providers.length > 0 && (
        <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
          <p className="text-sm text-slate-500">Keine Treffer für „{query}"</p>
        </div>
      )}

      {/* Liste */}
      {filtered.map((p) => {
        const isExpanded = expandedId === p.id;
        return (
          <div key={p.id} className="bg-white border border-slate-200 rounded-lg shadow-sm">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 text-sm">{p.name}</p>
                <p className="text-xs text-slate-500 truncate">
                  {[p.category, p.email, p.phone].filter(Boolean).join(" · ") || "Keine Kontaktdaten"}
                </p>
              </div>
              {p.category && (
                <span className="hidden sm:inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full shrink-0">
                  <Tag className="w-3 h-3" />{p.category}
                </span>
              )}
              <div className="flex items-center gap-1 ml-2">
                <Button variant="ghost" size="sm" onClick={() => openEdit(p)}><Pencil className="w-3.5 h-3.5" /></Button>
                <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(p.id, p.name)} disabled={isPending}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setExpandedId(isExpanded ? null : p.id)}>
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-slate-100 px-4 py-3 grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-slate-600 bg-slate-50 rounded-b-lg">
                {p.street && (
                  <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-slate-400" /><span>{p.street}, {p.zip} {p.city}</span></div>
                )}
                {p.email && (
                  <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-slate-400" /><a href={`mailto:${p.email}`} className="hover:underline text-blue-600">{p.email}</a></div>
                )}
                {p.phone && (
                  <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400" /><span>{p.phone}</span></div>
                )}
                {p.notes && (
                  <div className="col-span-2 text-slate-500 text-xs mt-1 italic">{p.notes}</div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Edit-Formular */}
      {showForm && editingId && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 space-y-3">
          <p className="font-medium text-sm text-slate-900">Dienstleister bearbeiten</p>
          <FormFields />
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => { setShowForm(false); setEditingId(null); }}>Abbrechen</Button>
            <Button type="submit" size="sm" disabled={isPending}>{isPending ? "Speichern…" : "Speichern"}</Button>
          </div>
        </form>
      )}
    </div>
  );
}
