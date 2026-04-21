'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { SignInButton } from './SignInButton';
import { EnterpriseContactButton } from './EnterpriseContactButton';

/* ─── Types ─────────────────────────────────────────────────────────────────── */
interface DbPlan {
  id: string;
  name: string;
  monthlyPrice: number | null;
  maxHectares: number | null;
  maxUsers: number | null;
}
interface Props {
  dbPlans: DbPlan[];
}

/* ─── Landing Page (Variant B — cream + forest-green) ───────────────────────── */
export function LandingPageClient({ dbPlans }: Props) {
  const t = useTranslations('Landing');

  return (
    <>
      <HeroSection />
      <FeaturesRail />
      <Rondel />
      <EudrSection />
      <PricingSection dbPlans={dbPlans} />

      {/* Final CTA — cream, plain */}
      <section className="border-t border-[#e0dbc9] px-8 py-28">
        <div className="max-w-[800px] mx-auto text-center">
          <h2 className="fm-serif text-[clamp(32px,4vw,56px)] leading-[1.02] tracking-[-0.025em] text-[#1a1e17] mb-6">
            {t('cta.title')}
          </h2>
          <p className="text-[17px] text-[#4a5148] leading-[1.55] mb-10 max-w-[48ch] mx-auto">
            {t('cta.description')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <SignInButton
              label={t('cta.button')}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-[13px] bg-[#1a1e17] text-[#efece2] border border-[#1a1e17] hover:bg-[#2d3d2a] hover:border-[#2d3d2a] transition-colors"
            />
            <a
              href="mailto:kontakt@forest-manager.eu"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-[13px] text-[#4a5148] border border-[#d4cfbe] hover:text-[#1a1e17] hover:border-[#1a1e17] transition-colors"
            >
              {t('cta.contact')}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

/* ─── 1. Hero ───────────────────────────────────────────────────────────────── */
function HeroSection() {
  const t = useTranslations('Landing');
  return (
    <section className="pt-16 pb-24">
      <div className="max-w-[1240px] mx-auto px-8">
        {/* Meta line */}
        <div className="flex flex-wrap items-center gap-[10px] font-[family-name:var(--font-geist-mono)] text-[11px] tracking-[0.04em] text-[#8a8f83] mb-14">
          <span>Forest Manager</span>
          <span className="opacity-40">·</span>
          <span>a medeina.ai product</span>
          <span className="opacity-40">·</span>
          <span>v4 · 2026</span>
        </div>

        {/* Title */}
        <h1 className="fm-serif text-[clamp(48px,8.5vw,136px)] leading-[0.94] tracking-[-0.03em] text-[#1a1e17] max-w-[14ch] mb-16">
          {t('hero.title1')}{' '}
          <em className="fm-em">{t('hero.title2')}</em>
        </h1>

        {/* Split sub + CTA */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20 pt-10 border-t border-[#e0dbc9]">
          <p className="text-[19px] leading-[1.55] text-[#4a5148] max-w-[42ch] m-0">
            {t('hero.description')}
          </p>
          <div className="flex flex-wrap gap-3 items-start md:justify-end">
            <SignInButton
              label={t('hero.cta')}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-[14px] bg-[#1a1e17] text-[#efece2] border border-[#1a1e17] hover:bg-[#2d3d2a] hover:border-[#2d3d2a] transition-colors"
            />
            <a
              href="#produkt"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-[14px] text-[#4a5148] border border-[#d4cfbe] hover:text-[#1a1e17] hover:border-[#1a1e17] transition-colors"
            >
              {t('hero.learnMore')}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── 2. Features Rail ───────────────────────────────────────────────────────── */
function FeaturesRail() {
  const t = useTranslations('Landing');
  const items = [
    { k: '01', key: 'map' },
    { k: '02', key: 'monitoring' },
    { k: '03', key: 'compliance' },
    { k: '04', key: 'harvest' },
    { k: '05', key: 'tasks' },
    { k: '06', key: 'orgs' },
  ] as const;

  const Card = ({ it, extraClass = '' }: { it: (typeof items)[number]; extraClass?: string }) => (
    <article
      className={`p-8 rounded-2xl border border-[#e0dbc9] bg-[#e8e4d6] hover:bg-[#efece2] hover:border-[#d4cfbe] hover:-translate-y-0.5 transition-all grid grid-rows-[auto_auto_1fr_auto] gap-3.5 min-h-[280px] ${extraClass}`}
    >
      <div className="font-[family-name:var(--font-geist-mono)] text-[11px] tracking-[0.06em] text-[#8a8f83]">
        {it.k} / 06
      </div>
      <h3 className="fm-serif text-[30px] leading-[1.05] tracking-[-0.02em] text-[#1a1e17]">
        {t(`features.${it.key}.title`)}
      </h3>
      <p className="text-[14px] leading-[1.55] text-[#4a5148]">
        {t(`features.${it.key}.desc`)}
      </p>
      <div className="font-[family-name:var(--font-geist-mono)] text-[14px] text-[#8a8f83] self-end">→</div>
    </article>
  );

  return (
    <section id="produkt" className="border-t border-[#e0dbc9] py-28">
      <div className="max-w-[1240px] mx-auto px-8 mb-12">
        <SectionKicker>{t('features.label')}</SectionKicker>
        <h2 className="fm-serif text-[clamp(40px,5.5vw,84px)] leading-[1] tracking-[-0.025em] text-[#1a1e17] max-w-[14ch]">
          {t('features.title')}{' '}
          <em className="fm-em">{t('features.titleHighlight')}</em>
        </h2>
      </div>

      {/* Mobile: vertical stack */}
      <div className="md:hidden max-w-[1240px] mx-auto px-8 grid grid-cols-1 gap-4">
        {items.map(it => <Card key={it.k} it={it} />)}
      </div>

      {/* Desktop: horizontal scroll rail aligned to content column */}
      <div className="hidden md:block fm-rail overflow-x-auto [scroll-snap-type:x_mandatory]">
        <div className="flex gap-5 w-max">
          {items.map(it => (
            <Card
              key={it.k}
              it={it}
              extraClass="shrink-0 w-[340px] [scroll-snap-align:start]"
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── 3. Rondel — horizontal scroll-jack on desktop, stack on mobile ─────────── */
function Rondel() {
  const t = useTranslations('Landing');

  const slides = [
    { n: '01', key: 's1' }, // NDVI / Karte
    { n: '02', key: 's3' }, // Klima & Borkenkäfer
    { n: '03', key: 's2' }, // Aufgaben
    { n: '04', key: 's4' }, // Einzelbäume
    { n: '05', key: 's5' }, // Forsteinrichtung
  ] as const;

  const [active, setActive] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);
  const outerRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const mobileRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Track viewport to switch between scroll-jack (desktop) and stack (mobile).
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // Desktop: translate the rail based on scroll progress through the pinned section.
  useEffect(() => {
    if (!isDesktop) return;
    const outer = outerRef.current;
    const rail = railRef.current;
    if (!outer || !rail) return;

    const maxIdx = slides.length - 1;
    let raf = 0;

    const update = () => {
      raf = 0;
      const rect = outer.getBoundingClientRect();
      const scrollable = outer.offsetHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const scrolled = Math.min(scrollable, Math.max(0, -rect.top));
      const progress = scrolled / scrollable;
      rail.style.transform = `translate3d(-${progress * maxIdx * 100}vw, 0, 0)`;
      setActive(Math.round(progress * maxIdx));
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
      // Reset so it doesn't bleed into mobile layout if breakpoint flips.
      rail.style.transform = '';
    };
  }, [isDesktop, slides.length]);

  // Mobile: IntersectionObserver to drive the sticky counter through the stack.
  useEffect(() => {
    if (isDesktop) return;
    const obs = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            const i = Number((e.target as HTMLElement).dataset.i);
            setActive(i);
          }
        });
      },
      { threshold: 0.4 },
    );
    mobileRefs.current.forEach(el => el && obs.observe(el));
    return () => obs.disconnect();
  }, [isDesktop]);

  const counter = (
    <>
      <span>{t('rondel.viewLabel')}</span>
      <span className="text-[#1a1e17] tabular-nums">
        {String(active + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
      </span>
    </>
  );

  return (
    <section className="border-t border-[#e0dbc9]">
      {/* Section head */}
      <div className="max-w-[1240px] mx-auto px-8 pt-32 pb-16">
        <SectionKicker>{t('product.label')}</SectionKicker>
        <h2 className="fm-serif text-[clamp(40px,5.5vw,84px)] leading-[1] tracking-[-0.025em] text-[#1a1e17] max-w-[18ch]">
          <em className="fm-em">{t('product.title')}</em>
          <br />
          {t('product.titleHighlight')}
        </h2>
      </div>

      {/* Desktop: scroll-jack */}
      <div
        ref={outerRef}
        className="hidden md:block relative"
        style={{ height: `${slides.length * 100}vh` }}
      >
        <div className="sticky top-0 h-screen overflow-hidden">
          {/* Counter */}
          <div className="absolute top-[92px] left-0 right-0 z-10">
            <div className="max-w-[1240px] mx-auto px-8 flex justify-between font-[family-name:var(--font-geist-mono)] text-[11px] tracking-[0.08em] text-[#8a8f83]">
              {counter}
            </div>
          </div>

          {/* Rail */}
          <div
            ref={railRef}
            className="flex h-full will-change-transform"
            style={{ width: `${slides.length * 100}vw` }}
          >
            {slides.map(s => {
              const title = t(`carousel.${s.key}.title`).replace(/\n/g, ' ');
              const subtitle = t(`carousel.${s.key}.subtitle`);
              const image = t(`carousel.${s.key}.image`);
              return (
                <div key={s.n} className="shrink-0 w-screen h-screen flex items-center">
                  <div className="max-w-[1240px] mx-auto w-full px-8 grid grid-cols-[minmax(260px,1fr)_1.4fr] gap-12 items-center">
                    <div>
                      <div className="font-[family-name:var(--font-geist-mono)] text-[56px] leading-none text-[#8a8f83] tabular-nums tracking-[-0.02em] mb-6">
                        {s.n}
                      </div>
                      <h3 className="fm-serif text-[clamp(32px,4.4vw,64px)] leading-[0.98] tracking-[-0.025em] text-[#1a1e17] mb-4">
                        {title}
                      </h3>
                      <p className="text-[17px] leading-[1.55] text-[#4a5148] max-w-[44ch] m-0">
                        {subtitle}
                      </p>
                    </div>
                    <div className="relative aspect-[16/10] rounded-2xl overflow-hidden border border-[#d4cfbe] bg-[#e8e4d6]">
                      <Image
                        src={image}
                        alt={title}
                        fill
                        sizes="(min-width: 1240px) 60vw, 100vw"
                        className="object-cover"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile: vertical stack */}
      <div className="md:hidden">
        <div className="sticky top-[64px] z-30 bg-[#efece2] border-y border-[#e0dbc9] py-3">
          <div className="max-w-[1240px] mx-auto px-8 flex justify-between font-[family-name:var(--font-geist-mono)] text-[11px] tracking-[0.08em] text-[#8a8f83]">
            {counter}
          </div>
        </div>

        {slides.map((s, i) => {
          const title = t(`carousel.${s.key}.title`).replace(/\n/g, ' ');
          const subtitle = t(`carousel.${s.key}.subtitle`);
          const image = t(`carousel.${s.key}.image`);
          return (
            <div
              key={s.n}
              ref={el => { mobileRefs.current[i] = el; }}
              data-i={i}
              className="py-16 border-b border-[#e0dbc9] last:border-b-0 last:pb-24"
            >
              <div className="max-w-[1240px] mx-auto px-8">
                <div className="font-[family-name:var(--font-geist-mono)] text-[44px] leading-none text-[#8a8f83] tabular-nums tracking-[-0.02em] mb-4">
                  {s.n}
                </div>
                <h3 className="fm-serif text-[clamp(32px,8vw,56px)] leading-[0.98] tracking-[-0.025em] text-[#1a1e17] mb-3">
                  {title}
                </h3>
                <p className="text-[16px] leading-[1.55] text-[#4a5148] mb-8">
                  {subtitle}
                </p>
                <div className="relative aspect-[16/10] rounded-2xl overflow-hidden border border-[#d4cfbe] bg-[#e8e4d6]">
                  <Image
                    src={image}
                    alt={title}
                    fill
                    sizes="100vw"
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ─── 4. EUDR ───────────────────────────────────────────────────────────────── */
function EudrSection() {
  const t = useTranslations('Landing');
  const rows = [
    { k: '01', key: 'step1' },
    { k: '02', key: 'step2' },
    { k: '03', key: 'step3' },
    { k: '04', key: 'step4' },
  ] as const;

  return (
    <section id="eudr" className="border-t border-[#e0dbc9] py-32">
      <div className="max-w-[1240px] mx-auto px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">
        {/* Left */}
        <div>
          <SectionKicker>{t('eudr.label')}</SectionKicker>
          <h2 className="fm-serif text-[clamp(40px,5.5vw,84px)] leading-[1] tracking-[-0.025em] text-[#1a1e17] max-w-[14ch] mb-10">
            {t('eudr.title1')}
            <br />
            <em className="fm-em">{t('eudr.title2')}</em>
          </h2>
          <p className="text-[17px] leading-[1.55] text-[#4a5148] max-w-[42ch] m-0">
            {t('eudr.description')}
          </p>

          <div className="mt-14 pt-7 border-t border-[#e0dbc9] flex items-baseline gap-5">
            <span className="fm-serif text-[64px] leading-none tracking-[-0.02em] text-[#2d3d2a] italic">
              100%
            </span>
            <span className="text-[14px] leading-[1.5] text-[#4a5148] max-w-[30ch]">
              {t('eudr.statCaption')}
            </span>
          </div>
        </div>

        {/* Right */}
        <div className="flex flex-col pt-3">
          {rows.map((r, i) => (
            <div
              key={r.k}
              className={`grid grid-cols-[48px_1fr] gap-6 py-6 border-b border-[#e0dbc9] ${
                i === 0 ? 'border-t border-[#e0dbc9]' : ''
              } items-baseline`}
            >
              <div className="font-[family-name:var(--font-geist-mono)] text-[11px] tracking-[0.04em] text-[#8a8f83]">
                {r.k}
              </div>
              <div>
                <div className="fm-serif text-[24px] leading-[1.15] tracking-[-0.01em] text-[#1a1e17] mb-1.5">
                  {t(`eudr.${r.key}.title`)}
                </div>
                <div className="text-[15px] leading-[1.5] text-[#4a5148] max-w-[48ch]">
                  {t(`eudr.${r.key}.desc`)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── 5. Pricing + Enterprise ───────────────────────────────────────────────── */
function PricingSection({ dbPlans }: { dbPlans: DbPlan[] }) {
  const t = useTranslations('Landing');

  const PLANS = [
    { id: 'basis',  price: '4,90',  featured: false },
    { id: 'pro',    price: '19,90', featured: true },
    { id: 'expert', price: '39,90', featured: false },
  ] as const;

  return (
    <section id="preise" className="border-t border-[#e0dbc9] py-32">
      <div className="max-w-[1240px] mx-auto px-8">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-baseline mb-10">
          <div>
            <SectionKicker>{t('pricing.label')}</SectionKicker>
            <h2 className="fm-serif text-[clamp(40px,5.5vw,84px)] leading-[1] tracking-[-0.025em] text-[#1a1e17] max-w-[14ch]">
              {t('pricing.title')}{' '}
              <em className="fm-em">{t('pricing.titleHighlight')}</em>
            </h2>
          </div>
        </div>

        {/* Plan grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          {PLANS.map(p => {
            const db = dbPlans.find(d => d.name.toLowerCase() === p.id);
            const price =
              db?.monthlyPrice?.toFixed(2).replace('.', ',') ?? p.price;
            const maxHa = db?.maxHectares ?? null;
            const maxU = db?.maxUsers ?? null;
            const featured = p.featured;
            return (
              <article
                key={p.id}
                className={`relative rounded-xl border flex flex-col gap-2 p-6 group ${
                  featured
                    ? 'bg-[#e8e4d6] border-[#2d3d2a]'
                    : 'bg-[#efece2] border-[#e0dbc9]'
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <div className="fm-serif text-[22px] leading-[1.1] tracking-[-0.01em] text-[#1a1e17]">
                    {t(`pricing.plans.${p.id}.name`)}
                  </div>
                  <div className="font-[family-name:var(--font-geist-mono)] text-[11px] text-[#8a8f83]">
                    {t(`pricing.plans.${p.id}.desc`)}
                  </div>
                </div>

                <div className="flex items-baseline gap-1 mt-1">
                  <span className="fm-serif text-[38px] leading-none tracking-[-0.015em] text-[#1a1e17]">
                    {price} €
                  </span>
                  <span className="font-[family-name:var(--font-geist-mono)] text-[11px] text-[#8a8f83] ml-1">
                    {t('pricing.perMonth')}
                  </span>
                </div>
                <div className="font-[family-name:var(--font-geist-mono)] text-[9px] tracking-[0.04em] text-[#8a8f83] -mt-0.5">
                  {t('pricing.vat')}
                </div>

                <div className="text-[13px] text-[#4a5148] pt-3 border-t border-[#e0dbc9] mt-2 flex-1">
                  {maxHa ? t('pricing.upTo', { ha: maxHa }) : t('pricing.unlimited')}
                  {maxU ? ` · ${t('pricing.users', { count: maxU })}` : ''}
                </div>

                <SignInButton
                  label={t('pricing.tryFree')}
                  className={`mt-3 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-full text-[12px] border transition-colors ${
                    featured
                      ? 'bg-[#1a1e17] text-[#efece2] border-[#1a1e17] hover:bg-[#2d3d2a] hover:border-[#2d3d2a]'
                      : 'bg-transparent text-[#4a5148] border-[#d4cfbe] hover:bg-[#1a1e17] hover:text-[#efece2] hover:border-[#1a1e17]'
                  }`}
                />
              </article>
            );
          })}
        </div>

        {/* Enterprise block */}
        <div className="relative mt-6 p-10 max-md:p-7 rounded-2xl border border-[#d4cfbe] bg-[#e3dfce] overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse at 85% 50%, rgba(45,61,42,0.08), transparent 55%)',
            }}
          />
          <div className="relative z-10 grid grid-cols-[auto_1fr_auto] max-md:grid-cols-1 items-center gap-12 max-md:gap-6">
            <div
              className="font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.14em] text-[#8a8f83] border-l border-[#d4cfbe] pl-3 py-2 [writing-mode:vertical-rl] [transform:rotate(180deg)] max-md:[writing-mode:horizontal-tb] max-md:[transform:none] max-md:border-l-0 max-md:border-b max-md:border-[#d4cfbe] max-md:pl-0 max-md:pb-3"
            >
              04 / Enterprise
            </div>
            <div className="max-w-[56ch]">
              <h3 className="fm-serif text-[clamp(28px,3.2vw,40px)] leading-[1.05] tracking-[-0.02em] text-[#1a1e17] mb-3">
                {t('pricing.enterprise.title1')}{' '}
                <em className="fm-em">{t('pricing.enterprise.titleEm')}</em>
                {t('pricing.enterprise.title2')}
              </h3>
              <p className="text-[14px] leading-[1.55] text-[#4a5148] mb-4 max-w-[48ch]">
                {t('pricing.enterprise.description')}
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-6 list-none p-0 m-0">
                {['feat1', 'feat2', 'feat3', 'feat4'].map(key => (
                  <li
                    key={key}
                    className="pl-4 relative font-[family-name:var(--font-geist-mono)] text-[12px] tracking-[0.02em] text-[#4a5148]"
                  >
                    <span className="absolute left-0 text-[#2d3d2a]">→</span>
                    {t(`pricing.enterprise.${key}`)}
                  </li>
                ))}
              </ul>
            </div>
            <div className="justify-self-start md:justify-self-end">
              <EnterpriseContactButton />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Shared bits ────────────────────────────────────────────────────────────── */
function SectionKicker({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 font-[family-name:var(--font-geist-mono)] text-[11px] tracking-[0.04em] text-[#8a8f83] mb-7">
      <span className="w-1.5 h-1.5 rounded-full bg-[#2d3d2a]" />
      <span>{children}</span>
    </div>
  );
}
