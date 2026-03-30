'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import {
  Map, Leaf, ShieldCheck, PackageOpen,
  ClipboardList, Trees, Radio, Zap,
  CheckCircle2, Globe, Lock, ArrowRight,
  TreePine, Mountain, Building2,
  Crosshair, BarChart3, Satellite, Users,
  Monitor, Smartphone, ChevronDown,
} from 'lucide-react';
import { SignInButton } from './SignInButton';
import { EnterpriseContactButton } from './EnterpriseContactButton';

/* ─── Types ─────────────────────────────────────────────────────────────────── */
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

/* ─── Scroll hook ───────────────────────────────────────────────────────────── */
function useScrollAnimations() {
  const deviceRef = useRef<HTMLDivElement>(null);
  const observerRefs = useRef<Set<HTMLElement>>(new Set());

  const addRef = useCallback((el: HTMLElement | null) => {
    if (el) observerRefs.current.add(el);
  }, []);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in-view');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -30px 0px' },
    );
    observerRefs.current.forEach((el) => io.observe(el));

    function onScroll() {
      if (!deviceRef.current) return;
      const rect = deviceRef.current.getBoundingClientRect();
      const vh = window.innerHeight;
      const center = rect.top + rect.height / 2;
      const progress = Math.max(0, Math.min(1, 1 - (center - vh * 0.5) / (vh * 0.7)));
      const pastCenter = Math.max(0, Math.min(1, (vh * 0.5 - center + rect.height * 0.2) / (vh * 0.4)));
      const rotateX = progress < 1 ? 50 * (1 - progress) : -6 * pastCenter;
      const scale = 0.82 + 0.18 * progress;
      const opacity = Math.min(1, progress * 2);
      deviceRef.current.style.transform = `perspective(1400px) rotateX(${rotateX}deg) scale(${scale})`;
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

/* ─── Component ─────────────────────────────────────────────────────────────── */
export function LandingPageClient({ dbPlans }: Props) {
  const { deviceRef, addRef } = useScrollAnimations();

  return (
    <>
      <style>{`
        /* ── reveal animations ──────────────────────── */
        .rv        { opacity:0; transform:translateY(48px); transition: opacity .75s cubic-bezier(.16,1,.3,1), transform .75s cubic-bezier(.16,1,.3,1); }
        .rv.in-view{ opacity:1; transform:translateY(0); }
        .rv-l      { opacity:0; transform:translateX(-64px); transition: opacity .75s cubic-bezier(.16,1,.3,1), transform .75s cubic-bezier(.16,1,.3,1); }
        .rv-l.in-view{ opacity:1; transform:translateX(0); }
        .rv-r      { opacity:0; transform:translateX(64px); transition: opacity .75s cubic-bezier(.16,1,.3,1), transform .75s cubic-bezier(.16,1,.3,1); }
        .rv-r.in-view{ opacity:1; transform:translateX(0); }
        .rv-s      { opacity:0; transform:scale(.92); transition: opacity .7s cubic-bezier(.16,1,.3,1), transform .7s cubic-bezier(.16,1,.3,1); }
        .rv-s.in-view{ opacity:1; transform:scale(1); }
        .d1{transition-delay:.07s} .d2{transition-delay:.14s} .d3{transition-delay:.21s}
        .d4{transition-delay:.28s} .d5{transition-delay:.35s} .d6{transition-delay:.42s}

        /* phone slide-in */
        .ph-l      { opacity:0; transform:translateX(-90px) rotate(-4deg); transition: opacity .85s cubic-bezier(.16,1,.3,1) .25s, transform .85s cubic-bezier(.16,1,.3,1) .25s; }
        .ph-l.in-view{ opacity:1; transform:translateX(0) rotate(-4deg); }
        .ph-r      { opacity:0; transform:translateX(90px) rotate(4deg); transition: opacity .85s cubic-bezier(.16,1,.3,1) .35s, transform .85s cubic-bezier(.16,1,.3,1) .35s; }
        .ph-r.in-view{ opacity:1; transform:translateX(0) rotate(4deg); }

        /* hero entrance */
        @keyframes fadeUp { from{opacity:0;transform:translateY(36px)} to{opacity:1;transform:translateY(0)} }
        .h-in { animation: fadeUp .85s cubic-bezier(.16,1,.3,1) forwards; }
        .hd1{animation-delay:.1s;opacity:0} .hd2{animation-delay:.2s;opacity:0}
        .hd3{animation-delay:.35s;opacity:0} .hd4{animation-delay:.5s;opacity:0}
        .hd5{animation-delay:.65s;opacity:0}

        /* scroll indicator bounce */
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(8px)} }
        .scroll-hint { animation: bounce 2.2s ease-in-out infinite; }

        /* gradient text */
        .grad-text {
          background: linear-gradient(135deg, #4ade80 0%, #22d3ee 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* glow ring */
        .glow-ring {
          box-shadow: 0 0 0 1px rgba(74,222,128,.15), 0 0 60px 10px rgba(74,222,128,.06);
        }

        /* bento hover */
        .bento-card {
          transition: transform .3s cubic-bezier(.16,1,.3,1), box-shadow .3s ease;
        }
        .bento-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(0,0,0,.08), 0 0 0 1px rgba(74,222,128,.2);
        }
      `}</style>

      {/* ════════════════════════════════════════════════════════════════════════
          HERO – full-screen dark with forest background
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950">
        {/* Background image with overlay */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&auto=format&fit=crop&q=80"
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/90 to-slate-950" />
        </div>

        {/* Ambient glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-green-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center pt-32 pb-24">
          <div className="h-in hd1 inline-flex items-center gap-2 bg-white/[0.06] backdrop-blur-sm border border-white/[0.08] text-green-400 text-xs font-semibold px-4 py-2 rounded-full mb-8">
            <Zap size={12} />
            Forstmanagement Software für Waldbesitzer und Forstbetriebe
          </div>

          <h1 className="h-in hd2 text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08] text-white mb-6">
            Ihr Wald.<br />
            <span className="grad-text">Digital verwaltet.</span>
          </h1>

          <p className="h-in hd3 text-lg sm:text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto mb-10">
            Digitale Waldinventur, GIS-Karte, Satellitenüberwachung und
            EUDR-Konformität — alles in einer Plattform für
            Waldbesitzer, WBVen und Forstbetriebsgemeinschaften.
          </p>

          <div className="h-in hd4 flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <SignInButton
              label="30 Tage kostenlos testen"
              className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold px-8 py-4 rounded-2xl transition-all text-sm shadow-lg shadow-green-600/25 hover:shadow-green-500/30 hover:-translate-y-0.5"
            />
            <a
              href="#showcase"
              className="flex items-center gap-2 text-slate-400 hover:text-white text-sm px-8 py-4 rounded-2xl border border-white/10 hover:border-white/25 transition-all hover:-translate-y-0.5 backdrop-blur-sm"
            >
              Funktionen entdecken
            </a>
          </div>

          <div className="h-in hd5 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500">
            {['DSGVO-konform', 'EUDR-ready (EU 2023/1115)', 'Serverstandort Europa'].map(b => (
              <span key={b} className="flex items-center gap-1.5">
                <CheckCircle2 size={12} className="text-green-500" />
                {b}
              </span>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-500">
          <span className="text-[10px] uppercase tracking-widest">Scrollen</span>
          <ChevronDown size={16} className="scroll-hint" />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════════
          SHOWCASE – 3D device reveal
      ════════════════════════════════════════════════════════════════════════ */}
      <section id="showcase" className="relative bg-slate-950 pt-20 pb-32 px-6 overflow-hidden">
        {/* Gradient divider top */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-green-500/30 to-transparent" />

        <div ref={addRef} className="rv max-w-3xl mx-auto text-center space-y-4 mb-20">
          <div className="inline-flex items-center gap-3 text-sm text-slate-500 mb-2">
            <Monitor size={16} className="text-green-500" />
            <span className="w-8 h-px bg-slate-700" />
            <Smartphone size={16} className="text-green-500" />
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
            Desktop & Mobil.<br />
            <span className="text-slate-500">Eine Plattform.</span>
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto text-lg">
            Waldinventur im Revier per Smartphone — Auswertung und EUDR-Einreichung
            am Schreibtisch. Läuft auch offline.
          </p>
        </div>

        {/* Device group */}
        <div className="max-w-6xl mx-auto relative" style={{ minHeight: 500 }}>
          {/* Desktop – 3D perspective */}
          <div
            ref={deviceRef}
            className="relative hidden md:block mx-auto"
            style={{ maxWidth: 880, transformOrigin: 'center bottom', opacity: 0, willChange: 'transform, opacity' }}
          >
            {/* Browser chrome */}
            <div className="rounded-t-2xl overflow-hidden" style={{ background: 'linear-gradient(180deg,#1e1e22,#18181b)', padding: '10px 14px 0', border: '1px solid rgba(255,255,255,.06)', borderBottom: 'none' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex gap-[6px]">
                  <div className="w-3 h-3 rounded-full" style={{ background: 'radial-gradient(circle at 35% 35%,#ff8080,#ff5f57)' }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: 'radial-gradient(circle at 35% 35%,#ffd080,#ffbd2e)' }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: 'radial-gradient(circle at 35% 35%,#7dde6d,#28c840)' }} />
                </div>
                <div className="flex-1 bg-white/[0.04] rounded-lg h-6 flex items-center justify-center border border-white/[0.04]">
                  <span className="text-[10px] text-slate-500 font-mono">forest-manager.eu/dashboard</span>
                </div>
              </div>
            </div>
            {/* Screen */}
            <div className="overflow-hidden rounded-b-xl" style={{ border: '1px solid rgba(255,255,255,.06)', borderTop: 'none', lineHeight: 0 }}>
              <img src="/landing/desktop-screen.jpg" alt="Forest Manager Desktop – GIS-Karte mit Waldpolygonen, Wetterdaten und Polter-Details" className="w-full block" />
            </div>
            {/* Base */}
            <div className="h-3 -mx-2 rounded-b" style={{ background: 'linear-gradient(180deg,#222,#1a1a1a)', boxShadow: '0 6px 24px rgba(0,0,0,.4)' }} />
            {/* Glow */}
            <div className="absolute -bottom-10 left-[15%] right-[15%] h-20" style={{ background: 'radial-gradient(ellipse,rgba(74,222,128,.12),transparent 70%)', pointerEvents: 'none' }} />
          </div>

          {/* Phones */}
          <div className="flex items-end justify-center gap-6 mt-10 md:mt-0 md:absolute md:inset-0 md:pointer-events-none" style={{ zIndex: 10 }}>
            <div ref={addRef} className="ph-l flex-shrink-0 md:absolute md:-left-4 lg:left-4 md:bottom-4">
              <PhoneFrame><img src="/landing/mobile-tree.png" alt="Forest Manager Mobile – Baumerfassung" className="w-full block" /></PhoneFrame>
            </div>
            <div ref={addRef} className="ph-r flex-shrink-0 md:absolute md:-right-4 lg:right-4 md:bottom-4">
              <PhoneFrame><img src="/landing/mobile-polter.png" alt="Forest Manager Mobile – Poltererfassung" className="w-full block" /></PhoneFrame>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════════
          FEATURES – Bento Grid
      ════════════════════════════════════════════════════════════════════════ */}
      <section id="features" className="py-28 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div ref={addRef} className="rv text-center mb-16 space-y-4">
            <p className="text-green-700 text-sm font-semibold uppercase tracking-widest">Funktionen</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900">
              Alles, was Ihr Forstbetrieb braucht.
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto text-lg">
              Von der GIS-gestützten Waldkarte über die digitale Waldinventur bis zur
              EU-Entwaldungsverordnung — alles in einer Software.
            </p>
          </div>

          {/* Bento grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                ref={addRef}
                className={`rv d${i + 1} bento-card group rounded-3xl p-8 ${
                  i === 0
                    ? 'lg:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 text-white'
                    : i === 3
                    ? 'lg:col-span-2 bg-gradient-to-br from-green-700 to-green-800 text-white'
                    : 'bg-stone-50 border border-stone-200'
                }`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${
                  i === 0 ? 'bg-white/10' : i === 3 ? 'bg-white/15' : f.iconBg
                }`}>
                  <f.icon size={22} className={i === 0 || i === 3 ? 'text-white' : f.iconColor} />
                </div>
                <h3 className={`text-xl font-bold mb-2 ${i === 0 || i === 3 ? '' : 'text-slate-900'}`}>{f.title}</h3>
                <p className={`leading-relaxed ${
                  i === 0 ? 'text-slate-300' : i === 3 ? 'text-green-100' : 'text-slate-500'
                }`}>{f.description}</p>
                {f.tags && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {f.tags.map(tag => (
                      <span key={tag} className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${
                        i === 0 ? 'bg-white/10 text-slate-300' : i === 3 ? 'bg-white/15 text-green-100' : 'bg-stone-200 text-slate-500'
                      }`}>{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════════
          EUDR
      ════════════════════════════════════════════════════════════════════════ */}
      <section id="eudr" className="py-28 px-6 bg-slate-950 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-green-500/20 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-green-500/20 to-transparent" />
        {/* Ambient */}
        <div className="absolute -left-40 top-1/3 w-80 h-80 bg-green-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left */}
            <div ref={addRef} className="rv-l space-y-6">
              <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium px-3 py-1.5 rounded-full">
                <ShieldCheck size={12} />
                Verordnung (EU) 2023/1115
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
                EUDR-Konformität<br />
                <span className="text-slate-500">ohne Mehraufwand.</span>
              </h2>
              <p className="text-slate-400 text-lg leading-relaxed">
                Die EU-Entwaldungsverordnung verpflichtet Holzproduzenten ab 2025 zur
                Sorgfaltserklärung. Forest Manager erstellt Ihre Due-Diligence-Statements
                automatisch — mit direkter Einreichung an die EU-Behörde.
              </p>
              <ul className="space-y-3">
                {[
                  'Sorgfaltserklärungen (DDS) erstellen & verwalten',
                  'Direkte Einreichung an die EU-Behörde',
                  'Herkunftsnachweise aus Ihren Waldpolygonen',
                  'Referenznummern automatisch auf Lieferscheinen',
                  'Satellitendaten als maschinenlesbarer Entwaldungsbeweis',
                ].map(item => (
                  <li key={item} className="flex items-start gap-3 text-slate-300">
                    <CheckCircle2 size={16} className="text-green-500 mt-0.5 shrink-0" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right – steps */}
            <div ref={addRef} className="rv-r space-y-4">
              {[
                { step: '01', title: 'Waldpolygone einzeichnen', desc: 'Flächen auf der Karte definieren — werden automatisch als EU-konforme Herkunftsnachweise aufbereitet.' },
                { step: '02', title: 'Erklärung erstellen & ausfüllen', desc: 'Baumart, Menge und Erntezeitraum eintragen — direkt aus Ihren Einschlagsdaten.' },
                { step: '03', title: 'An EU-Behörde einreichen', desc: 'Ein Klick — die Meldung wird übermittelt und die Referenznummer zurückgegeben.' },
                { step: '04', title: 'Lieferschein drucken', desc: 'Referenznummer erscheint automatisch auf allen Lieferscheinen des Holzverkaufs.' },
              ].map((s, i) => (
                <div key={s.step} className="group flex gap-5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded-2xl p-5 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                    <span className="text-green-400 font-mono text-xs font-bold">{s.step}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white mb-1">{s.title}</p>
                    <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════════
          MONITORING
      ════════════════════════════════════════════════════════════════════════ */}
      <section id="monitoring" className="py-28 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left text */}
            <div ref={addRef} className="rv-l space-y-6">
              <p className="text-green-700 text-sm font-semibold uppercase tracking-widest">Satellitengestützte Waldüberwachung</p>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-slate-900">
                Borkenkäfer, Sturm & Dürre<br />
                <span className="text-slate-400">automatisch erkennen.</span>
              </h2>
              <p className="text-slate-500 text-lg leading-relaxed">
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
                  <div key={item.label} className="bg-stone-50 border border-stone-200 rounded-2xl p-4">
                    <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                    <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right – live data card */}
            <div ref={addRef} className="rv-r">
              <div className="glow-ring bg-slate-950 rounded-3xl p-8 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Radio size={12} className="text-green-500" />
                    Live-Monitoring
                  </div>
                  <span className="text-[10px] text-slate-600 bg-slate-800 px-2 py-0.5 rounded-full">Automatisch aktualisiert</span>
                </div>
                {[
                  { forest: 'Revier Nord',   ndvi: '0.74', trend: '+2.1%', status: 'ok'   },
                  { forest: 'Abteilung 12A', ndvi: '0.61', trend: '-4.3%', status: 'warn' },
                  { forest: 'Südhanglage',   ndvi: '0.79', trend: '+0.8%', status: 'ok'   },
                ].map((row) => (
                  <div key={row.forest} className="flex items-center justify-between py-3 border-b border-white/[0.06] last:border-0">
                    <div>
                      <p className="text-sm font-medium text-white">{row.forest}</p>
                      <p className="text-xs text-slate-500">Vitalität {row.ndvi}</p>
                    </div>
                    <span className={`text-xs font-mono font-semibold px-3 py-1 rounded-lg ${
                      row.status === 'ok' ? 'text-green-400 bg-green-500/10' : 'text-amber-400 bg-amber-500/10'
                    }`}>{row.trend}</span>
                  </div>
                ))}
                <p className="text-[10px] text-slate-600 text-center pt-2">Beispieldaten zur Illustration</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════════
          PREISE
      ════════════════════════════════════════════════════════════════════════ */}
      <section id="preise" className="py-28 px-6 bg-stone-50">
        <div className="max-w-5xl mx-auto">
          <div ref={addRef} className="rv text-center mb-14 space-y-4">
            <p className="text-green-700 text-sm font-semibold uppercase tracking-widest">Preise</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900">
              Für jeden Forstbetrieb<br />der passende Tarif.
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto text-lg">
              30 Tage kostenlos testen — keine Kreditkarte nötig.
              Alle Tarife enthalten den vollen Funktionsumfang.
            </p>
          </div>

          {/* Feature block */}
          <div ref={addRef} className="rv bg-white border border-stone-200 rounded-3xl px-8 py-6 mb-8 shadow-sm">
            <p className="text-xs font-bold text-green-700 uppercase tracking-wider mb-5">In jedem Paket enthalten</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {PLAN_FEATURES.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-start gap-2.5">
                  <Icon size={15} className="text-green-600 mt-0.5 shrink-0" />
                  <span className="text-sm text-slate-600 leading-snug">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch mb-6">
            {PLANS.filter(p => !p.enterprise).map((plan, i) => {
              const db = dbPlans.find(d => d.name === plan.name);
              const monthlyPrice = db?.monthlyPrice?.toFixed(2).replace('.', ',') ?? plan.price;
              const maxHa = db?.maxHectares ?? null;
              const maxU = db?.maxUsers ?? null;
              return (
                <div
                  key={plan.name}
                  ref={addRef}
                  className={`rv d${i + 1} relative bg-white rounded-3xl p-7 flex flex-col transition-all duration-300 border-2 hover:-translate-y-1 ${
                    plan.highlight
                      ? 'border-green-600 shadow-xl shadow-green-600/10 md:-translate-y-2'
                      : 'border-stone-200 shadow-sm hover:shadow-lg'
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-green-600 text-white text-[10px] font-bold px-4 py-1 rounded-full uppercase tracking-wider shadow-lg shadow-green-600/25">
                      {plan.badge}
                    </div>
                  )}
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${plan.iconBg}`}>
                    <plan.icon className={`w-5 h-5 ${plan.iconColor}`} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-0.5">{plan.name}</h3>
                  <p className="text-sm text-slate-400 mb-6">{plan.desc}</p>
                  <div className="mb-1 flex items-baseline gap-1">
                    <span className={`text-4xl font-bold ${plan.highlight ? 'text-green-600' : 'text-slate-900'}`}>
                      {monthlyPrice} €
                    </span>
                    <span className="text-slate-400 text-sm">/ Monat</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-6">zzgl. MwSt.</p>
                  <div className={`text-sm font-bold px-4 py-3 rounded-2xl border text-center mb-5 ${plan.accentBg} ${plan.accentBorder} ${plan.accentText}`}>
                    {maxHa ? `bis ${maxHa} ha` : 'Unbegrenzte Fläche'}
                    {maxU && <span className="font-normal text-xs ml-2 opacity-75">· {maxU} Nutzer</span>}
                  </div>
                  <div className="mt-auto">
                    <SignInButton
                      label="Jetzt 30 Tage kostenlos testen"
                      className={`w-full py-3 rounded-2xl text-sm font-bold text-center transition-all ${
                        plan.highlight
                          ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-600/20'
                          : 'border-2 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Enterprise */}
          <div ref={addRef} className="rv bg-amber-50 border border-amber-200 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-amber-100 w-12 h-12 rounded-2xl flex items-center justify-center text-amber-600 shrink-0">
                <Building2 size={20} />
              </div>
              <div>
                <p className="text-slate-900 font-bold text-lg">Enterprise</p>
                <p className="text-sm text-slate-500 mt-0.5">
                  Unbegrenzte Fläche · Unbegrenzte Nutzer · Alle Funktionen · Individuelle SLA · API-Zugang
                </p>
              </div>
            </div>
            <EnterpriseContactButton />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════════
          FINAL CTA
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="relative py-28 px-6 bg-slate-950 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&auto=format&fit=crop&q=80"
            alt=""
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/95 to-slate-950/80" />
        </div>
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-green-500/8 rounded-full blur-[100px] pointer-events-none" />

        <div ref={addRef} className="rv-s relative z-10 max-w-3xl mx-auto text-center space-y-8">
          <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-3xl flex items-center justify-center mx-auto">
            <Trees size={30} className="text-green-400" />
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
            Bereit für den digitalen<br />Forstbetrieb?
          </h2>
          <p className="text-slate-400 text-lg max-w-lg mx-auto">
            Erstellen Sie Ihren Account und richten Sie Ihren ersten Wald in wenigen Minuten ein.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <SignInButton
              label="Jetzt starten"
              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold px-10 py-4 rounded-2xl transition-all shadow-lg shadow-green-600/25 hover:-translate-y-0.5"
            />
            <a
              href="mailto:kontakt@forest-manager.eu"
              className="flex items-center justify-center gap-2 text-slate-400 hover:text-white px-10 py-4 rounded-2xl border border-white/10 hover:border-white/25 transition-all text-sm"
            >
              Kontakt aufnehmen
            </a>
          </div>
          <div className="flex items-center justify-center gap-6 pt-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><Lock size={11} /> DSGVO-konform</span>
            <span className="flex items-center gap-1.5"><Globe size={11} /> Serverstandort Europa</span>
            <span className="flex items-center gap-1.5"><ShieldCheck size={11} /> EU-Entwaldungsverordnung</span>
          </div>
        </div>
      </section>
    </>
  );
}

/* ─── Phone frame ───────────────────────────────────────────────────────────── */
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative" style={{
      background: 'linear-gradient(145deg,#3a3a3c,#1c1c1e 35%,#2c2c2e 65%,#1c1c1e)',
      borderRadius: 36, padding: 8, width: 170,
      boxShadow: '0 30px 80px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.08)',
    }}>
      <div style={{ position:'absolute',left:-3,top:60,width:3,height:20,background:'#1c1c1e',borderRadius:'3px 0 0 3px' }} />
      <div style={{ position:'absolute',left:-3,top:90,width:3,height:32,background:'#1c1c1e',borderRadius:'3px 0 0 3px' }} />
      <div style={{ position:'absolute',left:-3,top:130,width:3,height:32,background:'#1c1c1e',borderRadius:'3px 0 0 3px' }} />
      <div style={{ position:'absolute',right:-3,top:108,width:3,height:50,background:'#1c1c1e',borderRadius:'0 3px 3px 0' }} />
      <div style={{ background:'#000', borderRadius:28, overflow:'hidden', position:'relative', lineHeight:0 }}>
        <div style={{ position:'absolute',top:8,left:'50%',transform:'translateX(-50%)',width:72,height:20,background:'#000',borderRadius:12,zIndex:10 }} />
        {children}
      </div>
      <div className="flex items-center justify-center" style={{ height: 18 }}>
        <div style={{ width: 56, height: 3, background: 'rgba(255,255,255,.18)', borderRadius: 2 }} />
      </div>
      <div style={{ position:'absolute',inset:0,borderRadius:36,background:'linear-gradient(135deg,rgba(255,255,255,.05),transparent 50%)',pointerEvents:'none' }} />
    </div>
  );
}

/* ─── Data ──────────────────────────────────────────────────────────────────── */
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
  { name:'Basis', desc:'Für kleine Privatwälder', limit:'bis 20 ha', users:'1 Nutzer',
    price:'4,90 €', badge:null, highlight:false, enterprise:false,
    icon:TreePine, iconBg:'bg-blue-50', iconColor:'text-blue-600',
    accentBg:'bg-blue-50', accentBorder:'border-blue-200', accentText:'text-blue-700' },
  { name:'Pro', desc:'Für wachsende Forstbetriebe', limit:'bis 100 ha', users:'3 Nutzer',
    price:'19,90 €', badge:'Beliebt', highlight:true, enterprise:false,
    icon:Trees, iconBg:'bg-green-50', iconColor:'text-green-700',
    accentBg:'bg-green-50', accentBorder:'border-green-200', accentText:'text-green-700' },
  { name:'Expert', desc:'Für professionelle Forstunternehmen', limit:'bis 200 ha', users:'7 Nutzer',
    price:'39,90 €', badge:null, highlight:false, enterprise:false,
    icon:Mountain, iconBg:'bg-violet-50', iconColor:'text-violet-600',
    accentBg:'bg-violet-50', accentBorder:'border-violet-200', accentText:'text-violet-700' },
  { name:'Enterprise', desc:'Kommunen & Verbände', limit:'', users:'',
    price:null, badge:null, highlight:false, enterprise:true,
    icon:Building2, iconBg:'', iconColor:'', accentBg:'', accentBorder:'', accentText:'' },
];

const FEATURES = [
  { title:'Interaktive Karte',
    description:'GIS-Layer für Waldpolygone, Einschlagsflächen, Wege, Kalamitäten, Habitate und POIs. Zeichnen, bearbeiten, verwalten — direkt im Browser.',
    icon:Map, iconBg:'bg-blue-100', iconColor:'text-blue-700',
    tags:['Leaflet','GeoJSON','Sentinel'] },
  { title:'Waldüberwachung',
    description:'Automatische Überwachung per Satellit. Sturm-, Trockenheits- und Borkenkäfer-Alarme in Echtzeit — ohne manuellen Aufwand.',
    icon:Leaf, iconBg:'bg-emerald-100', iconColor:'text-emerald-700',
    tags:['Satellit','Vitalität','Alarme'] },
  { title:'EU-Compliance',
    description:'Sorgfaltserklärungen erstellen, bearbeiten und direkt bei der EU-Behörde einreichen. Referenznummern auf Lieferscheinen.',
    icon:ShieldCheck, iconBg:'bg-green-100', iconColor:'text-green-700',
    tags:['EU 2023/1115','DDS','Einreichung'] },
  { title:'Maßnahmen & Holzverkauf',
    description:'Einschläge planen, Polter erfassen, Verkaufskontrakte anlegen und Abfuhrscheine drucken — von der Planung bis zum Lieferschein.',
    icon:PackageOpen, iconBg:'bg-orange-100', iconColor:'text-orange-700',
    tags:['Polter','Lieferscheine','PDF'] },
  { title:'Aufgaben & Planung',
    description:'Taskmanagement mit Zuweisung, Priorisierung, Kalender und wiederkehrenden Aufgaben für Ihr Forstteam.',
    icon:ClipboardList, iconBg:'bg-violet-100', iconColor:'text-violet-700',
    tags:['Kalender','Aufgaben','Teams'] },
  { title:'Mehrere Organisationen',
    description:'Verwalten Sie mehrere Forstbetriebe in einer Plattform. Rollen, Berechtigungen und getrennte Daten.',
    icon:Trees, iconBg:'bg-stone-200', iconColor:'text-stone-600',
    tags:['Mandanten','Rollen','RBAC'] },
];
