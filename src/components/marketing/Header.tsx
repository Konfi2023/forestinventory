'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
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
        <Link href="/" className="flex items-center shrink-0">
          <svg height="30" viewBox="0 0 285 47" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ height: 30, width: 'auto' }}>
            <g>
              <mask id="mask0_hdr" style={{ maskType: 'alpha' }} maskUnits="userSpaceOnUse" x="0" y="0" width="47" height="47">
                <rect width="47" height="47" fill="#D9D9D9"/>
              </mask>
              <g mask="url(#mask0_hdr)">
                <path d="M23.5116 43.4812C20.42 43.0973 17.6472 42.3101 15.1931 41.1194C12.7386 39.9287 10.6533 38.3753 8.93716 36.4591C7.22134 34.5425 5.90322 32.3142 4.9828 29.7743C4.06271 27.2347 3.587 24.4197 3.55566 21.3295C7.20828 21.6653 10.2886 22.2987 12.7965 23.2295C15.3045 24.1604 17.3453 25.4966 18.9188 27.2382C20.4926 28.9799 21.636 31.1753 22.3488 33.8246C23.0616 36.4742 23.4492 39.6931 23.5116 43.4812ZM23.4998 25.9639C22.7256 24.7902 21.6608 23.6485 20.3053 22.5387C18.9498 21.429 17.4078 20.4523 15.6792 19.6086C15.8829 18.2691 16.221 16.8708 16.6936 15.4138C17.1662 13.9568 17.7405 12.5126 18.4165 11.081C19.0928 9.64947 19.8627 8.26134 20.7263 6.91662C21.5896 5.57222 22.5102 4.33407 23.4881 3.20215C24.4738 4.34941 25.3983 5.59344 26.2616 6.93424C27.1252 8.27505 27.8971 9.66122 28.5773 11.0928C29.2572 12.524 29.8334 13.9663 30.306 15.4197C30.7786 16.8728 31.1168 18.2691 31.3204 19.6086C29.6075 20.4197 28.0773 21.3761 26.7296 22.478C25.3816 23.5799 24.305 24.7419 23.4998 25.9639ZM27.885 42.5573C27.7962 40.0852 27.5994 37.847 27.2946 35.8427C26.9897 33.8383 26.5359 31.975 25.9331 30.2526C27.5138 27.5779 29.7012 25.4335 32.4954 23.8195C35.2896 22.2058 38.9352 21.3758 43.4322 21.3295C43.3869 26.5647 41.9883 31.049 39.2365 34.7822C36.485 38.5155 32.7012 41.1072 27.885 42.5573Z" fill="#15803d"/>
              </g>
            </g>
            <text x="58" y="33" fill="#0f172a" fontFamily="sans-serif" fontWeight="bold" fontSize="26" letterSpacing="-0.5">Forest</text>
            <rect x="141" y="20" width="9" height="4" rx="1" fill="#15803d" />
            <text x="154" y="33" fill="#15803d" fontFamily="sans-serif" fontWeight="bold" fontSize="26" letterSpacing="-0.5">Manager</text>
          </svg>
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
