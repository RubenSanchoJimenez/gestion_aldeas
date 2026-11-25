// Escribe los archivos que una tarea de un plan crea («Crea `ruta` con este contenido:»). Si la tarea lo reescribe, manda el último.
// Uso: node scripts/extraer-tarea.mjs <tarea.md> [...]
import fs from 'node:fs'
import path from 'node:path'

for (const archivo of process.argv.slice(2)) {
  const lineas = fs.readFileSync(archivo, 'utf8').replace(/\r\n/g, '\n').split('\n')
  for (let i = 0; i < lineas.length; i++) {
    const crea = /^\s*(?:[-*]\s*)?(?:\*\*)?Crea(?:\*\*)?\s+`([^`]+)`/.exec(lineas[i])
    if (!crea) continue
    let j = i + 1
    while (j < lineas.length && !/^\s*```/.test(lineas[j])) j++
    if (j >= lineas.length) continue
    let k = j + 1
    while (k < lineas.length && !/^\s*```\s*$/.test(lineas[k])) k++
    fs.mkdirSync(path.dirname(crea[1]), { recursive: true })
    fs.writeFileSync(crea[1], lineas.slice(j + 1, k).join('\n') + '\n')
    console.log(`${path.basename(archivo)} → ${crea[1]}`)
    i = k
  }
}
