'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

/* ─── Component ─────────────────────────────────────────────────────────────── */
export function LandingPageClient({ dbPlans }: Props) {

  return (
    <>
      {/* ── Hero (2-Spalten: Text links, Scanner rechts) ─────────────────── */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src="/landing/satellite-roitzsch.png" alt="" className="w-full h-full object-cover opacity-[0.06]" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f0a] via-transparent to-[#0a0f0a]" />
        </div>
        <div className="relative z-10 max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text */}
          <div>
            <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              className="text-[13px] text-slate-500 mb-6 font-mono uppercase tracking-widest">
              Forstmanagement Software
            </motion.p>
            <motion.h1 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="text-4xl sm:text-5xl lg:text-[3.5rem] font-light tracking-tight leading-[1.15] text-white mb-6">
              Ihr Wald,<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-600">digital verwaltet.</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
              className="text-[15px] text-slate-400 leading-relaxed max-w-lg mb-10">
              Waldinventur, GIS-Karte, Satellitenüberwachung und
              EUDR-Konformität — eine Plattform für Waldbesitzer,
              WBVen und Forstbetriebsgemeinschaften.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
              className="flex flex-col sm:flex-row items-start gap-4 mb-8">
              <SignInButton
                label="Kostenlos testen"
                className="text-[13px] text-black bg-emerald-400 hover:bg-emerald-300 px-6 py-2.5 rounded-lg transition-colors font-medium"
              />
              <a href="#features" className="text-[13px] text-slate-400 hover:text-white transition-colors py-2.5">
                Mehr erfahren &darr;
              </a>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
              className="flex items-center gap-5 text-[11px] text-slate-500">
              <span>DSGVO-konform</span>
              <span className="w-px h-3 bg-white/10" />
              <span>EUDR-ready</span>
              <span className="w-px h-3 bg-white/10" />
              <span>Server in Europa</span>
            </motion.div>
          </div>

          {/* Right: Scanner Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
            className="group relative h-[420px] rounded-2xl overflow-hidden border border-white/10 bg-[#0d1a0d] hidden lg:block"
          >
            <div className="absolute inset-0">
              <img src="/landing/satellite-roitzsch.png" alt="Satellitenbild mit Waldpolygonen"
                className="w-full h-full object-cover transition-all duration-700 grayscale brightness-50 group-hover:grayscale-0 group-hover:brightness-100 group-hover:scale-105" />
              <div className="absolute inset-0 bg-[#0d1a0d]/40 mix-blend-multiply transition-opacity duration-700 group-hover:opacity-0" />
              <motion.div
                animate={{ top: ["-10%", "110%"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute left-0 right-0 h-1 bg-emerald-500/50 blur-[2px] shadow-[0_0_15px_#4ade80] opacity-50 group-hover:opacity-20 pointer-events-none"
              />
            </div>
            <div className="absolute inset-0 p-5 flex flex-col justify-between z-10">
              <div className="flex justify-between items-start">
                <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-lg px-3 py-1.5 flex items-center gap-2">
                  <Wifi size={12} className="text-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-mono text-emerald-400 tracking-wider">LIVE</span>
                </div>
                <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-lg px-3 py-1.5 text-[10px] font-mono text-slate-300">
                  51.62° N, 12.27° E
                </div>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-[#0a0f0a]/80 backdrop-blur-xl border border-white/10 rounded-xl" />
                <div className="relative z-10 p-4">
                  <h3 className="text-lg font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors">Roitzsch, DE</h3>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="bg-black/20 rounded-lg p-2 border border-white/5">
                      <div className="text-[9px] text-slate-500 uppercase font-mono mb-1">Fläche</div>
                      <div className="text-sm font-bold text-white flex items-center gap-1"><Trees size={13} className="text-emerald-500" /> 340 ha</div>
                    </div>
                    <div className="bg-black/20 rounded-lg p-2 border border-white/5">
                      <div className="text-[9px] text-slate-500 uppercase font-mono mb-1">NDVI Trend</div>
                      <div className="text-sm font-bold text-emerald-400">+2.1 %</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute top-3 left-3 w-4 h-4 border-l-2 border-t-2 border-white/20 rounded-tl-sm pointer-events-none" />
            <div className="absolute top-3 right-3 w-4 h-4 border-r-2 border-t-2 border-white/20 rounded-tr-sm pointer-events-none" />
            <div className="absolute bottom-3 left-3 w-4 h-4 border-l-2 border-b-2 border-white/20 rounded-bl-sm pointer-events-none" />
            <div className="absolute bottom-3 right-3 w-4 h-4 border-r-2 border-b-2 border-white/20 rounded-br-sm pointer-events-none" />
          </motion.div>
        </div>
      </section>

      {/* ── Features (direkt nach Hero) ─────────────────────────────────── */}
      <section id="features" className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex items-center gap-2 text-emerald-400 font-mono text-xs tracking-widest uppercase mb-4"
            >
              Funktionen
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-light text-white leading-tight max-w-md"
            >
              Alles, was Ihr Forstbetrieb{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-600">
                braucht.
              </span>
            </motion.h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-14">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
              >
                <f.icon size={18} className="text-emerald-400 mb-4" strokeWidth={1.5} />
                <h3 className="text-[15px] font-medium text-white mb-2">{f.title}</h3>
                <p className="text-[13px] text-slate-400 leading-relaxed">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Screenshot Carousel ─────────────────────────────────────────── */}
      <ScreenshotCarousel />

      <div className="max-w-6xl mx-auto px-6"><div className="h-px bg-white/5" /></div>

      {/* ── EUDR ──────────────────────────────────────────────────────────── */}
      <section id="eudr" className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs tracking-widest uppercase mb-4">
                EU 2023/1115
              </div>
              <h2 className="text-3xl md:text-4xl font-light text-white mb-6 leading-tight">
                EUDR-Konformität,<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-600">ohne Mehraufwand.</span>
              </h2>
              <p className="text-[15px] text-slate-400 leading-relaxed mb-8">
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
                    <CheckCircle2 size={14} className="text-emerald-400 mt-0.5 shrink-0" strokeWidth={1.5} />
                    <span className="text-[13px] text-slate-400">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.15 }}
              className="space-y-6 lg:pt-10">
              {[
                { step: '01', title: 'Waldpolygone einzeichnen', desc: 'Flächen auf der Karte definieren — automatisch als EU-konforme Herkunftsnachweise aufbereitet.' },
                { step: '02', title: 'Erklärung ausfüllen', desc: 'Baumart, Menge und Erntezeitraum eintragen — direkt aus Ihren Einschlagsdaten.' },
                { step: '03', title: 'Einreichen', desc: 'Ein Klick — die Meldung wird übermittelt, die Referenznummer zurückgegeben.' },
                { step: '04', title: 'Lieferschein drucken', desc: 'Referenznummer erscheint automatisch auf allen Lieferscheinen.' },
              ].map((s, i) => (
                <motion.div key={s.step} initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 + i * 0.08 }}
                  className="flex gap-5">
                  <span className="text-[11px] font-mono text-emerald-400/60 mt-0.5 shrink-0 w-5">{s.step}</span>
                  <div>
                    <p className="text-[14px] font-medium text-white mb-1">{s.title}</p>
                    <p className="text-[13px] text-slate-400 leading-relaxed">{s.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6"><div className="h-px bg-white/5" /></div>

      {/* ── Monitoring ────────────────────────────────────────────────────── */}
      <section id="monitoring" className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs tracking-widest uppercase mb-4">
                <Satellite size={14} className="animate-pulse" />
                Satellitenüberwachung
              </div>
              <h2 className="text-3xl md:text-4xl font-light text-white mb-6 leading-tight">
                Borkenkäfer, Sturm & Dürre<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-600">
                  automatisch erkennen.
                </span>
              </h2>
              <p className="text-[15px] text-slate-400 leading-relaxed mb-8">
                Wöchentliche Überwachung per Sentinel-2 und Sentinel-1.
                Borkenkäferbefall, Sturmwürfe und Trockenstress
                werden erkannt, bevor Sie im Revier waren.
              </p>
              <div className="grid grid-cols-2 gap-6">
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
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.15 }}
              className="lg:pt-10 space-y-4">
              <div className="rounded-xl overflow-hidden border border-white/10 shadow-lg">
                <img src="/landing/satellite-roitzsch.png" alt="Satellitenbild mit Waldpolygonen" className="w-full block" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl overflow-hidden border border-white/10 shadow-lg">
                  <img src="/landing/satellite-gutconow.png" alt="Satellitenbild Wald" className="w-full block" />
                </div>
                <div className="rounded-xl overflow-hidden border border-white/10 shadow-lg">
                  <img src="/landing/satellite-bogovic.png" alt="Satellitenbild Wald" className="w-full block" />
                </div>
              </div>
              <p className="text-[10px] text-slate-600 text-center">Echte Satellitenbilder aus dem Forest Manager</p>
            </motion.div>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6"><div className="h-px bg-white/5" /></div>

      {/* ── Preise ────────────────────────────────────────────────────────── */}
      <section id="preise" className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-16">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className="flex items-center gap-2 text-emerald-400 font-mono text-xs tracking-widest uppercase mb-4">
              Preise
            </motion.div>
            <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="text-3xl md:text-4xl font-light text-white mb-4 max-w-sm leading-tight">
              Für jeden Forstbetrieb der{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-600">passende Tarif.</span>
            </motion.h2>
            <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
              className="text-[15px] text-slate-400">
              30 Tage kostenlos — keine Kreditkarte nötig. Voller Funktionsumfang in jedem Tarif.
            </motion.p>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-12">
            <p className="text-[11px] text-slate-500 uppercase tracking-widest mb-4">In jedem Paket</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {PLAN_FEATURES.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-start gap-2">
                  <Icon size={13} className="text-emerald-400 mt-0.5 shrink-0" strokeWidth={1.5} />
                  <span className="text-[12px] text-slate-400 leading-snug">{label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-6 mb-8">
            {PLANS.filter(p => !p.enterprise).map((plan, i) => {
              const db = dbPlans.find(d => d.name === plan.name);
              const price = db?.monthlyPrice?.toFixed(2).replace('.', ',') ?? plan.price;
              const maxHa = db?.maxHectares ?? null;
              const maxU = db?.maxUsers ?? null;
              return (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`rounded-xl p-6 flex flex-col border ${
                    plan.highlight ? 'border-emerald-500' : 'border-white/10'
                  }`}
                >
                  {plan.badge && (
                    <span className="text-[10px] text-emerald-400 font-medium mb-4">{plan.badge}</span>
                  )}
                  <h3 className="text-[15px] font-medium text-white mb-0.5">{plan.name}</h3>
                  <p className="text-[12px] text-slate-500 mb-5">{plan.desc}</p>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-2xl font-light text-white">{price} €</span>
                    <span className="text-[12px] text-slate-500">/ Monat</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mb-5">zzgl. MwSt.</p>
                  <p className="text-[12px] text-slate-400 mb-6">
                    {maxHa ? `bis ${maxHa} ha` : 'Unbegrenzte Fläche'}
                    {maxU ? ` · ${maxU} Nutzer` : ''}
                  </p>
                  <div className="mt-auto">
                    <SignInButton
                      label="Kostenlos testen"
                      className={`w-full py-2 rounded-lg text-[13px] text-center transition-colors ${
                        plan.highlight
                          ? 'bg-emerald-500 text-black hover:bg-emerald-400 font-medium'
                          : 'border border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                      }`}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="rounded-xl border border-white/10 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Building2 size={18} className="text-slate-500 shrink-0" strokeWidth={1.5} />
              <div>
                <p className="text-[14px] font-medium text-white">Enterprise</p>
                <p className="text-[12px] text-slate-500">Unbegrenzte Fläche &middot; Unbegrenzte Nutzer &middot; SLA &middot; API-Zugang</p>
              </div>
            </div>
            <EnterpriseContactButton />
          </motion.div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6"><div className="h-px bg-white/5" /></div>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="py-28 px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="max-w-xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-light text-white mb-4">
            Bereit für den digitalen Forstbetrieb?
          </h2>
          <p className="text-[15px] text-slate-400 mb-8">
            Erstellen Sie Ihren Account und richten Sie Ihren ersten Wald in wenigen Minuten ein.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <SignInButton
              label="Jetzt starten"
              className="text-[13px] text-black bg-emerald-400 hover:bg-emerald-300 px-6 py-2.5 rounded-lg transition-colors font-medium"
            />
            <a
              href="mailto:kontakt@forest-manager.eu"
              className="text-[13px] text-slate-400 hover:text-white px-6 py-2.5 transition-colors"
            >
              Kontakt aufnehmen
            </a>
          </div>
        </motion.div>
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

const CAROUSEL_SLIDES = [
  { src: '/landing/slide-ndvi.png', num: '01', title: 'Biomasse-\nMonitoring.', subtitle: 'NDVI-Karte mit Sentinel-2 Satellitendaten — Waldvitalität auf einen Blick.' },
  { src: '/landing/slide-task.png', num: '02', title: 'Aufgaben\nim Revier.', subtitle: 'Aufgaben mit Standort, Foto und Beschreibung — direkt auf der Karte.' },
  { src: '/landing/slide-monitoring.png', num: '03', title: 'Klima &\nBorkenkäfer.', subtitle: 'NDVI-Jahresvergleich, Temperatur, Niederschlag und Borkenkäfer-Risiko.' },
  { src: '/landing/slide-forsteinrichtung.png', num: '04', title: 'Forst-\neinrichtung.', subtitle: 'Abteilungsweise Bestandserfassung mit Probekreisen und Ertragstafeln.' },
];

function ScreenshotCarousel() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const next = useCallback(() => { setDirection(1); setCurrent(i => (i + 1) % CAROUSEL_SLIDES.length); }, []);
  const prev = useCallback(() => { setDirection(-1); setCurrent(i => (i - 1 + CAROUSEL_SLIDES.length) % CAROUSEL_SLIDES.length); }, []);

  useEffect(() => {
    const id = setInterval(next, 6000);
    return () => clearInterval(id);
  }, [next]);

  const slide = CAROUSEL_SLIDES[current];

  return (
    <section className="relative h-[85vh] min-h-[600px] overflow-hidden">
      {/* Background image */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
          className="absolute inset-0"
        >
          <img src={slide.src} alt={slide.title} className="w-full h-full object-cover" />
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0f0a] via-[#0a0f0a]/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f0a]/80 via-transparent to-[#0a0f0a]/40" />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="relative z-10 h-full max-w-6xl mx-auto px-6 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            {/* Number */}
            <span className="text-[8rem] sm:text-[10rem] font-bold leading-none text-white/[0.04] absolute top-8 left-6 select-none pointer-events-none">
              {slide.num}
            </span>

            {/* Title */}
            <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.05] whitespace-pre-line mb-6 max-w-lg">
              {slide.title}
            </h2>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-slate-400 max-w-md mb-10">
              {slide.subtitle}
            </p>

            {/* Slide indicator */}
            <div className="flex items-center gap-4">
              {CAROUSEL_SLIDES.map((_, i) => (
                <button key={i} onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }}
                  className="relative h-[2px] w-12 bg-white/10 overflow-hidden rounded-full">
                  {current === i && (
                    <motion.div
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 6, ease: 'linear' }}
                      className="absolute inset-y-0 left-0 bg-emerald-400 rounded-full"
                    />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Nav arrows */}
      <button onClick={prev}
        className="absolute left-6 bottom-8 z-20 bg-white/5 backdrop-blur-md border border-white/10 rounded-full w-11 h-11 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <button onClick={next}
        className="absolute left-20 bottom-8 z-20 bg-white/5 backdrop-blur-md border border-white/10 rounded-full w-11 h-11 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </section>
  );
}

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
