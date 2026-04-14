// FILE: frontend/vite.config.ts
// PHOENIX PROTOCOL - PWA UNIFICATION V7.0
// 1. FIX: Consolidated manifest generation into the plugin.
// 2. FIX: Restricted icons to verified physical assets only.
// 3. REASON: Eliminates collision with public/manifest.json and prevents 404 redirects.

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'inline',
      // PHOENIX: Force the output filename to manifest.json
      manifestFilename: 'manifest.json',
      manifest: {
        name: 'Haveri AI',
        short_name: 'Haveri',
        description: 'Platforma e parë me Inteligjencë Artificiale për biznesin tuaj.',
        theme_color: '#020617',
        background_color: '#020617',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/vite.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}']
      }
    })
  ],
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  publicDir: 'public'
})