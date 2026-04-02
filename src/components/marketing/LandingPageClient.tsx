'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Map, Leaf, ShieldCheck, PackageOpen,
  ClipboardList, Trees, Radio, Wifi, Globe, ArrowUpRight,
  CheckCircle2,
  TreePine, Mountain, Building2,
  Crosshair, BarChart3, Satellite, Users,
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
interface Props { dbPlans: DbPlan[] }

/* ─── Scroll reveal ─────────────────────────────────────────────────────────── */
function useReveal() {
  const els = useRef<Set<HTMLElement>>(new Set());
  const ref = useCallback((el: HTMLElement | null) => { if (el) els.current.add(el); }, []);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
      }),
      { threshold: 0.1, rootMargin: '0px 0px -20px 0px' },
    );
    els.current.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return ref;
}

/* ─── Component ─────────────────────────────────────────────────────────────── */
export function LandingPageClient({ dbPlans }: Props) {
  const r = useReveal();

  return (
    <>
      <style>{`
        .fade { opacity: 0; transform: translateY(20px); transition: opacity .6s ease, transform .6s ease; }
        .fade.visible { opacity: 1; transform: translateY(0); }
        .d1{transition-delay:.06s} .d2{transition-delay:.12s} .d3{transition-delay:.18s}
        .d4{transition-delay:.24s} .d5{transition-delay:.30s} .d6{transition-delay:.36s}
      `}</style>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative pt-36 pb-24 px-6 overflow-hidden">
        {/* Satellite background */}
        <div className="absolute inset-0 z-0">
          <img src="/landing/satellite-roitzsch.png" alt="" className="w-full h-full object-cover opacity-[0.07]" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <p ref={r} className="fade text-[13px] text-stone-400 mb-6">
            Forstmanagement Software
          </p>
          <h1 ref={r} className="fade d1 text-4xl sm:text-5xl lg:text-[3.5rem] font-light tracking-tight leading-[1.15] text-stone-800 mb-6">
            Ihr Wald,<br />digital verwaltet.
          </h1>
          <p ref={r} className="fade d2 text-[15px] text-stone-400 leading-relaxed max-w-lg mx-auto mb-10">
            Waldinventur, GIS-Karte, Satellitenüberwachung und
            EUDR-Konformität — eine Plattform für Waldbesitzer,
            WBVen und Forstbetriebsgemeinschaften.
          </p>
          <div ref={r} className="fade d3 flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <SignInButton
              label="Kostenlos testen"
              className="text-[13px] text-white bg-stone-800 hover:bg-stone-700 px-6 py-2.5 rounded-lg transition-colors"
            />
            <a href="#features" className="text-[13px] text-stone-400 hover:text-stone-600 transition-colors">
              Mehr erfahren &darr;
            </a>
          </div>
          <div ref={r} className="fade d4 flex items-center justify-center gap-5 text-[11px] text-stone-300">
            <span>DSGVO-konform</span>
            <span className="w-px h-3 bg-stone-200" />
            <span>EUDR-ready</span>
            <span className="w-px h-3 bg-stone-200" />
            <span>Server in Europa</span>
          </div>
        </div>
      </section>

      {/* ── Screenshots ───────────────────────────────────────────────────── */}
      <section className="px-6 pb-32">
        <div className="max-w-6xl mx-auto">
          <div ref={r} className="fade mb-16 text-center">
            <p className="text-[11px] text-stone-300 uppercase tracking-widest mb-3">Desktop & Mobil</p>
            <p className="text-[15px] text-stone-400 max-w-md mx-auto">
              Erfassung im Revier per Smartphone. Auswertung am Schreibtisch. Funktioniert auch offline.
            </p>
          </div>

          {/* Desktop */}
          <div ref={r} className="fade d1 mb-12">
            <div className="rounded-xl overflow-hidden border border-stone-150" style={{ borderColor: 'rgb(231 229 228)' }}>
              <img
                src="/landing/desktop-screen.jpg"
                alt="Forest Manager — GIS-Karte mit Waldpolygonen, Wetterdaten und Polter-Details"
                className="w-full block"
              />
            </div>
          </div>

          {/* Mobile */}
          <div className="flex justify-center gap-6 sm:gap-10">
            <div ref={r} className="fade d2 w-44 sm:w-52">
              <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'rgb(231 229 228)' }}>
                <img src="/landing/mobile-tree.png" alt="Baumerfassung" className="w-full block" />
              </div>
              <p className="text-[11px] text-stone-300 text-center mt-3">Baumerfassung</p>
            </div>
            <div ref={r} className="fade d3 w-44 sm:w-52">
              <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'rgb(231 229 228)' }}>
                <img src="/landing/mobile-polter.png" alt="Poltererfassung" className="w-full block" />
              </div>
              <p className="text-[11px] text-stone-300 text-center mt-3">Poltererfassung</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trennlinie ────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6"><div className="h-px bg-stone-100" /></div>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section id="features" className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div ref={r} className="fade mb-16">
            <p className="text-[11px] text-stone-300 uppercase tracking-widest mb-3">Funktionen</p>
            <h2 className="text-2xl sm:text-3xl font-light text-stone-800 max-w-md">
              Alles, was Ihr Forstbetrieb braucht.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-14">
            {FEATURES.map((f, i) => (
              <div key={f.title} ref={r} className={`fade d${i + 1}`}>
                <f.icon size={18} className="text-green-600 mb-4" strokeWidth={1.5} />
                <h3 className="text-[15px] font-medium text-stone-800 mb-2">{f.title}</h3>
                <p className="text-[13px] text-stone-400 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trennlinie ────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6"><div className="h-px bg-stone-100" /></div>

      {/* ── EUDR ──────────────────────────────────────────────────────────── */}
      <section id="eudr" className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24">
            {/* Left */}
            <div ref={r} className="fade">
              <p className="text-[11px] text-stone-300 uppercase tracking-widest mb-3">EU 2023/1115</p>
              <h2 className="text-2xl sm:text-3xl font-light text-stone-800 mb-6">
                EUDR-Konformität,<br />ohne Mehraufwand.
              </h2>
              <p className="text-[15px] text-stone-400 leading-relaxed mb-8">
                Die EU-Entwaldungsverordnung verpflichtet Holzproduzenten ab 2025 zur
                Sorgfaltserklärung. Forest Manager erstellt Ihre Due-Diligence-Statements
                automatisch aus Waldpolygonen und Einschlagsdaten.
              </p>
              <ul className="space-y-3">
                {[
                  'Sorgfaltserklärungen erstellen & verwalten',
                  'Direkte Einreichung an die EU-Behörde',
                  'Herkunftsnachweise aus Waldpolygonen',
                  'Referenznummern auf Lieferscheinen',
                  'Satellitendaten als Entwaldungsbeweis',
                ].map(item => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2 size={14} className="text-green-600 mt-0.5 shrink-0" strokeWidth={1.5} />
                    <span className="text-[13px] text-stone-500">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right – steps */}
            <div ref={r} className="fade d2 space-y-6 lg:pt-10">
              {[
                { step: '01', title: 'Waldpolygone einzeichnen', desc: 'Flächen auf der Karte definieren — automatisch als EU-konforme Herkunftsnachweise aufbereitet.' },
                { step: '02', title: 'Erklärung ausfüllen', desc: 'Baumart, Menge und Erntezeitraum eintragen — direkt aus Ihren Einschlagsdaten.' },
                { step: '03', title: 'Einreichen', desc: 'Ein Klick — die Meldung wird übermittelt, die Referenznummer zurückgegeben.' },
                { step: '04', title: 'Lieferschein drucken', desc: 'Referenznummer erscheint automatisch auf allen Lieferscheinen.' },
              ].map((s) => (
                <div key={s.step} className="flex gap-5">
                  <span className="text-[11px] font-mono text-stone-300 mt-0.5 shrink-0 w-5">{s.step}</span>
                  <div>
                    <p className="text-[14px] font-medium text-stone-700 mb-1">{s.title}</p>
                    <p className="text-[13px] text-stone-400 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Trennlinie ────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6"><div className="h-px bg-stone-100" /></div>

      {/* ── Monitoring (dark section with scanner cards) ─────────────────── */}
      <section id="monitoring" className="py-28 px-6 bg-[#0a0f0a] relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl border-x border-white/5 pointer-events-none" />
        <div className="max-w-6xl mx-auto relative z-10">

          {/* Header */}
          <div className="flex flex-col md:flex-row items-end justify-between gap-8 mb-16">
            <div className="max-w-xl">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="flex items-center gap-2 text-emerald-400 font-mono text-xs tracking-widest uppercase mb-4"
              >
                <Satellite size={14} className="animate-pulse" />
                Satellitenüberwachung
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-3xl md:text-4xl font-light text-white leading-tight"
              >
                Borkenkäfer, Sturm & Dürre<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-600">
                  automatisch erkennen.
                </span>
              </motion.h2>
            </div>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-slate-400 max-w-sm text-sm"
            >
              Wöchentliche Überwachung per Sentinel-2 und Sentinel-1.
              Schäden werden erkannt, bevor Sie im Revier waren.
            </motion.p>
          </div>

          {/* Scanner Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {SATELLITE_PROJECTS.map((project, index) => (
              <motion.div
                key={project.location}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: index * 0.1, duration: 0.6, ease: "easeOut" }}
                className="group relative h-[400px] rounded-2xl overflow-hidden border border-white/10 bg-[#0d1a0d]"
              >
                {/* Background image */}
                <div className="absolute inset-0">
                  <img
                    src={project.image}
                    alt={project.location}
                    className="w-full h-full object-cover transition-all duration-700 grayscale brightness-50 group-hover:grayscale-0 group-hover:brightness-100 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-[#0d1a0d]/40 mix-blend-multiply transition-opacity duration-700 group-hover:opacity-0" />

                  {/* Scanner line */}
                  <motion.div
                    animate={{ top: ["-10%", "110%"] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 right-0 h-1 bg-emerald-500/50 blur-[2px] shadow-[0_0_15px_#4ade80] opacity-50 group-hover:opacity-20 pointer-events-none"
                  />
                </div>

                {/* HUD overlay */}
                <div className="absolute inset-0 p-5 flex flex-col justify-between z-10">
                  <div className="flex justify-between items-start">
                    <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-lg px-3 py-1.5 flex items-center gap-2">
                      <Wifi size={12} className="text-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-mono text-emerald-400 tracking-wider">LIVE</span>
                    </div>
                    <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-lg px-3 py-1.5 text-[10px] font-mono text-slate-300">
                      {project.coords}
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 bg-[#0a0f0a]/80 backdrop-blur-xl border border-white/10 rounded-xl" />
                    <div className="relative z-10 p-4">
                      <h3 className="text-lg font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors">
                        {project.location}
                      </h3>
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <div className="bg-black/20 rounded-lg p-2 border border-white/5">
                          <div className="text-[9px] text-slate-500 uppercase font-mono mb-1">Fläche</div>
                          <div className="text-sm font-bold text-white flex items-center gap-1">
                            <Trees size={13} className="text-emerald-500" /> {project.area}
                          </div>
                        </div>
                        <div className="bg-black/20 rounded-lg p-2 border border-white/5">
                          <div className="text-[9px] text-slate-500 uppercase font-mono mb-1">{project.metric.label}</div>
                          <div className="text-sm font-bold text-emerald-400">{project.metric.value}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Corner brackets */}
                <div className="absolute top-3 left-3 w-4 h-4 border-l-2 border-t-2 border-white/20 rounded-tl-sm pointer-events-none" />
                <div className="absolute top-3 right-3 w-4 h-4 border-r-2 border-t-2 border-white/20 rounded-tr-sm pointer-events-none" />
                <div className="absolute bottom-3 left-3 w-4 h-4 border-l-2 border-b-2 border-white/20 rounded-bl-sm pointer-events-none" />
                <div className="absolute bottom-3 right-3 w-4 h-4 border-r-2 border-b-2 border-white/20 rounded-br-sm pointer-events-none" />
              </motion.div>
            ))}
          </div>

          {/* Feature grid below cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16">
            {[
              { label: 'Radar-Analyse',      desc: 'Wöchentliche Veränderungserkennung' },
              { label: 'Vitalitätsmessung',  desc: 'Monatliche Gesundheitsbewertung'    },
              { label: 'Sturm-Erkennung',    desc: 'Automatische Alarme'               },
              { label: 'Borkenkäfer-Risiko', desc: 'Temperatur- & Niederschlag-Index'   },
            ].map(item => (
              <div key={item.label}>
                <p className="text-[13px] font-medium text-white">{item.label}</p>
                <p className="text-[12px] text-slate-500 mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trennlinie ────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6"><div className="h-px bg-stone-100" /></div>

      {/* ── Preise ────────────────────────────────────────────────────────── */}
      <section id="preise" className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div ref={r} className="fade mb-16">
            <p className="text-[11px] text-stone-300 uppercase tracking-widest mb-3">Preise</p>
            <h2 className="text-2xl sm:text-3xl font-light text-stone-800 mb-4 max-w-sm">
              Für jeden Forstbetrieb der passende Tarif.
            </h2>
            <p className="text-[15px] text-stone-400">
              30 Tage kostenlos — keine Kreditkarte nötig. Voller Funktionsumfang in jedem Tarif.
            </p>
          </div>

          {/* Included features */}
          <div ref={r} className="fade d1 mb-12">
            <p className="text-[11px] text-stone-300 uppercase tracking-widest mb-4">In jedem Paket</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {PLAN_FEATURES.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-start gap-2">
                  <Icon size={13} className="text-green-600 mt-0.5 shrink-0" strokeWidth={1.5} />
                  <span className="text-[12px] text-stone-500 leading-snug">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Cards */}
          <div className="grid sm:grid-cols-3 gap-6 mb-8">
            {PLANS.filter(p => !p.enterprise).map((plan, i) => {
              const db = dbPlans.find(d => d.name === plan.name);
              const price = db?.monthlyPrice?.toFixed(2).replace('.', ',') ?? plan.price;
              const maxHa = db?.maxHectares ?? null;
              const maxU = db?.maxUsers ?? null;
              return (
                <div
                  key={plan.name}
                  ref={r}
                  className={`fade d${i + 1} rounded-xl p-6 flex flex-col border ${
                    plan.highlight ? 'border-green-600' : ''
                  }`}
                  style={plan.highlight ? {} : { borderColor: 'rgb(231 229 228)' }}
                >
                  {plan.badge && (
                    <span className="text-[10px] text-green-600 font-medium mb-4">{plan.badge}</span>
                  )}
                  <h3 className="text-[15px] font-medium text-stone-800 mb-0.5">{plan.name}</h3>
                  <p className="text-[12px] text-stone-400 mb-5">{plan.desc}</p>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-2xl font-light text-stone-800">{price} €</span>
                    <span className="text-[12px] text-stone-400">/ Monat</span>
                  </div>
                  <p className="text-[11px] text-stone-300 mb-5">zzgl. MwSt.</p>
                  <p className="text-[12px] text-stone-500 mb-6">
                    {maxHa ? `bis ${maxHa} ha` : 'Unbegrenzte Fläche'}
                    {maxU ? ` · ${maxU} Nutzer` : ''}
                  </p>
                  <div className="mt-auto">
                    <SignInButton
                      label="Kostenlos testen"
                      className={`w-full py-2 rounded-lg text-[13px] text-center transition-colors ${
                        plan.highlight
                          ? 'bg-stone-800 text-white hover:bg-stone-700'
                          : 'border text-stone-600 hover:text-stone-800 hover:border-stone-300'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Enterprise */}
          <div ref={r} className="fade rounded-xl border p-5 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderColor: 'rgb(231 229 228)' }}>
            <div className="flex items-center gap-4">
              <Building2 size={18} className="text-stone-400 shrink-0" strokeWidth={1.5} />
              <div>
                <p className="text-[14px] font-medium text-stone-700">Enterprise</p>
                <p className="text-[12px] text-stone-400">Unbegrenzte Fläche &middot; Unbegrenzte Nutzer &middot; SLA &middot; API-Zugang</p>
              </div>
            </div>
            <EnterpriseContactButton />
          </div>
        </div>
      </section>

      {/* ── Trennlinie ────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6"><div className="h-px bg-stone-100" /></div>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="py-28 px-6">
        <div ref={r} className="fade max-w-xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-light text-stone-800 mb-4">
            Bereit für den digitalen Forstbetrieb?
          </h2>
          <p className="text-[15px] text-stone-400 mb-8">
            Erstellen Sie Ihren Account und richten Sie Ihren ersten Wald in wenigen Minuten ein.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <SignInButton
              label="Jetzt starten"
              className="text-[13px] text-white bg-stone-800 hover:bg-stone-700 px-6 py-2.5 rounded-lg transition-colors"
            />
            <a
              href="mailto:kontakt@forest-manager.eu"
              className="text-[13px] text-stone-400 hover:text-stone-600 px-6 py-2.5 transition-colors"
            >
              Kontakt aufnehmen
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

/* ─── Data ──────────────────────────────────────────────────────────────────── */
const PLAN_FEATURES = [
  { icon: Map,           label: 'Interaktive Forstkarte' },
  { icon: Crosshair,     label: 'POIs: Hochsitze, Wege, Hütten' },
  { icon: ClipboardList, label: 'Aufgaben & Maßnahmenplanung' },
  { icon: Leaf,          label: 'Baum- & Holzpolterinventar' },
  { icon: BarChart3,     label: 'Berichte & Controlling' },
  { icon: Satellite,     label: 'Satellitenmonitoring' },
  { icon: ShieldCheck,   label: 'Waldgesundheitsmonitoring' },
  { icon: Users,         label: 'Team-Einladungen & Rollen' },
];

const PLANS = [
  { name:'Basis', desc:'Kleine Privatwälder', price:'4,90 €', badge:null, highlight:false, enterprise:false, icon:TreePine },
  { name:'Pro', desc:'Wachsende Forstbetriebe', price:'19,90 €', badge:'Beliebt', highlight:true, enterprise:false, icon:Trees },
  { name:'Expert', desc:'Professionelle Forstunternehmen', price:'39,90 €', badge:null, highlight:false, enterprise:false, icon:Mountain },
  { name:'Enterprise', desc:'', price:null, badge:null, highlight:false, enterprise:true, icon:Building2 },
];

const FEATURES = [
  { title:'Interaktive Karte', description:'GIS-Layer für Waldpolygone, Einschlagsflächen, Wege, Kalamitäten, Habitate und POIs. Zeichnen, bearbeiten, verwalten.', icon:Map },
  { title:'Waldüberwachung', description:'Automatische Überwachung per Satellit. Sturm-, Trockenheits- und Borkenkäfer-Alarme — ohne manuellen Aufwand.', icon:Leaf },
  { title:'EU-Compliance', description:'Sorgfaltserklärungen erstellen, bearbeiten und direkt bei der EU-Behörde einreichen.', icon:ShieldCheck },
  { title:'Maßnahmen & Holzverkauf', description:'Einschläge planen, Polter erfassen, Verkaufskontrakte anlegen und Lieferscheine drucken.', icon:PackageOpen },
  { title:'Aufgaben & Planung', description:'Taskmanagement mit Zuweisung, Priorisierung, Kalender und wiederkehrenden Aufgaben.', icon:ClipboardList },
  { title:'Mehrere Organisationen', description:'Mehrere Forstbetriebe in einer Plattform. Rollen, Berechtigungen und getrennte Daten.', icon:Trees },
];

const SATELLITE_PROJECTS = [
  {
    location: 'Roitzsch, DE',
    coords: '51.62° N, 12.27° E',
    area: '340 ha',
    image: '/landing/satellite-roitzsch.png',
    metric: { label: 'NDVI Trend', value: '+2.1 %' },
  },
  {
    location: 'Gut Conow, DE',
    coords: '53.45° N, 11.18° E',
    area: '221 ha',
    image: '/landing/satellite-gutconow.png',
    metric: { label: 'Vitalität', value: 'NDVI 0.74' },
  },
  {
    location: 'Bogovic, HR',
    coords: '45.32° N, 15.87° E',
    area: '14 ha',
    image: '/landing/satellite-bogovic.png',
    metric: { label: 'CO₂-Speicher', value: '2.200 t' },
  },
];
