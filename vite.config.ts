/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // El dominio es TypeScript puro: sus pruebas corren en node, sin navegador.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
