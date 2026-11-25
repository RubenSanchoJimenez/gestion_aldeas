/** La estrella de cuatro puntas y el círculo relleno del emblema de la app, en var(--oro) (mjs L76-77; D-098). */
export function Emblema({ tamano }: { tamano: number }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--oro)"
      strokeWidth={1.4}
      strokeLinejoin="round"
    >
      <path d="M12 1.5l2.6 7.9 7.9 2.6-7.9 2.6L12 22.5l-2.6-7.9L1.5 12l7.9-2.6z" />
      <circle cx="12" cy="12" r="2.2" fill="var(--oro)" stroke="none" />
    </svg>
  )
}

/** El filete doble de las cabeceras de P0: dos trazos y el rombo dorado del centro (mjs L78-79). */
export function Filete({ ancho }: { ancho: number }) {
  const centro = ancho / 2
  return (
    <svg aria-hidden="true" focusable="false" width={ancho} height={12} viewBox={`0 0 ${ancho} 12`} fill="none">
      <path d={`M0 6H${centro - 14}M${centro + 14} 6H${ancho}`} stroke="var(--oro)" strokeWidth={1} />
      <path d={`M${centro} 1l5 5-5 5-5-5z`} stroke="var(--oro)" strokeWidth={1.25} />
      <circle cx={centro} cy={6} r={1.5} fill="var(--oro)" />
    </svg>
  )
}
