import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Cada prueba de la interfaz empieza con el documento vacío.
afterEach(() => {
  cleanup()
})
