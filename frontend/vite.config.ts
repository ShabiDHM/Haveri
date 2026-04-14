// FILE: vite.config.ts
// PHOENIX PROTOCOL - PWA FILENAME ALIGNMENT V5.0
// 1. FIX: Added 'manifestFilename' to force output to 'manifest.json'.
// 2. REASON: Matches index.html and resolves the persistent 404 error.

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // PHOENIX FIX: Force the plugin to output manifest.json instead of manifest.webmanifest
      manifestFilename: 'manifest.json', 
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Haveri AI',
        short_name: 'Haveri',
        description: 'Platforma Inteligjente për Menaxhimin e Biznesit',
        theme_color: '#020617', 
        background_color: '#020617',
        display: 'standalone', 
        orientation: 'portrait',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable' 
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      }
    })
  ],
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  publicDir: 'public'
})