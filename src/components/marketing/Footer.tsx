import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

export function Footer() {
  const t = useTranslations('Footer');

  return (
    <footer className="border-t border-[#e0dbc9] py-10 bg-[#efece2]">
      <div className="max-w-[1240px] mx-auto px-8 flex flex-wrap items-center justify-between gap-8">
        <div className="flex items-center gap-3 font-[family-name:var(--font-geist-mono)] text-[11px] tracking-[0.03em] text-[#8a8f83]">
          <span>&copy; {new Date().getFullYear()} forest-manager.eu</span>
          <span aria-hidden>·</span>
          <span className="hidden sm:inline">{t('serverLocation')}</span>
        </div>
        <nav className="flex gap-5">
          <Link
            href="/agb"
            className="font-[family-name:var(--font-geist-mono)] text-[11px] tracking-[0.03em] text-[#8a8f83] hover:text-[#1a1e17] transition-colors"
          >
            {t('terms')}
          </Link>
          <Link
            href="/datenschutz"
            className="font-[family-name:var(--font-geist-mono)] text-[11px] tracking-[0.03em] text-[#8a8f83] hover:text-[#1a1e17] transition-colors"
          >
            {t('privacy')}
          </Link>
          <Link
            href="/impressum"
            className="font-[family-name:var(--font-geist-mono)] text-[11px] tracking-[0.03em] text-[#8a8f83] hover:text-[#1a1e17] transition-colors"
          >
            {t('imprint')}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
