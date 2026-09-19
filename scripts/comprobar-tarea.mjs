// Comprueba, sin ningún modelo, que una tarea de un plan está hecha tal como la escribe el plan:
// 1. cada archivo que la tarea crea («Crea `ruta` con este contenido:») es igual al del repositorio;
// 2. `npx tsc -b` no da errores;
// 3. `npm test` pasa entero, y se compara el total con el último «Tests  N passed» de la tarea.
// Uso: node scripts/comprobar-tarea.mjs <archivo-de-la-tarea.md>
// Sale con 0 si todo cuadra y con 1 si algo falla; el recuento distinto del plan solo avisa.
import { execSync } from 'node:child_process'
import fs from 'node:fs'

const archivoTarea = process.argv[2]
if (!archivoTarea) {
  console.error('Uso: node scripts/comprobar-tarea.mjs <archivo-de-la-tarea.md>')
  process.exit(2)
}
const sinFinesDeLineaWindows = (texto) => texto.replace(/\r\n/g, '\n')
const tarea = sinFinesDeLineaWindows(fs.readFileSync(archivoTarea, 'utf8'))
const lineas = tarea.split('\n')

// El último bloque de código de cada «Crea `ruta`» (si la tarea lo reescribe, manda el último).
const creados = new Map()
const sustituidos = new Set()
for (let i = 0; i < lineas.length; i++) {
  const crea = /^\s*(?:[-*]\s*)?(?:\*\*)?Crea(?:\*\*)?\s+`([^`]+)`/.exec(lineas[i])
  const cambia = /(?:[Ss]ustituye|[Aa]ñade|[Cc]ambia|[Mm]odifica)[^`]*`([^`]+\.[a-z]+)`/.exec(lineas[i])
  if (cambia && creados.has(cambia[1])) sustituidos.add(cambia[1])
  if (!crea) continue
  let j = i + 1
  while (j < lineas.length && !/^\s*```/.test(lineas[j])) j++
  if (j >= lineas.length) continue
  const sangria = /^(\s*)/.exec(lineas[j])[1].length
  let k = j + 1
  while (k < lineas.length && !/^\s*```\s*$/.test(lineas[k])) k++
  const contenido = lineas.slice(j + 1, k).map((l) => l.slice(Math.min(sangria, /^(\s*)/.exec(l)[1].length))).join('\n')
  creados.set(crea[1], contenido)
  sustituidos.delete(crea[1])
  i = k
}

const problemas = []
const avisos = []
for (const [ruta, esperado] of creados) {
  if (sustituidos.has(ruta)) {
    avisos.push(`${ruta}: la tarea lo modifica después de crearlo; no se compara`)
    continue
  }
  if (!fs.existsSync(ruta)) {
    problemas.push(`${ruta}: no existe`)
    continue
  }
  const real = sinFinesDeLineaWindows(fs.readFileSync(ruta, 'utf8'))
  if (real.trimEnd() !== esperado.trimEnd()) {
    const a = real.split('\n')
    const b = esperado.split('\n')
    let n = 0
    while (n < a.length && n < b.length && a[n] === b[n]) n++
    problemas.push(`${ruta}: distinto del plan desde la línea ${n + 1}\n    plan: ${JSON.stringify(b[n] ?? '(fin)')}\n    real: ${JSON.stringify(a[n] ?? '(fin)')}`)
  }
}

const ejecutar = (orden) => {
  try {
    return { ok: true, salida: execSync(orden, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }
  } catch (e) {
    return { ok: false, salida: `${e.stdout ?? ''}${e.stderr ?? ''}` }
  }
}

const tipos = ejecutar('npx tsc -b')
if (!tipos.ok) problemas.push('npx tsc -b da errores:\n' + tipos.salida.split('\n').slice(0, 15).join('\n'))

const pruebas = ejecutar('npx vitest run')
const total = /Tests\s+(?:\d+ failed \| )?(\d+) passed/.exec(pruebas.salida)
const archivos = /Test Files\s+(?:\d+ failed \| )?(\d+) passed/.exec(pruebas.salida)
if (!pruebas.ok) {
  problemas.push('npm test falla:\n' + pruebas.salida.split('\n').filter((l) => /FAIL|✗|×|Error/.test(l)).slice(0, 15).join('\n'))
}
const esperados = [...tarea.matchAll(/Tests\s+(\d+) passed \((\d+)\)/g)]
const esperado = esperados.length ? Number(esperados[esperados.length - 1][1]) : null
if (total && esperado !== null && Number(total[1]) !== esperado) {
  avisos.push(`el plan espera ${esperado} pruebas y hay ${total[1]}`)
}

console.log(`Archivos del plan comparados: ${creados.size - sustituidos.size} · pruebas: ${total ? total[1] : '?'} en ${archivos ? archivos[1] : '?'} archivos`)
for (const a of avisos) console.log('AVISO ' + a)
for (const p of problemas) console.log('FALLO ' + p)
console.log(problemas.length ? 'RESULTADO: NO CUADRA' : 'RESULTADO: CUADRA')
process.exit(problemas.length ? 1 : 0)
