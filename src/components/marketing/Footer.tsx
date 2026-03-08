import Link from 'next/link';
import { Trees } from 'lucide-react';

const LINKS = {
  Produkt: [
    { label: 'Vorteile',        href: '#vorteile'   },
    { label: 'So funktioniert\'s', href: '#so-gehts' },
    { label: 'Rechtssicherheit', href: '#sicherheit' },
    { label: 'Preise',          href: '#preise'      },
  ],
  Rechtliches: [
    { label: 'Datenschutz',   href: '/datenschutz'   },
    { label: 'Impressum',     href: '/impressum'     },
    { label: 'AGB',           href: '/agb'           },
  ],
  Unterstützung: [
    { label: 'Dokumentation', href: '/docs'          },
    { label: 'Kontakt',       href: '/kontakt'       },
    { label: 'Status',        href: '/status'        },
  ],
};

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400">
      <div className="max-w-7xl mx-auto px-6 py-14">

        {/* Top row: brand + links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">

          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-green-600 rounded-md flex items-center justify-center">
                <Trees size={15} className="text-white" />
              </div>
              <span className="font-bold text-white tracking-tight">
                Forest<span className="text-green-400">Inventory</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-slate-500 max-w-xs">
              Digitales Forstmanagement für Waldbesitzer, Forstbetriebe und
              Waldbesitzervereinigungen – entwickelt in Deutschland.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(LINKS).map(([category, items]) => (
            <div key={category}>
              <p className="text-xs font-semibold text-white uppercase tracking-widest mb-4">
                {category}
              </p>
              <ul className="space-y-2.5">
                {items.map(item => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-sm hover:text-white transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom row */}
        <div className="pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <p>© {new Date().getFullYear()} ForestInventory. Alle Rechte vorbehalten.</p>
          <p>DSGVO-konform · Serverstandort Deutschland · EU-Entwaldungsverordnung</p>
        </div>
      </div>
    </footer>
  );
}
