'use client';

import { useState, useRef, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';

const LANGUAGES = [
  { code: 'de', label: 'DE' },
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
  { code: 'fr', label: 'FR' },
] as const;

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
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
    router.replace(pathname, { locale: newLocale as 'de' | 'en' | 'es' | 'fr' });
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-[13px] text-slate-400 hover:text-white transition-colors"
        aria-label="Sprache wechseln"
      >
        <Globe size={14} />
        <span className="uppercase">{locale}</span>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 bg-[#0a0f0a] border border-white/10 rounded-lg shadow-xl overflow-hidden z-50">
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
