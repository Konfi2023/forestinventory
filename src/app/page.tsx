import Link from 'next/link';

// Seite ist vollständig statisch – kein Session-Check im SSR.
// Eingeloggte Nutzer werden via Middleware (cookie-basiert) zum Dashboard geleitet.
export const dynamic = 'force-static';
import {
  Map, Leaf, ShieldCheck, PackageOpen,
  ClipboardList, Trees, Radio, Zap,
  ArrowRight, CheckCircle2, Globe, Lock,
} from 'lucide-react';
import { Header } from '@/components/marketing/Header';
import { Footer } from '@/components/marketing/Footer';
import { SignInButton } from '@/components/marketing/SignInButton';

export default function Home() {
  return (
    <div className="bg-white text-slate-800 min-h-screen">
      <Header />

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section className="pt-24 pb-16 px-6 bg-gradient-to-b from-green-50 to-white overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center pt-12">

            {/* Text */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 text-xs font-semibold px-3 py-1.5 rounded-full">
                <Zap size={12} />
                Für Waldbesitzer und WBVen in Deutschland
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight text-slate-900">
                Ihr digitaler<br />
                <span className="text-green-700">Forstbetrieb.</span>
              </h1>
              <p className="text-lg text-slate-600 leading-relaxed">
                Karte, Erntedaten, EU-Nachweispflichten, Waldüberwachung und
                Holzverkauf — alles in einer Plattform für moderne Forstwirtschaft.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <SignInButton
                  label="Jetzt kostenlos starten"
                  className="flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
                />
                <a
                  href="#features"
                  className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm px-6 py-3 rounded-xl border border-stone-300 hover:border-stone-400 transition-colors"
                >
                  Funktionen ansehen
                </a>
              </div>
              <div className="flex flex-wrap items-center gap-6 pt-2 text-xs text-slate-500">
                {[
                  'DSGVO-konform',
                  'EU-Entwaldungsverordnung',
                  'Serverstandort Deutschland',
                ].map(badge => (
                  <span key={badge} className="flex items-center gap-1.5">
                    <CheckCircle2 size={12} className="text-green-600" />
                    {badge}
                  </span>
                ))}
              </div>
            </div>

            {/* Hero image */}
            <div className="relative mt-8 md:mt-0">
              <img
                src="https://images.unsplash.com/photo-1448375240586-882707db888b?w=1200&auto=format&fit=crop&q=80"
                alt="Waldlandschaft"
                className="w-full aspect-[4/3] object-cover rounded-2xl shadow-md"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── APP SHOWCASE ──────────────────────────────────────────────────────── */}
      <section className="bg-stone-50 py-20 px-6 border-y border-stone-200 overflow-hidden">
        <div className="max-w-5xl mx-auto text-center space-y-4 mb-16">
          <p className="text-green-700 text-sm font-semibold uppercase tracking-widest">Die Anwendung</p>
          <h2 className="text-3xl font-bold text-slate-900">Desktop & Mobil — alles dabei.</h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            Ob am Schreibtisch oder draußen im Revier — ForestInventory läuft auf
            jedem Gerät, auch offline.
          </p>
        </div>

        {/* Device mockups */}
        <div className="max-w-6xl mx-auto relative flex items-center justify-center gap-0">

          {/* ── Desktop-Browser-Frame ───────────────────────── */}
          <div
            className="relative hidden md:flex flex-col"
            style={{
              transform: 'rotate(-4deg) translateY(32px)',
              zIndex: 1,
              filter: 'drop-shadow(0 40px 60px rgba(0,0,0,0.28))',
            }}
          >
            {/* macOS-style title bar */}
            <div style={{
              background: 'linear-gradient(180deg, #e8e8e8 0%, #d8d8d8 100%)',
              borderRadius: '14px 14px 0 0',
              padding: '10px 14px 0',
              borderTop: '1px solid #c0c0c0',
              borderLeft: '1px solid #c0c0c0',
              borderRight: '1px solid #c0c0c0',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                <div style={{ width: 13, height: 13, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #ff8080, #ff5f57)', boxShadow: '0 0 0 0.5px rgba(0,0,0,0.15)' }} />
                <div style={{ width: 13, height: 13, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #ffd080, #ffbd2e)', boxShadow: '0 0 0 0.5px rgba(0,0,0,0.15)' }} />
                <div style={{ width: 13, height: 13, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #7dde6d, #28c840)', boxShadow: '0 0 0 0.5px rgba(0,0,0,0.15)' }} />
                <div style={{ flex: 1, background: 'white', borderRadius: 6, height: 22, border: '1px solid #c8c8c8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 10, color: '#888', fontFamily: 'system-ui, sans-serif' }}>forestinventory.de/dashboard</span>
                </div>
              </div>
            </div>
            {/* Screen */}
            <div style={{
              border: '1px solid #c0c0c0',
              borderTop: 'none',
              borderRadius: '0 0 12px 12px',
              overflow: 'hidden',
              lineHeight: 0,
            }}>
              <img
                src="https://placehold.co/900x560/1a3d2b/4ade80?text=Desktop+Screenshot"
                alt="ForestInventory Desktop"
                style={{ width: 640, display: 'block' }}
              />
            </div>
            {/* Laptop base */}
            <div style={{
              height: 12,
              background: 'linear-gradient(180deg, #c8c8c8 0%, #b8b8b8 100%)',
              borderRadius: '0 0 4px 4px',
              margin: '0 -6px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            }} />
          </div>

          {/* ── iPhone-Frame (fotorealistisch) ──────────────── */}
          <div
            className="relative flex-shrink-0"
            style={{ transform: 'rotate(6deg)', zIndex: 2 }}
          >
            {/* Outer phone body */}
            <div style={{
              position: 'relative',
              background: 'linear-gradient(145deg, #3a3a3c 0%, #1c1c1e 35%, #2c2c2e 65%, #1c1c1e 100%)',
              borderRadius: 54,
              padding: 14,
              boxShadow: `
                0 0 0 1px rgba(255,255,255,0.18),
                inset 0 0 0 1px rgba(255,255,255,0.06),
                0 50px 120px rgba(0,0,0,0.55),
                0 15px 40px rgba(0,0,0,0.3)`,
            }}>
              {/* Mute button (left) */}
              <div style={{ position: 'absolute', left: -4, top: 88, width: 4, height: 28, background: 'linear-gradient(90deg, #111, #2c2c2e)', borderRadius: '3px 0 0 3px', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)' }} />
              {/* Volume up (left) */}
              <div style={{ position: 'absolute', left: -4, top: 130, width: 4, height: 44, background: 'linear-gradient(90deg, #111, #2c2c2e)', borderRadius: '3px 0 0 3px', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)' }} />
              {/* Volume down (left) */}
              <div style={{ position: 'absolute', left: -4, top: 186, width: 4, height: 44, background: 'linear-gradient(90deg, #111, #2c2c2e)', borderRadius: '3px 0 0 3px', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)' }} />
              {/* Power button (right) */}
              <div style={{ position: 'absolute', right: -4, top: 150, width: 4, height: 70, background: 'linear-gradient(270deg, #111, #2c2c2e)', borderRadius: '0 3px 3px 0', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)' }} />

              {/* Screen bezel */}
              <div style={{
                background: '#000',
                borderRadius: 40,
                overflow: 'hidden',
                position: 'relative',
                lineHeight: 0,
              }}>
                {/* Dynamic Island */}
                <div style={{
                  position: 'absolute', top: 14, left: '50%',
                  transform: 'translateX(-50%)',
                  width: 110, height: 30,
                  background: '#000',
                  borderRadius: 20,
                  zIndex: 10,
                  boxShadow: '0 0 0 2px #000',
                }} />
                <img
                  src="https://placehold.co/260x560/1a3d2b/4ade80?text=Mobile+App"
                  alt="ForestInventory Mobile"
                  style={{ width: 234, display: 'block' }}
                />
              </div>

              {/* Home indicator */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 28 }}>
                <div style={{ width: 96, height: 4, background: 'rgba(255,255,255,0.22)', borderRadius: 2 }} />
              </div>

              {/* Subtle glare on frame */}
              <div style={{
                position: 'absolute', inset: 0,
                borderRadius: 54,
                background: 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 50%)',
                pointerEvents: 'none',
              }} />
            </div>
          </div>

        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14 space-y-3">
            <p className="text-green-700 text-sm font-semibold uppercase tracking-widest">Funktionen</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Alles was Ihr Forstbetrieb braucht</h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Von der GIS-Karte bis zur EU-Einreichung — ForestInventory deckt den
              gesamten digitalen Betriebsablauf ab.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(f => (
              <div
                key={f.title}
                className="bg-stone-50 border border-stone-100 rounded-2xl p-6 space-y-3 hover:border-green-200 hover:bg-green-50/30 transition-colors group"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${f.iconBg}`}>
                  <f.icon size={20} className={f.iconColor} />
                </div>
                <h3 className="font-semibold text-slate-900">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.description}</p>
                {f.tags && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {f.tags.map(tag => (
                      <span key={tag} className="text-[10px] bg-stone-200 text-slate-500 px-2 py-0.5 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── EUDR ─────────────────────────────────────────────────────────────── */}
      <section id="eudr" className="py-24 px-6 bg-stone-50 border-y border-stone-200">
        <div className="max-w-7xl mx-auto">
          <div className="bg-green-800 rounded-3xl p-10 md:p-14 text-white">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 bg-white/10 text-green-200 text-xs font-medium px-3 py-1.5 rounded-full">
                  <ShieldCheck size={12} />
                  Verordnung (EU) 2023/1115
                </div>
                <h2 className="text-3xl md:text-4xl font-bold leading-tight">
                  EU-Compliance<br />
                  <span className="text-green-300">ohne Mehraufwand.</span>
                </h2>
                <p className="text-green-100 leading-relaxed">
                  Ab 1. Januar 2027 müssen Holzproduzenten Sorgfaltserklärungen
                  bei der EU einreichen. ForestInventory bereitet Sie jetzt darauf vor —
                  mit direkter Anbindung an die EU-Meldebehörde.
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

              <div className="space-y-3">
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

      {/* ── MONITORING ───────────────────────────────────────────────────────── */}
      <section id="monitoring" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-5">
              <p className="text-green-700 text-sm font-semibold uppercase tracking-widest">Waldüberwachung</p>
              <h2 className="text-3xl md:text-4xl font-bold leading-tight text-slate-900">
                Satellitendaten für<br />Ihren Wald.
              </h2>
              <p className="text-slate-500 leading-relaxed">
                Automatische Überwachung per Satellit — wöchentlich und monatlich.
                Sturmschäden, Borkenkäferbefall und ungewöhnliche Veränderungen werden
                sofort erkannt — ohne dass Sie etwas tun müssen.
              </p>
              <div className="grid grid-cols-2 gap-3 pt-2">
                {[
                  { label: 'Radar-Analyse',       desc: 'Wöchentliche Veränderungserkennung' },
                  { label: 'Vitalitätsmessung',   desc: 'Monatliche Gesundheitsbewertung'    },
                  { label: 'Sturm-Erkennung',     desc: 'Automatische Alarme nach Unwettern' },
                  { label: 'Borkenkäfer-Risiko',  desc: 'Temperatur & Niederschlag Index'    },
                ].map(item => (
                  <div key={item.label} className="bg-stone-50 border border-stone-200 rounded-xl p-4">
                    <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                    <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Radio size={12} className="text-green-600" />
                Live-Monitoring · Automatisch aktualisiert
              </div>
              {[
                { forest: 'Revier Nord',    ndvi: '0.74', trend: '+2.1%', status: 'ok'   },
                { forest: 'Abteilung 12A', ndvi: '0.61', trend: '-4.3%', status: 'warn' },
                { forest: 'Südhanglage',   ndvi: '0.79', trend: '+0.8%', status: 'ok'   },
              ].map(row => (
                <div key={row.forest} className="flex items-center justify-between py-2 border-b border-stone-200 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{row.forest}</p>
                    <p className="text-xs text-slate-500">Vitalität {row.ndvi}</p>
                  </div>
                  <span className={`text-xs font-mono font-medium px-2 py-0.5 rounded-full ${
                    row.status === 'ok'
                      ? 'text-green-700 bg-green-100'
                      : 'text-amber-700 bg-amber-100'
                  }`}>
                    {row.trend}
                  </span>
                </div>
              ))}
              <p className="text-[10px] text-slate-400 text-center">
                Beispieldaten zur Illustration
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── PREISE ───────────────────────────────────────────────────────────── */}
      <section id="preise" className="py-24 px-6 bg-stone-50 border-t border-stone-200">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14 space-y-3">
            <p className="text-green-700 text-sm font-semibold uppercase tracking-widest">Preise</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Einfach und transparent.</h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Starten Sie kostenlos — skalieren Sie mit Ihrem Betrieb.
              Alle Pläne beinhalten den vollen Funktionsumfang.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
            {PLANS.map(plan => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-6 flex flex-col gap-5 ${
                  plan.highlight
                    ? 'bg-green-800 text-white ring-2 ring-green-600 shadow-xl'
                    : 'bg-white border border-stone-200 shadow-sm'
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest whitespace-nowrap">
                    {plan.badge}
                  </span>
                )}

                <div>
                  <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${plan.highlight ? 'text-green-300' : 'text-green-700'}`}>
                    {plan.name}
                  </p>
                  <p className={`text-sm mb-1 ${plan.highlight ? 'text-green-200' : 'text-slate-500'}`}>
                    {plan.desc}
                  </p>
                  <p className={`text-xs font-medium mb-3 ${plan.highlight ? 'text-green-300' : 'text-green-700'}`}>
                    {plan.limit}
                  </p>
                  {plan.price ? (
                    <div className="flex items-end gap-1">
                      <span className={`text-3xl font-bold ${plan.highlight ? 'text-white' : 'text-slate-900'}`}>
                        {plan.price}
                      </span>
                      <span className={`text-sm mb-1 ${plan.highlight ? 'text-green-300' : 'text-slate-400'}`}>/Monat</span>
                    </div>
                  ) : (
                    <p className={`text-2xl font-bold ${plan.highlight ? 'text-white' : 'text-slate-900'}`}>
                      Auf Anfrage
                    </p>
                  )}
                  {plan.price && (
                    <p className={`text-xs mt-0.5 ${plan.highlight ? 'text-green-300' : 'text-slate-400'}`}>
                      zzgl. 19 % MwSt.
                    </p>
                  )}
                </div>

                <ul className="space-y-2 flex-1">
                  {PLAN_FEATURES.map(f => (
                    <li key={f} className={`flex items-start gap-2 text-sm ${plan.highlight ? 'text-green-100' : 'text-slate-600'}`}>
                      <CheckCircle2 size={14} className={`shrink-0 mt-0.5 ${plan.highlight ? 'text-green-400' : 'text-green-600'}`} />
                      {f}
                    </li>
                  ))}
                  <li className={`flex items-start gap-2 text-sm font-medium pt-1 border-t ${plan.highlight ? 'text-green-200 border-green-700' : 'text-slate-700 border-slate-100'}`}>
                    <CheckCircle2 size={14} className={`shrink-0 mt-0.5 ${plan.highlight ? 'text-green-300' : 'text-green-600'}`} />
                    {plan.support}
                  </li>
                </ul>

                <SignInButton
                  label={plan.cta}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold text-center transition-colors ${
                    plan.highlight
                      ? 'bg-white text-green-800 hover:bg-green-50'
                      : plan.enterprise
                      ? 'bg-stone-100 text-slate-700 hover:bg-stone-200'
                      : 'bg-green-700 text-white hover:bg-green-600'
                  }`}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-green-700">
        <div className="max-w-3xl mx-auto text-center space-y-6 text-white">
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
              href="mailto:kontakt@forestinventory.de"
              className="flex items-center justify-center gap-2 text-green-100 hover:text-white px-8 py-3.5 rounded-xl border border-white/30 hover:border-white/60 transition-colors text-sm"
            >
              Kontakt aufnehmen
            </a>
          </div>
          <div className="flex items-center justify-center gap-5 pt-2 text-xs text-green-300">
            <span className="flex items-center gap-1.5"><Lock size={11} /> DSGVO-konform</span>
            <span className="flex items-center gap-1.5"><Globe size={11} /> Serverstandort Deutschland</span>
            <span className="flex items-center gap-1.5"><ShieldCheck size={11} /> EU-Entwaldungsverordnung</span>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

// ─── Plan data ────────────────────────────────────────────────────────────────

const PLAN_FEATURES = [
  'Interaktive Forstkarte',
  'POIs: Hochsitze, Wege, Hütten, Fahrzeuge',
  'Aufgaben & Maßnahmenplanung',
  'Baum- & Holzpolterinventar (Mobile App)',
  'Berichte & Kostencontrolling',
  'Satellitenmonitoring (Biomasse, NDVI)',
  'Waldgesundheitsmonitoring',
  'Team-Einladungen & Rollen',
];

const PLANS = [
  {
    name:       'Basis',
    desc:       'Für kleine Privatwälder',
    limit:      'bis 20 ha · 1 Nutzer',
    price:      '4,90 €',
    badge:      null,
    highlight:  false,
    enterprise: false,
    support:    'E-Mail Support',
    cta:        'Kostenlos testen',
  },
  {
    name:       'Pro',
    desc:       'Für wachsende Forstbetriebe',
    limit:      'bis 100 ha · 3 Nutzer',
    price:      '19,90 €',
    badge:      'Beliebt',
    highlight:  true,
    enterprise: false,
    support:    'Prioritäts-Support',
    cta:        'Kostenlos testen',
  },
  {
    name:       'Expert',
    desc:       'Für professionelle Forstunternehmen',
    limit:      'bis 200 ha · 7 Nutzer',
    price:      '39,90 €',
    badge:      null,
    highlight:  false,
    enterprise: false,
    support:    'Telefonischer Support',
    cta:        'Kostenlos testen',
  },
  {
    name:       'Enterprise',
    desc:       'Kommunen & Verbände',
    limit:      'Unbegrenzte Fläche · Unbegrenzte Nutzer',
    price:      null,
    badge:      null,
    highlight:  false,
    enterprise: true,
    support:    'Dedizierter Support & SLA',
    cta:        'Kontakt aufnehmen',
  },
];

// ─── Feature data ─────────────────────────────────────────────────────────────

const FEATURES = [
  {
    title:       'Interaktive Karte',
    description: 'GIS-Layer für Waldpolygone, Einschlagsflächen, Wege, Kalamitäten, Habitate und POIs. Zeichnen, bearbeiten, verwalten.',
    icon:        Map,
    iconBg:      'bg-blue-100',
    iconColor:   'text-blue-700',
    tags:        ['Leaflet', 'GeoJSON', 'Sentinel'],
  },
  {
    title:       'Waldüberwachung',
    description: 'Automatische Überwachung per Satellit. Sturm-, Trockenheits- und Borkenkäfer-Alarme in Echtzeit — ohne manuellen Aufwand.',
    icon:        Leaf,
    iconBg:      'bg-emerald-100',
    iconColor:   'text-emerald-700',
    tags:        ['Satellit', 'Vitalität', 'Alarme'],
  },
  {
    title:       'EU-Compliance',
    description: 'Sorgfaltserklärungen erstellen, bearbeiten und direkt bei der EU-Behörde einreichen. Referenznummern auf Lieferscheinen.',
    icon:        ShieldCheck,
    iconBg:      'bg-green-100',
    iconColor:   'text-green-700',
    tags:        ['EU 2023/1115', 'DDS', 'Einreichung'],
  },
  {
    title:       'Maßnahmen & Holzverkauf',
    description: 'Einschläge planen, Polter erfassen, Verkaufskontrakte anlegen und Abfuhrscheine (Lieferscheine) drucken.',
    icon:        PackageOpen,
    iconBg:      'bg-orange-100',
    iconColor:   'text-orange-700',
    tags:        ['Polter', 'Lieferscheine', 'PDF'],
  },
  {
    title:       'Aufgaben & Planung',
    description: 'Taskmanagement mit Zuweisung, Priorisierung, Kalender und wiederkehrenden Aufgaben für Ihr Forstteam.',
    icon:        ClipboardList,
    iconBg:      'bg-violet-100',
    iconColor:   'text-violet-700',
    tags:        ['Kalender', 'Aufgaben', 'Teams'],
  },
  {
    title:       'Mehrere Organisationen',
    description: 'Verwalten Sie mehrere Forstbetriebe in einer Plattform. Rollen, Berechtigungen und getrennte Daten.',
    icon:        Trees,
    iconBg:      'bg-stone-200',
    iconColor:   'text-stone-600',
    tags:        ['Mandanten', 'Rollen', 'RBAC'],
  },
];
