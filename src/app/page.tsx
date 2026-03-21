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

      {/* ── APP SCREENSHOT ────────────────────────────────────────────────────── */}
      <section className="bg-stone-50 py-16 px-6 border-y border-stone-200">
        <div className="max-w-5xl mx-auto text-center space-y-4 mb-10">
          <p className="text-green-700 text-sm font-semibold uppercase tracking-widest">Die Anwendung</p>
          <h2 className="text-3xl font-bold text-slate-900">Alles auf einen Blick</h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            Eine Oberfläche für Ihre gesamte Waldbewirtschaftung – übersichtlich,
            auch vom Smartphone aus nutzbar.
          </p>
        </div>
        <div className="max-w-5xl mx-auto">
          <img
            src="https://placehold.co/1280x720/1a3d2b/4ade80?text=App-Screenshot+einfügen"
            alt="ForestInventory App – Kartenansicht"
            className="w-full aspect-video object-cover rounded-2xl border border-stone-300 shadow-sm"
          />
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
        <div className="max-w-3xl mx-auto text-center space-y-5">
          <p className="text-green-700 text-sm font-semibold uppercase tracking-widest">Preise</p>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Einfach und transparent.</h2>
          <p className="text-slate-500">
            Starten Sie kostenlos — skalieren Sie mit Ihrem Betrieb.
            Preise auf Anfrage für größere Forstbetriebe und Forstbetriebsgemeinschaften.
          </p>
          <SignInButton
            label="Kostenlos loslegen"
            className="inline-flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors mt-2"
          />
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
