/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // PWA instalable y sin conexión (D-098): precachea la app, las 6 fuentes y los iconos del manifiesto.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'Gestión de Aldeas',
        short_name: 'Aldeas',
        description: 'La economía de tus dominios en la Tierra Media',
        lang: 'es',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'landscape',
        background_color: '#F2E8D0',
        theme_color: '#FBF6E9',
        icons: [
          { src: 'iconos/icono-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'iconos/icono-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'iconos/icono-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Solo woff2: cada CSS de Fontsource trae también un .woff que Chrome no necesita (crítica §5.1).
        globPatterns: ['**/*.{js,css,html,woff2}'],
      },
    }),
  ],
  test: {
    projects: [
      {
        extends: true,
        test: {
          // El dominio y los datos son TypeScript sin navegador: sus pruebas corren en node.
          name: 'nodo',
          environment: 'node',
          include: ['src/**/*.test.ts'],
          exclude: ['src/interfaz/**'],
        },
      },
      {
        extends: true,
        test: {
          // La interfaz necesita un DOM: happy-dom, con jest-dom y la limpieza tras cada prueba.
          name: 'interfaz',
          environment: 'happy-dom',
          include: ['src/interfaz/**/*.test.{ts,tsx}'],
          setupFiles: ['./src/interfaz/pruebas/preparar.ts'],
        },
      },
    ],
  },
})
