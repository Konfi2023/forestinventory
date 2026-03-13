import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
import withPWAInit from "@ducanh2912/next-pwa";
import { withSentryConfig } from '@sentry/nextjs';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  workboxOptions: {
    runtimeCaching: [
      // CARTO Basemap Tiles (Dark, Light, Labels)
      {
        urlPattern: /^https:\/\/[a-z]\.basemaps\.cartocdn\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'map-tiles-carto',
          expiration: { maxEntries: 3000, maxAgeSeconds: 30 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      // OpenStreetMap Tiles (OUTDOORS Basemap)
      {
        urlPattern: /^https:\/\/[a-z]\.tile\.openstreetmap\.org\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'map-tiles-osm',
          expiration: { maxEntries: 3000, maxAgeSeconds: 30 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      // Esri Satellite Tiles
      {
        urlPattern: /^https:\/\/server\.arcgisonline\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'map-tiles-esri',
          expiration: { maxEntries: 1000, maxAgeSeconds: 7 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
};

const combinedConfig = withPWA(withNextIntl(nextConfig));

export default withSentryConfig(combinedConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Sourcemaps werden hochgeladen aber nicht im Bundle ausgeliefert
  silent: true,
  sourcemaps: { disable: false, deleteSourcemapsAfterUpload: true },
  disableLogger: true,
  // Kein Sentry-Tunnel — direkter Upload
  autoInstrumentServerFunctions: true,
});
