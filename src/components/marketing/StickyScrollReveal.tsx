'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform, useMotionValueEvent } from 'framer-motion';
import { useState } from 'react';

interface SlideItem {
  title: string;
  description: string;
  image: string;
  type: 'phone' | 'desktop';
}

const SLIDES: SlideItem[] = [
  {
    title: 'Interaktive Forstkarte',
    description: 'Waldpolygone einzeichnen, Abteilungen verwalten, Satellitenlayer einblenden — alles auf einer Karte.',
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
    description: 'Aufgaben direkt auf der Karte erstellen, zuweisen und nachverfolgen. Mit Foto, Standort und Fälligkeitsdatum.',
    image: '/landing/desktop-screen.jpg',
    type: 'desktop',
  },
];

function PhoneMockup({ image, alt }: { image: string; alt: string }) {
  return (
    <div className="relative w-[200px] sm:w-[220px]">
      <div className="relative rounded-[2rem] border-[5px] border-white/10 bg-black overflow-hidden shadow-2xl shadow-black/50">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-4 bg-black rounded-b-xl z-10" />
        <img src={image} alt={alt} className="w-full block" />
      </div>
    </div>
  );
}

function DesktopMockup({ image, alt }: { image: string; alt: string }) {
  return (
    <div className="relative w-full max-w-[400px]">
      <div className="rounded-lg border border-white/10 bg-[#1a1a1a] overflow-hidden shadow-2xl shadow-black/50">
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/5">
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-white/10" />
            <div className="w-2 h-2 rounded-full bg-white/10" />
            <div className="w-2 h-2 rounded-full bg-white/10" />
          </div>
          <div className="flex-1 mx-6">
            <div className="bg-white/5 rounded px-2 py-0.5 text-[8px] text-slate-500 font-mono text-center">forest-manager.eu</div>
          </div>
        </div>
        <img src={image} alt={alt} className="w-full block" />
      </div>
    </div>
  );
}

export function StickyScrollReveal() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  const [activeIndex, setActiveIndex] = useState(0);

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const idx = Math.min(Math.floor(v * SLIDES.length), SLIDES.length - 1);
    setActiveIndex(idx);
  });

  const slide = SLIDES[activeIndex];

  return (
    <section ref={containerRef} style={{ height: `${SLIDES.length * 100}vh` }} className="relative">
      <div className="sticky top-0 h-screen overflow-hidden">
        <div className="h-full max-w-5xl mx-auto px-6 flex items-center">
          <div className="w-full grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-10 items-center">

            {/* Left: Text */}
            <div className="relative">
              {SLIDES.map((s, i) => (
                <motion.div
                  key={i}
                  initial={false}
                  animate={{ opacity: activeIndex === i ? 1 : 0, y: activeIndex === i ? 0 : 20 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className={`${i === 0 ? '' : 'absolute inset-0'}`}
                  style={{ pointerEvents: activeIndex === i ? 'auto' : 'none' }}
                >
                  <p className="text-[11px] text-emerald-400 font-mono uppercase tracking-widest mb-4">
                    {s.type === 'phone' ? 'Mobile App' : 'Desktop'}
                  </p>
                  <h3 className="text-2xl sm:text-3xl font-light text-white mb-4">{s.title}</h3>
                  <p className="text-[15px] text-slate-400 leading-relaxed">{s.description}</p>
                </motion.div>
              ))}

              {/* Progress dots */}
              <div className="flex gap-2 mt-8">
                {SLIDES.map((_, i) => (
                  <div key={i} className={`h-1 rounded-full transition-all duration-300 ${
                    activeIndex === i ? 'w-8 bg-emerald-400' : 'w-2 bg-white/10'
                  }`} />
                ))}
              </div>
            </div>

            {/* Right: Mockup */}
            <div className="relative flex items-center justify-center min-h-[350px]">
              {SLIDES.map((s, i) => (
                <motion.div
                  key={i}
                  initial={false}
                  animate={{
                    opacity: activeIndex === i ? 1 : 0,
                    scale: activeIndex === i ? 1 : 0.9,
                    y: activeIndex === i ? 0 : 30,
                  }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className={`${i === 0 ? '' : 'absolute'} flex items-center justify-center`}
                  style={{ pointerEvents: activeIndex === i ? 'auto' : 'none' }}
                >
                  {s.type === 'phone' ? (
                    <PhoneMockup image={s.image} alt={s.title} />
                  ) : (
                    <DesktopMockup image={s.image} alt={s.title} />
                  )}
                </motion.div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
