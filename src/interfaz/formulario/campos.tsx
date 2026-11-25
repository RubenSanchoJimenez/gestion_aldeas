import { useId, useState } from 'react'
import { formatearOro } from '../../dominio/dinero/formato'
import { saldosPorDominio } from '../../dominio/dinero/saldo'
import type { OpcionCatalogo } from '../../dominio/modelo/catalogos'
import { ordenarDominios } from '../../dominio/partidas/orden'
import { CampoTexto, EtiquetaCampo } from '../comunes/Campo'
import { SelectorConBuscador, type GrupoSelector } from '../comunes/SelectorConBuscador'
import { usePartida } from '../partida/contexto'
import { NuevaCategoria } from './NuevaCategoria'
import { ubicaciones } from './ubicaciones'
import estilosCampo from '../comunes/campos.module.css'

/** El valor de «Ninguno» en los selectores opcionales. */
export const NINGUNO = ''

export interface PropsCampoCuenta {
  etiqueta: string
  valor: string
  alCambiar: (dominioId: string) => void
  /** «Ninguno: solo anotar la deuda», «Ninguno: ya invertido»… */
  ninguno?: string
}

/** Selector n.º 7: la bolsa del personaje y las cajas, con su saldo. */
export function CampoCuenta({ etiqueta, valor, alCambiar, ninguno }: PropsCampoCuenta) {
  const { documento } = usePartida()
  const saldos = saldosPorDominio(documento)
  const eq = documento.partida.equivalencias
  const opciones = ordenarDominios(documento.dominios).map((d) => ({
    valor: d.id,
    texto: d.tipo === 'personaje' ? `Bolsa de ${d.nombre}` : `Caja de ${d.nombre}`,
    detalle: formatearOro(saldos[d.id] ?? 0, eq),
  }))
  const grupos: GrupoSelector<string>[] =
    ninguno === undefined ? [{ opciones }] : [{ opciones: [{ valor: NINGUNO, texto: ninguno }] }, { opciones }]
  return (
    <SelectorConBuscador
      etiqueta={etiqueta}
      valor={valor}
      grupos={grupos}
      alCambiar={alCambiar}
      sustantivo={{ singular: 'cuenta', plural: 'cuentas' }}
    />
  )
}

export interface PropsCampoOpcion {
  etiqueta: string
  valor: string
  alCambiar: (valor: string) => void
  opciones: readonly { valor: string; texto: string; detalle?: string }[]
  singular?: string
  plural?: string
  textoSinValor?: string
}

/** Un selector sencillo de una lista. */
export function CampoOpcion(props: PropsCampoOpcion) {
  const { etiqueta, valor, alCambiar, opciones, singular = 'opción', plural = 'opciones', textoSinValor } = props
  return (
    <SelectorConBuscador
      etiqueta={etiqueta}
      valor={valor}
      textoSinValor={textoSinValor ?? 'Elige una opción'}
      grupos={[{ opciones }]}
      alCambiar={alCambiar}
      sustantivo={{ singular, plural }}
    />
  )
}

const GRUPOS_CATEGORIA: Record<string, string> = {
  gastosPersonaje: 'Gastos del personaje',
  ingresosPersonaje: 'Ingresos del personaje',
  asentamientos: 'Asentamientos',
  otros: 'Otros',
  tuyas: 'Tus categorías',
}

/** Selector n.º 6: las categorías de movimiento, por grupos. */
export function CampoCategoria({ valor, alCambiar }: { valor: string; alCambiar: (id: string) => void }) {
  const { catalogo } = usePartida()
  const categorias = catalogo.opciones.filter(
    (o): o is Extract<OpcionCatalogo, { lista: 'categorias' }> =>
      o.lista === 'categorias' && !('borrada' in o && o.borrada === true),
  )
  const grupos = [...new Set(categorias.map((c) => c.grupo))].map((grupo) => ({
    nombre: GRUPOS_CATEGORIA[grupo] ?? grupo,
    opciones: categorias.filter((c) => c.grupo === grupo).map((c) => ({ valor: c.id, texto: c.nombre })),
  }))
  const [nueva, setNueva] = useState<string | null>(null)
  return (
    <>
      <SelectorConBuscador
        etiqueta="Categoría"
        valor={valor}
        textoSinValor="Elige una categoría"
        grupos={grupos}
        alCambiar={alCambiar}
        sustantivo={{ singular: 'categoría', plural: 'categorías' }}
        alta={{ texto: 'Nueva categoría', alPedir: setNueva }}
      />
      {nueva !== null && <NuevaCategoria inicial={nueva} alCreada={alCambiar} alCerrar={() => setNueva(null)} />}
    </>
  )
}

/** Persona o entidad: se elige una de la lista o se escribe un nombre nuevo (§6.6, patrón 4). */
export function CampoPersona(props: { etiqueta: string; valor: string; alCambiar: (nombre: string) => void }) {
  const { documento } = usePartida()
  const idLista = useId()
  const id = useId()
  return (
    <EtiquetaCampo etiqueta={props.etiqueta} idControl={id} ayuda="Elige de la lista o escribe un nombre nuevo">
      <input
        id={id}
        className={estilosCampo.cantidad}
        style={{ textAlign: 'left' }}
        list={idLista}
        maxLength={60}
        value={props.valor}
        onChange={(e) => props.alCambiar(e.target.value)}
      />
      <datalist id={idLista}>
        {documento.personas.map((p) => (
          <option key={p.id} value={p.nombre} />
        ))}
      </datalist>
    </EtiquetaCampo>
  )
}

export const NUEVA_UBICACION = 'nueva'

/** Selector n.º 8, con «Nueva ubicación» y su nombre. */
export function CampoUbicacion(props: {
  valor: string
  alCambiar: (clave: string) => void
  nombreNueva: string
  alCambiarNombre: (nombre: string) => void
}) {
  const { documento } = usePartida()
  return (
    <div>
      <CampoOpcion
        etiqueta="Ubicación"
        valor={props.valor}
        opciones={[...ubicaciones(documento), { valor: NUEVA_UBICACION, texto: 'Nueva ubicación…' }]}
        alCambiar={props.alCambiar}
        singular="ubicación"
        plural="ubicaciones"
      />
      {props.valor === NUEVA_UBICACION && (
        <CampoTexto etiqueta="Nombre de la ubicación" maximo={60} valor={props.nombreNueva} alCambiar={props.alCambiarNombre} />
      )}
    </div>
  )
}
