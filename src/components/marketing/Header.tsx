'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { Menu, X } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useTranslations, useLocale } from 'next-intl';
import { LanguageSwitcher } from './LanguageSwitcher';

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const t = useTranslations('Header');
  const locale = useLocale();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const NAV_LINKS = [
    { label: t('product'),    href: '#produkt'   },
    { label: t('eudr'),       href: '#eudr'      },
    { label: t('pricing'),    href: '#preise'    },
  ];

  return (
    <header
      className={`sticky top-0 z-50 bg-[#efece2] transition-[border-color] duration-200 ${
        scrolled ? 'border-b border-[#e0dbc9]' : 'border-b border-transparent'
      }`}
    >
      <div className="max-w-[1240px] mx-auto px-8 flex items-center justify-between gap-8 py-5">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 text-[#1a1e17]">
          <BrandMark />
          <span className="text-[20px] font-medium tracking-[-0.02em]">ForestManager</span>
          <span className="font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.08em] text-[#8a8f83] ml-1">eu</span>
        </Link>

        {/* Middle nav */}
        <nav className="hidden md:flex items-center gap-7">
          {NAV_LINKS.map(link => (
            <a
              key={link.href}
              href={link.href}
              className="font-[family-name:var(--font-geist-mono)] text-[12px] tracking-[0.02em] text-[#4a5148] hover:text-[#1a1e17] transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right */}
        <div className="hidden md:flex items-center gap-3">
          <LanguageSwitcher />
          <button
            onClick={() => signIn('keycloak', undefined, { ui_locales: locale })}
            className="group inline-flex items-center gap-2 px-[18px] py-[10px] rounded-full text-[13px] bg-[#1a1e17] text-[#efece2] border border-[#1a1e17] hover:bg-[#2d3d2a] hover:border-[#2d3d2a] transition-colors"
          >
            <span>{t('getStarted')}</span>
            <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">→</span>
          </button>
        </div>

        <button
          className="md:hidden text-[#4a5148]"
          onClick={() => setOpen(o => !o)}
          aria-label="Menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-[#efece2] border-t border-[#e0dbc9] px-8 py-4 space-y-3">
          {NAV_LINKS.map(link => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block font-[family-name:var(--font-geist-mono)] text-[13px] text-[#4a5148] hover:text-[#1a1e17] py-1"
            >
              {link.label}
            </a>
          ))}
          <div className="pt-3 border-t border-[#e0dbc9] flex items-center justify-between">
            <LanguageSwitcher />
            <button
              onClick={() => signIn('keycloak', undefined, { ui_locales: locale })}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] bg-[#1a1e17] text-[#efece2]"
            >
              {t('getStarted')} →
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

function BrandMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 47 47" fill="none" aria-hidden="true">
      <path
        d="M23.5116 43.4812C20.42 43.0973 17.6472 42.3101 15.1931 41.1194C12.7386 39.9287 10.6533 38.3753 8.93716 36.4591C7.22134 34.5425 5.90322 32.3142 4.9828 29.7743C4.06271 27.2347 3.587 24.4197 3.55566 21.3295C7.20828 21.6653 10.2886 22.2987 12.7965 23.2295C15.3045 24.1604 17.3453 25.4966 18.9188 27.2382C20.4926 28.9799 21.636 31.1753 22.3488 33.8246C23.0616 36.4742 23.4492 39.6931 23.5116 43.4812ZM23.4998 25.9639C22.7256 24.7902 21.6608 23.6485 20.3053 22.5387C18.9498 21.429 17.4078 20.4523 15.6792 19.6086C15.8829 18.2691 16.221 16.8708 16.6936 15.4138C17.1662 13.9568 17.7405 12.5126 18.4165 11.081C19.0928 9.64947 19.8627 8.26134 20.7263 6.91662C21.5896 5.57222 22.5102 4.33407 23.4881 3.20215C24.4738 4.34941 25.3983 5.59344 26.2616 6.93424C27.1252 8.27505 27.8971 9.66122 28.5773 11.0928C29.2572 12.524 29.8334 13.9663 30.306 15.4197C30.7786 16.8728 31.1168 18.2691 31.3204 19.6086C29.6075 20.4197 28.0773 21.3761 26.7296 22.478C25.3816 23.5799 24.305 24.7419 23.4998 25.9639ZM27.885 42.5573C27.7962 40.0852 27.5994 37.847 27.2946 35.8427C26.9897 33.8383 26.5359 31.975 25.9331 30.2526C27.5138 27.5779 29.7012 25.4335 32.4954 23.8195C35.2896 22.2058 38.9352 21.3758 43.4322 21.3295C43.3869 26.5647 41.9883 31.049 39.2365 34.7822C36.485 38.5155 32.7012 41.1072 27.885 42.5573Z"
        fill="#2d3d2a"
      />
    </svg>
  );
}
