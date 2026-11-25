import { useState } from 'react'
import type { Seccion } from '../app/navegacion'
import { CabeceraPantalla } from '../comunes/Panel'
import { Segmentos } from '../comunes/Segmentos'
import { Almacen } from './Almacen'
import { Animales } from './Animales'
import { Comercio } from './Comercio'
import { Edificios } from './Edificios'
import { Eventos } from './Eventos'
import { Obras } from './Obras'
import { Personal } from './Personal'
import { Poblacion } from './Poblacion'
import { ResumenAsentamiento } from './ResumenAsentamiento'
import { Tesoreria } from './Tesoreria'

type PestanaProduccion = 'edificios' | 'almacen' | 'obras'

/** A7, A8 y A9. */
function Produccion({ dominioId }: { dominioId: string }) {
  const [pestana, setPestana] = useState<PestanaProduccion>('edificios')
  return (
    <>
      <CabeceraPantalla titulo="Producción" />
      <Segmentos<PestanaProduccion>
        etiqueta="Producción"
        etiquetaOculta
        opciones={[
          { valor: 'edificios', texto: 'Edificios' },
          { valor: 'almacen', texto: 'Almacén' },
          { valor: 'obras', texto: 'Obras' },
        ]}
        valor={pestana}
        alCambiar={setPestana}
      />
      {pestana === 'edificios' && <Edificios dominioId={dominioId} />}
      {pestana === 'almacen' && <Almacen dominioId={dominioId} />}
      {pestana === 'obras' && <Obras dominioId={dominioId} />}
    </>
  )
}

/** La sección elegida de un asentamiento (§5). */
export function PantallaAsentamiento({ dominioId, seccion }: { dominioId: string; seccion: Seccion }) {
  switch (seccion) {
    case 'tesoreria':
      return <Tesoreria key={dominioId} dominioId={dominioId} />
    case 'poblacion':
      return <Poblacion dominioId={dominioId} />
    case 'personal':
      return <Personal key={dominioId} dominioId={dominioId} />
    case 'produccion':
      return <Produccion key={dominioId} dominioId={dominioId} />
    case 'animales':
      return <Animales dominioId={dominioId} />
    case 'comercio':
      return <Comercio dominioId={dominioId} />
    case 'eventos':
      return <Eventos dominioId={dominioId} />
    default:
      return <ResumenAsentamiento dominioId={dominioId} />
  }
}
