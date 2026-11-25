import type { Seccion } from '../app/navegacion'
import { Deudas } from '../dominio/Deudas'
import { Libro } from '../dominio/Libro'
import { Hechizos } from './Hechizos'
import { Inventario } from './Inventario'
import { Inversiones } from './Inversiones'
import { Recurrentes } from './Recurrentes'
import { ResumenPersonaje } from './ResumenPersonaje'

/** La sección elegida del personaje (§5). */
export function PantallaPersonaje({ dominioId, seccion }: { dominioId: string; seccion: Seccion }) {
  switch (seccion) {
    case 'bolsa':
      return <Libro key={dominioId} dominioId={dominioId} titulo="Bolsa y movimientos" />
    case 'inventario':
      return <Inventario dominioId={dominioId} />
    case 'deudas':
      return <Deudas dominioId={dominioId} />
    case 'gastos':
      return <Recurrentes dominioId={dominioId} />
    case 'inversiones':
      return <Inversiones dominioId={dominioId} />
    case 'hechizos':
      return <Hechizos dominioId={dominioId} />
    default:
      return <ResumenPersonaje dominioId={dominioId} />
  }
}
