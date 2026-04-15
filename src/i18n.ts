import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { routing } from './i18n/routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Fallback: read NEXT_LOCALE cookie for internal routes
  // (onboarding, signout, etc.) that skip next-intl middleware
  if (!locale || !routing.locales.includes(locale as any)) {
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
    if (cookieLocale && routing.locales.includes(cookieLocale as any)) {
      locale = cookieLocale;
    } else {
      // Fallback: Accept-Language Header (wichtig fuer Capacitor-App beim ersten Request)
      const headerStore = await headers();
      const acceptLang = headerStore.get('accept-language') ?? '';
      const browserLang = acceptLang.split(',')[0]?.split('-')[0]?.toLowerCase();
      if (browserLang && routing.locales.includes(browserLang as any)) {
        locale = browserLang;
      } else {
        locale = routing.defaultLocale;
      }
    }
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
