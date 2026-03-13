import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
import withPWAInit from "@ducanh2912/next-pwa";

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
  serverExternalPackages: ['better-sqlite3'],
};

const combinedConfig = withPWA(withNextIntl(nextConfig));

export default combinedConfig;
