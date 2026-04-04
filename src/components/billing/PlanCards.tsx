'use client';

import { useState } from 'react';
import { CheckCircle2, TreePine, Trees, Mountain, Building2, Lock, Mail, Map, Crosshair, ClipboardList, Leaf, BarChart3, Satellite, ShieldCheck, Users, X, Loader2, Send } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

export type PlanData = {
  id: string;
  name: string;
  maxHectares: number | null;
  maxUsers: number | null;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  monthlyPriceId: string | null;
  yearlyPriceId: string | null;
  displayOrder: number;
};

// ─── Features included in ALL plans ───────────────────────────────────────────

export const ALL_FEATURES = [
  { icon: Map,           labelKey: 'map' },
  { icon: Crosshair,     labelKey: 'pois' },
  { icon: ClipboardList, labelKey: 'tasks' },
  { icon: Leaf,          labelKey: 'inventory' },
  { icon: BarChart3,     labelKey: 'reports' },
  { icon: Satellite,     labelKey: 'satellite' },
  { icon: ShieldCheck,   labelKey: 'health' },
  { icon: Users,         labelKey: 'team' },
] as const;

// ─── Visual config & support tier per plan ────────────────────────────────────

const PLAN_META: Record<string, {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  accentBorder: string;
  accentBg: string;
  accentText: string;
  priceCls: string;
  highlighted?: boolean;
}> = {
  Basis: {
    icon: TreePine,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    accentBorder: 'border-blue-200',
    accentBg: 'bg-blue-50',
    accentText: 'text-blue-700',
    priceCls: 'text-slate-900',
  },
  Pro: {
    icon: Trees,
    iconBg: 'bg-green-50',
    iconColor: 'text-green-700',
    accentBorder: 'border-green-200',
    accentBg: 'bg-green-50',
    accentText: 'text-green-700',
    priceCls: 'text-green-700',
    highlighted: true,
  },
  Expert: {
    icon: Mountain,
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    accentBorder: 'border-violet-200',
    accentBg: 'bg-violet-50',
    accentText: 'text-violet-700',
    priceCls: 'text-slate-900',
  },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  plans: PlanData[];
  selectedPlanId: string | null;
  onSelect: (plan: PlanData) => void;
  billingInterval: 'monthly' | 'yearly';
  onIntervalChange: (i: 'monthly' | 'yearly') => void;
  currentUsedHa?: number;
  currentMemberCount?: number;
  showAnnualDiscountBadge?: boolean;
  showFeaturesBlock?: boolean;
  onEnterpriseAfterSend?: () => Promise<void>;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function useBlockedReason(plan: PlanData, usedHa: number, memberCount: number, t: ReturnType<typeof useTranslations>): string | null {
  const reasons: string[] = [];
  if (plan.maxHectares !== null && usedHa > plan.maxHectares) {
    reasons.push(t('reduceArea', { ha: plan.maxHectares }));
  }
  if (plan.maxUsers !== null && memberCount > plan.maxUsers) {
    reasons.push(t('reduceUsers', { count: plan.maxUsers }));
  }
  return reasons.length > 0 ? reasons.join(` ${t('and')} `) : null;
}

// ─── Enterprise Contact Modal ─────────────────────────────────────────────────

function EnterpriseContactModal({ onClose, onAfterSend }: { onClose: () => void; onAfterSend?: () => Promise<void> }) {
  const { data: session } = useSession();
  const te = useTranslations('Enterprise');
  const [name, setName] = useState(session?.user?.name ?? '');
  const [email, setEmail] = useState(session?.user?.email ?? '');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/contact/enterprise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });
      if (!res.ok) throw new Error();
      toast.success(te('success'));
      if (onAfterSend) {
        await onAfterSend();
      } else {
        onClose();
      }
    } catch {
      toast.error(te('error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{te('title')}</h3>
            <p className="text-sm text-slate-500 mt-0.5">{te('subtitle')}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">{te('name')}</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600 text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">{te('email')}</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600 text-slate-900"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">{te('message')}</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              required
              rows={4}
              placeholder={te('placeholder')}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600 text-slate-900 resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition">
              {te('cancel')}
            </button>
            <button
              type="submit"
              disabled={loading || !message.trim()}
              className="inline-flex items-center gap-2 px-5 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {te('send')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PlanCards({
  plans,
  selectedPlanId,
  onSelect,
  billingInterval,
  onIntervalChange,
  currentUsedHa = 0,
  currentMemberCount = 0,
  showAnnualDiscountBadge = true,
  showFeaturesBlock = true,
  onEnterpriseAfterSend,
}: Props) {
  const t = useTranslations('PlanCards');
  const [enterpriseModalOpen, setEnterpriseModalOpen] = useState(false);
  const paidPlans = plans.filter(p => p.name !== 'Enterprise');
  const enterprise = plans.find(p => p.name === 'Enterprise');

  return (
    <div className="space-y-8">

      {/* ── Alle Features Block ───────────────────────────────────────────────── */}
      {showFeaturesBlock && (
        <div className="bg-green-50 border border-green-100 rounded-2xl px-6 py-5">
          <p className="text-xs font-bold text-green-700 uppercase tracking-wider mb-4">{t('includedInAll')}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {ALL_FEATURES.map(({ icon: Icon, labelKey }) => (
              <div key={labelKey} className="flex items-start gap-2">
                <Icon size={14} className="text-green-600 mt-0.5 shrink-0" />
                <span className="text-xs text-slate-700 leading-snug">{t(`features.${labelKey}`)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Billing interval toggle ───────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-4 flex-wrap">
        <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200">
          <button
            onClick={() => onIntervalChange('monthly')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${
              billingInterval === 'monthly'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t('monthly')}
          </button>
          <button
            onClick={() => onIntervalChange('yearly')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${
              billingInterval === 'yearly'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t('yearly')}
          </button>
        </div>
        {billingInterval === 'yearly' && showAnnualDiscountBadge && (
          <span className="text-xs font-bold text-green-700 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
            {t('annualDiscount')}
          </span>
        )}
      </div>

      {/* ── Plan cards ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
        {paidPlans.map(plan => {
          const meta = PLAN_META[plan.name];
          if (!meta) return null;

          const Icon = meta.icon;
          const isSelected = selectedPlanId === plan.id;
          const isHighlighted = !!meta.highlighted;
          const blockedReason = useBlockedReason(plan, currentUsedHa, currentMemberCount, t);
          const isBlocked = !!blockedReason;

          const monthlyEquivalent = billingInterval === 'yearly' && plan.yearlyPrice
            ? (plan.yearlyPrice / 12).toFixed(2)
            : plan.monthlyPrice?.toFixed(2);
          const originalMonthlyEquivalent = billingInterval === 'yearly' && plan.yearlyPrice
            ? ((plan.yearlyPrice * 2) / 12).toFixed(2)
            : null;
          const originalYearlyPrice = billingInterval === 'yearly' && plan.yearlyPrice
            ? (plan.yearlyPrice * 2).toFixed(2)
            : null;

          const tagline = t.has(`taglines.${plan.name}`) ? t(`taglines.${plan.name}`) : '';
          const supportLabel = t.has(`support.${plan.name}`) ? t(`support.${plan.name}`) : '';

          return (
            <div
              key={plan.id}
              onClick={() => { if (!isBlocked) onSelect(plan); }}
              className={`
                relative bg-white rounded-2xl p-6 flex flex-col transition-all duration-200
                ${isHighlighted ? 'md:-translate-y-2 shadow-lg' : 'shadow-sm'}
                ${isBlocked
                  ? 'opacity-60 cursor-not-allowed border-2 border-slate-200'
                  : isSelected
                  ? 'cursor-pointer border-2 border-green-700 shadow-md ring-4 ring-green-700/10'
                  : isHighlighted
                  ? 'cursor-pointer border-2 border-green-700'
                  : 'cursor-pointer border-2 border-slate-200 hover:border-slate-300 hover:shadow-md'
                }
              `}
            >
              {/* Beliebt badge */}
              {isHighlighted && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-green-700 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow">
                  {t('popular')}
                </div>
              )}

              {/* Lock overlay */}
              {isBlocked && (
                <div className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center bg-white/80 p-5 z-10 text-center gap-2">
                  <Lock size={18} className="text-slate-400" />
                  <p className="text-xs text-slate-600 leading-snug">
                    {t('blockedReduce', { reason: blockedReason })}
                  </p>
                </div>
              )}

              {/* Icon */}
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${meta.iconBg}`}>
                <Icon className={`w-5 h-5 ${meta.iconColor}`} />
              </div>

              {/* Name + tagline */}
              <h3 className="text-lg font-bold text-slate-900 mb-0.5">{plan.name}</h3>
              <p className="text-xs text-slate-400 mb-5">{tagline}</p>

              {/* Price */}
              <div className="mb-0.5 flex items-baseline gap-2">
                {originalMonthlyEquivalent && (
                  <span className="text-xl text-slate-400 line-through">
                    {originalMonthlyEquivalent} €
                  </span>
                )}
                <span className={`text-4xl font-bold ${meta.priceCls}`}>
                  {monthlyEquivalent ? `${monthlyEquivalent} €` : '—'}
                </span>
                <span className="text-slate-400 text-sm">{t('perMonth')}</span>
              </div>
              {billingInterval === 'yearly' && plan.yearlyPrice && (
                <p className="text-xs text-slate-400 mb-1">
                  {originalYearlyPrice && (
                    <span className="line-through mr-1">{originalYearlyPrice} €</span>
                  )}
                  <span className="text-green-600 font-semibold">{t('yearlyBilled', { price: plan.yearlyPrice })}</span>
                </p>
              )}
              <p className="text-xs text-slate-400 mb-5">{t('plusVat')}</p>

              {/* Limits badge */}
              <div className={`text-sm font-bold px-4 py-3 rounded-xl border text-center mb-4 ${meta.accentBg} ${meta.accentBorder} ${meta.accentText}`}>
                {plan.maxHectares ? t('upToHa', { ha: plan.maxHectares }) : t('unlimitedArea')}
                <span className="font-normal text-xs ml-2 opacity-75">
                  · {plan.maxUsers ? t('users', { count: plan.maxUsers }) : t('unlimitedUsers')}
                </span>
              </div>

              {/* CTA button */}
              {!isBlocked && (
                <div className="mt-auto">
                  <div className={`w-full py-2.5 rounded-xl text-sm font-bold text-center transition ${
                    isSelected
                      ? 'bg-green-700 text-white'
                      : isHighlighted
                      ? 'bg-green-700 text-white hover:bg-green-800'
                      : 'border-2 border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                  }`}>
                    {isSelected ? `✓ ${t('selected')}` : t('select')}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Enterprise row ────────────────────────────────────────────────────── */}
      {enterprise && (
        <>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-amber-100 w-11 h-11 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
                <Building2 size={20} />
              </div>
              <div>
                <p className="text-slate-900 font-bold">{t('enterprise')}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t('enterpriseDesc')}
                </p>
              </div>
            </div>
            <button
              onClick={() => setEnterpriseModalOpen(true)}
              className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-bold hover:bg-amber-700 transition"
            >
              <Mail size={14} /> {t('contactUs')}
            </button>
          </div>
          {enterpriseModalOpen && <EnterpriseContactModal onClose={() => setEnterpriseModalOpen(false)} onAfterSend={onEnterpriseAfterSend} />}
        </>
      )}
    </div>
  );
}
