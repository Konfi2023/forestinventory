'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

interface SlideItem {
  title: string;
  description: string;
  image: string;
  type: 'phone' | 'desktop';
}

const SLIDES: SlideItem[] = [
  {
    title: 'Interaktive Forstkarte',
    description: 'Waldpolygone einzeichnen, Abteilungen verwalten, Satellitenlayer einblenden — alles auf einer Karte. Einschlagsflächen, Wege und Kalamitäten auf einen Blick.',
    image: '/landing/desktop-screen.jpg',
    type: 'desktop',
  },
  {
    title: 'Bäume erfassen',
    description: 'BHD, Höhe, Art und Gesundheitszustand direkt im Wald per Smartphone erfassen. GPS-Position wird automatisch gespeichert.',
    image: '/landing/mobile-tree.png',
    type: 'phone',
  },
  {
    title: 'Polter dokumentieren',
    description: 'Holzpolter mit Foto, GPS und Sortiment-Daten erfassen. Vom Einschlag bis zur Abfuhr — lückenlos dokumentiert.',
    image: '/landing/mobile-polter.png',
    type: 'phone',
  },
  {
    title: 'Aufgaben im Revier',
    description: 'Aufgaben direkt auf der Karte erstellen, zuweisen und nachverfolgen. Mit Foto, Standort und Fälligkeitsdatum — auch offline.',
    image: '/landing/desktop-screen.jpg',
    type: 'desktop',
  },
];

function PhoneMockup({ image, alt }: { image: string; alt: string }) {
  return (
    <div className="relative mx-auto w-[240px] sm:w-[280px]">
      {/* Phone frame */}
      <div className="relative rounded-[2.5rem] border-[6px] border-white/10 bg-black overflow-hidden shadow-2xl shadow-black/50">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-b-2xl z-10" />
        {/* Screen */}
        <img src={image} alt={alt} className="w-full block" />
      </div>
    </div>
  );
}

function DesktopMockup({ image, alt }: { image: string; alt: string }) {
  return (
    <div className="relative mx-auto max-w-[480px]">
      {/* Browser frame */}
      <div className="rounded-xl border border-white/10 bg-[#1a1a1a] overflow-hidden shadow-2xl shadow-black/50">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
            <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
            <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
          </div>
          <div className="flex-1 mx-8">
            <div className="bg-white/5 rounded-md px-3 py-1 text-[9px] text-slate-500 font-mono text-center">forest-manager.eu</div>
          </div>
        </div>
        {/* Screen */}
        <img src={image} alt={alt} className="w-full block" />
      </div>
    </div>
  );
}

function SlideContent({ slide, progress }: { slide: SlideItem; progress: any }) {
  const opacity = useTransform(progress, [0, 0.1, 0.4, 0.6, 0.9, 1], [0, 1, 1, 1, 1, 0]);
  const y = useTransform(progress, [0, 0.1, 0.9, 1], [40, 0, 0, -40]);

  return (
    <motion.div
      style={{ opacity, y }}
      className="absolute inset-0 flex items-center"
    >
      <div className="w-full grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Text left */}
        <div>
          <h3 className="text-2xl sm:text-3xl font-light text-white mb-4">{slide.title}</h3>
          <p className="text-[15px] text-slate-400 leading-relaxed max-w-md">{slide.description}</p>
        </div>

        {/* Mockup right */}
        <div className="flex items-center justify-center">
          {slide.type === 'phone' ? (
            <PhoneMockup image={slide.image} alt={slide.title} />
          ) : (
            <DesktopMockup image={slide.image} alt={slide.title} />
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function StickyScrollReveal() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  return (
    <section ref={containerRef} style={{ height: `${SLIDES.length * 100}vh` }} className="relative">
      {/* Sticky viewport */}
      <div className="sticky top-0 h-screen overflow-hidden flex items-center">
        <div className="w-full max-w-6xl mx-auto px-6">
          {/* Progress indicator */}
          <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-20 hidden lg:flex">
            {SLIDES.map((_, i) => {
              const start = i / SLIDES.length;
              const end = (i + 1) / SLIDES.length;
              return <ProgressDot key={i} index={i} scrollProgress={scrollYProgress} start={start} end={end} />;
            })}
          </div>

          {/* Slides */}
          {SLIDES.map((slide, i) => {
            const start = i / SLIDES.length;
            const end = (i + 1) / SLIDES.length;
            return <SlideSegment key={i} slide={slide} scrollProgress={scrollYProgress} start={start} end={end} />;
          })}
        </div>
      </div>
    </section>
  );
}

function SlideSegment({ slide, scrollProgress, start, end }: {
  slide: SlideItem; scrollProgress: any; start: number; end: number;
}) {
  const progress = useTransform(scrollProgress, [start, end], [0, 1]);
  return <SlideContent slide={slide} progress={progress} />;
}

function ProgressDot({ index, scrollProgress, start, end }: {
  index: number; scrollProgress: any; start: number; end: number;
}) {
  const mid = (start + end) / 2;
  const opacity = useTransform(scrollProgress, [start, mid, end], [0.2, 1, 0.2]);
  const scale = useTransform(scrollProgress, [start, mid, end], [1, 1.5, 1]);

  return (
    <motion.div
      style={{ opacity, scale }}
      className="w-2 h-2 rounded-full bg-emerald-400"
    />
  );
}
