import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Build output follows the Finesse folder standard: /js, /css, /images, /fonts.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['images/icon-192.png', 'images/icon-512.png', 'images/apple-touch-icon.png', 'images/favicon.png'],
      manifest: {
        name: 'DiveCast',
        short_name: 'DiveCast',
        description: 'Live dive conditions, Florida dive sites, open dives and your logbook.',
        theme_color: '#04121F',
        background_color: '#04121F',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/images/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/images/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/images/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname.endsWith('basemaps.cartocdn.com') || url.hostname === 'tile.openstreetmap.org',
            handler: 'CacheFirst',
            options: { cacheName: 'map-tiles', expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 30 } }
          },
          {
            urlPattern: ({ url }) =>
              ['api.weather.gov', 'api.tidesandcurrents.noaa.gov', 'marine-api.open-meteo.com', 'waterservices.usgs.gov'].includes(url.hostname),
            handler: 'NetworkFirst',
            options: { cacheName: 'conditions', networkTimeoutSeconds: 6, expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 } }
          }
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'js/[name]-[hash].js',
        chunkFileNames: 'js/[name]-[hash].js',
        assetFileNames: (info) => {
          const name = info.names?.[0] ?? info.name ?? '';
          if (/\.css$/i.test(name)) return 'css/[name]-[hash][extname]';
          if (/\.(woff2?|ttf|otf)$/i.test(name)) return 'fonts/[name]-[hash][extname]';
          return 'images/[name]-[hash][extname]';
        }
      }
    }
  }
});
