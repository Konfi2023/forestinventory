'use client';

import { useTranslations } from 'next-intl';

export function LegalPage({ namespace }: { namespace: 'privacy' | 'imprint' | 'terms' }) {
  const t = useTranslations(`Legal.${namespace}`);

  let sectionCount = 0;
  try {
    while (true) {
      t(`sections.${sectionCount}.title`);
      sectionCount++;
      if (sectionCount > 30) break;
    }
  } catch {
    // done
  }

  return (
    <article className="fm-prose">
      <div className="mb-12 pb-8 border-b border-[#e0dbc9]">
        <div className="font-[family-name:var(--font-geist-mono)] text-[11px] tracking-[0.08em] text-[#8a8f83] uppercase mb-4">
          {namespace === 'privacy' ? 'Datenschutz' : namespace === 'imprint' ? 'Impressum' : 'AGB'}
        </div>
        <h1 className="fm-serif text-[clamp(40px,6vw,80px)] leading-[0.98] tracking-[-0.025em] text-[#1a1e17] mb-4">
          {t('title')}
        </h1>
        {t.has('lastUpdated') && (
          <p className="font-[family-name:var(--font-geist-mono)] text-[11px] tracking-[0.04em] text-[#8a8f83]">
            {t('lastUpdated')}
          </p>
        )}
      </div>

      {t.has('intro') && (
        <p className="text-[17px] leading-[1.6] text-[#4a5148] mb-14 max-w-[60ch] whitespace-pre-line">
          {t('intro')}
        </p>
      )}

      <div className="space-y-12">
        {Array.from({ length: sectionCount }, (_, i) => (
          <section key={i}>
            <h2 className="fm-serif text-[26px] leading-[1.15] tracking-[-0.01em] text-[#1a1e17] mb-4 pb-2 border-b border-[#e0dbc9]">
              {t(`sections.${i}.title`)}
            </h2>
            <div className="text-[15px] leading-[1.65] text-[#4a5148] space-y-3">
              <p className="whitespace-pre-line">{t(`sections.${i}.content`)}</p>

              {t.has(`sections.${i}.legalBasis`) && (
                <p className="font-[family-name:var(--font-geist-mono)] text-[12px] tracking-[0.02em] text-[#8a8f83]">
                  {t(`sections.${i}.legalBasis`)}
                </p>
              )}

              {t.has(`sections.${i}.privacyLink`) && (
                <p className="font-[family-name:var(--font-geist-mono)] text-[12px] tracking-[0.02em] text-[#8a8f83] break-all">
                  {t(`sections.${i}.privacyLink`)}
                </p>
              )}

              {t.has(`sections.${i}.modelInfo`) && (
                <p className="text-[14px] text-[#4a5148]">{t(`sections.${i}.modelInfo`)}</p>
              )}

              {t.has(`sections.${i}.items.0`) && (
                <ul className="space-y-1.5 mt-2 pl-5 list-disc text-[15px] marker:text-[#8a8f83]">
                  {Array.from({ length: 20 }, (_, j) => {
                    if (!t.has(`sections.${i}.items.${j}`)) return null;
                    return <li key={j}>{t(`sections.${i}.items.${j}`)}</li>;
                  }).filter(Boolean)}
                </ul>
              )}

              {t.has(`sections.${i}.closing`) && (
                <p>{t(`sections.${i}.closing`)}</p>
              )}

              {(t.has(`sections.${i}.subsections.0.title`) ||
                t.has(`sections.${i}.subsections.0.label`)) && (
                <div className="space-y-5 mt-5">
                  {Array.from({ length: 10 }, (_, j) => {
                    if (!t.has(`sections.${i}.subsections.${j}.content`)) return null;
                    const subTitle = t.has(`sections.${i}.subsections.${j}.title`)
                      ? t(`sections.${i}.subsections.${j}.title`)
                      : t.has(`sections.${i}.subsections.${j}.label`)
                        ? t(`sections.${i}.subsections.${j}.label`)
                        : null;
                    return (
                      <div key={j} className="pl-4 border-l-2 border-[#d4cfbe]">
                        {subTitle && (
                          <h3 className="fm-serif text-[18px] text-[#1a1e17] mb-1.5">
                            {subTitle}
                          </h3>
                        )}
                        <p className="text-[14px] text-[#4a5148] leading-[1.6]">
                          {t(`sections.${i}.subsections.${j}.content`)}
                        </p>
                        {t.has(`sections.${i}.subsections.${j}.privacyLink`) && (
                          <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-[11px] text-[#8a8f83] break-all">
                            {t(`sections.${i}.subsections.${j}.privacyLink`)}
                          </p>
                        )}
                      </div>
                    );
                  }).filter(Boolean)}
                </div>
              )}

              {t.has(`sections.${i}.thirdPartyDisclaimer`) && (
                <p className="text-[14px] text-[#4a5148]">
                  {t(`sections.${i}.thirdPartyDisclaimer`)}
                </p>
              )}
              {t.has(`sections.${i}.withdrawalAddress`) && (
                <p className="font-medium text-[#1a1e17] whitespace-pre-line">
                  {t(`sections.${i}.withdrawalAddress`)}
                </p>
              )}
              {t.has(`sections.${i}.severability`) && (
                <p className="text-[14px] text-[#4a5148]">
                  {t(`sections.${i}.severability`)}
                </p>
              )}
            </div>
          </section>
        ))}
      </div>

      {t.has('footer') && (
        <p className="mt-16 pt-8 border-t border-[#e0dbc9] font-[family-name:var(--font-geist-mono)] text-[11px] tracking-[0.04em] text-[#8a8f83]">
          {t('footer')}
        </p>
      )}
    </article>
  );
}
