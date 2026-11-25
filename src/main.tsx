import './interfaz/estilos/fuentes'
import './interfaz/estilos/variables.css'
import './interfaz/estilos/global.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
