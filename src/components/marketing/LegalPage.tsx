'use client';

import { useTranslations } from 'next-intl';

interface Section {
  title: string;
  content: string;
  items?: string[];
  subsections?: { title: string; content: string }[];
}

export function LegalPage({ namespace }: { namespace: 'privacy' | 'imprint' | 'terms' }) {
  const t = useTranslations(`Legal.${namespace}`);

  let sectionCount = 0;
  try {
    // Count sections by trying to access them
    while (true) {
      t(`sections.${sectionCount}.title`);
      sectionCount++;
      if (sectionCount > 30) break; // Safety limit
    }
  } catch {
    // Expected — we've found all sections
  }

  return (
    <article className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold text-white mb-2">{t('title')}</h1>
      {t.has('lastUpdated') && (
        <p className="text-sm text-slate-500 mb-2">{t('lastUpdated')}</p>
      )}
      {t.has('intro') && (
        <p className="text-slate-400 leading-relaxed mb-10">{t('intro')}</p>
      )}

      {Array.from({ length: sectionCount }, (_, i) => (
        <section key={i} className="mb-10">
          <h2 className="text-base font-semibold text-white mb-3 pb-1 border-b border-white/5">
            {t(`sections.${i}.title`)}
          </h2>
          <div className="text-slate-400 leading-relaxed text-sm space-y-2">
            <p>{t(`sections.${i}.content`)}</p>

            {/* Items (bullet list) */}
            {t.has(`sections.${i}.items.0`) && (
              <ul className="list-disc list-inside space-y-1 text-sm">
                {Array.from({ length: 20 }, (_, j) => {
                  if (!t.has(`sections.${i}.items.${j}`)) return null;
                  return <li key={j}>{t(`sections.${i}.items.${j}`)}</li>;
                }).filter(Boolean)}
              </ul>
            )}

            {/* Closing text after items */}
            {t.has(`sections.${i}.closing`) && (
              <p>{t(`sections.${i}.closing`)}</p>
            )}

            {/* Subsections */}
            {(t.has(`sections.${i}.subsections.0.title`) || t.has(`sections.${i}.subsections.0.label`)) && (
              <div className="space-y-4 mt-4">
                {Array.from({ length: 10 }, (_, j) => {
                  if (!t.has(`sections.${i}.subsections.${j}.content`)) return null;
                  const subTitle = t.has(`sections.${i}.subsections.${j}.title`)
                    ? t(`sections.${i}.subsections.${j}.title`)
                    : t.has(`sections.${i}.subsections.${j}.label`)
                      ? t(`sections.${i}.subsections.${j}.label`)
                      : null;
                  return (
                    <div key={j}>
                      {subTitle && <h3 className="text-sm font-semibold text-slate-300 mb-1">{subTitle}</h3>}
                      <p className="text-sm text-slate-400">{t(`sections.${i}.subsections.${j}.content`)}</p>
                    </div>
                  );
                }).filter(Boolean)}
              </div>
            )}

            {/* Additional fields */}
            {t.has(`sections.${i}.thirdPartyDisclaimer`) && (
              <p>{t(`sections.${i}.thirdPartyDisclaimer`)}</p>
            )}
            {t.has(`sections.${i}.withdrawalAddress`) && (
              <p className="font-medium">{t(`sections.${i}.withdrawalAddress`)}</p>
            )}
            {t.has(`sections.${i}.severability`) && (
              <p>{t(`sections.${i}.severability`)}</p>
            )}
          </div>
        </section>
      ))}

      {t.has('footer') && (
        <p className="mt-12 pt-6 border-t border-white/10 text-xs text-slate-500">
          {t('footer')}
        </p>
      )}
    </article>
  );
}
