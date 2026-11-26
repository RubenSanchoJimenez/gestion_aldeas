// Tras `npm run build`, comprueba que la app funcionará sin conexión: npm run comprobar:pwa
import { existsSync, readFileSync } from 'node:fs'

const fallos = []
const exige = (condicion, texto) => {
  if (!condicion) {
    fallos.push(texto)
  }
}

const manifiesto = JSON.parse(readFileSync('dist/manifest.webmanifest', 'utf8'))
exige(manifiesto.name === 'Gestión de Aldeas', 'name del manifiesto')
exige(manifiesto.short_name === 'Aldeas', 'short_name del manifiesto')
exige(manifiesto.display === 'standalone', 'display standalone')
exige(manifiesto.orientation === 'any', 'orientación libre')
exige(manifiesto.lang === 'es', 'idioma es')
for (const [lado, proposito] of [['192x192', undefined], ['512x512', undefined], ['512x512', 'maskable']]) {
  const icono = manifiesto.icons.find((i) => i.sizes === lado && i.purpose === proposito)
  exige(icono !== undefined, `icono ${lado}${proposito ? ` ${proposito}` : ''}`)
  if (icono !== undefined) {
    // En un PNG, el ancho es el entero de 4 bytes que empieza en el byte 16 (cabecera IHDR).
    exige(readFileSync(`dist/${icono.src}`).readUInt32BE(16) === Number(lado.split('x')[0]), `ancho de ${icono.src}`)
  }
}

const precache = [...readFileSync('dist/sw.js', 'utf8').matchAll(/url:"([^"]+)"/g)].map((m) => m[1])
exige(precache.includes('index.html'), 'index.html en el precaché')
exige(precache.includes('manifest.webmanifest'), 'manifiesto en el precaché')
exige(precache.some((u) => /^assets\/index-.*\.js$/.test(u)), 'JavaScript en el precaché')
exige(precache.some((u) => /^assets\/index-.*\.css$/.test(u)), 'CSS en el precaché')
for (const fuente of [
  'cormorant-garamond-latin-600-normal',
  'cormorant-garamond-latin-500-italic',
  'source-sans-3-latin-400-normal',
  'source-sans-3-latin-600-normal',
  'source-sans-3-latin-700-normal',
  'cinzel-latin-600-normal',
]) {
  exige(precache.some((u) => u.startsWith(`assets/${fuente}-`) && u.endsWith('.woff2')), `fuente ${fuente}`)
}
exige(precache.filter((u) => u.endsWith('.woff2')).length === 6, 'exactamente 6 fuentes woff2')
exige(!precache.some((u) => u.endsWith('.woff')), 'sin fuentes woff en el precaché')
exige(new Set(precache).size === precache.length, 'sin entradas repetidas en el precaché')
exige(!readFileSync('dist/index.html', 'utf8').includes('fonts.googleapis'), 'sin Google Fonts')
exige(existsSync('dist/registerSW.js'), 'registro del service worker')

if (fallos.length > 0) {
  console.error(`La PWA no está lista (${fallos.length}):\n- ${fallos.join('\n- ')}`)
  process.exit(1)
}
console.log(`PWA lista: ${precache.length} archivos en el precaché, 6 fuentes y 3 iconos.`)
