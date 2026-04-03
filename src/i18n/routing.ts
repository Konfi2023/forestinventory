import { defineRouting } from 'next-intl/routing';

export const locales = ['de', 'en', 'es', 'fr'] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: 'de',
  localePrefix: 'as-needed',
  pathnames: {
    '/': '/',
    '/datenschutz': {
      de: '/datenschutz',
      en: '/privacy',
      es: '/privacidad',
      fr: '/confidentialite',
    },
    '/impressum': {
      de: '/impressum',
      en: '/imprint',
      es: '/aviso-legal',
      fr: '/mentions-legales',
    },
    '/agb': {
      de: '/agb',
      en: '/terms',
      es: '/terminos',
      fr: '/conditions',
    },
  },
});
