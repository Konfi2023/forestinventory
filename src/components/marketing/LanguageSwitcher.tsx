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

// Reverse lookup: localized path → canonical path key
const LOCALIZED_PATHS: Record<string, string> = {};
const pathnames = routing.pathnames as Record<string, string | Record<string, string>>;
for (const [canonical, localized] of Object.entries(pathnames)) {
  if (typeof localized === 'object') {
    for (const [, localPath] of Object.entries(localized)) {
      LOCALIZED_PATHS[localPath] = canonical;
    }
  }
}

// Forward lookup: canonical path → localized path for a locale
function getLocalizedPath(canonicalPath: string, locale: string): string {
  const entry = pathnames[canonicalPath];
  if (!entry) return canonicalPath;
  if (typeof entry === 'string') return entry;
  return (entry as Record<string, string>)[locale] ?? canonicalPath;
}

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
    // Set NEXT_LOCALE cookie so next-intl middleware respects the choice
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=${365 * 24 * 60 * 60};SameSite=Lax`;

    // Strip current locale prefix
    let path = fullPathname;
    const localePattern = new RegExp(`^/(${routing.locales.join('|')})(/|$)`);
    const match = path.match(localePattern);
    if (match) {
      path = path.replace(localePattern, '/');
    }
    if (path === '' || path === '/') path = '/';

    // Resolve canonical path (e.g. /privacy → /datenschutz canonical key)
    const canonical = LOCALIZED_PATHS[path] ?? path;

    // Get localized path for target locale
    const localizedPath = getLocalizedPath(canonical, newLocale);

    // Build full URL — always use explicit locale prefix for non-default
    let newPath: string;
    if (newLocale === routing.defaultLocale) {
      newPath = localizedPath;
    } else {
      newPath = `/${newLocale}${localizedPath === '/' ? '' : localizedPath}`;
    }

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
