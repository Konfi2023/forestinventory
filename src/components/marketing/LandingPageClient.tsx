'use client';

import { useEffect, useRef, useCallback } from 'react';
import {
  Map, Leaf, ShieldCheck, PackageOpen,
  ClipboardList, Trees, Radio, Zap,
  CheckCircle2, Globe, Lock,
  TreePine, Mountain, Building2,
  Crosshair, BarChart3, Satellite, Users,
} from 'lucide-react';
import { SignInButton } from './SignInButton';
import { EnterpriseContactButton } from './EnterpriseContactButton';

// ─── Types ───────────────────────────────────────────────────────────────────
interface DbPlan {
  id: string;
  name: string;
  monthlyPrice: number | null;
  maxHectares: number | null;
  maxUsers: number | null;
}

interface Props {
  dbPlans: DbPlan[];
}

// ─── Scroll Animation Hook ───────────────────────────────────────────────────
function useScrollAnimations() {
  const deviceRef = useRef<HTMLDivElement>(null);
  const observerRefs = useRef<Set<HTMLElement>>(new Set());

  const addRef = useCallback((el: HTMLElement | null) => {
    if (el) observerRefs.current.add(el);
  }, []);

  useEffect(() => {
    // IntersectionObserver for fade-in elements
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    );

    observerRefs.current.forEach((el) => io.observe(el));

    // Scroll handler for 3D device perspective
    function onScroll() {
      if (!deviceRef.current) return;
      const rect = deviceRef.current.getBoundingClientRect();
      const vh = window.innerHeight;
      // progress: 0 = element just entered bottom, 1 = element center at viewport center
      const center = rect.top + rect.height / 2;
      const progress = Math.max(0, Math.min(1, 1 - (center - vh * 0.5) / (vh * 0.6)));

      // rotateX goes from 45deg (folded back) to 0deg (flat), then to -8deg (tilted forward) as user scrolls past
      const pastCenter = Math.max(0, Math.min(1, (vh * 0.5 - center + rect.height * 0.3) / (vh * 0.5)));
      const rotateX = progress < 1
        ? 45 * (1 - progress)
        : -8 * pastCenter;
      const scale = 0.85 + 0.15 * progress;
      const opacity = Math.min(1, progress * 1.5);

      deviceRef.current.style.transform = `perspective(1200px) rotateX(${rotateX}deg) scale(${scale})`;
      deviceRef.current.style.opacity = String(opacity);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return { deviceRef, addRef };
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function LandingPageClient({ dbPlans }: Props) {
  const { deviceRef, addRef } = useScrollAnimations();

  return (
    <>
      {/* ── INLINE STYLES for animations ──────────────────────────────────── */}
      <style>{`
        .scroll-fade {
          opacity: 0;
          transform: translateY(40px);
          transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
                      transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .scroll-fade.animate-in {
          opacity: 1;
          transform: translateY(0);
        }
        .scroll-fade-left {
          opacity: 0;
          transform: translateX(-60px);
          transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
                      transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .scroll-fade-left.animate-in {
          opacity: 1;
          transform: translateX(0);
        }
        .scroll-fade-right {
          opacity: 0;
          transform: translateX(60px);
          transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
                      transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .scroll-fade-right.animate-in {
          opacity: 1;
          transform: translateX(0);
        }
        .stagger-1 { transition-delay: 0.05s; }
        .stagger-2 { transition-delay: 0.10s; }
        .stagger-3 { transition-delay: 0.15s; }
        .stagger-4 { transition-delay: 0.20s; }
        .stagger-5 { transition-delay: 0.25s; }
        .stagger-6 { transition-delay: 0.30s; }

        /* Phone slide-in */
        .phone-left {
          opacity: 0;
          transform: translateX(-80px) rotate(-6deg);
          transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s,
                      transform 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s;
        }
        .phone-left.animate-in {
          opacity: 1;
          transform: translateX(0) rotate(-6deg);
        }
        .phone-right {
          opacity: 0;
          transform: translateX(80px) rotate(6deg);
          transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.4s,
                      transform 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.4s;
        }
        .phone-right.animate-in {
          opacity: 1;
          transform: translateX(0) rotate(6deg);
        }

        /* Hero entrance */
        @keyframes heroFadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hero-animate {
          animation: heroFadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .hero-delay-1 { animation-delay: 0.1s; opacity: 0; }
        .hero-delay-2 { animation-delay: 0.2s; opacity: 0; }
        .hero-delay-3 { animation-delay: 0.3s; opacity: 0; }
        .hero-delay-4 { animation-delay: 0.4s; opacity: 0; }
        .hero-delay-5 { animation-delay: 0.5s; opacity: 0; }
      `}</style>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="pt-24 pb-20 px-6 bg-gradient-to-b from-green-50 via-white to-white overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center pt-12">
            {/* Text */}
            <div className="space-y-6">
              <div className="hero-animate hero-delay-1 inline-flex items-center gap-2 bg-green-100 text-green-800 text-xs font-semibold px-3 py-1.5 rounded-full">
                <Zap size={12} />
                Forstmanagement Software für Waldbesitzer und Forstbetriebe
              </div>
              <h1 className="hero-animate hero-delay-2 text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] text-slate-900">
                Forstmanagement Software<br />
                <span className="text-green-700">für Waldbesitzer.</span>
              </h1>
              <p className="hero-animate hero-delay-3 text-lg text-slate-600 leading-relaxed max-w-lg">
                Digitale Waldinventur, GIS-Karte, Satellitenüberwachung und
                EUDR-Konformität — alles in einer Forstbetrieb-Software für
                Waldbesitzer, WBVen und Forstbetriebsgemeinschaften.
              </p>
              <div className="hero-animate hero-delay-4 flex flex-col sm:flex-row items-center gap-3 pt-2">
                <SignInButton
                  label="30 Tage kostenlos testen"
                  className="flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white font-semibold px-6 py-3.5 rounded-xl transition-colors text-sm shadow-lg shadow-green-700/20"
                />
                <a
                  href="#features"
                  className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm px-6 py-3.5 rounded-xl border border-stone-300 hover:border-stone-400 transition-colors"
                >
                  Alle Funktionen ansehen
                </a>
              </div>
              <div className="hero-animate hero-delay-5 flex flex-wrap items-center gap-6 pt-2 text-xs text-slate-500">
                {['DSGVO-konform', 'EUDR-ready (EU 2023/1115)', 'Serverstandort Europa'].map(badge => (
                  <span key={badge} className="flex items-center gap-1.5">
                    <CheckCircle2 size={12} className="text-green-600" />
                    {badge}
                  </span>
                ))}
              </div>
            </div>

            {/* Hero image */}
            <div className="hero-animate hero-delay-3 relative mt-8 md:mt-0">
              <div className="absolute -inset-4 bg-green-200/30 rounded-3xl blur-2xl" />
              <img
                src="https://images.unsplash.com/photo-1448375240586-882707db888b?w=1200&auto=format&fit=crop&q=80"
                alt="Forstmanagement Software – europäische Waldlandschaft"
                className="relative w-full aspect-[4/3] object-cover rounded-2xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── APP SHOWCASE – 3D Device Reveal ───────────────────────────────── */}
      <section className="bg-slate-950 py-28 px-6 overflow-hidden">
        <div ref={addRef} className="scroll-fade max-w-5xl mx-auto text-center space-y-4 mb-20">
          <p className="text-green-400 text-sm font-semibold uppercase tracking-widest">Waldinventur App & Dashboard</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white">Forstbetrieb-Software für Desktop & Mobil.</h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Waldinventur im Revier per Smartphone — Auswertung und EUDR-Einreichung
            am Schreibtisch. Läuft auch offline ohne Netzempfang.
          </p>
        </div>

        <div className="max-w-6xl mx-auto relative">
          {/* Desktop – 3D perspective scroll */}
          <div
            ref={deviceRef}
            className="hidden md:block mx-auto"
            style={{
              maxWidth: 900,
              transformOrigin: 'center bottom',
              opacity: 0,
              willChange: 'transform, opacity',
            }}
          >
            {/* macOS-style title bar */}
            <div style={{
              background: 'linear-gradient(180deg, #2a2a2e 0%, #1f1f23 100%)',
              borderRadius: '14px 14px 0 0',
              padding: '10px 14px 0',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              borderLeft: '1px solid rgba(255,255,255,0.08)',
              borderRight: '1px solid rgba(255,255,255,0.08)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                <div style={{ width: 13, height: 13, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #ff8080, #ff5f57)', boxShadow: '0 0 0 0.5px rgba(0,0,0,0.3)' }} />
                <div style={{ width: 13, height: 13, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #ffd080, #ffbd2e)', boxShadow: '0 0 0 0.5px rgba(0,0,0,0.3)' }} />
                <div style={{ width: 13, height: 13, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #7dde6d, #28c840)', boxShadow: '0 0 0 0.5px rgba(0,0,0,0.3)' }} />
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 6, height: 22, border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 10, color: '#888', fontFamily: 'system-ui, sans-serif' }}>forest-manager.eu/dashboard</span>
                </div>
              </div>
            </div>
            {/* Screen */}
            <div style={{
              border: '1px solid rgba(255,255,255,0.08)',
              borderTop: 'none',
              borderRadius: '0 0 12px 12px',
              overflow: 'hidden',
              lineHeight: 0,
            }}>
              <img
                src="/landing/desktop-screen.jpg"
                alt="Forest Manager Desktop – GIS-Karte mit Waldpolygonen und Wetterdaten"
                style={{ width: '100%', display: 'block' }}
              />
            </div>
            {/* Laptop base */}
            <div style={{
              height: 14,
              background: 'linear-gradient(180deg, #2a2a2e 0%, #1a1a1e 100%)',
              borderRadius: '0 0 6px 6px',
              margin: '0 -8px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            }} />
            {/* Glow effect under laptop */}
            <div style={{
              position: 'absolute',
              bottom: -40,
              left: '10%',
              right: '10%',
              height: 80,
              background: 'radial-gradient(ellipse at center, rgba(74, 222, 128, 0.15) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />
          </div>

          {/* Mobile on small screens + phones flanking desktop on large */}
          <div className="flex items-end justify-center gap-8 mt-12 md:mt-0 md:absolute md:inset-0 md:pointer-events-none">
            {/* Phone left */}
            <div ref={addRef} className="phone-left flex-shrink-0 md:absolute md:left-0 md:bottom-0" style={{ zIndex: 10 }}>
              <PhoneFrame>
                <img
                  src="/landing/mobile-tree.png"
                  alt="Forest Manager Mobile – Baum fotografieren"
                  style={{ width: '100%', display: 'block' }}
                />
              </PhoneFrame>
            </div>
            {/* Phone right */}
            <div ref={addRef} className="phone-right flex-shrink-0 md:absolute md:right-0 md:bottom-0" style={{ zIndex: 10 }}>
              <PhoneFrame>
                <img
                  src="/landing/mobile-polter.png"
                  alt="Forest Manager Mobile – Polter erfassen"
                  style={{ width: '100%', display: 'block' }}
                />
              </PhoneFrame>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div ref={addRef} className="scroll-fade text-center mb-14 space-y-3">
            <p className="text-green-700 text-sm font-semibold uppercase tracking-widest">Funktionen der Forstmanagement Software</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Digitale Forstwirtschaft — alle Werkzeuge in einer Software</h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Von der GIS-gestützten Waldkarte über die digitale Waldinventur bis zur
              EU-Entwaldungsverordnung — Forest Manager digitalisiert Ihren gesamten Forstbetrieb.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                ref={addRef}
                className={`scroll-fade stagger-${i + 1} bg-stone-50 border border-stone-100 rounded-2xl p-6 space-y-3 hover:border-green-200 hover:bg-green-50/30 transition-colors group`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${f.iconBg}`}>
                  <f.icon size={20} className={f.iconColor} />
                </div>
                <h3 className="font-semibold text-slate-900">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.description}</p>
                {f.tags && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {f.tags.map(tag => (
                      <span key={tag} className="text-[10px] bg-stone-200 text-slate-500 px-2 py-0.5 rounded-full">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── EUDR ──────────────────────────────────────────────────────────── */}
      <section id="eudr" className="py-24 px-6 bg-stone-50 border-y border-stone-200">
        <div className="max-w-7xl mx-auto">
          <div className="bg-green-800 rounded-3xl p-10 md:p-14 text-white overflow-hidden">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div ref={addRef} className="scroll-fade-left space-y-5">
                <div className="inline-flex items-center gap-2 bg-white/10 text-green-200 text-xs font-medium px-3 py-1.5 rounded-full">
                  <ShieldCheck size={12} />
                  Verordnung (EU) 2023/1115
                </div>
                <h2 className="text-3xl md:text-4xl font-bold leading-tight">
                  EUDR-Konformität<br />
                  <span className="text-green-300">ohne Mehraufwand.</span>
                </h2>
                <p className="text-green-100 leading-relaxed">
                  Die EU-Entwaldungsverordnung (EUDR, EU 2023/1115) verpflichtet
                  Holzproduzenten ab 2025 zur Sorgfaltserklärung. Forest Manager
                  erstellt Ihre Due-Diligence-Statements automatisch aus Waldpolygonen
                  und Einschlagsdaten — mit direkter Einreichung an die EU-Behörde.
                </p>
                <ul className="space-y-2.5 text-sm">
                  {[
                    'Sorgfaltserklärungen (DDS) erstellen & verwalten',
                    'Direkte Einreichung an die EU-Behörde',
                    'Herkunftsnachweise aus Ihren Waldpolygonen',
                    'Referenznummern automatisch auf Lieferscheinen',
                    'Satellitendaten als maschinenlesbarer Entwaldungsbeweis',
                  ].map(item => (
                    <li key={item} className="flex items-start gap-2.5 text-green-100">
                      <CheckCircle2 size={15} className="text-green-400 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div ref={addRef} className="scroll-fade-right space-y-3">
                {[
                  { step: '01', title: 'Waldpolygone einzeichnen', desc: 'Flächen auf der Karte definieren — werden automatisch als EU-konforme Herkunftsnachweise aufbereitet.' },
                  { step: '02', title: 'Erklärung erstellen & ausfüllen', desc: 'Baumart, Menge und Erntezeitraum eintragen — direkt aus Ihren Einschlagsdaten.' },
                  { step: '03', title: 'An EU-Behörde einreichen', desc: 'Ein Klick — die Meldung wird übermittelt und die Referenznummer zurückgegeben.' },
                  { step: '04', title: 'Lieferschein drucken', desc: 'Referenznummer erscheint automatisch auf allen Lieferscheinen des Holzverkaufs.' },
                ].map(s => (
                  <div key={s.step} className="flex gap-4 bg-white/10 rounded-xl p-4">
                    <span className="text-green-400 font-mono text-xs font-bold mt-0.5 shrink-0">{s.step}</span>
                    <div>
                      <p className="text-sm font-medium text-white">{s.title}</p>
                      <p className="text-xs text-green-200 mt-0.5 leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MONITORING ────────────────────────────────────────────────────── */}
      <section id="monitoring" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div ref={addRef} className="scroll-fade-left space-y-5">
              <p className="text-green-700 text-sm font-semibold uppercase tracking-widest">Satellitengestützte Waldüberwachung</p>
              <h2 className="text-3xl md:text-4xl font-bold leading-tight text-slate-900">
                Borkenkäfer, Sturm & Dürre<br />automatisch erkennen.
              </h2>
              <p className="text-slate-500 leading-relaxed">
                Forest Manager überwacht Ihren Wald per Sentinel-2 und Sentinel-1
                Satellit — wöchentlich und automatisch. Borkenkäferbefall, Sturmwürfe
                und Trockenstress werden erkannt, bevor Sie im Revier waren.
              </p>
              <div className="grid grid-cols-2 gap-3 pt-2">
                {[
                  { label: 'Radar-Analyse',      desc: 'Wöchentliche Veränderungserkennung' },
                  { label: 'Vitalitätsmessung',  desc: 'Monatliche Gesundheitsbewertung'    },
                  { label: 'Sturm-Erkennung',    desc: 'Automatische Alarme nach Unwettern' },
                  { label: 'Borkenkäfer-Risiko', desc: 'Temperatur & Niederschlag Index'    },
                ].map(item => (
                  <div key={item.label} className="bg-stone-50 border border-stone-200 rounded-xl p-4">
                    <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                    <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div ref={addRef} className="scroll-fade-right bg-stone-50 border border-stone-200 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Radio size={12} className="text-green-600" />
                Live-Monitoring · Automatisch aktualisiert
              </div>
              {[
                { forest: 'Revier Nord',   ndvi: '0.74', trend: '+2.1%', status: 'ok'   },
                { forest: 'Abteilung 12A', ndvi: '0.61', trend: '-4.3%', status: 'warn' },
                { forest: 'Südhanglage',   ndvi: '0.79', trend: '+0.8%', status: 'ok'   },
              ].map(row => (
                <div key={row.forest} className="flex items-center justify-between py-2 border-b border-stone-200 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{row.forest}</p>
                    <p className="text-xs text-slate-500">Vitalität {row.ndvi}</p>
                  </div>
                  <span className={`text-xs font-mono font-medium px-2 py-0.5 rounded-full ${
                    row.status === 'ok' ? 'text-green-700 bg-green-100' : 'text-amber-700 bg-amber-100'
                  }`}>
                    {row.trend}
                  </span>
                </div>
              ))}
              <p className="text-[10px] text-slate-400 text-center">Beispieldaten zur Illustration</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── PREISE ────────────────────────────────────────────────────────── */}
      <section id="preise" className="py-24 px-6 bg-stone-50 border-t border-stone-200">
        <div className="max-w-5xl mx-auto">
          <div ref={addRef} className="scroll-fade text-center mb-10 space-y-3">
            <p className="text-green-700 text-sm font-semibold uppercase tracking-widest">Preise der Forstmanagement Software</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Für jeden Forstbetrieb der passende Tarif.</h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              30 Tage kostenlos testen — keine Kreditkarte erforderlich.
              Alle Tarife beinhalten den vollen Funktionsumfang: GIS-Karte,
              Waldinventur, Satellitenmonitoring und EUDR.
            </p>
          </div>

          {/* Features-Block */}
          <div ref={addRef} className="scroll-fade bg-green-50 border border-green-100 rounded-2xl px-6 py-5 mb-8">
            <p className="text-xs font-bold text-green-700 uppercase tracking-wider mb-4">In jedem Paket enthalten</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {PLAN_FEATURES.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-start gap-2">
                  <Icon size={14} className="text-green-600 mt-0.5 shrink-0" />
                  <span className="text-xs text-slate-700 leading-snug">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Plan-Karten */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch mb-5">
            {PLANS.filter(p => !p.enterprise).map((plan, i) => {
              const db = dbPlans.find(d => d.name === plan.name);
              const monthlyPrice = db?.monthlyPrice?.toFixed(2).replace('.', ',') ?? plan.price;
              const maxHa = db?.maxHectares ?? null;
              const maxU = db?.maxUsers ?? null;
              return (
                <div
                  key={plan.name}
                  ref={addRef}
                  className={`scroll-fade stagger-${i + 1} relative bg-white rounded-2xl p-6 flex flex-col shadow-sm transition-all duration-200 border-2 ${
                    plan.highlight ? 'border-green-700 shadow-lg md:-translate-y-2' : 'border-slate-200'
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-green-700 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow">
                      {plan.badge}
                    </div>
                  )}
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${plan.iconBg}`}>
                    <plan.icon className={`w-5 h-5 ${plan.iconColor}`} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-0.5">{plan.name}</h3>
                  <p className="text-xs text-slate-400 mb-5">{plan.desc}</p>
                  <div className="mb-0.5 flex items-baseline gap-1">
                    <span className={`text-4xl font-bold ${plan.highlight ? 'text-green-700' : 'text-slate-900'}`}>{monthlyPrice} €</span>
                    <span className="text-slate-400 text-sm">/ Monat</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-5">zzgl. MwSt.</p>
                  <div className={`text-sm font-bold px-4 py-3 rounded-xl border text-center mb-4 ${plan.accentBg} ${plan.accentBorder} ${plan.accentText}`}>
                    {maxHa ? `bis ${maxHa} ha` : 'Unbegrenzte Fläche'}
                    {maxU && <span className="font-normal text-xs ml-2 opacity-75">· {maxU} {maxU === 1 ? 'Nutzer' : 'Nutzer'}</span>}
                  </div>
                  <div className="mt-auto">
                    <SignInButton
                      label="Jetzt 30 Tage kostenlos testen"
                      className={`w-full py-2.5 rounded-xl text-sm font-bold text-center transition-colors ${
                        plan.highlight
                          ? 'bg-green-700 text-white hover:bg-green-800'
                          : 'border-2 border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Enterprise-Banner */}
          <div ref={addRef} className="scroll-fade bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
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
            <EnterpriseContactButton />
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-green-700">
        <div ref={addRef} className="scroll-fade max-w-3xl mx-auto text-center space-y-6 text-white">
          <div className="w-14 h-14 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center mx-auto">
            <Trees size={28} className="text-green-200" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold">
            Bereit für den digitalen<br />Forstbetrieb?
          </h2>
          <p className="text-green-100">
            Erstellen Sie Ihren Account und richten Sie Ihren ersten Wald in wenigen Minuten ein.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <SignInButton
              label="Jetzt starten"
              className="flex items-center justify-center gap-2 bg-white text-green-800 hover:bg-green-50 font-semibold px-8 py-3.5 rounded-xl transition-colors"
            />
            <a
              href="mailto:kontakt@forest-manager.eu"
              className="flex items-center justify-center gap-2 text-green-100 hover:text-white px-8 py-3.5 rounded-xl border border-white/30 hover:border-white/60 transition-colors text-sm"
            >
              Kontakt aufnehmen
            </a>
          </div>
          <div className="flex items-center justify-center gap-5 pt-2 text-xs text-green-300">
            <span className="flex items-center gap-1.5"><Lock size={11} /> DSGVO-konform</span>
            <span className="flex items-center gap-1.5"><Globe size={11} /> Serverstandort Europa</span>
            <span className="flex items-center gap-1.5"><ShieldCheck size={11} /> EU-Entwaldungsverordnung</span>
          </div>
        </div>
      </section>
    </>
  );
}

// ─── Phone Frame Component ───────────────────────────────────────────────────
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: 'relative',
      background: 'linear-gradient(145deg, #3a3a3c 0%, #1c1c1e 35%, #2c2c2e 65%, #1c1c1e 100%)',
      borderRadius: 40,
      padding: 10,
      boxShadow: '0 30px 80px rgba(0,0,0,0.5), 0 10px 30px rgba(0,0,0,0.3)',
      width: 180,
    }}>
      {/* Side buttons */}
      <div style={{ position: 'absolute', left: -3, top: 65, width: 3, height: 22, background: 'linear-gradient(90deg, #111, #2c2c2e)', borderRadius: '3px 0 0 3px' }} />
      <div style={{ position: 'absolute', left: -3, top: 98, width: 3, height: 34, background: 'linear-gradient(90deg, #111, #2c2c2e)', borderRadius: '3px 0 0 3px' }} />
      <div style={{ position: 'absolute', left: -3, top: 140, width: 3, height: 34, background: 'linear-gradient(90deg, #111, #2c2c2e)', borderRadius: '3px 0 0 3px' }} />
      <div style={{ position: 'absolute', right: -3, top: 115, width: 3, height: 54, background: 'linear-gradient(270deg, #111, #2c2c2e)', borderRadius: '0 3px 3px 0' }} />

      {/* Screen */}
      <div style={{
        background: '#000',
        borderRadius: 30,
        overflow: 'hidden',
        position: 'relative',
        lineHeight: 0,
      }}>
        {/* Dynamic Island */}
        <div style={{
          position: 'absolute', top: 10, left: '50%',
          transform: 'translateX(-50%)',
          width: 80, height: 22,
          background: '#000',
          borderRadius: 14,
          zIndex: 10,
        }} />
        {children}
      </div>

      {/* Home indicator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 20 }}>
        <div style={{ width: 64, height: 3, background: 'rgba(255,255,255,0.2)', borderRadius: 2 }} />
      </div>

      {/* Glare */}
      <div style={{
        position: 'absolute', inset: 0,
        borderRadius: 40,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 50%)',
        pointerEvents: 'none',
      }} />
    </div>
  );
}

// ─── Plan data ───────────────────────────────────────────────────────────────
const PLAN_FEATURES = [
  { icon: Map,           label: 'Interaktive Forstkarte' },
  { icon: Crosshair,     label: 'POIs: Hochsitze, Wege, Hütten, Fahrzeuge' },
  { icon: ClipboardList, label: 'Aufgaben & Maßnahmenplanung' },
  { icon: Leaf,          label: 'Baum- & Holzpolterinventar (Mobile App)' },
  { icon: BarChart3,     label: 'Berichte & Kostencontrolling' },
  { icon: Satellite,     label: 'Satellitenmonitoring (Biomasse, NDVI)' },
  { icon: ShieldCheck,   label: 'Waldgesundheitsmonitoring' },
  { icon: Users,         label: 'Team-Einladungen & Rollen' },
];

const PLANS = [
  {
    name: 'Basis', desc: 'Für kleine Privatwälder', limit: 'bis 20 ha', users: '1 Nutzer',
    price: '4,90 €', badge: null, highlight: false, enterprise: false,
    icon: TreePine, iconBg: 'bg-blue-50', iconColor: 'text-blue-600',
    accentBg: 'bg-blue-50', accentBorder: 'border-blue-200', accentText: 'text-blue-700',
  },
  {
    name: 'Pro', desc: 'Für wachsende Forstbetriebe', limit: 'bis 100 ha', users: '3 Nutzer',
    price: '19,90 €', badge: 'Beliebt', highlight: true, enterprise: false,
    icon: Trees, iconBg: 'bg-green-50', iconColor: 'text-green-700',
    accentBg: 'bg-green-50', accentBorder: 'border-green-200', accentText: 'text-green-700',
  },
  {
    name: 'Expert', desc: 'Für professionelle Forstunternehmen', limit: 'bis 200 ha', users: '7 Nutzer',
    price: '39,90 €', badge: null, highlight: false, enterprise: false,
    icon: Mountain, iconBg: 'bg-violet-50', iconColor: 'text-violet-600',
    accentBg: 'bg-violet-50', accentBorder: 'border-violet-200', accentText: 'text-violet-700',
  },
  {
    name: 'Enterprise', desc: 'Kommunen & Verbände', limit: '', users: '',
    price: null, badge: null, highlight: false, enterprise: true,
    icon: Building2, iconBg: '', iconColor: '', accentBg: '', accentBorder: '', accentText: '',
  },
];

const FEATURES = [
  {
    title: 'Interaktive Karte',
    description: 'GIS-Layer für Waldpolygone, Einschlagsflächen, Wege, Kalamitäten, Habitate und POIs. Zeichnen, bearbeiten, verwalten.',
    icon: Map, iconBg: 'bg-blue-100', iconColor: 'text-blue-700',
    tags: ['Leaflet', 'GeoJSON', 'Sentinel'],
  },
  {
    title: 'Waldüberwachung',
    description: 'Automatische Überwachung per Satellit. Sturm-, Trockenheits- und Borkenkäfer-Alarme in Echtzeit — ohne manuellen Aufwand.',
    icon: Leaf, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-700',
    tags: ['Satellit', 'Vitalität', 'Alarme'],
  },
  {
    title: 'EU-Compliance',
    description: 'Sorgfaltserklärungen erstellen, bearbeiten und direkt bei der EU-Behörde einreichen. Referenznummern auf Lieferscheinen.',
    icon: ShieldCheck, iconBg: 'bg-green-100', iconColor: 'text-green-700',
    tags: ['EU 2023/1115', 'DDS', 'Einreichung'],
  },
  {
    title: 'Maßnahmen & Holzverkauf',
    description: 'Einschläge planen, Polter erfassen, Verkaufskontrakte anlegen und Abfuhrscheine (Lieferscheine) drucken.',
    icon: PackageOpen, iconBg: 'bg-orange-100', iconColor: 'text-orange-700',
    tags: ['Polter', 'Lieferscheine', 'PDF'],
  },
  {
    title: 'Aufgaben & Planung',
    description: 'Taskmanagement mit Zuweisung, Priorisierung, Kalender und wiederkehrenden Aufgaben für Ihr Forstteam.',
    icon: ClipboardList, iconBg: 'bg-violet-100', iconColor: 'text-violet-700',
    tags: ['Kalender', 'Aufgaben', 'Teams'],
  },
  {
    title: 'Mehrere Organisationen',
    description: 'Verwalten Sie mehrere Forstbetriebe in einer Plattform. Rollen, Berechtigungen und getrennte Daten.',
    icon: Trees, iconBg: 'bg-stone-200', iconColor: 'text-stone-600',
    tags: ['Mandanten', 'Rollen', 'RBAC'],
  },
];
