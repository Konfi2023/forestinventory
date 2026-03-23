import Link from 'next/link';

const LEGAL_LINKS = [
  { label: 'Datenschutz', href: '/datenschutz' },
  { label: 'Impressum',   href: '/impressum'   },
  { label: 'AGB',         href: '/agb'         },
];

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400">
      <div className="max-w-7xl mx-auto px-6 py-14">

        <div className="grid grid-cols-2 md:grid-cols-3 gap-10 mb-12">

          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-4">
            <Link href="/" className="flex items-center shrink-0">
              <svg height="28" viewBox="0 0 285 47" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ height: 28, width: 'auto' }}>
                <mask id="mask0_ftr" style={{ maskType: 'alpha' }} maskUnits="userSpaceOnUse" x="0" y="0" width="47" height="47">
                  <rect width="47" height="47" fill="#D9D9D9"/>
                </mask>
                <g mask="url(#mask0_ftr)">
                  <path d="M23.5116 43.4812C20.42 43.0973 17.6472 42.3101 15.1931 41.1194C12.7386 39.9287 10.6533 38.3753 8.93716 36.4591C7.22134 34.5425 5.90322 32.3142 4.9828 29.7743C4.06271 27.2347 3.587 24.4197 3.55566 21.3295C7.20828 21.6653 10.2886 22.2987 12.7965 23.2295C15.3045 24.1604 17.3453 25.4966 18.9188 27.2382C20.4926 28.9799 21.636 31.1753 22.3488 33.8246C23.0616 36.4742 23.4492 39.6931 23.5116 43.4812ZM23.4998 25.9639C22.7256 24.7902 21.6608 23.6485 20.3053 22.5387C18.9498 21.429 17.4078 20.4523 15.6792 19.6086C15.8829 18.2691 16.221 16.8708 16.6936 15.4138C17.1662 13.9568 17.7405 12.5126 18.4165 11.081C19.0928 9.64947 19.8627 8.26134 20.7263 6.91662C21.5896 5.57222 22.5102 4.33407 23.4881 3.20215C24.4738 4.34941 25.3983 5.59344 26.2616 6.93424C27.1252 8.27505 27.8971 9.66122 28.5773 11.0928C29.2572 12.524 29.8334 13.9663 30.306 15.4197C30.7786 16.8728 31.1168 18.2691 31.3204 19.6086C29.6075 20.4197 28.0773 21.3761 26.7296 22.478C25.3816 23.5799 24.305 24.7419 23.4998 25.9639ZM27.885 42.5573C27.7962 40.0852 27.5994 37.847 27.2946 35.8427C26.9897 33.8383 26.5359 31.975 25.9331 30.2526C27.5138 27.5779 29.7012 25.4335 32.4954 23.8195C35.2896 22.2058 38.9352 21.3758 43.4322 21.3295C43.3869 26.5647 41.9883 31.049 39.2365 34.7822C36.485 38.5155 32.7012 41.1072 27.885 42.5573Z" fill="#4ade80"/>
                </g>
                <text x="58" y="33" fill="#f8fafc" fontFamily="sans-serif" fontWeight="bold" fontSize="26" letterSpacing="-0.5">Forest</text>
                <rect x="141" y="20" width="9" height="4" rx="1" fill="#4ade80" />
                <text x="154" y="33" fill="#4ade80" fontFamily="sans-serif" fontWeight="bold" fontSize="26" letterSpacing="-0.5">Manager</text>
              </svg>
            </Link>
            <p className="text-sm leading-relaxed text-slate-500 max-w-xs">
              Digitales Forstmanagement für Waldbesitzer, Forstbetriebe und
              Waldbesitzervereinigungen in Europa.
            </p>
          </div>

          {/* Produkt */}
          <div>
            <p className="text-xs font-semibold text-white uppercase tracking-widest mb-4">Produkt</p>
            <ul className="space-y-2.5">
              {[
                { label: 'Funktionen',   href: '/#features'  },
                { label: 'EUDR',         href: '/#eudr'       },
                { label: 'Monitoring',   href: '/#monitoring' },
                { label: 'Preise',       href: '/#preise'     },
              ].map(item => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm hover:text-white transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Rechtliches */}
          <div>
            <p className="text-xs font-semibold text-white uppercase tracking-widest mb-4">Rechtliches</p>
            <ul className="space-y-2.5">
              {LEGAL_LINKS.map(item => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm hover:text-white transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Bottom row */}
        <div className="pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <p>© {new Date().getFullYear()} Forest Manager. Alle Rechte vorbehalten.</p>
          <p>DSGVO-konform · Serverstandort Europa · EU-Entwaldungsverordnung</p>
        </div>
      </div>
    </footer>
  );
}
