'use client';

import { useState, useTransition } from 'react';
import { createCoupon, deactivateCoupon } from '@/actions/admin-coupons';
import { Plus, Tag, CheckCircle2, XCircle, Loader2, Copy, Check } from 'lucide-react';

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  percentOff: number | null;
  amountOff: number | null;
  maxRedemptions: number | null;
  timesRedeemed: number;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
}

export function CouponsClient({ coupons: initial }: { coupons: Coupon[] }) {
  const [coupons, setCoupons] = useState<Coupon[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [form, setForm] = useState({
    code: '',
    description: '',
    discountType: 'percent' as 'percent' | 'amount',
    percentOff: '',
    amountOff: '',
    maxRedemptions: '',
    expiresAt: '',
  });

  function copyCode(code: string, id: string) {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      try {
        await createCoupon({
          code: form.code,
          description: form.description || undefined,
          percentOff: form.discountType === 'percent' && form.percentOff ? parseFloat(form.percentOff) : undefined,
          amountOff: form.discountType === 'amount' && form.amountOff ? parseFloat(form.amountOff) : undefined,
          maxRedemptions: form.maxRedemptions ? parseInt(form.maxRedemptions) : undefined,
          expiresAt: form.expiresAt || undefined,
        });
        setShowForm(false);
        setForm({ code: '', description: '', discountType: 'percent', percentOff: '', amountOff: '', maxRedemptions: '', expiresAt: '' });
        window.location.reload();
      } catch (err: any) {
        setError(err.message || 'Fehler beim Erstellen');
      }
    });
  }

  function handleDeactivate(id: string) {
    startTransition(async () => {
      await deactivateCoupon(id);
      setCoupons(prev => prev.map(c => c.id === id ? { ...c, active: false } : c));
    });
  }

  return (
    <div className="space-y-4">
      {/* Header + Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
        >
          <Plus size={16} />
          Gutschein erstellen
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 shadow-sm">
          <h3 className="font-semibold text-slate-800">Neuer Gutschein</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Code *</label>
              <input
                required
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="z.B. SOMMER25"
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Beschreibung</label>
              <input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Interne Notiz"
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Rabatttyp *</label>
              <select
                value={form.discountType}
                onChange={e => setForm(f => ({ ...f, discountType: e.target.value as any }))}
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value="percent">Prozent (%)</option>
                <option value="amount">Betrag (€)</option>
              </select>
            </div>
            {form.discountType === 'percent' ? (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Rabatt in % *</label>
                <input
                  required
                  type="number"
                  min="1"
                  max="100"
                  value={form.percentOff}
                  onChange={e => setForm(f => ({ ...f, percentOff: e.target.value }))}
                  placeholder="z.B. 25"
                  className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Betrag in € *</label>
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.amountOff}
                  onChange={e => setForm(f => ({ ...f, amountOff: e.target.value }))}
                  placeholder="z.B. 20.00"
                  className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Max. Einlösungen</label>
              <input
                type="number"
                min="1"
                value={form.maxRedemptions}
                onChange={e => setForm(f => ({ ...f, maxRedemptions: e.target.value }))}
                placeholder="Unbegrenzt"
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Ablaufdatum</label>
              <input
                type="date"
                value={form.expiresAt}
                onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white text-sm font-medium rounded-lg hover:bg-green-800 disabled:opacity-50 transition-colors"
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Erstellen
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}

      {/* Coupons Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {coupons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Tag size={32} className="mb-3 opacity-40" />
            <p className="text-sm">Noch keine Gutscheine erstellt</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Code</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Rabatt</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Beschreibung</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Einlösungen</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Läuft ab</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Status</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">Aktion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {coupons.map((coupon) => (
                <tr key={coupon.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-slate-800">{coupon.code}</span>
                      <button
                        onClick={() => copyCode(coupon.code, coupon.id)}
                        className="text-slate-400 hover:text-slate-700 transition-colors"
                        title="Code kopieren"
                      >
                        {copiedId === coupon.id ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-green-700">
                    {coupon.percentOff != null
                      ? `${coupon.percentOff}%`
                      : coupon.amountOff != null
                      ? `${(coupon.amountOff / 100).toFixed(2)} €`
                      : '—'}
                  </td>
                  <td className="px-6 py-4 text-slate-500">{coupon.description || '—'}</td>
                  <td className="px-6 py-4">
                    <span className="text-slate-700">{coupon.timesRedeemed}</span>
                    {coupon.maxRedemptions && (
                      <span className="text-slate-400"> / {coupon.maxRedemptions}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {coupon.expiresAt
                      ? new Date(coupon.expiresAt).toLocaleDateString('de-DE')
                      : '—'}
                  </td>
                  <td className="px-6 py-4">
                    {coupon.active ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <CheckCircle2 size={11} /> Aktiv
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                        <XCircle size={11} /> Inaktiv
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {coupon.active && (
                      <button
                        onClick={() => handleDeactivate(coupon.id)}
                        disabled={isPending}
                        className="text-xs text-red-600 hover:text-red-800 font-medium transition-colors disabled:opacity-50"
                      >
                        Deaktivieren
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
