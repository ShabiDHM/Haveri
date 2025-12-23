// FILE: vite.config.ts
// PHOENIX PROTOCOL - BUILD REBRAND V2.1 (ASSET PATH FIX)
// 1. FIX: Updated PWA icon 'src' paths to be absolute (e.g., '/pwa-192x192.png').
// 2. REASON: This prevents relative path issues and ensures the browser correctly locates the assets from the domain root after deployment.
// 3. STATUS: PWA asset pathing is now corrected.

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Haveri AI',
        short_name: 'Haveri',
        description: 'Platforma Inteligjente për Menaxhimin e Biznesit',
        theme_color: '#111827', 
        background_color: '#111827',
        display: 'standalone', 
        orientation: 'portrait',
        icons: [
          {
            src: '/pwa-192x192.png', // PHOENIX FIX: Absolute path
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png', // PHOENIX FIX: Absolute path
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png', // PHOENIX FIX: Absolute path
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable' 
          }
        ]
      },
      workbox: {
        // This setting tells the service worker to ignore large files.
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