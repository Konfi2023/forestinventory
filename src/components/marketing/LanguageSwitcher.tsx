'use client';

import { useState, useRef, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { useLocale } from 'next-intl';
import { usePathname } from 'next/navigation';
import { routing } from '@/i18n/routing';

const LANGUAGES = [
  { code: 'de', label: 'DE' },
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
  { code: 'fr', label: 'FR' },
] as const;

export function LanguageSwitcher() {
  const locale = useLocale();
  const fullPathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function switchLocale(newLocale: string) {
    // Strip current locale prefix from pathname
    let path = fullPathname;
    const localePattern = new RegExp(`^/(${routing.locales.join('|')})(/|$)`);
    path = path.replace(localePattern, '/');
    if (path === '') path = '/';

    // Add new locale prefix (skip for default locale 'de')
    const newPath = newLocale === routing.defaultLocale ? path : `/${newLocale}${path === '/' ? '' : path}`;

    window.location.href = newPath;
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-[13px] text-slate-400 hover:text-white transition-colors"
        aria-label="Language"
      >
        <Globe size={14} />
        <span className="uppercase">{locale}</span>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 bg-[#0a0f0a] border border-white/10 rounded-lg shadow-xl overflow-hidden z-50 min-w-[80px]">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => switchLocale(lang.code)}
              className={`block w-full px-4 py-2 text-left text-[13px] transition-colors ${
                locale === lang.code
                  ? 'text-emerald-400 bg-white/5'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
