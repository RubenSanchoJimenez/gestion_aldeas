// Dibuja los iconos de la PWA (el emblema de §10 sobre papel) sin dependencias: npm run iconos
import { mkdirSync, writeFileSync } from 'node:fs'
import { crc32, deflateSync } from 'node:zlib'

const PAPEL = [0xf2, 0xe8, 0xd0]
const ORO = [0xa9, 0x81, 0x2f]
// La estrella de cuatro puntas de emblema() en design/build-artboards.mjs (L76-77), en su rejilla de 24.
const ESTRELLA = [[12, 1.5], [14.6, 9.4], [22.5, 12], [14.6, 14.6], [12, 22.5], [9.4, 14.6], [1.5, 12], [9.4, 9.4]]
const TRAZO = 1.4
const RADIO = 2.2
const MUESTRAS = 4

function distanciaASegmento(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax
  const dy = by - ay
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

function tinta(x, y) {
  if (Math.hypot(x - 12, y - 12) <= RADIO) {
    return true
  }
  return ESTRELLA.some((punto, i) => distanciaASegmento(x, y, punto, ESTRELLA[(i + 1) % ESTRELLA.length]) <= TRAZO / 2)
}

function trozo(tipo, datos) {
  const largo = Buffer.alloc(4)
  largo.writeUInt32BE(datos.length)
  const cuerpo = Buffer.concat([Buffer.from(tipo, 'ascii'), datos])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(cuerpo))
  return Buffer.concat([largo, cuerpo, crc])
}

/** PNG RGB de lado × lado con el emblema ocupando `fraccion` del lado. */
function png(lado, fraccion) {
  const escala = (lado * fraccion) / 24
  const margen = (lado - 24 * escala) / 2
  const filas = []
  for (let y = 0; y < lado; y += 1) {
    const fila = Buffer.alloc(1 + lado * 3)
    for (let x = 0; x < lado; x += 1) {
      let cubierto = 0
      for (let sy = 0; sy < MUESTRAS; sy += 1) {
        for (let sx = 0; sx < MUESTRAS; sx += 1) {
          if (tinta((x + (sx + 0.5) / MUESTRAS - margen) / escala, (y + (sy + 0.5) / MUESTRAS - margen) / escala)) {
            cubierto += 1
          }
        }
      }
      const a = cubierto / (MUESTRAS * MUESTRAS)
      for (let c = 0; c < 3; c += 1) {
        fila[1 + x * 3 + c] = Math.round(PAPEL[c] * (1 - a) + ORO[c] * a)
      }
    }
    filas.push(fila)
  }
  const cabecera = Buffer.alloc(13)
  cabecera.writeUInt32BE(lado, 0)
  cabecera.writeUInt32BE(lado, 4)
  cabecera[8] = 8
  cabecera[9] = 2
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    trozo('IHDR', cabecera),
    trozo('IDAT', deflateSync(Buffer.concat(filas), { level: 9 })),
    trozo('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync('public/iconos', { recursive: true })
writeFileSync('public/iconos/icono-192.png', png(192, 0.72))
writeFileSync('public/iconos/icono-512.png', png(512, 0.72))
// El maskable deja el emblema dentro del círculo seguro del 80 %.
writeFileSync('public/iconos/icono-maskable-512.png', png(512, 0.56))
