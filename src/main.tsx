import './interfaz/estilos/fuentes'
import './interfaz/estilos/variables.css'
import './interfaz/estilos/global.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BaseDeDatos } from './datos/baseDeDatos'
import { nuevoId } from './datos/ids'
import App from './interfaz/app/App'
import { descargarArchivo, pedirAlmacenamientoPersistente, selectorDeArchivo } from './interfaz/app/navegador'
import { ContextoServicios, type Servicios } from './interfaz/app/servicios'

const servicios: Servicios = {
  db: new BaseDeDatos(),
  ahora: () => new Date().toISOString(),
  nuevoId,
  descargar: descargarArchivo,
  elegirArchivo: selectorDeArchivo(),
}
void pedirAlmacenamientoPersistente()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ContextoServicios value={servicios}>
      <App />
    </ContextoServicios>
  </StrictMode>,
)
