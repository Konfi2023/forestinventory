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
                  try {
                    const item = t(`sections.${i}.items.${j}`);
                    return <li key={j}>{item}</li>;
                  } catch { return null; }
                }).filter(Boolean)}
              </ul>
            )}

            {/* Subsections */}
            {t.has(`sections.${i}.subsections.0.title`) && (
              <div className="space-y-4 mt-4">
                {Array.from({ length: 10 }, (_, j) => {
                  try {
                    const subTitle = t(`sections.${i}.subsections.${j}.title`);
                    const subContent = t(`sections.${i}.subsections.${j}.content`);
                    return (
                      <div key={j}>
                        <h3 className="text-sm font-semibold text-slate-300 mb-1">{subTitle}</h3>
                        <p className="text-sm text-slate-400">{subContent}</p>
                      </div>
                    );
                  } catch { return null; }
                }).filter(Boolean)}
              </div>
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
