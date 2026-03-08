'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Trees, Menu, X } from 'lucide-react';
import { signIn } from 'next-auth/react';

const NAV_LINKS = [
  { label: 'Funktionen', href: '#features'  },
  { label: 'EUDR',       href: '#eudr'       },
  { label: 'Monitoring', href: '#monitoring' },
  { label: 'Preise',     href: '#preise'     },
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 bg-green-700 rounded-lg flex items-center justify-center">
            <Trees size={18} className="text-white" />
          </div>
          <span className="font-bold text-slate-900 text-lg tracking-tight">
            Forest<span className="text-green-700">Inventory</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map(link => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={() => signIn('keycloak')}
            className="text-sm text-slate-600 hover:text-slate-900 transition-colors px-3 py-1.5"
          >
            Einloggen
          </button>
          <button
            onClick={() => signIn('keycloak')}
            className="text-sm font-medium bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Kostenlos starten
          </button>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden text-slate-600 hover:text-slate-900 transition-colors"
          onClick={() => setOpen(o => !o)}
          aria-label="Menü"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden bg-white border-t border-stone-200 px-6 py-4 space-y-3">
          {NAV_LINKS.map(link => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block text-sm text-slate-600 hover:text-slate-900 py-1.5 transition-colors"
            >
              {link.label}
            </a>
          ))}
          <div className="pt-3 border-t border-stone-200 flex flex-col gap-2">
            <button onClick={() => signIn('keycloak')} className="text-sm text-slate-600 hover:text-slate-900 py-1.5 text-left">
              Einloggen
            </button>
            <button
              onClick={() => signIn('keycloak')}
              className="text-sm font-medium bg-green-700 text-white px-4 py-2.5 rounded-lg text-center"
            >
              Kostenlos starten
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
