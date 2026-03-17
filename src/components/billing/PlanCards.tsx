'use client';

import { CheckCircle2, TreePine, Trees, Mountain, Building2, Lock, Mail } from 'lucide-react';

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

// ─── Feature lists & visual config per plan ───────────────────────────────────

const PLAN_META: Record<string, {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  accentBorder: string;
  accentBg: string;
  accentText: string;
  priceCls: string;
  tagline: string;
  features: string[];
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
    tagline: 'Für kleine Privatwälder',
    features: [
      'Interaktive Forstkarte',
      'Waldbestandsverwaltung',
      'POI-System (Hochsitze, Rückelager, Fahrzeuge…)',
      'Aufgaben & Terminplanung',
      'Kalender & Erinnerungen',
      'Kalamitätsdokumentation',
      'E-Mail Support',
    ],
  },
  Pro: {
    icon: Trees,
    iconBg: 'bg-green-50',
    iconColor: 'text-green-700',
    accentBorder: 'border-green-200',
    accentBg: 'bg-green-50',
    accentText: 'text-green-700',
    priceCls: 'text-green-700',
    tagline: 'Für wachsende Forstbetriebe',
    highlighted: true,
    features: [
      'Alles aus Basis',
      'Biomasse-Monitoring',
      'Pflanzflächen & Kulturen',
      'Jagdreviere',
      'Wege & Rückegassen',
      'Zeitcontrolling',
      'EUDR-Compliance',
      'Maßnahmen & Holzverkauf',
      'Prioritäts-Support',
    ],
  },
  Expert: {
    icon: Mountain,
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    accentBorder: 'border-violet-200',
    accentBg: 'bg-violet-50',
    accentText: 'text-violet-700',
    priceCls: 'text-slate-900',
    tagline: 'Für professionelle Forstunternehmen',
    features: [
      'Alles aus Pro',
      'Sentinel Satellitendaten',
      'Erweiterte Auswertungen & Reports',
      'Individuelle Rollenrechte',
      'Mehrere Organisationen',
      'Telefonischer Support',
    ],
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
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function getBlockedReason(plan: PlanData, usedHa: number, memberCount: number): string | null {
  const reasons: string[] = [];
  if (plan.maxHectares !== null && usedHa > plan.maxHectares) {
    reasons.push(`Waldfläche auf unter ${plan.maxHectares} ha reduzieren`);
  }
  if (plan.maxUsers !== null && memberCount > plan.maxUsers) {
    reasons.push(`Nutzer auf ${plan.maxUsers} reduzieren`);
  }
  return reasons.length > 0 ? reasons.join(' und ') : null;
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
}: Props) {
  const paidPlans = plans.filter(p => p.name !== 'Enterprise');
  const enterprise = plans.find(p => p.name === 'Enterprise');

  return (
    <div className="space-y-6">
      {/* Billing interval toggle */}
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
            Monatlich
          </button>
          <button
            onClick={() => onIntervalChange('yearly')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${
              billingInterval === 'yearly'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Jährlich
          </button>
        </div>
        {billingInterval === 'yearly' && showAnnualDiscountBadge && (
          <span className="text-xs font-bold text-green-700 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
            50 % Rabatt im 1. Jahr beim Direktabschluss
          </span>
        )}
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
        {paidPlans.map(plan => {
          const meta = PLAN_META[plan.name];
          if (!meta) return null;

          const Icon = meta.icon;
          const isSelected = selectedPlanId === plan.id;
          const isHighlighted = !!meta.highlighted;
          const blockedReason = getBlockedReason(plan, currentUsedHa, currentMemberCount);
          const isBlocked = !!blockedReason;

          const monthlyEquivalent = billingInterval === 'yearly' && plan.yearlyPrice
            ? (plan.yearlyPrice / 12).toFixed(2)
            : plan.monthlyPrice?.toFixed(2);

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
                  Beliebt
                </div>
              )}

              {/* Lock overlay */}
              {isBlocked && (
                <div className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center bg-white/80 p-5 z-10 text-center gap-2">
                  <Lock size={18} className="text-slate-400" />
                  <p className="text-xs text-slate-600 leading-snug">
                    Bitte {blockedReason}, um dieses Paket zu wählen.
                  </p>
                </div>
              )}

              {/* Icon */}
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${meta.iconBg}`}>
                <Icon className={`w-5 h-5 ${meta.iconColor}`} />
              </div>

              {/* Name + tagline */}
              <h3 className="text-lg font-bold text-slate-900 mb-0.5">{plan.name}</h3>
              <p className="text-xs text-slate-400 mb-4">{meta.tagline}</p>

              {/* Price */}
              <div className="mb-0.5">
                <span className={`text-4xl font-bold ${meta.priceCls}`}>
                  {monthlyEquivalent ? `${monthlyEquivalent} €` : '—'}
                </span>
                <span className="text-slate-400 text-sm ml-1">/ Monat</span>
              </div>
              <p className="text-xs text-slate-400 mb-1">zzgl. MwSt.</p>
              {billingInterval === 'yearly' && plan.yearlyPrice && (
                <p className="text-xs text-slate-400 mb-4">{plan.yearlyPrice} € zzgl. MwSt. jährlich abgerechnet</p>
              )}
              {billingInterval === 'monthly' && <div className="mb-4" />}

              {/* Limits badge */}
              <div className={`text-xs font-semibold px-3 py-2 rounded-lg border text-center mb-5 ${meta.accentBg} ${meta.accentBorder} ${meta.accentText}`}>
                {plan.maxHectares ? `bis ${plan.maxHectares} ha` : 'unbegrenzt'} ·{' '}
                {plan.maxUsers ? `${plan.maxUsers} Nutzer` : 'unbegrenzte Nutzer'}
              </div>

              {/* Features */}
              <ul className="space-y-2 flex-1 mb-6">
                {meta.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle2 size={14} className="text-green-600 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

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
                    {isSelected ? '✓ Ausgewählt' : 'Auswählen'}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Enterprise row */}
      {enterprise && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-amber-100 w-11 h-11 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
              <Building2 size={20} />
            </div>
            <div>
              <p className="text-slate-900 font-bold">Enterprise</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Unbegrenzte Fläche · Unbegrenzte Nutzer · Alle Funktionen · Individuelle SLA · Dedizierter Support · API-Zugang
              </p>
            </div>
          </div>
          <a
            href="mailto:info@forest-inventory.eu?subject=Enterprise%20Anfrage"
            className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-bold hover:bg-amber-700 transition"
          >
            <Mail size={14} /> Kontakt aufnehmen
          </a>
        </div>
      )}
    </div>
  );
}
