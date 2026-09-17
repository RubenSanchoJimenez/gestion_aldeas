// Genera los artboards (.dc.html) y el canvas.json de las vistas de Gestión de Aldeas.
// Uso: node design/build-artboards.mjs  → escribe en design/artboards/
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), 'artboards');
mkdirSync(OUT, { recursive: true });

// ── Tokens del sistema visual «pergamino legible» ─────────────────────────────
const C = {
  papel: '#F2E8D0', vitela: '#FBF6E9', pliegue: '#E6D8B8', borde: '#D4C29C', campo: '#FFFDF6',
  tinta: '#2B2118', suave: '#6B5A45', lacre: '#8E2A1F', oro: '#A9812F', oroOsc: '#7A5B1F', bosque: '#3F5E3A',
  lacreTinte: '#F4DED6', oroTinte: '#F1E3BF', bosqueTinte: '#DFE7D5',
};
const F = {
  titulo: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
  ui: "'Source Sans 3', 'Segoe UI', Helvetica, Arial, sans-serif",
  marca: "Cinzel, 'Trajan Pro', Georgia, serif",
};
const num = 'font-variant-numeric: tabular-nums;';
const TONO = { lacre: [C.lacreTinte, C.lacre], oro: [C.oroTinte, C.oroOsc], bosque: [C.bosqueTinte, C.bosque], neutro: [C.pliegue, C.suave] };
const TIPO = { p: 'lacre', c: 'bosque', e: 'oro', o: 'neutro' };
// Calendario gregoriano actual; el ejemplo transcurre en abril de 1640 (el día 1 cae en domingo).
const SEMANA_LUNES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const diaDe = (anio, mes, dia) => ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][new Date(anio, mes, dia).getDay()];
const diaSemana = (n) => diaDe(1640, 3, n);

// ── Iconos (trazo, rejilla 24) ────────────────────────────────────────────────
const I = {
  casa: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  calendario: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  reloj_arena: '<path d="M6 2h12M6 22h12"/><path d="M7 2l5 10-5 10M17 2l-5 10 5 10"/>',
  reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  usuario: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  torre: '<path d="M5 21V9l2-1V4h2v2h2V4h2v2h2V4h2v4l2 1v12z"/><path d="M10 21v-5h4v5"/>',
  monedas: '<ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v4c0 1.7 2.7 3 6 3s6-1.3 6-3V7"/><path d="M9 14v3c0 1.7 2.7 3 6 3s6-1.3 6-3v-4c0-1.6-2.4-2.9-5.5-3"/>',
  bolsa: '<path d="M5 8h14l-1 13H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  balanza: '<path d="M12 3v18M7 21h10M5 7h14"/><path d="M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z"/>',
  repetir: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
  maletin: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>',
  libro: '<path d="M4 19V5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2 2 2 0 0 0 2 2h14"/><path d="M9 8h7"/>',
  pergamino: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  ajustes: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  tesoro: '<path d="M3 10l9-6 9 6"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18"/>',
  gente: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.5 3.5-5.5 6.5-5.5s5.5 2 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.8.8 3 2.6 3.5 5.2"/>',
  ficha: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2.2"/><path d="M5.5 16c.7-1.6 2-2.5 3.5-2.5s2.8.9 3.5 2.5M15 10h3M15 14h3"/>',
  trigo: '<path d="M12 22V8"/><path d="M12 12c-3 0-5-2-5-5 3 0 5 2 5 5zM12 12c3 0 5-2 5-5-3 0-5 2-5 5zM12 17c-3 0-5-2-5-5 3 0 5 2 5 5zM12 17c3 0 5-2 5-5-3 0-5 2-5 5z"/><path d="M12 8c-1-1.5-1-3.5 0-5 1 1.5 1 3.5 0 5z"/>',
  carro: '<path d="M2 7h13v9H2zM15 10h4l3 3v3h-7"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
  escudo: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  bandera: '<path d="M5 21V4"/><path d="M5 4h12l-2 4 2 4H5"/>',
  alerta: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  abajo: '<path d="M6 9l6 6 6-6"/>',
  derecha: '<path d="M9 6l6 6-6 6"/>',
  izquierda: '<path d="M15 6l-6 6 6 6"/>',
  mas: '<path d="M12 5v14M5 12h14"/>',
  cambio: '<path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
  bajar: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
  subir: '<path d="M12 21V9M7 14l5-5 5 5M4 3h16"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  buscar: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  sube: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  baja: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  deshacer: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
  editar: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  resumen: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  martillo: '<path d="M11 3l6 6-3 3-6-6z"/><path d="M11 9l-8 8 3 3 8-8"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  candado: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  enlazado: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  huella: '<circle cx="6.5" cy="9.5" r="1.8"/><circle cx="10" cy="5.5" r="1.8"/><circle cx="14" cy="5.5" r="1.8"/><circle cx="17.5" cy="9.5" r="1.8"/><path d="M12 11.5c-3 0-5.5 3.2-5.5 5.8 0 1.6 1.2 2.7 2.8 2.7 1 0 1.8-.5 2.7-.5s1.7.5 2.7.5c1.6 0 2.8-1.1 2.8-2.7 0-2.6-2.5-5.8-5.5-5.8z"/>',
};
const ic = (n, s = 20, c = 'currentColor') =>
  `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">${I[n]}</svg>`;
const emblema = (s) =>
  `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${C.oro}" stroke-width="1.4" stroke-linejoin="round" style="flex-shrink: 0;"><path d="M12 1.5l2.6 7.9 7.9 2.6-7.9 2.6L12 22.5l-2.6-7.9L1.5 12l7.9-2.6z"/><circle cx="12" cy="12" r="2.2" fill="${C.oro}" stroke="none"/></svg>`;
const filete = (w) =>
  `<svg width="${w}" height="12" viewBox="0 0 ${w} 12" fill="none"><path d="M0 6H${w / 2 - 14}M${w / 2 + 14} 6H${w}" stroke="${C.oro}" stroke-width="1"/><path d="M${w / 2} 1l5 5-5 5-5-5z" stroke="${C.oro}" stroke-width="1.25"/><circle cx="${w / 2}" cy="6" r="1.5" fill="${C.oro}"/></svg>`;

// ── Documento ─────────────────────────────────────────────────────────────────
const doc = (cuerpo) => `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600&amp;family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&amp;family=Source+Sans+3:wght@400;600;700&amp;display=swap">
  <style>
    body { margin: 0; background: ${C.papel}; }
    * { box-sizing: border-box; }
    a { color: ${C.oroOsc}; }
    a:hover { color: ${C.tinta}; }
  </style>
</helmet>
${cuerpo}
</x-dc>
</body>
</html>
`;

// ── Componentes ───────────────────────────────────────────────────────────────
const btn = (texto, { v = 'secundario', icono = '', ancho = '' } = {}) => {
  const estilo = {
    principal: `background: ${C.oroOsc}; color: ${C.vitela}; border: 1px solid ${C.oroOsc};`,
    secundario: `background: ${C.vitela}; color: ${C.tinta}; border: 1px solid ${C.borde};`,
    fantasma: `background: transparent; color: ${C.tinta}; border: 1px solid transparent;`,
    peligro: `background: transparent; color: ${C.lacre}; border: 1px solid ${C.lacre};`,
    peligroLleno: `background: ${C.lacre}; color: ${C.vitela}; border: 1px solid ${C.lacre};`,
  }[v];
  return `<div style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 44px; padding: 0 18px; border-radius: 6px; font-family: ${F.ui}; font-size: 15px; font-weight: 600; white-space: nowrap; ${ancho ? `width: ${ancho};` : ''} ${estilo}">${icono ? ic(icono, 18) : ''}<span>${texto}</span></div>`;
};
const btnIcono = (icono, v = 'secundario') =>
  `<div style="display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 6px; color: ${C.tinta}; ${v === 'secundario' ? `background: ${C.vitela}; border: 1px solid ${C.borde};` : 'border: 1px solid transparent;'}">${ic(icono, 20)}</div>`;
const enlace = (texto) =>
  `<span style="display: inline-flex; align-items: center; height: 44px; padding: 0 12px; font-family: ${F.ui}; font-size: 15px; font-weight: 600; color: ${C.oroOsc}; white-space: nowrap;">${texto}</span>`;
const badge = (texto, tono = 'neutro', icono = '') => {
  const [bg, fg] = TONO[tono];
  return `<span style="display: inline-flex; align-items: center; gap: 5px; height: 26px; padding: 0 10px; border-radius: 13px; background: ${bg}; color: ${fg}; font-family: ${F.ui}; font-size: 13px; font-weight: 600; white-space: nowrap;">${icono ? ic(icono, 14) : ''}${texto}</span>`;
};
const imp = (t, { fuerte = true } = {}) => {
  const color = t.startsWith('−') ? C.lacre : t.startsWith('+') ? C.bosque : C.tinta;
  return `<span style="font-weight: ${fuerte ? 600 : 400}; color: ${color}; white-space: nowrap; ${num}">${t}</span>`;
};
const dos = (t, s) =>
  `<div style="display: flex; flex-direction: column; min-width: 0;"><span>${t}</span><span style="font-size: 13px; color: ${C.suave};">${s}</span></div>`;
// Varias líneas en una celda (por ejemplo, un edificio con varios productos) y un dato secundario debajo.
const lineas = (items, sub = '') =>
  `<div style="display: flex; flex-direction: column; min-width: 0;">${items.map((t) => `<span>${t}</span>`).join('')}${sub ? `<span style="font-size: 13px; color: ${C.suave};">${sub}</span>` : ''}</div>`;
const cabecera = (titulo, { sub = '', acciones = '' } = {}) => `<div style="display: flex; align-items: flex-end; justify-content: space-between; gap: 16px;">
  <div style="display: flex; flex-direction: column; gap: 2px; min-width: 0;">
    ${sub ? `<span style="font-family: ${F.ui}; font-size: 14px; color: ${C.suave};">${sub}</span>` : ''}
    <h1 style="margin: 0; font-family: ${F.titulo}; font-size: 36px; font-weight: 600; line-height: 1.1; color: ${C.tinta};">${titulo}</h1>
  </div>
  <div style="display: flex; gap: 10px; align-items: center;">${acciones}</div>
</div>`;
const panel = (titulo, cuerpo, { accion = '', estilo = '', pad = '4px 20px 10px' } = {}) => `<section style="display: flex; flex-direction: column; min-height: 0; min-width: 0; background: ${C.vitela}; border: 1px solid ${C.borde}; border-radius: 8px; ${estilo}">
  <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 56px; padding: 6px 12px 4px 20px; border-bottom: 3px double ${C.borde};">
    <h2 style="margin: 0; font-family: ${F.titulo}; font-size: 23px; font-weight: 600; color: ${C.tinta}; white-space: nowrap;">${titulo}</h2>
    <div style="display: flex; align-items: center; gap: 8px;">${accion}</div>
  </div>
  <div style="display: flex; flex-direction: column; padding: ${pad}; min-height: 0;">${cuerpo}</div>
</section>`;
const stat = (etq, valor, { sub = '', color = C.tinta } = {}) => `<div style="display: flex; flex-direction: column; gap: 2px; padding: 12px 18px; background: ${C.vitela}; border: 1px solid ${C.borde}; border-radius: 8px; min-width: 0;">
  <span style="font-family: ${F.ui}; font-size: 14px; color: ${C.suave};">${etq}</span>
  <span style="font-family: ${F.ui}; font-size: 28px; font-weight: 600; line-height: 1.2; color: ${color}; white-space: nowrap; ${num}">${valor}</span>
  ${sub ? `<span style="font-family: ${F.ui}; font-size: 14px; color: ${C.suave}; white-space: nowrap;">${sub}</span>` : ''}
</div>`;
const rejilla = (n, hijos, { gap = 16, estilo = '' } = {}) =>
  `<div style="display: grid; grid-template-columns: repeat(${n}, minmax(0, 1fr)); gap: ${gap}px; ${estilo}">${hijos.join('')}</div>`;
const columnas = (plantilla, hijos, { gap = 16, estilo = '' } = {}) =>
  `<div style="display: grid; grid-template-columns: ${plantilla}; gap: ${gap}px; align-items: start; ${estilo}">${hijos.join('')}</div>`;
const pila = (hijos, { gap = 16 } = {}) =>
  `<div style="display: flex; flex-direction: column; gap: ${gap}px; min-width: 0;">${hijos.join('')}</div>`;
const fila = (izq, der, { sub = '', borde = true, fuerte = false, alto } = {}) =>
  `<div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: ${alto || (sub ? 54 : 44)}px; ${borde ? `border-bottom: 1px solid ${C.borde};` : ''} font-family: ${F.ui}; font-size: 15px; font-weight: ${fuerte ? 600 : 400}; color: ${C.tinta};"><div style="display: flex; flex-direction: column; min-width: 0;"><span>${izq}</span>${sub ? `<span style="font-size: 13px; font-weight: 400; color: ${C.suave};">${sub}</span>` : ''}</div><div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">${der}</div></div>`;
const lista = (filas) => filas.map((f, i) => fila(f[0], f[1], { ...(f[2] || {}), borde: i < filas.length - 1 })).join('');
const tabla = (cols, filas, { alto = 44, total } = {}) => {
  const tpl = cols.map((c) => c.w || 'minmax(0, 1fr)').join(' ');
  const filaT = (celdas, { cab = false, ultimo = false, esTotal = false } = {}) =>
    `<div style="display: grid; grid-template-columns: ${tpl}; column-gap: 16px; align-items: center; min-height: ${cab ? 38 : alto}px; ${ultimo ? '' : `border-bottom: 1px solid ${C.borde};`} ${esTotal ? `border-top: 3px double ${C.borde}; font-weight: 600;` : ''} font-family: ${F.ui}; ${cab ? `font-size: 13px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: ${C.suave};` : `font-size: 15px; color: ${C.tinta};`}">${celdas
      .map((v, i) => `<div style="display: flex; align-items: center; gap: 8px; min-width: 0; ${cols[i].der ? 'justify-content: flex-end; text-align: right;' : ''} ${num}">${v}</div>`)
      .join('')}</div>`;
  return (
    filaT(cols.map((c) => c.t), { cab: true }) +
    filas.map((f, i) => filaT(f, { ultimo: i === filas.length - 1 })).join('') +
    (total ? filaT(total, { ultimo: true, esTotal: true }) : '')
  );
};
const pestanas = (items, activa) =>
  `<div style="display: flex; gap: 4px; border-bottom: 1px solid ${C.borde};">${items
    .map((t) =>
      t === activa
        ? `<div style="display: flex; align-items: center; height: 44px; padding: 0 16px; margin-bottom: -1px; border-bottom: 3px solid ${C.oro}; font-family: ${F.ui}; font-size: 16px; font-weight: 600; color: ${C.tinta};">${t}</div>`
        : `<div style="display: flex; align-items: center; height: 44px; padding: 0 16px; font-family: ${F.ui}; font-size: 16px; color: ${C.suave};">${t}</div>`,
    )
    .join('')}</div>`;
const barra = (pct, { color = C.oro, alto = 8 } = {}) =>
  `<div style="flex: 1; min-width: 60px; height: ${alto}px; border-radius: 4px; background: ${C.pliegue}; overflow: hidden;"><div style="width: ${pct}%; height: 100%; border-radius: 4px; background: ${color};"></div></div>`;
const aviso = (texto, tono = 'lacre', { accion = '', icono } = {}) => {
  const [bg, fg] = TONO[tono];
  return `<div style="display: flex; align-items: center; gap: 12px; min-height: 48px; padding: 2px 6px 2px 16px; background: ${bg}; border: 1px solid ${fg}40; border-radius: 8px; font-family: ${F.ui}; font-size: 15px; color: ${fg};">${ic(icono || (tono === 'lacre' ? 'alerta' : 'reloj'), 20)}<span style="flex: 1; font-weight: 600;">${texto}</span>${accion}</div>`;
};
const nota = (texto, icono = 'info') =>
  `<div style="display: flex; align-items: center; gap: 8px; font-family: ${F.ui}; font-size: 14px; color: ${C.suave};">${ic(icono, 16)}<span>${texto}</span></div>`;
const desplegable = (texto, ancho = '') =>
  `<div style="display: inline-flex; align-items: center; justify-content: space-between; gap: 10px; height: 44px; padding: 0 12px 0 14px; ${ancho ? `width: ${ancho};` : ''} background: ${C.campo}; border: 1px solid ${C.borde}; border-radius: 6px; font-family: ${F.ui}; font-size: 15px; color: ${C.tinta}; white-space: nowrap;">${texto}${ic('abajo', 16, C.suave)}</div>`;
const campo = (etq, valor, { ayuda = '', icono = '', alto = 48 } = {}) => `<div style="display: flex; flex-direction: column; gap: 6px; font-family: ${F.ui}; min-width: 0;">
  <span style="font-size: 14px; font-weight: 600; color: ${C.tinta};">${etq}</span>
  <div style="display: flex; align-items: ${alto > 48 ? 'flex-start' : 'center'}; justify-content: space-between; gap: 8px; min-height: ${alto}px; padding: ${alto > 48 ? '12px 14px' : '0 14px'}; background: ${C.campo}; border: 1px solid ${C.borde}; border-radius: 6px; font-size: 16px; color: ${C.tinta};"><span>${valor}</span>${icono ? ic(icono, 18, C.suave) : ''}</div>
  ${ayuda ? `<span style="font-size: 13px; color: ${C.suave};">${ayuda}</span>` : ''}
</div>`;
const chip = (texto, activo = false) =>
  `<div style="display: inline-flex; align-items: center; height: 44px; padding: 0 16px; border-radius: 22px; border: 1px solid ${activo ? C.oro : C.borde}; background: ${activo ? C.oroTinte : C.vitela}; font-family: ${F.ui}; font-size: 15px; font-weight: ${activo ? 600 : 400}; color: ${activo ? C.oroOsc : C.tinta}; white-space: nowrap;">${texto}</div>`;
const interruptor = (on) =>
  `<div style="display: inline-flex; align-items: center; gap: 10px; min-height: 44px; font-family: ${F.ui}; font-size: 15px; font-weight: 600; color: ${on ? C.bosque : C.suave};"><div style="display: flex; align-items: center; justify-content: ${on ? 'flex-end' : 'flex-start'}; width: 46px; height: 28px; padding: 3px; border-radius: 14px; background: ${on ? C.bosque : C.borde};"><div style="width: 22px; height: 22px; border-radius: 11px; background: ${C.vitela};"></div></div>${on ? 'Activo' : 'En pausa'}</div>`;
// Grupo plegado para los registros cerrados (saldadas, retiradas, terminadas, historial).
const plegable = (titulo, n, detalle = '') =>
  `<div style="display: flex; align-items: center; gap: 10px; min-height: 48px; padding: 0 16px 0 14px; background: ${C.vitela}; border: 1px solid ${C.borde}; border-radius: 8px; font-family: ${F.ui};">${ic('derecha', 18, C.suave)}<span style="font-size: 15px; font-weight: 600; color: ${C.tinta}; white-space: nowrap;">${titulo}</span>${badge(n)}<span style="flex: 1; min-width: 0; font-size: 14px; color: ${C.suave}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${detalle}</span></div>`;
const etiquetaGrupo = (t) =>
  `<div style="display: flex; align-items: flex-end; height: 30px; padding: 0 2px 4px; font-family: ${F.marca}; font-size: 13px; font-weight: 600; letter-spacing: 0.1em; color: ${C.suave};">${t}</div>`;
const leyenda = (items) =>
  `<div style="display: flex; flex-wrap: wrap; gap: 14px; font-family: ${F.ui}; font-size: 13px; color: ${C.suave};">${items
    .map(([t, l]) => `<span style="display: inline-flex; align-items: center; gap: 6px;"><span style="width: 10px; height: 10px; border-radius: 3px; background: ${TONO[TIPO[t]][0]}; border: 1px solid ${TONO[TIPO[t]][1]};"></span>${l}</span>`)
    .join('')}</div>`;
// Todo el dinero se muestra en monedas de oro (mo) con decimales.
const saldoOro = (valor, { etiqueta = 'Saldo' } = {}) => `<div style="display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 12px 22px; background: ${C.vitela}; border: 1px solid ${C.borde}; border-radius: 10px; font-family: ${F.ui};">
  <div style="display: flex; align-items: center; gap: 16px;">
    <div style="display: flex; align-items: center; justify-content: center; width: 52px; height: 52px; border-radius: 26px; background: ${C.oroTinte}; border: 1px solid ${C.oro}; font-family: ${F.marca}; font-size: 16px; font-weight: 600; color: ${C.oroOsc};">mo</div>
    <div style="display: flex; flex-direction: column;"><span style="font-size: 14px; color: ${C.suave};">${etiqueta} en monedas de oro</span><span style="font-size: 36px; font-weight: 600; line-height: 1.1; ${num}">${valor}</span></div>
  </div>
  <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px; font-size: 14px; color: ${C.suave};"><span>Equivalencias</span><span style="${num}">1 mo = 10 mp = 100 mb = 1.000 mc</span></div>
</div>`;

// ── Estructura común: barra superior + menú lateral ──────────────────────────
const DOMINIOS = {
  tharan: { nombre: 'Tharan', tipo: 'personaje', icono: 'usuario', sub: [['Resumen', 'resumen'], ['Bolsa y movimientos', 'monedas'], ['Inventario', 'bolsa'], ['Deudas y préstamos', 'balanza'], ['Gastos e ingresos', 'repetir'], ['Inversiones', 'maletin'], ['Hechizos', 'libro']] },
  bree: { nombre: 'Bree', tipo: 'pueblo', icono: 'torre', sub: [['Resumen', 'resumen'], ['Tesorería', 'tesoro'], ['Población', 'gente'], ['Personal', 'ficha'], ['Producción', 'trigo'], ['Animales', 'huella'], ['Comercio', 'carro'], ['Eventos', 'bandera']] },
  archet: { nombre: 'Archet', tipo: 'aldea', icono: 'torre', sub: [] },
};
const itemNav = (texto, icono, { activo = false, sangria = false, tenue = false } = {}) =>
  `<div style="display: flex; align-items: center; gap: 10px; height: 44px; padding: 0 12px 0 ${sangria ? 36 : 12}px; border-radius: 6px; border: 1px solid ${activo ? C.oro : 'transparent'}; background: ${activo ? C.vitela : 'transparent'}; font-family: ${F.ui}; font-size: 15px; font-weight: ${activo ? 600 : 400}; color: ${tenue ? C.suave : C.tinta};">${ic(icono, 18, activo ? C.oroOsc : C.suave)}<span style="flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${texto}</span></div>`;
const barraLateral = (activo) => {
  const [dom, sec] = activo.includes(':') ? activo.split(':') : [null, null];
  const dominio = (id) => {
    const d = DOMINIOS[id];
    const abierto = dom === id;
    const cab = `<div style="display: flex; align-items: center; gap: 10px; height: 44px; padding: 0 10px 0 12px; font-family: ${F.ui}; font-size: 15px; font-weight: ${abierto ? 600 : 400}; color: ${C.tinta};">${ic(d.icono, 18, abierto ? C.oroOsc : C.suave)}<span style="flex: 1;">${d.nombre}</span><span style="font-size: 13px; font-weight: 400; color: ${C.suave};">${d.tipo}</span>${ic(abierto ? 'abajo' : 'derecha', 16, C.suave)}</div>`;
    return cab + (abierto ? d.sub.map(([t, i]) => itemNav(t, i, { activo: t === sec, sangria: true })).join('') : '');
  };
  return `<nav style="grid-row: 2; grid-column: 1; display: flex; flex-direction: column; padding: 6px 12px 10px; background: ${C.pliegue}; border-right: 1px solid ${C.borde}; min-height: 0; overflow: hidden;">
  ${etiquetaGrupo('Partida')}
  ${itemNav('Inicio', 'casa', { activo: activo === 'inicio' })}
  ${itemNav('Calendario', 'calendario', { activo: activo === 'calendario' })}
  <div style="height: 6px; flex-shrink: 0;"></div>
  ${etiquetaGrupo('Dominios')}
  ${dominio('tharan')}${dominio('bree')}${dominio('archet')}
  ${itemNav('Añadir asentamiento', 'mas', { tenue: true })}
  <div style="flex: 1;"></div>
  ${itemNav('Ajustes y copias', 'ajustes', { activo: activo === 'ajustes' })}
</nav>`;
};
// El próximo aviso prioriza el aviso rojo más cercano; si no hay, el siguiente elemento del calendario.
const barraSuperior = (fecha, proximo, alerta = false) => `<header style="grid-row: 1; grid-column: 1 / 3; display: flex; align-items: center; gap: 20px; padding-right: 16px; background: ${C.vitela}; border-bottom: 1px solid ${C.borde};">
  <div style="display: flex; align-items: center; gap: 10px; width: 232px; height: 100%; padding: 0 18px; border-right: 1px solid ${C.borde}; flex-shrink: 0;">${emblema(22)}<span style="font-family: ${F.marca}; font-size: 14px; font-weight: 600; letter-spacing: 0.05em; line-height: 1.2; color: ${C.tinta};">La Sombra del Este</span></div>
  <div style="display: flex; align-items: baseline; gap: 12px; flex: 1; min-width: 0;">
    <span style="font-family: ${F.titulo}; font-size: 28px; font-weight: 600; color: ${C.tinta}; white-space: nowrap;">${fecha}</span>
    <span style="font-family: ${F.ui}; font-size: 14px; color: ${C.suave}; white-space: nowrap;">Jueves</span>
  </div>
  <div style="display: flex; align-items: center; gap: 8px; font-family: ${F.ui}; font-size: 14px; font-weight: ${alerta ? 600 : 400}; color: ${alerta ? C.lacre : C.suave}; white-space: nowrap;">${ic(alerta ? 'alerta' : 'reloj', 16)}${proximo}</div>
  ${btn('Avanzar días', { v: 'principal', icono: 'reloj_arena' })}
</header>`;
const marco = ({ activo, contenido, fecha = '12 de abril de 1640 T.E.', proximo = 'Mañana: salarios de Bree', alerta = false, capa = '' }) =>
  doc(`<div style="position: relative; width: 1180px; height: 820px; display: grid; grid-template-columns: 232px minmax(0, 1fr); grid-template-rows: 64px minmax(0, 1fr); background: ${C.papel}; color: ${C.tinta}; font-family: ${F.ui}; overflow: hidden;">
${barraSuperior(fecha, proximo, alerta)}
${barraLateral(activo)}
<main style="grid-row: 2; grid-column: 2; display: flex; flex-direction: column; gap: 18px; padding: 20px 28px 22px; min-height: 0; min-width: 0; overflow: hidden;">
${contenido}
</main>
${capa}
</div>`);
const dialogo = (ancho, contenido) => `<div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(43, 33, 24, 0.55);">
  <div style="display: flex; flex-direction: column; width: ${ancho}px; background: ${C.vitela}; border: 1px solid ${C.borde}; border-radius: 10px; box-shadow: 0 24px 60px rgba(43, 33, 24, 0.35); overflow: hidden;">${contenido}</div>
</div>`;
const cabDialogo = (titulo, sub) => `<div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 18px 16px 14px 28px; border-bottom: 3px double ${C.borde};">
  <div style="display: flex; flex-direction: column; gap: 2px;"><h2 style="margin: 0; font-family: ${F.titulo}; font-size: 32px; font-weight: 600; line-height: 1.15; color: ${C.tinta};">${titulo}</h2><span style="font-family: ${F.ui}; font-size: 15px; color: ${C.suave};">${sub}</span></div>
  ${btnIcono('x', 'fantasma')}
</div>`;
const pieDialogo = (izq, der) =>
  `<div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 20px 14px 28px; border-top: 1px solid ${C.borde}; background: ${C.papel};"><div>${izq}</div><div style="display: flex; gap: 10px;">${der}</div></div>`;
// Diálogo apilado: el de abajo queda atenuado por un segundo velo y el nuevo se ancla a 24 px del borde superior.
const dialogoApilado = (anchoAbajo, contenidoAbajo, anchoArriba, contenidoArriba, { extra = '' } = {}) => `<div style="position: absolute; inset: 0;">
  ${dialogo(anchoAbajo, contenidoAbajo)}
  <div style="position: absolute; inset: 0; background: rgba(43, 33, 24, 0.35);"></div>
  <div data-dialogo-apilado="true" style="position: absolute; top: 24px; left: ${(1180 - anchoArriba) / 2}px; display: flex; flex-direction: column; width: ${anchoArriba}px; background: ${C.vitela}; border: 1px solid ${C.borde}; border-radius: 10px; box-shadow: 0 24px 60px rgba(43, 33, 24, 0.45); overflow: hidden;">${contenidoArriba}</div>
  ${extra}
</div>`;
// Teclado en pantalla de la tablet (380 px) para comprobar que el alta rápida queda por encima.
const teclado = (sugerencias) => {
  const tecla = (t, flex = 1, oscura = false) =>
    `<div style="display: flex; align-items: center; justify-content: center; flex: ${flex}; height: 60px; border-radius: 8px; background: ${oscura ? '#B9BCC4' : '#FFFFFF'}; box-shadow: 0 1px 0 rgba(0, 0, 0, 0.25); font-family: ${F.ui}; font-size: 22px; color: #1F2024;">${t}</div>`;
  const filaTeclas = (teclas) => `<div style="display: flex; gap: 8px;">${teclas.join('')}</div>`;
  return `<div data-teclado="true" style="position: absolute; left: 0; right: 0; bottom: 0; height: 380px; display: flex; flex-direction: column; gap: 10px; padding: 0 10px 14px; background: #D5D7DC; border-top: 1px solid #B9BCC4;">
  <div style="display: flex; align-items: center; justify-content: space-around; height: 44px; border-bottom: 1px solid #B9BCC4; font-family: ${F.ui}; font-size: 17px; color: #1F2024;">${sugerencias.map((s, i) => `<span style="${i === 1 ? 'font-weight: 600;' : ''}">${s}</span>`).join(`<span style="width: 1px; height: 24px; background: #B9BCC4;"></span>`)}</div>
  ${filaTeclas('qwertyuiop'.split('').map((l) => tecla(l)).concat(tecla('⌫', 1.4, true)))}
  ${filaTeclas([`<div style="flex: 0.4;"></div>`, ...'asdfghjklñ'.split('').map((l) => tecla(l)), tecla('Intro', 1.9, true)])}
  ${filaTeclas([tecla('⇧', 1.4, true), ...'zxcvbnm'.split('').map((l) => tecla(l)), tecla(',', 1), tecla('.', 1), tecla('⇧', 1.4, true)])}
  ${filaTeclas([tecla('123', 1.6, true), tecla('', 8), tecla('123', 1.6, true)])}
</div>`;
};

// ── PÁGINA 1 · PARTIDA ───────────────────────────────────────────────────────
const tarjetaPartida = ({ nombre, fecha, dominios, ultima, principal }) => `<div style="display: flex; align-items: center; gap: 20px; padding: 18px 20px 18px 22px; background: ${C.vitela}; border: 1px solid ${principal ? C.oro : C.borde}; border-radius: 10px;">
  <div style="display: flex; align-items: center; justify-content: center; width: 56px; height: 56px; border-radius: 28px; background: ${C.pliegue}; border: 1px solid ${C.borde}; flex-shrink: 0;">${emblema(28)}</div>
  <div style="display: flex; flex-direction: column; gap: 3px; flex: 1; min-width: 0; font-family: ${F.ui};">
    <span style="font-family: ${F.titulo}; font-size: 28px; font-weight: 600; line-height: 1.1; color: ${C.tinta};">${nombre}</span>
    <span style="font-size: 15px; color: ${C.tinta};">${fecha}</span>
    <span style="font-size: 14px; color: ${C.suave};">${dominios} · Última sesión: ${ultima}</span>
  </div>
  ${btnIcono('editar', 'fantasma')}
  ${btn('Exportar', { v: 'fantasma', icono: 'bajar' })}
  ${btn(principal ? 'Continuar' : 'Abrir', { v: principal ? 'principal' : 'secundario' })}
</div>`;

const selectorPartidas = () =>
  doc(`<div style="display: flex; flex-direction: column; align-items: center; width: 1180px; height: 820px; padding: 60px 0 40px; background: ${C.papel}; color: ${C.tinta}; font-family: ${F.ui}; overflow: hidden;">
  <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
    ${emblema(44)}
    <h1 style="margin: 0; font-family: ${F.marca}; font-size: 44px; font-weight: 600; letter-spacing: 0.08em; color: ${C.tinta};">Gestión de Aldeas</h1>
    ${filete(280)}
    <p style="margin: 0; font-family: ${F.titulo}; font-size: 23px; font-style: italic; font-weight: 500; color: ${C.suave};">La economía de tus dominios en la Tierra Media</p>
  </div>
  <div style="display: flex; flex-direction: column; gap: 14px; width: 780px; margin-top: 44px;">
    <div style="display: flex; align-items: flex-end; justify-content: space-between;">
      <h2 style="margin: 0; font-family: ${F.titulo}; font-size: 26px; font-weight: 600;">Tus partidas</h2>
      <div style="display: flex; gap: 10px;">${btn('Importar copia', { v: 'fantasma', icono: 'subir' })}${btn('Nueva partida', { icono: 'mas' })}</div>
    </div>
    ${tarjetaPartida({ nombre: 'La Sombra del Este', fecha: '12 de abril de 1640 T.E.', dominios: 'Tharan, Bree y Archet', ultima: '8 de septiembre de 2026', principal: true })}
    ${tarjetaPartida({ nombre: 'Los Senderos del Norte', fecha: '3 de febrero de 2980 T.E.', dominios: 'Aldric, sin asentamientos', ultima: '2 de junio de 2026' })}
    <div style="margin-top: 6px;">${nota('Tus partidas se guardan solo en esta tablet. Exporta una copia de vez en cuando para no perderlas.')}</div>
  </div>
</div>`);

const pasoAsistente = (n, texto, estado) => {
  const activo = estado === 'activo';
  return `<div style="display: flex; align-items: center; gap: 10px; font-family: ${F.ui};"><div style="display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 17px; background: ${activo ? C.oroOsc : C.vitela}; border: 1px solid ${activo ? C.oroOsc : C.borde}; font-size: 15px; font-weight: 600; color: ${activo ? C.vitela : C.suave};">${n}</div><span style="font-size: 15px; font-weight: ${activo ? 600 : 400}; color: ${activo ? C.tinta : C.suave};">${texto}</span></div>`;
};
const nuevaPartida = () =>
  doc(`<div style="display: flex; flex-direction: column; width: 1180px; height: 820px; background: ${C.papel}; color: ${C.tinta}; font-family: ${F.ui}; overflow: hidden;">
  <div style="display: flex; align-items: center; justify-content: space-between; height: 64px; padding: 0 16px 0 24px; background: ${C.vitela}; border-bottom: 1px solid ${C.borde};">
    <div style="display: flex; align-items: center; gap: 10px;">${emblema(22)}<span style="font-family: ${F.marca}; font-size: 15px; font-weight: 600; letter-spacing: 0.06em;">Gestión de Aldeas</span></div>
    ${btn('Cancelar', { v: 'fantasma', icono: 'x' })}
  </div>
  <div style="display: flex; flex-direction: column; gap: 22px; width: 880px; margin: 0 auto; padding-top: 30px;">
    <div style="display: flex; align-items: center; gap: 14px;">
      ${pasoAsistente(1, 'Partida y fecha', 'activo')}<div style="flex: 1; height: 1px; background: ${C.borde};"></div>
      ${pasoAsistente(2, 'Personaje')}
    </div>
    <h1 style="margin: 0; font-family: ${F.titulo}; font-size: 40px; font-weight: 600; line-height: 1.1;">Da nombre a tu partida</h1>
    ${campo('Nombre de la partida', 'La Sombra del Este')}
    <div style="display: grid; grid-template-columns: 110px minmax(0, 1fr) 140px minmax(0, 1.6fr); gap: 14px; align-items: end;">
      ${campo('Día', '1')}${campo('Mes', 'Enero', { icono: 'abajo' })}${campo('Año', '1640')}${etiquetaCampo('Edad', segmentos(['Segunda', 'Tercera', 'Cuarta'], 'Tercera'))}
    </div>
    <div style="display: flex; flex-direction: column; gap: 8px;">
      ${aviso(`La partida empieza el ${diaDe(1640, 0, 1)} 1 de enero de 1640 T.E.`, 'neutro', { icono: 'calendario' })}
      ${nota('Calendario actual: meses, bisiestos y días de la semana reales del año elegido. No hay festivos predefinidos: los anuncia el máster y los anotas como eventos.')}
    </div>
    <div style="display: flex; align-items: center; gap: 16px; padding: 12px 12px 12px 18px; background: ${C.vitela}; border: 1px solid ${C.borde}; border-radius: 8px;">
      ${ic('monedas', 22, C.oroOsc)}
      <div style="display: flex; flex-direction: column; flex: 1;"><span style="font-size: 15px; font-weight: 600;">Monedas de MERP · los saldos se muestran en oro</span><span style="font-size: 14px; color: ${C.suave};">1 mm = 100 mo · 1 mo = 10 mp · 1 mp = 10 mb · 1 mb = 10 mc · 1 mc = 10 me · 1 me = 10 mh</span></div>
      ${enlace('Editar equivalencias')}
    </div>
    <div style="display: flex; align-items: center; gap: 16px; padding: 12px 12px 12px 18px; background: ${C.vitela}; border: 1px solid ${C.borde}; border-radius: 8px;">
      ${ic('trigo', 22, C.oroOsc)}
      <div style="display: flex; flex-direction: column; flex: 1; min-height: 44px; justify-content: center;"><span style="font-size: 15px; font-weight: 600;">Víveres en sacos · ración fija</span><span style="font-size: 14px; color: ${C.suave};">1 saco = 30 kg = víveres para 1 persona durante 1 mes (30 días) · 1 kg al día con margen para pérdidas</span></div>
    </div>
    <div style="display: flex; justify-content: flex-end; margin-top: 4px;">${btn('Siguiente: personaje', { v: 'principal' })}</div>
  </div>
</div>`);

// Estado de la partida antes (día 12) y después (día 19) del avance de 7 días que muestran los diálogos.
const INICIO = {
  antes: {
    ultimo: 'Último avance: del 10 al 12 de abril',
    // Rojo: falta en 7 días o menos, impago, deuda vencida o saldo negativo. Ámbar: falta entre 8 y 30 días o deuda que vence en 10 días.
    avisos: [['Los víveres de Bree se agotan el 23 de abril', 'oro', 'Ver almacén', 'alerta'], ['La deuda de 4 mo con Hobart vence el 20 de abril', 'oro', 'Ver deudas']],
    tharan: { valor: '46,518 mo', patrimonio: '167,118 mo', estudio: '2' },
    bree: { valor: '340,6 mo', curso: '2 obras · 2 caravanas' },
    archet: { valor: '85 mo', curso: 'Molino al 60 %' },
    proximos: [
      [13, [['p', 'Salarios de Bree', '−4,2 mo']]],
      [14, [['o', 'Producción de Bree', '']]],
      [15, [['e', 'Feria de primavera', 'Hasta el 17'], ['c', 'Aranceles', '+18 mo'], ['c', 'Barcaza', '+1,5 mo']]],
      [16, []],
      [17, [['o', 'Puerta del sur', 'Obra terminada'], ['e', 'Fin de la feria', '']]],
      [18, [['c', 'Caravana de Fornost', '+24 mo']]],
      [19, [['p', 'Tributo de Archet', '−60 mo']]],
    ],
  },
  despues: {
    ultimo: 'Último avance: del 12 al 19 de abril',
    avisos: [['Los víveres de Bree se agotan el 23; la caravana vuelve el 25', 'lacre', 'Ver almacén'], ['Mañana vence la deuda de 4 mo con Hobart', 'oro', 'Ver deudas'], ['La caja de Archet no cubre el tributo de 60 mo del 19 de julio', 'oro', 'Ver tesorería']],
    tharan: { valor: '47,178 mo', patrimonio: '167,778 mo', estudio: '2' },
    bree: { valor: '380,5 mo', curso: '1 obra · 1 caravana' },
    archet: { valor: '25 mo', curso: 'Molino al 78 %' },
    proximos: [
      [20, [['p', 'Salarios de Bree', '−4,2 mo'], ['p', 'Vence deuda Hobart', '4 mo pendientes']]],
      [21, [['o', 'Producción de Bree', ''], ['e', 'Fin de las lluvias', '']]],
      [22, [['c', 'Aranceles', '+3 mo']]],
      [23, [['p', 'Bree sin víveres', '']]],
      [24, [['p', 'Soldada de Bree', '−5,8 mo']]],
      [25, [['o', 'Caravana de Tharbad', '+300 sacos']]],
      [26, [['p', 'Salarios de Archet', '−3,2 mo']]],
    ],
  },
};
const LEYENDA = [['p', 'Pagos y avisos'], ['c', 'Cobros'], ['e', 'Eventos'], ['o', 'Producción, obras, caravanas y estudio']];
const chipDia = ([t, titulo, sub]) => {
  const [bg, fg] = TONO[TIPO[t]];
  return `<div style="display: flex; flex-direction: column; gap: 1px; padding: 6px 9px; border-radius: 6px; background: ${bg}; color: ${t === 'o' ? C.tinta : fg}; font-family: ${F.ui};"><span style="font-size: 13px; font-weight: 600; line-height: 1.25;">${titulo}</span>${sub ? `<span style="font-size: 13px; line-height: 1.25; ${num}">${sub}</span>` : ''}</div>`;
};
const tarjetaDominio = ({ icono, nombre, tipo, etq, valor, filas }) => `<div style="display: flex; flex-direction: column; background: ${C.vitela}; border: 1px solid ${C.borde}; border-radius: 10px; overflow: hidden; min-width: 0;">
  <div style="display: flex; align-items: center; gap: 10px; padding: 12px 16px 8px 18px; border-bottom: 3px double ${C.borde};">${ic(icono, 20, C.oroOsc)}<span style="flex: 1; font-family: ${F.titulo}; font-size: 26px; font-weight: 600;">${nombre}</span>${badge(tipo)}</div>
  <div style="display: flex; flex-direction: column; gap: 0; padding: 12px 18px 4px;"><span style="font-size: 14px; color: ${C.suave};">${etq}</span><span style="font-size: 30px; font-weight: 600; line-height: 1.2; ${num}">${valor}</span></div>
  <div style="display: flex; flex-direction: column; padding: 0 18px 6px;">${lista(filas.map((f) => [f[0], f[1], { alto: 40 }]))}</div>
</div>`;
const contenidoInicio = (d = INICIO.antes) => `
${cabecera('Estado de tus dominios', { sub: 'Inicio', acciones: enlace(d.ultimo) })}
${rejilla(2, d.avisos.map(([t, tono, accion, icono]) => aviso(t, tono, { accion: enlace(accion), icono })), { gap: 10 })}
${rejilla(3, [
  tarjetaDominio({ icono: 'usuario', nombre: 'Tharan', tipo: 'personaje', etq: 'Bolsa', valor: d.tharan.valor, filas: [['Patrimonio', imp(d.tharan.patrimonio)], ['Deudas pendientes', imp('−46 mo')], ['Hechizos en estudio', d.tharan.estudio]] }),
  tarjetaDominio({ icono: 'torre', nombre: 'Bree', tipo: 'pueblo', etq: 'Caja', valor: d.bree.valor, filas: [['Población', '1.240 hab.'], ['Balance mensual', imp('−11,5 mo')], ['En curso', d.bree.curso]] }),
  tarjetaDominio({ icono: 'torre', nombre: 'Archet', tipo: 'aldea', etq: 'Caja', valor: d.archet.valor, filas: [['Población', '310 hab.'], ['Balance mensual', imp('−14,6 mo')], ['En curso', d.archet.curso]] }),
])}
${panel(
  'Próximos 7 días',
  `<div style="display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 10px; padding-top: 8px;">${d.proximos.map(
    ([n, items]) => `<div style="display: flex; flex-direction: column; gap: 6px; min-width: 0;"><div style="display: flex; align-items: baseline; gap: 6px; padding-bottom: 4px; border-bottom: 1px solid ${C.borde};"><span style="font-family: ${F.titulo}; font-size: 24px; font-weight: 600; line-height: 1.1;">${n}</span><span style="font-size: 13px; color: ${C.suave};">${diaSemana(n)}</span></div>${items.length ? items.map(chipDia).join('') : `<span style="font-size: 13px; color: ${C.suave};">Nada previsto</span>`}</div>`,
  ).join('')}</div>`,
  { accion: leyenda(LEYENDA), pad: '4px 18px 14px' },
)}`;
const inicio = () => marco({ activo: 'inicio', contenido: contenidoInicio() });

const MARCAS = {
  1: [['c', 'Impuesto hogar'], ['c', 'Impuesto locales'], ['c', 'Aranceles'], ['c', 'Tonel Dorado'], ['e', 'Mensajero real'], ['o', 'Sale caravana Tharbad'], ['o', 'Producción']],
  6: [['p', 'Salarios Bree'], ['o', 'Empieza obra puerta']],
  7: [['o', 'Producción']],
  8: [['c', 'Aranceles'], ['e', 'Lluvias']],
  10: [['p', 'Soldada Bree'], ['c', 'Alquiler molino'], ['o', 'Empieza obra granero'], ['o', 'Intento estudio'], ['o', 'Sale caravana Fornost']],
  13: [['p', 'Salarios Bree']],
  14: [['o', 'Producción']],
  15: [['e', 'Feria'], ['c', 'Aranceles'], ['c', 'Barcaza']],
  17: [['o', 'Fin obra puerta'], ['e', 'Fin feria']],
  18: [['c', 'Caravana Fornost']],
  19: [['p', 'Tributo Archet']],
  20: [['p', 'Salarios Bree'], ['p', 'Vence deuda Hobart']],
  21: [['o', 'Producción'], ['e', 'Fin lluvias']],
  22: [['c', 'Aranceles']],
  23: [['p', 'Sin víveres']],
  24: [['p', 'Soldada Bree']],
  25: [['o', 'Caravana Tharbad']],
  26: [['p', 'Salarios Archet']],
  27: [['p', 'Salarios Bree']],
  28: [['o', 'Producción'], ['o', 'Fin obra molino (Archet)']],
  29: [['c', 'Aranceles']],
  30: [['p', 'Diezmo Fornost']],
};
const celdaCalendario = (i) => {
  const n = i - 5;
  if (n < 1 || n > 30) return `<div></div>`;
  const hoy = n === 12;
  const sel = n === 15;
  const marcas = MARCAS[n] || [];
  const visibles = marcas.slice(0, marcas.length > 2 ? 1 : 2)
    .map(([t, l]) => `<div style="padding: 1px 5px; border-radius: 4px; background: ${TONO[TIPO[t]][0]}; font-size: 12px; font-weight: 600; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: ${t === 'o' ? C.tinta : TONO[TIPO[t]][1]};">${l}</div>`)
    .join('');
  const mas = marcas.length > 2 ? `<span style="font-size: 12px; color: ${C.suave};">+${marcas.length - 1} más</span>` : '';
  return `<div style="display: flex; flex-direction: column; gap: 3px; min-width: 0; min-height: 0; padding: 3px 5px; border-radius: 6px; background: ${sel ? C.oroTinte : C.campo}; border: ${hoy ? `2px solid ${C.oro}` : `1px solid ${sel ? C.oro : C.borde}`}; overflow: hidden;">
    <div style="display: flex; align-items: baseline; justify-content: space-between;"><span style="font-size: 15px; font-weight: 600; color: ${n < 12 ? C.suave : C.tinta};">${n}</span>${hoy ? `<span style="font-size: 12px; font-weight: 600; color: ${C.oroOsc};">Hoy</span>` : ''}</div>
    ${visibles}${mas}
  </div>`;
};
// Una tarjeta por registro (nunca se agrupan registros distintos), con su botón de editar.
const detalleDia = (titulo, sub, valor) =>
  `<div style="display: flex; align-items: center; gap: 4px; min-width: 0; padding: 3px 2px 3px 10px; background: ${C.campo}; border: 1px solid ${C.borde}; border-radius: 6px; font-family: ${F.ui};"><div style="display: flex; flex-direction: column; flex: 1; min-width: 0;"><span style="font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${titulo}</span><span style="font-size: 13px; color: ${C.suave}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${sub} · ${valor}</span></div>${btnIcono('editar', 'fantasma')}</div>`;
const calendario = () =>
  marco({
    activo: 'calendario',
    contenido: `
${cabecera('Abril de 1640 T.E.', { sub: 'Calendario', acciones: `${desplegable('Todos')}${btnIcono('izquierda')}${btn('Hoy')}${btnIcono('derecha')}${btn('Añadir evento o pago', { icono: 'mas' })}` })}
<div style="display: flex; flex-direction: column; gap: 10px; flex: 1; min-height: 0;">
  <div style="display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); grid-template-rows: 26px repeat(6, minmax(0, 1fr)); gap: 4px; flex: 1; min-height: 0; padding: 10px; background: ${C.vitela}; border: 1px solid ${C.borde}; border-radius: 8px; font-family: ${F.ui};">
    ${SEMANA_LUNES.map((d) => `<div style="display: flex; align-items: center; justify-content: center; font-family: ${F.marca}; font-size: 12px; font-weight: 600; letter-spacing: 0.04em; color: ${C.suave};">${d}</div>`).join('')}
    ${Array.from({ length: 42 }, (_, i) => celdaCalendario(i)).join('')}
  </div>
  <div style="display: grid; grid-template-columns: 190px repeat(3, minmax(0, 1fr)); gap: 6px 10px; padding: 8px 12px; background: ${C.vitela}; border: 1px solid ${C.borde}; border-radius: 8px;">
    <div style="grid-row: 1 / 3; display: flex; flex-direction: column; justify-content: center; gap: 2px;"><span style="font-family: ${F.titulo}; font-size: 24px; font-weight: 600; line-height: 1.1;">15 de abril</span><span style="font-size: 14px; color: ${C.suave};">${diaSemana(15)} · dentro de 3 días</span></div>
    ${detalleDia('Feria de primavera', 'Bree', `<span style="font-weight: 600; color: ${C.oroOsc};">aranceles +500 %</span>`)}
    ${detalleDia('Aranceles', 'Bree', imp('+18 mo'))}
    ${detalleDia('Barcaza del Brandivino', 'Tharan', imp('+1,5 mo'))}
    ${detalleDia('Posada El Poney Pisador', 'Tharan', `${imp('−0,1 mo')} al día`)}
    ${detalleDia('Establo del poni', 'Tharan', `${imp('−0,02 mo')} al día`)}
    ${detalleDia('Peaje del camino', 'Bree', `${imp('+0,3 mo')} al día`)}
  </div>
  <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px;">${leyenda(LEYENDA)}${nota('En el mes no se marcan los gastos diarios ni los movimientos manuales.')}</div>
</div>`,
  });

const grupoPrevia = (icono, nombre, total, filas) => `<div style="display: flex; flex-direction: column;">
  <div style="display: flex; align-items: center; gap: 8px; height: 42px; border-bottom: 1px solid ${C.borde};">${ic(icono, 18, C.oroOsc)}<span style="flex: 1; font-family: ${F.titulo}; font-size: 23px; font-weight: 600;">${nombre}</span>${total}</div>
  ${filas.map(([t, v], i) => fila(t, v, { alto: 34, borde: i < filas.length - 1 })).join('')}
</div>`;
const selectorDias = () => `<div style="display: flex; align-items: center; gap: 10px; padding: 12px 28px; border-bottom: 1px solid ${C.borde}; font-family: ${F.ui};">
  <span style="font-size: 15px; font-weight: 600; margin-right: 4px;">Días</span>
  ${chip('1')}${chip('7', true)}${chip('30')}${chip('Otro…')}
  <div style="flex: 1;"></div>
  <span style="font-size: 17px; font-weight: 600;">Del 12 al 19 de abril</span>
</div>`;
const avanzarPrevia = () =>
  marco({
    activo: 'inicio',
    contenido: contenidoInicio(),
    capa: dialogo(
      960,
      `${cabDialogo('Avanzar días', 'Revisa lo que va a pasar antes de aplicarlo.')}
      ${selectorDias()}
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 28px; padding: 4px 28px 12px; align-items: start;">
        ${pila([
          grupoPrevia('usuario', 'Tharan', imp('+0,66 mo'), [
            ['Posada El Poney Pisador · 7 noches', imp('−0,7 mo')],
            ['Establo del poni · 7 días', imp('−0,14 mo')],
            ['Beneficio de la Barcaza (día 15)', imp('+1,5 mo')],
          ]),
          grupoPrevia('torre', 'Archet', imp('−60 mo'), [
            ['Tributo a la Corona (día 19)', imp('−60 mo')],
            ['Consumo de víveres', imp('−72 sacos')],
            ['Obra del molino', imp('60 % → 78 %')],
          ]),
        ], { gap: 10 })}
        ${grupoPrevia('torre', 'Bree', imp('+39,9 mo'), [
          ['Salarios de 14 trabajadores (día 13)', imp('−4,2 mo')],
          ['Aranceles con la feria (día 15)', imp('+18 mo')],
          ['Peaje del camino · 7 días', imp('+2,1 mo')],
          ['Venta de cerveza en Fornost (día 18)', imp('+24 mo')],
          ['Víveres de las granjas (día 14, lluvias −20 %)', imp('+72 sacos')],
          ['Madera y piedra', imp('+35 haces · +17 carretadas')],
          ['Cerveza y lana', imp('+20 barriles · +12 fardos')],
          ['Consumo de víveres', imp('−289 sacos')],
          ['Consumo de cerveza y leña', imp('−26 barriles · −69 haces')],
          ['Obras: la puerta termina el 17', imp('granero 8 % → 25 %')],
        ])}
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px; padding: 0 28px 16px;">
        ${aviso('Al acabar quedan 93 sacos: los víveres de Bree se agotan el 23 y la caravana de Tharbad no vuelve hasta el 25.', 'lacre')}
        ${rejilla(2, [aviso('Mañana vence la deuda de 4 mo con Hobart.', 'oro'), aviso('La caja de Archet no cubre el tributo de 60 mo del 19 de julio.', 'oro')], { gap: 8 })}
      </div>
      ${pieDialogo(nota('Se registrarán 8 movimientos. Podrás deshacer este avance.'), `${btn('Cancelar')}${btn('Avanzar 7 días', { v: 'principal', icono: 'reloj_arena' })}`)}`,
    ),
  });

const avanzarResumen = () =>
  marco({
    activo: 'inicio',
    fecha: '19 de abril de 1640 T.E.',
    proximo: 'Víveres de Bree: se agotan el 23',
    alerta: true,
    contenido: contenidoInicio(INICIO.despues),
    capa: dialogo(
      900,
      `<div style="display: flex; align-items: center; gap: 16px; padding: 18px 16px 14px 28px; border-bottom: 3px double ${C.borde};">
        <div style="display: flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 24px; background: ${C.bosqueTinte}; color: ${C.bosque};">${ic('check', 26)}</div>
        <div style="display: flex; flex-direction: column; gap: 2px; flex: 1;"><h2 style="margin: 0; font-family: ${F.titulo}; font-size: 32px; font-weight: 600; line-height: 1.15;">Avance aplicado</h2><span style="font-family: ${F.ui}; font-size: 15px; color: ${C.suave};">Del 12 al 19 de abril de 1640 T.E. · 7 días · 8 movimientos</span></div>
        ${btnIcono('x', 'fantasma')}
      </div>
      <div style="display: flex; flex-direction: column; gap: 16px; padding: 14px 28px 18px;">
        <div>${tabla(
          [{ t: 'Dominio' }, { t: 'Antes', w: '150px', der: true }, { t: 'Después', w: '150px', der: true }, { t: 'Cambio', w: '150px', der: true }, { t: 'Movimientos', w: '130px', der: true }],
          [
            ['Tharan', '46,518 mo', '47,178 mo', imp('+0,66 mo'), `<span style="display: inline-flex; align-items: center; gap: 4px; font-weight: 600; color: ${C.oroOsc};">3${ic('derecha', 16)}</span>`],
            ['Bree', '340,6 mo', '380,5 mo', imp('+39,9 mo'), `<span style="display: inline-flex; align-items: center; gap: 4px; font-weight: 600; color: ${C.oroOsc};">4${ic('derecha', 16)}</span>`],
            ['Archet', '85 mo', '25 mo', imp('−60 mo'), `<span style="display: inline-flex; align-items: center; gap: 4px; font-weight: 600; color: ${C.oroOsc};">1${ic('derecha', 16)}</span>`],
          ],
          { alto: 40 },
        )}</div>
        <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 28px;">
          <div style="display: flex; flex-direction: column;">
            <h3 style="margin: 0 0 2px; font-family: ${F.titulo}; font-size: 23px; font-weight: 600;">Almacenes</h3>
            ${lista([
              ['Bree · víveres', `<span style="color: ${C.suave};">310 →</span> ${imp('93 sacos')} ${badge('Hasta el 23', 'lacre', 'alerta')}`, { alto: 38 }],
              ['Bree · madera', `<span style="color: ${C.suave};">420 →</span> ${imp('386 haces')}`, { alto: 38 }],
              ['Bree · piedra', `<span style="color: ${C.suave};">180 →</span> ${imp('197 carretadas')}`, { alto: 38 }],
              ['Bree · cerveza', `<span style="color: ${C.suave};">90 →</span> ${imp('84 barriles')}`, { alto: 38 }],
              ['Bree · lana', `<span style="color: ${C.suave};">35 →</span> ${imp('47 fardos')}`, { alto: 38 }],
              ['Archet · víveres', `<span style="color: ${C.suave};">900 →</span> ${imp('828 sacos')}`, { alto: 38 }],
            ])}
          </div>
          <div style="display: flex; flex-direction: column;">
            <h3 style="margin: 0 0 2px; font-family: ${F.titulo}; font-size: 23px; font-weight: 600;">Qué ha pasado</h3>
            ${lista([
              ['Feria de primavera celebrada', '<span style="color: #6B5A45;">15 al 17</span>', { alto: 38 }],
              ['Puerta del sur reparada', '<span style="color: #6B5A45;">17</span>', { alto: 38 }],
              ['Caravana de Fornost de vuelta', '<span style="color: #6B5A45;">18</span>', { alto: 38 }],
              ['Tributo de Archet pagado', '<span style="color: #6B5A45;">19</span>', { alto: 38 }],
            ])}
          </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${aviso('Los víveres de Bree se agotan el 23 y la caravana de Tharbad no vuelve hasta el 25. Compra víveres o anota lo que decida el máster.', 'lacre', { accion: enlace('Ver almacén') })}
          ${rejilla(2, [aviso('Mañana vence la deuda de 4 mo con Hobart.', 'oro', { accion: enlace('Ver deudas') }), aviso('La caja de Archet no cubre el tributo de 60 mo del 19 de julio.', 'oro', { accion: enlace('Ver tesorería') })], { gap: 8 })}
        </div>
      </div>
      ${pieDialogo(btn('Deshacer avance', { icono: 'deshacer' }), `${nota('Toca un dominio para ver los movimientos de este avance.')}${btn('Cerrar', { v: 'principal' })}`)}`,
    ),
  });

const campoCorto = (valor) => `<span style="font-weight: 600; ${num}">${valor}</span>`;
const ajustes = () =>
  marco({
    activo: 'ajustes',
    contenido: `
${cabecera('Ajustes y copias', { sub: 'La Sombra del Este' })}
${columnas('minmax(0, 1.1fr) minmax(0, 1fr)', [
  pila([panel(
    'Monedas',
    `${tabla(
      [{ t: 'Moneda' }, { t: 'Abrev.', w: '70px' }, { t: 'Equivale a', w: '170px', der: true }],
      [
        ['Mithril', 'mm', `${campoCorto('100')}<span style="width: 28px;">mo</span>`],
        ['Oro', 'mo', `${campoCorto('10')}<span style="width: 28px;">mp</span>`],
        ['Plata', 'mp', `${campoCorto('10')}<span style="width: 28px;">mb</span>`],
        ['Bronce', 'mb', `${campoCorto('10')}<span style="width: 28px;">mc</span>`],
        ['Cobre', 'mc', `${campoCorto('10')}<span style="width: 28px;">me</span>`],
        ['Estaño', 'me', `${campoCorto('10')}<span style="width: 28px;">mh</span>`],
        ['Hierro', 'mh', `<span style="color: ${C.suave};">Unidad base</span>`],
      ],
      { alto: 44 },
    )}
    <div style="margin-top: 8px;">${nota('Se fijaron al crear la partida. Todos los importes se muestran en oro.')}</div>`,
  ),
  panel(
    'Listas y catálogos',
    `<div style="display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 10px 0 4px;"><span style="font-size: 14px; line-height: 1.4; color: ${C.suave};">Categorías, oficios, tipos, recursos, ubicaciones y personas</span>${btn('Gestionar listas', { icono: 'derecha' })}</div>`,
  )]),
  pila([
    panel('Calendario', lista([['Calendario', 'Actual, con los meses de hoy', { alto: 40 }], ['Fecha actual', 'Jueves, 12 de abril de 1640 T.E.', { alto: 40 }], ['Ración de víveres', '1 saco de 30 kg por persona al mes', { alto: 40 }]]) + `<div style="padding: 4px 0 2px;">${nota('Sin festivos fijos: anótalos como eventos.')}</div>`),
    panel(
      'Copias de seguridad',
      `<p style="margin: 6px 0 2px; font-size: 15px; line-height: 1.4;">Tus datos solo están en esta tablet. Exporta una copia para no perderlos si se borra o se cambia de dispositivo.</p>
      ${fila('Última copia exportada', '8 de septiembre de 2026', { borde: false })}
      <div style="display: flex; gap: 10px; margin: 4px 0 8px;">${btn('Exportar copia', { icono: 'bajar' })}${btn('Importar copia', { v: 'fantasma', icono: 'subir' })}</div>
      ${nota('Importar una copia reemplaza la partida actual.', 'alerta')}`,
      { pad: '4px 20px 14px' },
    ),
    panel('Partida', `<div style="display: flex; gap: 10px; padding: 8px 0 2px;">${btn('Cambiar de partida', { icono: 'cambio' })}${btn('Borrar partida', { v: 'peligro' })}</div>`),
  ]),
])}`,
  });

// P7: opciones de los desplegables (catálogos de la app y listas de la partida), con editar y eliminar con reasignación.
const filaLista = (nombre, n, sel = false) =>
  `<div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; height: 44px; padding: 0 10px; border-radius: 6px; border: 1px solid ${sel ? C.oro : 'transparent'}; background: ${sel ? C.campo : 'transparent'}; font-family: ${F.ui}; font-size: 15px; font-weight: ${sel ? 600 : 400}; color: ${C.tinta};"><span style="white-space: nowrap;">${nombre}</span><span style="font-size: 13px; font-weight: 400; color: ${C.suave}; ${num}">${n}</span></div>`;
const origenApp = (candado = false) => `<span style="display: inline-flex; align-items: center; gap: 4px; color: ${C.suave};">${candado ? ic('candado', 14) : ''}App</span>`;
const contenidoListas = () => `
<div style="display: flex; align-items: flex-end; justify-content: space-between; gap: 16px;">
  <div style="display: flex; align-items: center; gap: 10px;">${btnIcono('izquierda')}<div style="display: flex; flex-direction: column; gap: 2px;"><span style="font-family: ${F.ui}; font-size: 14px; color: ${C.suave};">Ajustes y copias · opciones de los desplegables</span><h1 style="margin: 0; font-family: ${F.titulo}; font-size: 36px; font-weight: 600; line-height: 1.1;">Listas y catálogos</h1></div></div>
  ${btn('Añadir categoría', { icono: 'mas' })}
</div>
${columnas('240px minmax(0, 1fr)', [
  panel(
    'Listas',
    `${etiquetaGrupo('Catálogos de la app')}
    ${filaLista('Categorías', '28', true)}${filaLista('Oficios', '23')}${filaLista('Tipos de edificio', '24')}${filaLista('Tipos de unidad', '8')}${filaLista('Tipos de defensa', '6')}${filaLista('Tipos de animal', '57')}${filaLista('Recursos', '21')}
    ${etiquetaGrupo('Listas de esta partida')}
    ${filaLista('Ubicaciones', '2')}${filaLista('Personas y entidades', '6')}
    <div style="padding: 10px 4px 2px;">${nota('Mercados, hechizos, negocios y tipos de local: en su pantalla.')}</div>`,
    { pad: '0 10px 10px' },
  ),
  panel(
    'Categorías',
    tablaEditable(
      [{ t: 'Categoría' }, { t: 'Se usa en', w: '220px' }, { t: 'Origen', w: '76px' }],
      [
        [dos('Posadas del camino', 'Tus categorías'), '1 movimiento', badge('Tuya', 'oro')],
        [dos('Alojamiento', 'Gastos del personaje'), dos('5 movimientos, 1 gasto recurrente', '3 más en Los Senderos del Norte'), origenApp()],
        [dos('Comida y bebida', 'Gastos del personaje'), vacio, origenApp()],
        [dos('Montura', 'Gastos del personaje'), '6 movimientos, 1 gasto recurrente', origenApp()],
        [dos('Equipo', 'Gastos del personaje'), vacio, origenApp()],
        [dos('Hierbas y curación', 'Gastos del personaje'), '1 movimiento', origenApp()],
        [dos('Salarios', 'Asentamientos'), '12 movimientos', origenApp(true)],
      ],
      { alto: 56 },
    ) + `<div style="padding: 10px 0 2px;">${nota('28 categorías · las que llevan candado las pone la app: se renombran, pero no se eliminan.', 'candado')}</div>`,
    { accion: `<div style="width: 170px;">${segmentos(['Todas', 'Tuyas'], 'Todas')}</div>${desplegable('Todos los grupos')}${btnIcono('buscar')}` },
  ),
])}`;
const listasYCatalogos = () => marco({ activo: 'ajustes', contenido: contenidoListas() });

// P7b: J2d con reasignación. La opción en uso pide adónde pasan sus registros.
const listasEliminarCategoria = () =>
  marco({
    activo: 'ajustes',
    contenido: contenidoListas(),
    capa: dialogo(
      620,
      `${cabDialogo('¿Eliminar «Posadas del camino»?', 'Categoría tuya · se usa en 1 movimiento de Tharan')}
      <div style="display: flex; flex-direction: column; gap: 14px; padding: 18px 28px 20px; font-family: ${F.ui};">
        ${cajaResumen([
          ['Posada El Poney Pisador · 2 noches', imp('−0,6 mo'), { sub: '12 de abril · Bolsa de Tharan', alto: 54 }],
          ['Partidas afectadas', 'La Sombra del Este'],
        ])}
        ${aviso('Lo creó el avance del 10 al 12 de abril. Si lo deshaces, el movimiento desaparece y la categoría sigue eliminada.', 'oro', { icono: 'reloj_arena' })}
        ${etiquetaCampo('Sus registros pasan a', desplegable('Alojamiento', '100%'), 'Obligatorio: la categoría está en uso. No incluye «Posadas del camino».')}
        <span style="display: inline-flex; align-items: center; gap: 8px; font-size: 14px; color: ${C.bosque};">${ic('check', 16)}Los saldos no cambian: solo cambia la categoría del movimiento.</span>
        ${casilla('Sé que esto no se puede deshacer', true)}
        ${nota('El botón rojo se activa al elegir adónde pasan y marcar la casilla.')}
      </div>
      ${pieDialogo('', `${btn('Cancelar')}${btn('Eliminar definitivamente', { v: 'peligroLleno', icono: 'x' })}`)}`,
    ),
  });

// ── PÁGINA 2 · PERSONAJE ─────────────────────────────────────────────────────
const marcoTharan = (sec, contenido, extra = {}) => marco({ activo: `tharan:${sec}`, contenido, ...extra });

const personajeResumen = () =>
  marcoTharan(
    'Resumen',
    `
${cabecera('Tharan', { sub: 'Montaraz dúnadan · personaje', acciones: `${btn('Editar', { icono: 'editar' })}${btn('Nuevo movimiento', { icono: 'mas' })}` })}
${rejilla(4, [
  stat('Bolsa', '46,518 mo', { sub: 'en monedas de oro' }),
  stat('Patrimonio', '167,118 mo', { sub: 'descontadas las deudas' }),
  stat('Deudas pendientes', '46 mo', { color: C.lacre, sub: '4 mo vencen el día 20' }),
  stat('Inversiones', '70 mo', { sub: '+4,5 mo al mes' }),
])}
${columnas('minmax(0, 1fr) minmax(0, 1fr)', [
  pila([
    panel('Patrimonio', lista([
      ['Bolsa', imp('46,518 mo', { fuerte: false }), { alto: 36 }],
      ['Inventario', imp('81,6 mo', { fuerte: false }), { alto: 36 }],
      ['Inversiones', imp('70 mo', { fuerte: false }), { alto: 36 }],
      ['Te deben', imp('+15 mo', { fuerte: false }), { alto: 36 }],
      ['Deudas', imp('−46 mo', { fuerte: false }), { alto: 36 }],
      ['Patrimonio neto', imp('167,118 mo'), { alto: 42, fuerte: true }],
    ])),
    panel(
      'Estudio de hechizos',
      lista([
        ['Paso sin rastro', conteo(0, 2), { sub: 'Canalización · nivel 2 · último intento el 10 de abril', alto: 52 }],
        ['Luz de Elbereth', conteo(1, 0), { sub: 'Esencia · nivel 3 · último intento el 25 de marzo', alto: 52 }],
      ]),
      { accion: btn('Registrar intento', { v: 'fantasma', icono: 'libro' }) },
    ),
  ], { gap: 16 }),
  panel('Próximos 30 días', lista([
    ['Posada y establo', imp('−0,12 mo al día'), { sub: 'Cada día' }],
    ['Beneficio de la Barcaza del Brandivino', imp('+1,5 mo'), { sub: '15 de abril' }],
    ['Vence la deuda con Hobart Brezal', badge('4 mo pendientes', 'oro', 'reloj'), { sub: '20 de abril · no se paga sola' }],
    ['Vence el préstamo del Gremio', badge('44 mo pendientes'), { sub: '1 de mayo · tras sumar el interés del día' }],
    ['Beneficio de El Tonel Dorado', imp('+3 mo'), { sub: '1 de mayo' }],
  ]) + `<div style="padding: 8px 0 2px;">${nota('Los vencimientos son avisos: el pago se registra en Deudas y préstamos.')}</div>`),
])}`,
  );

const MOV_THARAN = [
  ['12 de abril', 'Posada El Poney Pisador · 2 noches', 'Alojamiento', 'Automático', '−0,2 mo'],
  ['12 de abril', 'Establo del poni · 2 días', 'Montura', 'Automático', '−0,04 mo'],
  ['10 de abril', 'Recompensa de la guardia de Bree', 'Recompensas', 'Manual', '+12 mo'],
  ['10 de abril', 'Compra de athelas (3)', 'Hierbas y curación', 'Manual', '−0,6 mo', '6 mp'],
  ['10 de abril', 'Posada El Poney Pisador · 4 noches', 'Alojamiento', 'Automático', '−0,4 mo'],
  ['10 de abril', 'Establo del poni · 4 días', 'Montura', 'Automático', '−0,08 mo'],
  ['6 de abril', 'Transferencia desde Bree', 'Transferencias', 'Transferencia', '+20 mo'],
];
// Los registros del personaje llevan un botón de editar al final de cada fila.
const tablaEditable = (cols, filas, opciones) =>
  tabla([...cols, { t: '', w: '44px' }], filas.map((f) => [...f, btnIcono('editar', 'fantasma')]), opciones);
const listaEditable = (filas) => lista(filas.map(([izq, der, opciones]) => [izq, `${der}${btnIcono('editar', 'fantasma')}`, opciones]));
// Origen: «Automático» (lo creó un avance), «Manual» o el registro vinculado, que se edita desde su propio formulario.
const tablaMovimientos = (filas, { editable = false } = {}) =>
  (editable ? tablaEditable : tabla)(
    [{ t: 'Fecha', w: '96px' }, { t: 'Concepto' }, { t: 'Categoría', w: '150px' }, { t: 'Origen', w: '132px' }, { t: 'Importe', w: '104px', der: true }],
    filas.map(([f, c, cat, o, i, introducido]) => [
      `<span style="color: ${C.suave};">${f}</span>`,
      c,
      cat,
      o === 'Automático' ? badge('Automático') : o === 'Manual' ? `<span style="color: ${C.suave};">Manual</span>` : badge(o, 'oro', 'enlazado'),
      introducido ? `<div style="display: flex; flex-direction: column; align-items: flex-end;">${imp(i)}<span style="font-size: 13px; color: ${C.suave};">${introducido}</span></div>` : imp(i),
    ]),
    { alto: 46 },
  );
const filtrosMovimientos = () => `${desplegable('Abril de 1640')}${desplegable('Todas las categorías')}${btnIcono('buscar')}`;
const notaVinculados = () =>
  `<div style="padding: 8px 0 0;">${nota('Los movimientos con origen en oro se editan desde su registro: el botón abre ese formulario.', 'enlazado')}</div>`;

const contenidoBolsa = () => `
${cabecera('Bolsa y movimientos', { sub: 'Tharan', acciones: btn('Nuevo movimiento', { icono: 'mas' }) })}
${saldoOro('46,518 mo')}
${panel('Movimientos', tablaMovimientos(MOV_THARAN, { editable: true }) + notaVinculados(), { accion: filtrosMovimientos() })}`;
const personajeBolsa = () => marcoTharan('Bolsa y movimientos', contenidoBolsa());

const contenidoInventario = () => `
${cabecera('Inventario', { sub: 'Tharan · 6 objetos', acciones: btn('Añadir objeto', { icono: 'mas' }) })}
<div style="display: flex; gap: 10px;">${desplegable('Todas las ubicaciones', '280px')}${btnIcono('buscar')}</div>
${panel(
  'Objetos',
  tabla(
    [{ t: 'Objeto' }, { t: 'Cant.', w: '60px', der: true }, { t: 'Unidad', w: '90px', der: true }, { t: 'Total', w: '90px', der: true }, { t: 'Ubicación', w: '160px' }, { t: '', w: '150px', der: true }],
    [
      [dos('Espada larga dúnadan', 'Forjada en Fornost'), '1', '18 mo', '18 mo', 'Encima', `${btn('Vender', { v: 'fantasma' })}${btnIcono('editar', 'fantasma')}`],
      ['Cota de malla', '1', '25 mo', '25 mo', 'Encima', `${btn('Vender', { v: 'fantasma' })}${btnIcono('editar', 'fantasma')}`],
      ['Esmeralda tallada', '2', '12 mo', '24 mo', 'Caja de Bree', `${btn('Vender', { v: 'fantasma' })}${btnIcono('editar', 'fantasma')}`],
      ['Athelas', '3', '0,2 mo', '0,6 mo', 'Encima', `${btn('Vender', { v: 'fantasma' })}${btnIcono('editar', 'fantasma')}`],
      [`<span>Pergamino «Luz de Elbereth»</span>${badge('Hechizos', 'oro', 'libro')}`, '1', '8 mo', '8 mo', 'Posada El Poney Pisador', `${btn('Vender', { v: 'fantasma' })}${btnIcono('editar', 'fantasma')}`],
      ['Poni «Castaño»', '1', '6 mo', '6 mo', 'Establo de Bree', `${btn('Vender', { v: 'fantasma' })}${btnIcono('editar', 'fantasma')}`],
    ],
    { alto: 56, total: ['Valor total', '', '', imp('81,6 mo'), '', ''] },
  ),
)}`;
const personajeInventario = () => marcoTharan('Inventario', contenidoInventario());

const tarjetaDeuda = ({ nombre, estado, detalle, cifras, pct, accion, ultima }) => `<div style="display: flex; flex-direction: column; gap: 10px; padding: 14px 0 16px; ${ultima ? '' : `border-bottom: 1px solid ${C.borde};`}">
  <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;"><span style="font-family: ${F.titulo}; font-size: 24px; font-weight: 600; line-height: 1.1;">${nombre}</span>${estado}</div>
  <span style="margin-top: -6px; font-size: 14px; color: ${C.suave};">${detalle}</span>
  ${rejilla(cifras.length, cifras.map(([e, v]) => `<div style="display: flex; flex-direction: column;"><span style="font-size: 13px; color: ${C.suave};">${e}</span><span style="font-size: 18px; font-weight: 600; ${num}">${v}</span></div>`), { gap: 12 })}
  <div style="display: flex; align-items: center; gap: 12px;">${barra(pct)}<span style="width: 92px; font-size: 14px; color: ${C.suave}; ${num}">${pct} % saldado</span>${btn(accion)}${btnIcono('editar')}</div>
</div>`;
// Al vencer, una deuda no se paga sola: queda «Vencida», con aviso rojo, y sigue sumando intereses.
const notaVencimiento = () => `<div style="display: flex; flex-direction: column; gap: 8px; padding: 14px 18px; background: ${C.vitela}; border: 1px solid ${C.borde}; border-radius: 8px;">
  ${nota('Al vencer, la deuda no se paga sola: pasa a «Vencida», sale un aviso rojo y los intereses siguen corriendo hasta que registres el pago.', 'reloj')}
  ${nota('Al saldarla, pasa al grupo plegado «Saldadas», al final de la lista.', 'check')}
</div>`;
const contenidoDeudas = () => `
${cabecera('Deudas y préstamos', { sub: 'Tharan', acciones: btn('Nueva deuda o préstamo', { icono: 'mas' }) })}
${rejilla(3, [
  stat('Debes', '46 mo', { color: C.lacre, sub: '2 deudas' }),
  stat('Te deben', '15 mo', { color: C.bosque, sub: '1 préstamo' }),
  stat('Intereses este mes', '2 mo', { sub: 'Gremio de mercaderes' }),
])}
${columnas('minmax(0, 1fr) minmax(0, 1fr)', [
  panel('Lo que debes', tarjetaDeuda({ nombre: 'Gremio de mercaderes de Bree', estado: badge('Vence el 1 de mayo'), detalle: 'Préstamo de 60 mo · 5 % de interés mensual, el día 1', cifras: [['Pagado', '20 mo'], ['Intereses pendientes', '2 mo'], ['Pendiente', '42 mo']], pct: 33, accion: 'Registrar pago' }) +
    tarjetaDeuda({ nombre: 'Hobart Brezal, herrero', estado: badge('Vence en 8 días', 'oro', 'reloj'), detalle: 'Arreglo de la espada · sin interés · vence el 20 de abril', cifras: [['Pagado', '0 mo'], ['Intereses pendientes', '0 mo'], ['Pendiente', '4 mo']], pct: 0, accion: 'Registrar pago', ultima: true }), { pad: '0 20px 0' }),
  pila([
    panel('Lo que te deben', tarjetaDeuda({ nombre: 'Dalen, mercader de Esgaroth', estado: badge('Vence el 5 de junio'), detalle: 'Préstamo de 15 mo · sin interés', cifras: [['Cobrado', '0 mo'], ['Intereses pendientes', '0 mo'], ['Pendiente', '15 mo']], pct: 0, accion: 'Registrar cobro', ultima: true }), { pad: '0 20px 0' }),
    notaVencimiento(),
  ]),
])}`;
const personajeDeudas = () => marcoTharan('Deudas y préstamos', contenidoDeudas());

const personajeGastos = () =>
  marcoTharan(
    'Gastos e ingresos',
    `
${cabecera('Gastos e ingresos recurrentes', { sub: 'Tharan · −3,6 mo al mes en los activos', acciones: btn('Añadir gasto o ingreso', { icono: 'mas' }) })}
${panel(
  'Recurrentes',
  tabla(
    [{ t: 'Concepto' }, { t: 'Importe', w: '100px', der: true }, { t: 'Frecuencia', w: '150px' }, { t: 'Próximo', w: '120px' }, { t: 'Estado', w: '130px' }, { t: '', w: '44px' }],
    [
      [dos('Posada El Poney Pisador', 'Gasto · habitación individual'), imp('−0,1 mo'), 'Cada día', '13 de abril', interruptor(true), btnIcono('editar', 'fantasma')],
      [dos('Establo del poni', 'Gasto · paja y cuidados'), imp('−0,02 mo'), 'Cada día', '13 de abril', interruptor(true), btnIcono('editar', 'fantasma')],
      [dos('Escolta de dos guardias', 'Gasto · para viajar por el Camino del Este'), imp('−2 mo'), `Semanal · ${diaSemana(1)}`, `<span style="color: ${C.suave};">—</span>`, interruptor(false), btnIcono('editar', 'fantasma')],
      [dos('Alquiler de la casa de Archet', 'Ingreso · sin inquilino desde marzo'), imp('+0,5 mo'), 'Mensual · día 1', `<span style="color: ${C.suave};">—</span>`, interruptor(false), btnIcono('editar', 'fantasma')],
    ],
    { alto: 58 },
  ) + `<div style="padding: 10px 0 2px;">${nota('Se cobran o se ingresan al avanzar días. Si no hay dinero para un gasto, queda como impago en Deudas y préstamos.')}</div>`,
)}
${panel('Últimos cobros', listaEditable([
  ['Posada El Poney Pisador · 2 noches', `<span style="color: ${C.suave}; width: 110px;">12 de abril</span>${imp('−0,2 mo')}`, { alto: 44 }],
  ['Establo del poni · 2 días', `<span style="color: ${C.suave}; width: 110px;">12 de abril</span>${imp('−0,04 mo')}`, { alto: 44 }],
  ['Posada El Poney Pisador · 4 noches', `<span style="color: ${C.suave}; width: 110px;">10 de abril</span>${imp('−0,4 mo')}`, { alto: 44 }],
]))}`,
  );

const tarjetaInversion = ({ nombre, sub, datos, pct, recuperado }) => `<div style="display: flex; flex-direction: column; gap: 14px; padding: 18px 20px; background: ${C.vitela}; border: 1px solid ${C.borde}; border-radius: 10px;">
  <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;"><div style="display: flex; flex-direction: column; gap: 2px;"><span style="font-family: ${F.titulo}; font-size: 28px; font-weight: 600; line-height: 1.1;">${nombre}</span><span style="font-size: 14px; color: ${C.suave};">${sub}</span></div>${badge('Activa', 'bosque', 'check')}</div>
  ${rejilla(2, datos.map(([e, v]) => `<div style="display: flex; flex-direction: column;"><span style="font-size: 13px; color: ${C.suave};">${e}</span><span style="font-size: 17px; font-weight: 600; ${num}">${v}</span></div>`), { gap: 12 })}
  <div style="display: flex; flex-direction: column; gap: 6px;"><div style="display: flex; justify-content: space-between; font-size: 14px; color: ${C.suave};"><span>Beneficios cobrados</span><span style="${num}">${recuperado}</span></div>${barra(pct, { color: C.bosque })}</div>
  <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: -4px;">${btn('Retirar inversión', { v: 'fantasma' })}${btn('Editar', { icono: 'editar' })}</div>
</div>`;
const personajeInversiones = () =>
  marcoTharan(
    'Inversiones',
    `
${cabecera('Inversiones y negocios', { sub: 'Tharan', acciones: btn('Nueva inversión', { icono: 'mas' }) })}
${rejilla(3, [
  stat('Capital invertido', '70 mo', { sub: '2 negocios' }),
  stat('Beneficio mensual', '+4,5 mo', { color: C.bosque }),
  stat('Cobrado hasta hoy', '10,5 mo', { sub: '15 % del capital' }),
])}
${rejilla(2, [
  tarjetaInversion({ nombre: 'El Tonel Dorado', sub: 'Posada en Archet', datos: [['Participación', '25 %'], ['Capital', '50 mo'], ['Beneficio', '3 mo al mes, el día 1'], ['Próximo cobro', '1 de mayo']], pct: 18, recuperado: '9 mo de 50 mo' }),
  tarjetaInversion({ nombre: 'Barcaza del Brandivino', sub: 'Transporte de mercancías por el río', datos: [['Participación', '10 %'], ['Capital', '20 mo'], ['Beneficio', '1,5 mo al mes, el día 15'], ['Próximo cobro', '15 de abril']], pct: 8, recuperado: '1,5 mo de 20 mo' }),
])}
${columnas('minmax(0, 1fr) 320px', [
  panel('Historial de beneficios', listaEditable([
    ['El Tonel Dorado', `<span style="color: ${C.suave}; width: 110px;">1 de abril</span>${imp('+3 mo')}`, { alto: 42 }],
    ['Barcaza del Brandivino', `<span style="color: ${C.suave}; width: 110px;">15 de marzo</span>${imp('+1,5 mo')}`, { alto: 42 }],
  ]), { accion: enlace('Ver los 4 cobros') }),
  plegable('Retiradas', '1', 'Mercería de Staddle · el 3 de febrero'),
])}`,
  );

const resultado = (bueno) =>
  bueno
    ? `<span style="display: inline-flex; align-items: center; gap: 6px; font-weight: 600; color: ${C.bosque};">${ic('check', 18)}Bueno</span>`
    : `<span style="display: inline-flex; align-items: center; gap: 6px; font-weight: 600; color: ${C.lacre};">${ic('x', 18)}Malo</span>`;
const conteo = (buenos, malos) =>
  `<span style="display: inline-flex; align-items: center; gap: 3px; font-weight: 600; color: ${C.bosque};">${ic('check', 16)}${buenos}</span><span style="display: inline-flex; align-items: center; gap: 3px; font-weight: 600; color: ${C.lacre};">${ic('x', 16)}${malos}</span>`;
// Estudio por hechizo: varios a la vez, sin contar días; «Aprendido» lo marca el jugador cuando lo decide el máster.
const estadoAprendido = (fecha) =>
  `<div style="display: flex; flex-direction: column; align-items: flex-start; gap: 2px;">${badge('Aprendido', 'bosque', 'check')}<span style="font-size: 13px; color: ${C.suave};">el ${fecha}</span></div>`;
const contenidoHechizos = () => `
${cabecera('Estudio de hechizos', { sub: 'Tharan · 2 en estudio · 1 aprendido', acciones: `${btn('Añadir hechizo', { icono: 'mas' })}${btn('Registrar intento', { icono: 'libro' })}` })}
${columnas('minmax(0, 1fr) 280px', [
  pila([
    panel(
      'Hechizos',
      tablaEditable(
        [{ t: 'Hechizo' }, { t: 'Estado', w: '104px' }, { t: 'Intentos', w: '72px' }, { t: 'Último', w: '86px' }],
        [
          [dos('Paso sin rastro', 'Sendas del bosque · Canalización · nivel 2'), badge('En estudio', 'oro'), conteo(0, 2), `<span style="color: ${C.suave};">10 de abril</span>`],
          [dos('Luz de Elbereth', 'Caminos de la luz · Esencia · nivel 3'), badge('En estudio', 'oro'), conteo(1, 0), `<span style="color: ${C.suave};">25 de marzo</span>`],
          [dos('Hablar con los animales', 'Voces de la naturaleza · Canalización · nivel 1'), estadoAprendido('5 de febrero'), conteo(1, 1), `<span style="color: ${C.suave};">3 de febrero</span>`],
        ],
        { alto: 52 },
      ),
    ),
    panel(
      'Historial de intentos',
      tablaEditable(
        [{ t: 'Fecha', w: '100px' }, { t: 'Hechizo' }, { t: 'Resultado', w: '96px' }],
        [
          [`<span style="color: ${C.suave};">10 de abril</span>`, 'Paso sin rastro', resultado(false)],
          [`<span style="color: ${C.suave};">28 de marzo</span>`, dos('Paso sin rastro', 'Con su pergamino, que se consumió'), resultado(false)],
          [`<span style="color: ${C.suave};">25 de marzo</span>`, 'Luz de Elbereth', resultado(true)],
          [`<span style="color: ${C.suave};">3 de febrero</span>`, 'Hablar con los animales', resultado(true)],
          [`<span style="color: ${C.suave};">20 de enero</span>`, 'Hablar con los animales', resultado(false)],
        ],
      ),
    ),
  ]),
  pila([
    panel(
      'Pergaminos',
      lista([
        ['«Luz de Elbereth»', badge('Poseído', 'bosque') + btnIcono('editar', 'fantasma'), { sub: 'Esencia · nivel 3 · 8 mo · en la posada' }],
        ['«Paso sin rastro»', badge('Consumido') + btnIcono('editar', 'fantasma'), { sub: 'Canalización · nivel 2 · 28 de marzo' }],
      ]) + `<div style="padding-top: 4px;">${enlace('Ver en el inventario')}</div>`,
      { accion: btn('Añadir', { v: 'fantasma', icono: 'mas' }) },
    ),
    `<div style="display: flex; flex-direction: column; gap: 10px; padding: 14px 18px; background: ${C.vitela}; border: 1px solid ${C.borde}; border-radius: 8px;">
      ${nota('Bueno o malo solo suma al conteo. «Aprendido» lo marcas tú, en el hechizo, cuando lo decida el máster.', 'check')}
      ${nota('Puedes estudiar varios hechizos a la vez. La app no cuenta días: cada intento guarda su fecha.', 'calendario')}
    </div>`,
  ]),
])}`;
const personajeHechizos = () => marcoTharan('Hechizos', contenidoHechizos());

const segmento = (texto, sel, tono) => {
  const [bg, fg] = TONO[tono];
  return `<div style="display: flex; align-items: center; justify-content: center; gap: 8px; flex: 1; height: 48px; border-radius: 6px; background: ${sel ? bg : C.campo}; border: ${sel ? 2 : 1}px solid ${sel ? fg : C.borde}; font-size: 16px; font-weight: 600; color: ${sel ? fg : C.tinta};">${ic(tono === 'bosque' ? 'check' : 'x', 18)}${texto}</div>`;
};
const personajeRegistrarIntento = () =>
  marcoTharan('Hechizos', contenidoHechizos(), {
    capa: dialogo(
      680,
      `${cabDialogo('Registrar intento', 'Solo se anota: el máster resuelve la tirada en la mesa.')}
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; padding: 18px 28px 20px; font-family: ${F.ui};">
        ${campo('Fecha', '12 de abril de 1640 T.E.', { icono: 'calendario', ayuda: 'Hoy o antes' })}
        ${campo('Hechizo', 'Paso sin rastro', { icono: 'abajo', ayuda: 'En estudio · 0 buenos · 2 malos' })}
        <div style="grid-column: 1 / 3; display: flex; flex-direction: column; gap: 6px;"><span style="font-size: 14px; font-weight: 600;">Resultado</span><div style="display: flex; gap: 8px;">${segmento('Bueno', true, 'bosque')}${segmento('Malo', false, 'lacre')}</div></div>
        ${campo('Pergamino usado', 'Ninguno', { icono: 'abajo' })}
        <div style="display: flex; align-items: flex-end;">${casilla(`<span style="color: ${C.suave};">El pergamino se consume</span>`, false, { desactivada: true })}</div>
        <div style="grid-column: 1 / 3;">${campo('Notas', 'Estudio junto al fuego de la posada, sin interrupciones.', { alto: 76 })}</div>
        <div style="grid-column: 1 / 3;">${nota('Bueno o malo solo suma al conteo. «Aprendido» lo marcas en el hechizo cuando lo decida el máster.')}</div>
      </div>
      ${pieDialogo('', `${btn('Cancelar')}${btn('Guardar intento', { v: 'principal' })}`)}`,
    ),
  });

// ── PÁGINA 3 · ASENTAMIENTO (Bree) ───────────────────────────────────────────
const marcoBree = (sec, contenido, extra = {}) => marco({ activo: `bree:${sec}`, contenido, ...extra });
// Aviso de reserva: 'lacre' si falta en 7 días o menos; 'oro' si falta entre 8 y 30 días.
const alertaTexto = (texto, tono) =>
  `<span style="display: inline-flex; align-items: center; gap: 6px; font-weight: 600; color: ${tono === 'lacre' ? C.lacre : C.oroOsc};">${ic('alerta', 16)}${texto}</span>`;
const reserva = (texto, pct, tono = '') =>
  `<div style="display: flex; flex-direction: column; gap: 6px; width: 100%;"><div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">${tono ? alertaTexto(texto, tono) : `<span style="color: ${C.suave};">${texto}</span>`}</div>${barra(pct, { color: tono === 'lacre' ? C.lacre : C.oro })}</div>`;

const breeResumen = () =>
  marcoBree(
    'Resumen',
    `
${cabecera('Bree', { sub: 'Pueblo · 1.240 habitantes', acciones: `${btn('Editar', { icono: 'editar' })}${btn('Transferir', { icono: 'cambio' })}` })}
${rejilla(4, [
  stat('Caja', '340,6 mo', { sub: 'debe 30 mo al Gremio' }),
  stat('Balance mensual', '−11,5 mo', { color: C.lacre, sub: 'entran 44 · salen 55,4' }),
  stat('Obras en curso', '2', { sub: 'la puerta termina el 17' }),
  stat('Caravanas en ruta', '2', { sub: 'la próxima llega el 18' }),
])}
${rejilla(2, [
  panel('Próximos pagos y cobros', lista([
    ['Salarios de 14 trabajadores', imp('−4,2 mo'), { sub: '13 de abril' }],
    ['Aranceles con la feria', imp('+18 mo'), { sub: '15 de abril' }],
    ['Soldada de la guarnición', imp('−5,8 mo'), { sub: '24 de abril' }],
    ['Diezmo a Fornost', imp('−25 mo'), { sub: '30 de abril' }],
  ])),
  panel('Almacén', lista([
    ['Víveres · 310 sacos', `<div style="width: 230px;">${reserva('Se agota el 23 de abril', 26, 'oro')}</div>`, { alto: 54 }],
    ['Cerveza · 90 barriles', `<div style="width: 230px;">${reserva('Unos 105 días', 60)}</div>`, { alto: 54 }],
    ['Madera · 420 haces', `<div style="width: 230px;">${reserva('Unos 85 días', 70)}</div>`, { alto: 54 }],
  ]) + `<div style="padding-top: 6px;">${nota('Días de reserva contando la producción. La barra indica lo lleno que está el almacén.')}</div>`),
  panel('Obras', lista([
    ['Reparación de la puerta del sur', `<div style="display: flex; align-items: center; gap: 10px; width: 250px;">${barra(58)}<span style="width: 110px; font-size: 14px; color: ${C.suave};">58 % · día 17</span></div>`, { sub: 'Quedan 5 días' }],
    ['Nuevo granero', `<div style="display: flex; align-items: center; gap: 10px; width: 250px;">${barra(8)}<span style="width: 110px; font-size: 14px; color: ${C.suave};">8 % · 19 de mayo</span></div>`, { sub: 'Quedan 37 días' }],
  ])),
  panel('Eventos', lista([
    ['Lluvias de primavera', badge('Granjas −20 %', 'lacre', 'baja'), { sub: 'Activo hasta el 21 de abril' }],
    ['Feria de primavera', badge('Aranceles +500 %', 'bosque', 'sube'), { sub: 'Del 15 al 17 de abril' }],
  ])),
])}`,
  );

const cabTesoreria = (activa, { segmento = '' } = {}) => `
${cabecera('Tesorería', {
  sub: 'Bree',
  acciones: {
    'Caja y movimientos': `${btn('Transferir', { icono: 'cambio' })}${btn('Nuevo movimiento', { icono: 'mas' })}`,
    Deudas: btn('Nueva deuda o préstamo', { icono: 'mas' }),
    'Impuestos y rentas': `<div style="width: 420px;">${segmentos(['Ingresos y tributos', 'Locales comerciales'], segmento)}</div>`,
  }[activa] || '',
})}
${pestanas(['Caja y movimientos', 'Impuestos y rentas', 'Deudas'], activa)}`;
const breeTesoreria = () =>
  marcoBree(
    'Tesorería',
    `${cabTesoreria('Caja y movimientos')}
${saldoOro('340,6 mo', { etiqueta: 'Caja' })}
${panel('Movimientos', tablaMovimientos([
  ['12 de abril', 'Peaje del camino · 2 días', 'Impuestos', 'Automático', '+0,6 mo'],
  ['10 de abril', 'Soldada de la guarnición', 'Soldadas', 'Automático', '−5,8 mo'],
  ['10 de abril', 'Alquiler del molino', 'Rentas y alquileres', 'Automático', '+5 mo'],
  ['10 de abril', 'Obra: nuevo granero', 'Obras', 'Obra', '−85 mo'],
  ['10 de abril', 'Peaje del camino · 4 días', 'Impuestos', 'Automático', '+1,2 mo'],
  ['8 de abril', 'Aranceles del mercado', 'Aranceles', 'Automático', '+3 mo'],
  ['6 de abril', 'Transferencia a Tharan', 'Transferencias', 'Transferencia', '−20 mo'],
], { editable: true }) + notaVinculados(), { accion: filtrosMovimientos() })}`,
  );

// Deudas del asentamiento: las crea el jugador o el motor cuando la caja no llega (impagos).
const breeDeudas = () =>
  marcoBree(
    'Tesorería',
    `${cabTesoreria('Deudas')}
${rejilla(3, [
  stat('Debe', '30 mo', { color: C.lacre, sub: '1 deuda · vence el 1 de junio' }),
  stat('Le deben', '0 mo', { sub: 'nadie' }),
  stat('Impagos', '0', { sub: 'la caja ha cubierto todos los pagos' }),
])}
${columnas('minmax(0, 1fr) minmax(0, 1fr)', [
  pila([
    panel('Lo que debe Bree', tarjetaDeuda({ nombre: 'Gremio de mercaderes de Bree', estado: badge('Vence el 1 de junio'), detalle: 'Adelanto para el granero · 30 mo · sin interés · vence el 1 de junio', cifras: [['Pagado', '0 mo'], ['Intereses pendientes', '0 mo'], ['Pendiente', '30 mo']], pct: 0, accion: 'Registrar pago', ultima: true }), { pad: '0 20px 0' }),
    plegable('Saldadas', '1', 'Barnabás Mantecona, posadero · préstamo de 10 mo · saldado el 2 de marzo'),
  ], { gap: 12 }),
  pila([
    panel(
      'Lo que le deben a Bree',
      `<div style="display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 22px 0 18px; text-align: center;"><span style="font-size: 15px; color: ${C.suave};">Nadie debe dinero a Bree.</span>${btn('Anotar un préstamo', { icono: 'mas' })}</div>`,
    ),
    `<div style="display: flex; flex-direction: column; gap: 8px; padding: 14px 18px; background: ${C.vitela}; border: 1px solid ${C.borde}; border-radius: 8px;">
      ${nota('Si la caja no llega para salarios, soldadas, tributos o pagos programados, el impago se anota aquí como deuda con «Trabajadores de Bree», «Guarnición de Bree», el destinatario del tributo o, si no lo tiene, el concepto del pago.', 'alerta')}
      ${nota('Los pagos salen de la caja de Bree. Al vencer, la deuda no se paga sola: queda «Vencida» con aviso rojo.', 'reloj')}
    </div>`,
  ], { gap: 12 }),
])}`,
  );

const breeImpuestos = () =>
  marcoBree(
    'Tesorería',
    `${cabTesoreria('Impuestos y rentas', { segmento: 'Ingresos y tributos' })}
${panel(
  'Ingresos',
  tabla(
    [{ t: 'Concepto' }, { t: 'Base', w: '160px' }, { t: 'Frecuencia', w: '130px' }, { t: 'Importe', w: '90px', der: true }, { t: 'Al mes', w: '100px', der: true }, { t: '', w: '44px' }],
    [
      ['Impuesto por hogar', '0,01 mo por habitante', 'Mensual · día 1', '12,4 mo', imp('+12,4 mo'), btnIcono('editar', 'fantasma')],
      ['Aranceles del mercado', 'Fija', `Semanal · ${diaSemana(1)}`, '3 mo', imp('+12,9 mo'), btnIcono('editar', 'fantasma')],
      ['Alquiler del molino', 'Fija', 'Mensual · día 10', '5 mo', imp('+5 mo'), btnIcono('editar', 'fantasma')],
      ['Peaje del camino', 'Fija', 'Cada día', '0,3 mo', imp('+9 mo'), btnIcono('editar', 'fantasma')],
      // Se gestiona en Locales comerciales (A3b): la flecha abre esa vista.
      ['Impuestos de locales comerciales', 'Por local', 'Mensual · día 1', '4 locales', imp('+4,7 mo'), btnIcono('derecha', 'fantasma')],
    ],
  ),
  { accion: `<span style="font-family: ${F.ui}; font-size: 15px; font-weight: 600; color: ${C.bosque}; white-space: nowrap; ${num}">+44 mo al mes</span>${btn('Añadir ingreso', { icono: 'mas' })}` },
)}
${panel(
  'Tributos',
  tablaEditable(
    [{ t: 'Concepto' }, { t: 'Base', w: '90px' }, { t: 'Destinatario', w: '160px' }, { t: 'Frecuencia', w: '130px' }, { t: 'Importe', w: '90px', der: true }, { t: 'Al mes', w: '90px', der: true }],
    [['Diezmo a Fornost', 'Fija', 'Corona de Arthedain', 'Mensual · día 30', '25 mo', imp('−25 mo')]],
  ),
  { accion: `<span style="font-family: ${F.ui}; font-size: 15px; font-weight: 600; color: ${C.lacre}; white-space: nowrap; ${num}">−25 mo al mes</span>${btn('Añadir tributo', { icono: 'mas' })}` },
)}
${nota('Resultado fiscal: +19 mo al mes (ingresos menos tributos, sin salarios ni guarnición).', 'balanza')}`,
  );

// Locales comerciales: negocios de terceros que pagan a la caja el mayor entre el % de lo producido en el mes y el mínimo de su tipo.
const mesProducido = (valor, anotada) =>
  `<div style="display: flex; flex-direction: column; align-items: flex-end;"><span style="font-weight: 600;">${valor}</span><span style="font-size: 13px; color: ${anotada ? C.oroOsc : C.suave};">${anotada ? 'anotada' : 'habitual'}</span></div>`;
const contenidoLocales = () => `${cabTesoreria('Impuestos y rentas', { segmento: 'Locales comerciales' })}
${columnas('minmax(0, 1fr) 290px', [
  panel(
    'Locales',
    tablaEditable(
      [{ t: 'Local' }, { t: 'Habitual', w: '76px', der: true }, { t: 'Abril', w: '96px', der: true }, { t: 'Impuesto', w: '86px', der: true }],
      [
        [dos('Herrería 1', 'Herrería · Hobart Brezal, herrero'), '10 mo', mesProducido('10 mo', false), imp('+1 mo')],
        [dos('Posada El Poney Pisador', 'Posada · Barnabás Mantecona, posadero'), '40 mo', mesProducido('40 mo', false), imp('+3,2 mo')],
        [dos('Tienda de telas', 'Tienda · sin titular'), '6 mo', mesProducido('1,5 mo', true), `<div style="display: flex; flex-direction: column; align-items: flex-end;">${imp('+0,1 mo')}<span style="font-size: 13px; color: ${C.suave};">el mínimo</span></div>`],
        [dos('Ultramarinos del camino', 'Tienda · sin titular'), '4 mo', mesProducido('4 mo', false), imp('+0,2 mo')],
      ],
      { alto: 58, total: ['Total', '60 mo', '55,5 mo', imp('+4,5 mo'), ''] },
    ) + `<div style="padding: 10px 0 2px;">${nota('Impuesto = el mayor entre el % del tipo sobre lo producido en el mes y el mínimo. Se cobra el día del tipo por el mes anterior; sin anotar, cuenta la producción habitual. Toca la producción de abril para anotar lo que produjo de verdad.')}</div>`,
    { accion: btn('Añadir local', { icono: 'mas' }) },
  ),
  pila([
    panel(
      'Tipos de local',
      listaEditable([
        ['Herrería', '', { sub: '10 % · mínimo 2 mp · día 1', alto: 54 }],
        ['Posada', '', { sub: '8 % · mínimo 5 mp · día 1', alto: 54 }],
        ['Tienda', '', { sub: '5 % · mínimo 1 mp · día 1', alto: 54 }],
      ]),
      { accion: btn('Añadir', { v: 'fantasma', icono: 'mas' }) },
    ),
    stat('Cobro del 1 de mayo', '+4,5 mo', { color: C.bosque, sub: 'por la producción de abril' }),
    nota('Al mes con la producción habitual: +4,7 mo.', 'repetir'),
  ], { gap: 12 }),
])}`;
const breeLocales = () => marcoBree('Tesorería', contenidoLocales());
const breeProduccionLocal = () =>
  marcoBree('Tesorería', contenidoLocales(), {
    capa: dialogo(
      620,
      `${cabDialogo('Producción de abril', 'Herrería 1 · Hobart Brezal, herrero · habitual 10 mo')}
      <div style="display: flex; flex-direction: column; gap: 14px; padding: 18px 28px 20px; font-family: ${F.ui};">
        ${campo('Mes', 'Abril de 1640', { icono: 'abajo', ayuda: 'Solo meses sin cobrar' })}
        ${importe('1', 'Oro · mo', '1 mo', { etiqueta: 'Producción del mes', ayuda: 'Déjalo vacío para usar la habitual (10 mo). Si no produjo nada, anota 0.' })}
        ${campo('Nota', 'Cerrada dos semanas por la boda de su hija')}
        ${cajaResumen([
          ['10 % de 1 mo', '0,1 mo'],
          ['Mínimo de las herrerías', '0,2 mo (2 mp)'],
          ['Se cobra el 1 de mayo', imp('+0,2 mo')],
        ])}
      </div>
      ${pieDialogo(btn('Usar la habitual', { v: 'fantasma' }), `${btn('Cancelar')}${btn('Guardar', { v: 'principal' })}`)}`,
    ),
  });

const breePoblacion = () =>
  marcoBree(
    'Población',
    `
${cabecera('Población', { sub: 'Bree', acciones: btn('Registrar cambio', { icono: 'mas' }) })}
${rejilla(3, [
  stat('Habitantes', '1.240', { sub: '+26 desde enero' }),
  stat('Consumo de víveres', '41,3 sacos al día', { sub: '1 saco por persona al mes' }),
  stat('Víveres disponibles', 'Hasta el 23', { color: C.oroOsc, sub: '11 días contando la producción' }),
])}
${panel(
  'Consumo diario',
  tabla(
    [{ t: 'Consumo' }, { t: 'Por habitante', w: '140px', der: true }, { t: 'Al día', w: '110px', der: true }, { t: 'Existencias', w: '120px', der: true }, { t: 'Reserva', w: '220px' }, { t: '', w: '44px' }],
    [
      [dos('Víveres', 'Ración fija de la partida'), '0,0333 sacos', '41,3 sacos', '310 sacos', alertaTexto('Se agota el 23 de abril', 'oro'), ''],
      ['Cerveza', '0,003 barriles', '3,7 barriles', '90 barriles', 'Unos 105 días', btnIcono('editar', 'fantasma')],
      [dos('Leña', 'Descuenta de la madera'), '0,008 haces', '9,9 haces', '420 haces', 'Unos 85 días', btnIcono('editar', 'fantasma')],
    ],
    { alto: 52 },
  ),
  { accion: btn('Añadir consumo', { v: 'fantasma', icono: 'mas' }) },
)}
${panel('Cambios de población', lista([
  ['Llegan familias huidas de Cardolan', imp('+12') + btnIcono('editar', 'fantasma'), { sub: '1 de abril' }],
  ['Se instalan hobbits de la Comarca', imp('+20') + btnIcono('editar', 'fantasma'), { sub: '2 de marzo' }],
  ['Fiebres de invierno', imp('−6') + btnIcono('editar', 'fantasma'), { sub: '14 de febrero' }],
]))}`,
  );

const cabPersonal = (activa, accion) => `
${cabecera('Personal', { sub: 'Bree', acciones: btn(accion, { icono: 'mas' }) })}
${pestanas(['Trabajadores', 'Guarnición', 'Armería'], activa)}`;
const breeTrabajadores = () =>
  marcoBree(
    'Personal',
    `${cabPersonal('Trabajadores', 'Contratar')}
${rejilla(3, [
  stat('Trabajadores', '14'),
  stat('Próximo pago', '4,2 mo', { sub: `${diaSemana(13)} 13 de abril` }),
  stat('Coste al mes', '18 mo'),
])}
${aviso('La cantera tiene 2 de 3 canteros y produce al 67 %.', 'oro', { icono: 'alerta', accion: enlace('Contratar cantero') })}
${panel(
  'Plantilla',
  tablaEditable(
    [{ t: 'Oficio' }, { t: 'Número', w: '76px', der: true }, { t: 'Salario', w: '80px', der: true }, { t: 'Frecuencia', w: '150px' }, { t: 'Edificio', w: '160px' }, { t: 'Al mes', w: '80px', der: true }],
    [
      ['Granjeros', '6', '0,3 mo', `Semanal · ${diaSemana(6)}`, 'Granjas del Oeste', '7,7 mo'],
      ['Leñadores', '3', '0,3 mo', `Semanal · ${diaSemana(6)}`, 'Aserradero', '3,9 mo'],
      ['Cerveceros', '2', '0,4 mo', `Semanal · ${diaSemana(6)}`, 'Cervecería', '3,4 mo'],
      ['Canteros', '2', '0,3 mo', `Semanal · ${diaSemana(6)}`, 'Cantera', '2,6 mo'],
      ['Pastor', '1', '0,1 mo', `Semanal · ${diaSemana(6)}`, 'Redil', '0,4 mo'],
    ],
    { total: ['Total', '14', '4,2 mo', '', '', '18 mo'] },
  ),
)}`,
  );

const breeGuarnicion = () =>
  marcoBree(
    'Personal',
    `${cabPersonal('Guarnición', 'Añadir unidad')}
${rejilla(3, [
  stat('Soldados', '11'),
  stat('Próximo pago', '5,8 mo', { sub: `${diaSemana(24)} 24 de abril · cada 14 días` }),
  stat('Coste al mes', '12,4 mo'),
])}
${columnas('minmax(0, 1.35fr) minmax(0, 1fr)', [
  panel(
    'Unidades',
    tablaEditable(
      [{ t: 'Unidad' }, { t: 'Nº', w: '50px', der: true }, { t: 'Soldada', w: '76px', der: true }, { t: 'Total', w: '76px', der: true }],
      [
        [dos('Guardias de la puerta', 'Guardia'), '6', '0,3 mo', '1,8 mo'],
        [dos('Arqueros de la empalizada', 'Arquero'), '4', '0,5 mo', '2 mo'],
        [dos('Capitán de la guardia', 'Capitán'), '1', '2 mo', '2 mo'],
      ],
      { alto: 56, total: ['Total', '11', '', '5,8 mo'] },
    ),
  ),
  panel(
    'Defensas',
    lista([
      ['Empalizada norte', badge('Buena', 'bosque', 'check') + btnIcono('editar', 'fantasma')],
      ['Puerta del sur', badge('Dañada', 'lacre', 'alerta') + btnIcono('editar', 'fantasma'), { sub: 'En reparación hasta el 17 de abril' }],
      ['Torre de vigía', badge('Buena', 'bosque', 'check') + btnIcono('editar', 'fantasma')],
    ]),
    { accion: btn('Añadir defensa', { v: 'fantasma', icono: 'mas' }) },
  ),
])}`,
  );

const cabProduccion = (activa, acciones) => `
${cabecera('Producción', { sub: 'Bree', acciones })}
${pestanas(['Edificios', 'Almacén', 'Obras'], activa)}`;
const contenidoEdificios = () => `${cabProduccion('Edificios', btn('Añadir edificio', { icono: 'mas' }))}
${aviso('Lluvias de primavera hasta el 21 de abril: las granjas producen un 20 % menos.', 'oro', { icono: 'bandera', accion: enlace('Ver evento') })}
${panel(
  'Edificios',
  tablaEditable(
    [{ t: 'Edificio' }, { t: 'Estado', w: '120px' }, { t: 'Trabajadores', w: '110px' }, { t: 'Produce' }, { t: 'Cada', w: '150px' }],
    [
      ['Granjas del Oeste', badge('Activo', 'bosque'), '6 de 6', dos('72 sacos de víveres', '90 sin las lluvias'), `Semanal · ${diaSemana(7)}`],
      ['Aserradero', badge('Activo', 'bosque'), '3 de 3', '35 haces de madera', `Semanal · ${diaSemana(7)}`],
      ['Cervecería', badge('Activo', 'bosque'), '2 de 2', '20 barriles de cerveza', `Semanal · ${diaSemana(7)}`],
      ['Cantera', badge('Activo', 'bosque'), `<span style="font-weight: 600; color: ${C.oroOsc};">2 de 3</span>`, lineas(['17 carretadas de piedra', '7 carretadas de arcilla'], '25 y 10 con 3 canteros'), lineas([`Semanal · ${diaSemana(7)}`, 'Mensual · día 1'], '&nbsp;')],
      ['Redil', badge('Activo', 'bosque'), '1 de 1', '12 fardos de lana', `Semanal · ${diaSemana(7)}`],
      ['Molino', badge('Alquilado'), `<span style="color: ${C.suave};">—</span>`, `<div style="display: flex; flex-direction: column;"><span>Renta de 5 mo</span><span style="font-size: 13px; font-weight: 600; color: ${C.oroOsc};">en Impuestos y rentas</span></div>`, 'Mensual · día 10'],
    ],
    { alto: 54 },
  ) + `<div style="padding: 8px 0 2px;">${nota('Cada cantidad es la prevista para la próxima vez, en proporción a los días del periodo según trabajadores, estado y eventos.')}</div>`,
)}`;
const breeEdificios = () => marcoBree('Producción', contenidoEdificios());

const existencia = (valor, cap, unidad, pct, tono = '') =>
  `<div style="display: flex; flex-direction: column; gap: 6px; width: 100%;"><span><strong style="font-weight: 600;">${valor}</strong> <span style="color: ${C.suave};">de ${cap} ${unidad}</span></span>${barra(pct, { color: tono === 'lacre' ? C.lacre : C.oro })}</div>`;
const vacio = `<span style="color: ${C.suave};">—</span>`;
// Previsión a 30 días: simulación del motor día a día (producción los sábados, consumo con decimales, caravanas en ruta).
const contenidoAlmacen = () => `${cabProduccion('Almacén', `${btn('Añadir víveres', { icono: 'trigo' })}${btn('Añadir existencias', { icono: 'mas' })}`)}
${panel(
  'Existencias y previsión a 30 días',
  tablaEditable(
    [{ t: 'Recurso', w: '100px' }, { t: 'Existencias' }, { t: 'Entradas', w: '90px', der: true }, { t: 'Salidas', w: '90px', der: true }, { t: 'Dentro de 30 días', w: '200px' }],
    [
      ['Víveres', existencia('310', '1.200', 'sacos', 26, 'oro'), imp('+714'), `<div style="display: flex; flex-direction: column; align-items: flex-end;">${imp('−975')}<span style="font-size: 13px; color: ${C.suave};">faltan 265</span></div>`, `<div style="display: flex; flex-direction: column;">${alertaTexto('Falta del 23 al 25', 'oro')}<span style="font-size: 13px; color: ${C.suave};">y del 7 al 11 de mayo · quedan 49</span></div>`],
      ['Madera', existencia('420', '600', 'haces', 70), imp('+175'), imp('−298'), dos('297 haces', 'Reserva: unos 85 días')],
      ['Piedra', existencia('180', '400', 'carretadas', 45), imp('+83'), vacio, dos('263 carretadas', 'Sin consumo')],
      ['Arcilla', existencia('150', '300', 'carretadas', 50), imp('+7'), vacio, dos('157 carretadas', 'Sin consumo')],
      ['Hierro', existencia('64', '200', 'lingotes', 32), vacio, vacio, dos('64 lingotes', 'Sin consumo')],
      ['Cerveza', existencia('90', '150', 'barriles', 60), imp('+100'), imp('−112'), dos('78 barriles', 'Reserva: unos 105 días')],
      ['Lana', existencia('35', '100', 'fardos', 35), imp('+60'), vacio, dos('95 fardos', 'Sin consumo')],
    ],
    { alto: 58 },
  ) + `<div style="padding-top: 10px;">${nota('Previsión simulada día a día: entradas de producción y caravanas; salidas del consumo servido, que se para al agotarse (la leña sale de la madera). La barra indica lo lleno que está el almacén.')}</div>`,
)}`;
const breeAlmacen = () => marcoBree('Producción', contenidoAlmacen());

const tarjetaObra = ({ nombre, datos, pct, progreso, efecto }) => `<div style="display: flex; flex-direction: column; gap: 14px; padding: 18px 20px; background: ${C.vitela}; border: 1px solid ${C.borde}; border-radius: 10px; min-width: 0;">
  <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;"><span style="font-family: ${F.titulo}; font-size: 27px; font-weight: 600; line-height: 1.1;">${nombre}</span><div style="display: flex; align-items: center; gap: 4px;">${badge('En curso', 'oro', 'martillo')}${btnIcono('editar', 'fantasma')}</div></div>
  ${rejilla(2, datos.map(([e, v]) => `<div style="display: flex; flex-direction: column;"><span style="font-size: 13px; color: ${C.suave};">${e}</span><span style="font-size: 16px; font-weight: 600;">${v}</span></div>`), { gap: 12 })}
  <div style="display: flex; flex-direction: column; gap: 6px;"><div style="display: flex; justify-content: space-between; font-size: 14px; color: ${C.suave};"><span>${progreso}</span><span style="font-weight: 600; color: ${C.tinta}; ${num}">${pct} %</span></div>${barra(pct, { alto: 10 })}</div>
  <div style="padding-top: 10px; border-top: 1px solid ${C.borde};">${nota(efecto, 'check')}</div>
</div>`;
const contenidoObras = () => `${cabProduccion('Obras', btn('Nueva obra', { icono: 'mas' }))}
${rejilla(2, [
  tarjetaObra({ nombre: 'Reparación de la puerta del sur', datos: [['Coste', '30 mo · pagado'], ['Materiales', '40 haces · 20 lingotes'], ['Empezó', '6 de abril'], ['Termina', '17 de abril']], pct: 58, progreso: 'Día 7 de 12 · quedan 5 días', efecto: 'Al terminar, la puerta vuelve a estar en buen estado.' }),
  tarjetaObra({ nombre: 'Nuevo granero', datos: [['Coste', '85 mo · pagado'], ['Materiales', '120 haces · 60 carretadas'], ['Empezó', '10 de abril'], ['Termina', '19 de mayo']], pct: 8, progreso: 'Día 3 de 40 · quedan 37 días', efecto: 'Al terminar, el almacén admite 800 sacos más de víveres (hasta 2.000).' }),
])}
${panel(
  'Planificadas',
  fila(
    'Ampliar la cervecería',
    `${badge('Recursos suficientes', 'bosque', 'check')}${btn('Empezar obra')}${btnIcono('editar', 'fantasma')}`,
    { sub: 'Mejorar edificio · 45 mo · 60 haces y 30 carretadas · 20 días', borde: false, alto: 64 },
  ),
)}
${plegable('Terminadas', '3', 'Empalizada norte, torre de vigía y redil')}`;
const breeObras = () => marcoBree('Producción', contenidoObras());

const caravana = ({ titulo, sub, tipo, origen, destino, pct, llegada, ultima }) => `<div style="display: flex; align-items: center; gap: 18px; padding: 7px 0; ${ultima ? '' : `border-bottom: 1px solid ${C.borde};`}">
  <div style="display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 22px; background: ${C.pliegue}; color: ${C.oroOsc}; flex-shrink: 0;">${ic('carro', 22)}</div>
  <div style="display: flex; flex-direction: column; gap: 2px; width: 290px;"><div style="display: flex; align-items: center; gap: 8px;"><span style="font-size: 16px; font-weight: 600;">${titulo}</span>${tipo}</div><span style="font-size: 14px; color: ${C.suave};">${sub}</span></div>
  <div style="display: flex; flex-direction: column; gap: 6px; flex: 1;"><div style="display: flex; justify-content: space-between; font-size: 14px; color: ${C.suave};"><span>${origen}</span><span>${destino}</span></div>${barra(pct)}</div>
  <span style="width: 130px; text-align: right; font-size: 15px; font-weight: 600;">${llegada}</span>${btnIcono('editar', 'fantasma')}
</div>`;
const contenidoComercio = () => `
${cabecera('Comercio', { sub: 'Bree', acciones: btn('Nueva caravana', { icono: 'mas' }) })}
${panel(
  'Caravanas en ruta',
  caravana({ titulo: 'Venta de cerveza', tipo: badge('Venta', 'bosque'), sub: '40 barriles · +24 mo al volver', origen: 'Salió el 10 de abril', destino: 'Fornost y vuelta', pct: 25, llegada: 'Vuelve el 18' }) +
    caravana({ titulo: 'Compra de víveres', tipo: badge('Compra'), sub: '300 sacos · 75 mo pagados al salir', origen: 'Salió el 1 de abril', destino: 'Tharbad y vuelta', pct: 46, llegada: 'Vuelve el 25', ultima: true }),
  { pad: '0 20px' },
)}
${plegable('Historial de caravanas', '6', 'La última volvió de Fornost el 30 de marzo')}
${panel(
  'Precios por mercado',
  tabla(
    [{ t: 'Recurso' }, { t: 'Bree (local)', w: '150px', der: true }, { t: 'Fornost', w: '150px', der: true }, { t: 'Tharbad', w: '150px', der: true }],
    [
      ['Víveres · saco de 30 kg', '0,4 mo', '0,3 mo', '0,25 mo'],
      ['Madera · haz', '0,1 mo', '0,15 mo', '0,1 mo'],
      ['Hierro · lingote', '1 mo', '0,8 mo', '1,2 mo'],
      ['Cerveza · barril', '0,4 mo', '0,6 mo', '0,5 mo'],
      ['Piedra · carretada', '0,15 mo', '0,25 mo', '0,3 mo'],
      ['Arcilla · carretada', '0,1 mo', '0,15 mo', '0,08 mo'],
    ],
    { alto: 34, total: [`<span style="font-weight: 400; color: ${C.suave};">Días de viaje desde Bree</span>`, `—${btnIcono('editar', 'fantasma')}`, `4 días${btnIcono('editar', 'fantasma')}`, `12 días${btnIcono('editar', 'fantasma')}`] },
  ),
  { accion: enlace('Añadir mercado') },
)}`;
const breeComercio = () => marcoBree('Comercio', contenidoComercio());

const eventoFila = (titulo, sub, efecto, sel = false) =>
  `<div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 58px; padding: 0 12px; margin: 0 -12px; border-radius: 6px; background: ${sel ? C.oroTinte : 'transparent'}; border: 1px solid ${sel ? C.oro : 'transparent'};"><div style="display: flex; flex-direction: column;"><span style="font-size: 16px; font-weight: 600;">${titulo}</span><span style="font-size: 14px; color: ${C.suave};">${sub}</span></div><div style="display: flex; align-items: center; gap: 4px;">${efecto}${btnIcono('editar', 'fantasma')}</div></div>`;
const contenidoEventos = () => `
${cabecera('Eventos narrativos', { sub: 'Bree · anota lo que decide el máster', acciones: btn('Nuevo evento', { icono: 'mas' }) })}
${columnas('minmax(0, 1fr) 340px', [
  panel(
    'Eventos',
    `${etiquetaGrupo('Activos')}
    ${eventoFila('Lluvias de primavera', 'Del 8 al 21 de abril · quedan 9 días', badge('Granjas −20 %', 'lacre', 'baja'), true)}
    ${etiquetaGrupo('Próximos')}
    ${eventoFila('Feria de primavera', 'Del 15 al 17 de abril', badge('Aranceles +500 %', 'bosque', 'sube'))}
    ${etiquetaGrupo('Pasados')}
    ${eventoFila('Incursión de bandidos en el camino', 'Del 20 al 24 de marzo', badge('Peaje −100 %', 'lacre', 'baja'))}
    ${eventoFila('Visita del mensajero real', '1 de abril', badge('Sin efectos'))}`,
    { pad: '4px 20px 12px' },
  ),
  panel(
    'Detalle',
    `<span style="padding-top: 10px; font-family: ${F.titulo}; font-size: 27px; font-weight: 600; line-height: 1.1;">Lluvias de primavera</span>
    ${lista([['Empieza', '8 de abril', { alto: 40 }], ['Termina', '21 de abril', { alto: 40 }], ['Duración', '14 días', { alto: 40 }]])}
    <span style="padding-top: 12px; font-size: 14px; font-weight: 600;">Efectos</span>
    ${fila('Producción', badge('−20 %', 'lacre', 'baja'), { sub: 'Granjas del Oeste', borde: false })}
    <span style="padding-top: 6px; font-size: 14px; font-weight: 600;">Notas</span>
    <p style="margin: 4px 0 12px; font-family: ${F.titulo}; font-size: 19px; font-style: italic; line-height: 1.35; color: ${C.tinta};">El máster anuncia lluvias intensas: los campos del oeste se encharcan.</p>
    <div style="display: flex; gap: 10px;">${btn('Editar', { icono: 'editar' })}${btn('Terminar hoy', { v: 'fantasma' })}</div>`,
  ),
])}`;
const breeEventos = () => marcoBree('Eventos', contenidoEventos());

// ── Formularios de alta con lógica propia ────────────────────────────────────
const segmentos = (opciones, sel) =>
  `<div style="display: flex; gap: 6px; padding: 4px; background: ${C.pliegue}; border-radius: 8px;">${opciones
    .map((o) => `<div style="display: flex; align-items: center; justify-content: center; flex: 1; height: 44px; border-radius: 6px; font-family: ${F.ui}; font-size: 15px; font-weight: 600; white-space: nowrap; ${o === sel ? `background: ${C.vitela}; border: 1px solid ${C.oro}; color: ${C.tinta};` : `border: 1px solid transparent; color: ${C.suave};`}">${o}</div>`)
    .join('')}</div>`;
const etiquetaCampo = (t, cuerpo, ayuda = '') =>
  `<div style="display: flex; flex-direction: column; gap: 6px; font-family: ${F.ui}; min-width: 0;"><span style="font-size: 14px; font-weight: 600; color: ${C.tinta};">${t}</span>${cuerpo}${ayuda ? `<span style="font-size: 13px; color: ${C.suave};">${ayuda}</span>` : ''}</div>`;
const casilla = (texto, on, { desactivada = false } = {}) =>
  `<div style="display: flex; align-items: center; gap: 10px; min-height: 44px; font-family: ${F.ui}; font-size: 15px; color: ${C.tinta}; ${desactivada ? 'opacity: 0.6;' : ''}"><div style="display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 5px; border: 2px solid ${on ? C.oroOsc : desactivada ? C.borde : C.suave}; background: ${on ? C.oroOsc : 'transparent'}; color: ${C.vitela};">${on ? ic('check', 16) : ''}</div>${texto}</div>`;
const cuerpoDialogo = (hijos) => `<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; padding: 18px 28px 20px;">${hijos.join('')}</div>`;
const ancho2 = (h) => `<div style="grid-column: 1 / 3;">${h}</div>`;

// Campo de importe: cantidad + moneda y su equivalente en oro, calculado al momento.
const importeFila = (cantidad, moneda, oro, extra = '') =>
  `<div style="display: grid; grid-template-columns: 110px minmax(0, 1fr) 150px${extra ? ' 44px' : ''}; gap: 10px; align-items: center; font-family: ${F.ui};">
    <div style="display: flex; align-items: center; justify-content: flex-end; height: 48px; padding: 0 14px; background: ${C.campo}; border: 1px solid ${C.borde}; border-radius: 6px; font-size: 16px; ${num}">${cantidad}</div>
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; height: 48px; padding: 0 14px; background: ${C.campo}; border: 1px solid ${C.borde}; border-radius: 6px; font-size: 16px;"><span>${moneda}</span>${ic('abajo', 18, C.suave)}</div>
    <div style="display: flex; align-items: center; justify-content: flex-end; gap: 8px; height: 48px; padding: 0 14px; background: ${C.oroTinte}; border: 1px solid ${C.oro}; border-radius: 6px; font-size: 18px; font-weight: 600; color: ${C.oroOsc}; ${num}"><span style="font-size: 14px; font-weight: 400;">=</span>${oro}</div>${extra}
  </div>`;
const importe = (cantidad, moneda, oro, { etiqueta = 'Importe', ayuda = '' } = {}) => etiquetaCampo(etiqueta, importeFila(cantidad, moneda, oro), ayuda);
const cajaResumen = (filas) =>
  `<div style="padding: 0 16px; background: ${C.papel}; border: 1px solid ${C.borde}; border-radius: 8px;">${lista(filas.map((f) => [f[0], f[1], { alto: 40, ...(f[2] || {}) }]))}</div>`;
const antes = (t) => `<span style="color: ${C.suave};">${t} →</span>`;

// Todos los desplegables se abren con un buscador arriba, opciones agrupadas y, si procede, «crear».
const resaltar = (texto, q) => {
  const i = q ? texto.toLowerCase().indexOf(q.toLowerCase()) : -1;
  return i < 0 ? texto : `${texto.slice(0, i)}<strong style="font-weight: 700; color: ${C.oroOsc};">${texto.slice(i, i + q.length)}</strong>${texto.slice(i + q.length)}`;
};
// Panel de al menos 400 px: contador dentro del buscador, degradado si la lista sigue y pie fijo solo con la acción de alta.
const selectorAbierto = ({ etiqueta = '', valor, busqueda = '', placeholder = 'Buscar', grupos, contador = '', crear = '', alinear = 'izquierda', ancho = '400px', degradado = false }) => `<div style="position: relative; display: flex; flex-direction: column; gap: 6px; font-family: ${F.ui}; min-width: 0;">
  ${etiqueta ? `<span style="font-size: 14px; font-weight: 600; color: ${C.tinta};">${etiqueta}</span>` : ''}
  <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; height: 48px; padding: 0 14px; background: ${C.campo}; border: 2px solid ${C.oro}; border-radius: 6px; font-size: 16px; color: ${C.tinta};"><span>${valor}</span>${ic('abajo', 18, C.oroOsc)}</div>
  <div data-flotante="true" style="position: absolute; top: ${etiqueta ? 80 : 54}px; ${alinear === 'derecha' ? 'right: 0;' : 'left: 0;'} width: ${ancho}; z-index: 5; display: flex; flex-direction: column; background: ${C.vitela}; border: 1px solid ${C.borde}; border-radius: 8px; box-shadow: 0 12px 32px rgba(43, 33, 24, 0.28); overflow: hidden;">
    <div style="display: flex; align-items: center; gap: 10px; height: 48px; margin: 8px; padding: 0 12px; background: ${C.campo}; border: 1px solid ${C.oro}; border-radius: 6px; font-size: 16px;">${ic('buscar', 18, C.suave)}<span style="flex: 1; color: ${busqueda ? C.tinta : C.suave};">${busqueda || placeholder}</span><span style="font-size: 13px; color: ${C.suave}; white-space: nowrap; ${num}">${contador}</span>${busqueda ? ic('x', 16, C.suave) : ''}</div>
    <div style="position: relative; display: flex; flex-direction: column; padding: 0 8px 6px;">${grupos
      .map(
        ([grupo, opciones]) =>
          `<div style="padding: 6px 8px 2px; font-family: ${F.marca}; font-size: 13px; font-weight: 600; letter-spacing: 0.08em; color: ${C.suave};">${grupo}</div>${opciones
            .map(
              ([o, detalle, sel]) =>
                `<div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 44px; padding: 0 10px; border-radius: 6px; background: ${sel ? C.oroTinte : 'transparent'}; font-size: 15px; color: ${C.tinta};"><span>${resaltar(o, busqueda)}</span><span style="display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: ${C.suave}; ${num}">${detalle || ''}${sel ? ic('check', 16, C.oroOsc) : ''}</span></div>`,
            )
            .join('')}`,
      )
      .join('')}${degradado ? `<div style="position: absolute; left: 0; right: 0; bottom: 0; height: 36px; background: linear-gradient(to bottom, rgba(251, 246, 233, 0), ${C.vitela});"></div>` : ''}</div>
    ${crear ? `<div style="display: flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 16px; border-top: 1px solid ${C.borde}; background: ${C.papel}; font-size: 15px; font-weight: 600; color: ${C.oroOsc}; white-space: nowrap;">${ic('mas', 16)}${crear}</div>` : ''}
  </div>
</div>`;

const personajeNuevoMovimiento = () =>
  marcoTharan('Bolsa y movimientos', contenidoBolsa(), {
    capa: dialogo(
      700,
      `${cabDialogo('Nuevo movimiento', 'Un ingreso, un gasto o una transferencia entre tus dominios.')}
      ${cuerpoDialogo([
        ancho2(segmentos(['Gasto', 'Ingreso', 'Transferencia'], 'Gasto')),
        ancho2(importe('120', 'Plata · mp', '12 mo', { etiqueta: 'Importe' })),
        campo('Concepto', 'Capa élfica'),
        campo('Categoría', 'Equipo', { icono: 'abajo' }),
        campo('Sale de', 'Bolsa de Tharan · 46,518 mo', { icono: 'abajo' }),
        campo('Fecha', '12 de abril de 1640 T.E.', { icono: 'calendario' }),
        // Solo con «Gasto»: la compra crea el objeto; el valor por unidad se propone como importe ÷ cantidad y se puede cambiar.
        ancho2(`<div style="display: flex; flex-direction: column; gap: 2px;">${casilla('Añadir también al inventario', true)}
          <div style="display: flex; flex-direction: column; gap: 10px; padding: 10px 14px 12px; background: ${C.papel}; border: 1px solid ${C.borde}; border-radius: 8px;">
            <div style="display: grid; grid-template-columns: minmax(0, 1fr) 76px 170px; gap: 10px; align-items: start;">${campo('Objeto', 'Capa élfica')}${campo('Cantidad', '1')}${campo('Ubicación', 'Encima', { icono: 'abajo' })}</div>
            <div style="display: grid; grid-template-columns: 130px minmax(0, 1fr); gap: 10px; align-items: center;"><span style="font-family: ${F.ui}; font-size: 14px; font-weight: 600;">Valor por unidad</span>${importeFila('120', 'Plata · mp', '12 mo')}</div>
          </div></div>`),
      ])}
      ${pieDialogo(`<span style="font-family: ${F.ui}; font-size: 15px;">La bolsa queda en ${antes('46,518 mo')} ${imp('34,518 mo')}</span>`, `${btn('Cancelar')}${btn('Guardar movimiento', { v: 'principal' })}`)}`,
    ),
  });

// Transferencia entre dominios propios: dos movimientos vinculados. Aquí deja la bolsa en negativo y el pie pide confirmación.
const personajeTransferencia = () =>
  marcoTharan('Bolsa y movimientos', contenidoBolsa(), {
    capa: dialogo(
      700,
      `${cabDialogo('Nuevo movimiento', 'Un ingreso, un gasto o una transferencia entre tus dominios.')}
      ${cuerpoDialogo([
        ancho2(segmentos(['Gasto', 'Ingreso', 'Transferencia'], 'Transferencia')),
        ancho2(importe('50', 'Oro · mo', '50 mo', { etiqueta: 'Importe' })),
        campo('Sale de', 'Bolsa de Tharan · 46,518 mo', { icono: 'abajo' }),
        campo('Entra en', 'Caja de Bree · 340,6 mo', { icono: 'abajo' }),
        campo('Concepto', 'Transferencia a Bree', { ayuda: 'En Bree: «Transferencia desde Tharan»' }),
        campo('Fecha', '12 de abril de 1640 T.E.', { icono: 'calendario' }),
        ancho2(nota('Categoría fija: Transferencias. Se crean dos movimientos vinculados, uno en cada libro, que se editan juntos.', 'enlazado')),
        ancho2(cajaResumen([
          ['La bolsa de Tharan queda en', `${antes('46,518 mo')}${alertaTexto('−3,482 mo', 'lacre')}`],
          ['La caja de Bree queda en', `${antes('340,6 mo')}${imp('390,6 mo')}`],
        ])),
        ancho2(aviso('La bolsa quedará en negativo. Puedes guardarlo: Inicio lo marcará en rojo hasta que vuelva a 0 o más, y los gastos que no se puedan pagar al avanzar días quedarán como impagos.', 'lacre')),
      ])}
      ${pieDialogo(`<span style="display: inline-flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600; color: ${C.lacre};">${ic('alerta', 18)}La bolsa quedará en −3,482 mo</span>`, `${btn('Revisar')}${btn('Transferir igualmente', { v: 'principal', icono: 'cambio' })}`)}`,
    ),
  });

const dialogoNuevaCaravana = ({ sinMercado = false } = {}) =>
  `${cabDialogo('Nueva caravana', 'Bree · compra, vende o traslada recursos.')}
      ${cuerpoDialogo([
        ancho2(segmentos(['Compra', 'Venta', 'Traslado'], 'Compra')),
        sinMercado ? campo('Mercado', `<span style="color: ${C.suave};">Elige un mercado</span>`, { icono: 'abajo' }) : campo('Mercado', 'Fornost · 4 días de viaje', { icono: 'abajo' }),
        campo('Recurso', 'Víveres · saco de 30 kg', { icono: 'abajo' }),
        campo('Cantidad', '100 sacos', { ayuda: sinMercado ? 'Hoy caben 890 sacos más' : 'Caben 1.148 más el día de llegada' }),
        campo('Salida', '12 de abril de 1640 T.E.', { icono: 'calendario', ayuda: sinMercado ? '—' : 'Vuelve el 20 de abril' }),
        ancho2(importe(sinMercado ? '' : '3', 'Plata · mp', sinMercado ? '—' : '0,3 mo', { etiqueta: 'Precio por saco', ayuda: sinMercado ? 'Sale del mercado elegido' : 'El de Fornost; cámbialo si lo negocias' })),
        ancho2(cajaResumen([
          ['Se paga al salir', sinMercado ? vacio : imp('−30 mo')],
          ['La caja queda en', sinMercado ? vacio : imp('310,6 mo')],
          ['Días con falta de víveres hasta el 25', sinMercado ? vacio : `<span style="color: ${C.suave};">de 3 a</span>${imp('0 días')}`],
        ])),
      ])}
      ${pieDialogo(sinMercado ? '' : casilla('Guardar como precio de Fornost', false), `${btn('Cancelar')}${btn('Enviar caravana', { v: 'principal', icono: 'carro' })}`)}`;
const breeNuevaCaravana = () => marcoBree('Comercio', contenidoComercio(), { capa: dialogo(720, dialogoNuevaCaravana()) });

// Alta completa: el formulario de su sección, apilado, con el contexto del origen y los campos que el origen necesita.
const breeNuevoMercado = () =>
  marcoBree('Comercio', contenidoComercio(), {
    capa: dialogoApilado(
      720,
      dialogoNuevaCaravana({ sinMercado: true }),
      680,
      `${cabDialogo('Nuevo mercado', 'Para «Nueva caravana» de Bree: se elegirá al crearlo.')}
      ${cuerpoDialogo([
        ancho2(campo('Nombre', 'Cavada Grande', { ayuda: 'Complétalo si hace falta' })),
        campo('Días de viaje desde Bree', '5', { ayuda: 'Solo ida: sale hoy y vuelve el 22 de abril' }),
        campo('Días de viaje desde Archet', `<span style="color: ${C.suave};">Sin ruta</span>`, { ayuda: 'Opcional: sin días, Archet no verá este mercado' }),
        ancho2(etiquetaCampo(
          'Precios en Cavada Grande',
          `<div style="display: flex; flex-direction: column; gap: 6px;"><div style="display: grid; grid-template-columns: 170px minmax(0, 1fr); gap: 10px; align-items: center;"><div style="display: flex; align-items: center; height: 48px; padding: 0 12px; background: ${C.pliegue}; border-radius: 6px; font-size: 15px; font-weight: 600;">Víveres · saco de 30 kg</div>${importeFila('28', 'Bronce · mb', '0,28 mo')}</div>
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px;"><span style="font-size: 13px; color: ${C.suave};">Obligatorio: lo necesita la caravana</span>${btn('Añadir precio', { v: 'fantasma', icono: 'mas' })}</div></div>`,
        )),
        ancho2(cajaResumen([
          ['La caravana de 100 sacos', `${imp('−28 mo')}<span style="color: ${C.suave};">· la caja queda en</span>${imp('312,6 mo')}`],
          ['Vuelve', '22 de abril, antes de la falta de víveres del 23'],
        ])),
      ])}
      ${pieDialogo('', `${btn('Cancelar')}${btn('Crear y elegir', { v: 'principal', icono: 'check' })}`)}`,
    ),
  });

const breeNuevoEvento = () =>
  marcoBree('Eventos', contenidoEventos(), {
    capa: dialogo(
      720,
      `${cabDialogo('Nuevo evento', 'Anota lo que decide el máster y cómo afecta a Bree.')}
      ${cuerpoDialogo([
        ancho2(campo('Nombre', 'Descontento por la falta de pan')),
        campo('Empieza', '23 de abril de 1640 T.E.', { icono: 'calendario' }),
        campo('Duración', '3 días', { ayuda: 'Termina el 25 de abril' }),
        ancho2(etiquetaCampo('Efectos', `<div style="display: flex; flex-direction: column; gap: 6px;">
          <div style="display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr) 110px 44px; gap: 8px; align-items: center;">${desplegable('Producción', '100%')}${desplegable('Todos los edificios', '100%')}<div style="display: flex; align-items: center; justify-content: flex-end; height: 44px; padding: 0 12px; background: ${C.campo}; border: 1px solid ${C.borde}; border-radius: 6px; font-family: ${F.ui}; font-size: 16px; font-weight: 600; color: ${C.lacre}; ${num}">−10 %</div>${btnIcono('x', 'fantasma')}</div>
          <div>${btn('Añadir efecto', { v: 'fantasma', icono: 'mas' })}</div>
        </div>`)),
        ancho2(campo('Notas', 'El máster avisa: mientras falte pan, la gente trabaja con desgana.', { alto: 76 })),
      ])}
      ${pieDialogo(nota('El efecto aparecerá en la vista previa de «Avanzar días».'), `${btn('Cancelar')}${btn('Guardar evento', { v: 'principal' })}`)}`,
    ),
  });

const nuevoAsentamiento = () =>
  marco({
    activo: 'inicio',
    contenido: contenidoInicio(),
    capa: dialogo(
      720,
      `${cabDialogo('Nuevo asentamiento', 'Aparecerá en Dominios, en el menú lateral.')}
      ${cuerpoDialogo([
        campo('Nombre', 'Combe'),
        etiquetaCampo('Tipo', segmentos(['Aldea', 'Pueblo', 'Ciudad'], 'Aldea')),
        ancho2(`<div style="display: grid; grid-template-columns: 170px minmax(0, 1fr); gap: 16px; align-items: start;">${campo('Habitantes', '180', { ayuda: 'Comen 6 sacos de víveres al día' })}${importe('20', 'Oro · mo', '20 mo', { etiqueta: 'Caja inicial' })}</div>`),
        ancho2(nota('Se crea vacío, solo con la fila de víveres (0 sacos) y su mercado local sin precios. Después añades edificios, trabajadores, impuestos, existencias y animales.', 'torre')),
        ancho2(nota('La caja inicial no sale de la bolsa de Tharan; para eso, haz después una transferencia.')),
      ])}
      ${pieDialogo('', `${btn('Cancelar')}${btn('Crear asentamiento', { v: 'principal' })}`)}`,
    ),
  });

// ── Altas y operaciones con dinero en varias monedas ─────────────────────────
const nuevaPartidaPersonaje = () =>
  doc(`<div style="display: flex; flex-direction: column; width: 1180px; height: 820px; background: ${C.papel}; color: ${C.tinta}; font-family: ${F.ui}; overflow: hidden;">
  <div style="display: flex; align-items: center; justify-content: space-between; height: 64px; padding: 0 16px 0 24px; background: ${C.vitela}; border-bottom: 1px solid ${C.borde};">
    <div style="display: flex; align-items: center; gap: 10px;">${emblema(22)}<span style="font-family: ${F.marca}; font-size: 15px; font-weight: 600; letter-spacing: 0.06em;">Gestión de Aldeas</span></div>
    ${btn('Cancelar', { v: 'fantasma', icono: 'x' })}
  </div>
  <div style="display: flex; flex-direction: column; gap: 16px; width: 880px; margin: 0 auto; padding-top: 26px;">
    <div style="display: flex; align-items: center; gap: 14px;">
      ${pasoAsistente(1, 'Partida y fecha')}<div style="flex: 1; height: 1px; background: ${C.borde};"></div>
      ${pasoAsistente(2, 'Personaje', 'activo')}
    </div>
    <h1 style="margin: 0; font-family: ${F.titulo}; font-size: 40px; font-weight: 600; line-height: 1.1;">Crea a tu personaje</h1>
    ${rejilla(2, [campo('Nombre', 'Tharan'), campo('Descripción', 'Montaraz dúnadan')])}
    ${etiquetaCampo('Bolsa inicial', `<div style="display: flex; flex-direction: column; gap: 8px;">
      ${importeFila('38', 'Oro · mo', '38 mo', btnIcono('x', 'fantasma'))}
      ${importeFila('25', 'Plata · mp', '2,5 mo', btnIcono('x', 'fantasma'))}
      ${importeFila('40', 'Bronce · mb', '0,4 mo', btnIcono('x', 'fantasma'))}
      ${importeFila('18', 'Cobre · mc', '0,018 mo', btnIcono('x', 'fantasma'))}
      <div>${btn('Añadir otra moneda', { v: 'fantasma', icono: 'mas' })}</div>
    </div>`, 'Copia las monedas de la ficha tal como las tengas; solo se guarda el total en oro. Podrás corregirla después como primera fila del libro.')}
    ${saldoOro('40,918 mo', { etiqueta: 'Bolsa inicial' })}
    <div style="display: flex; justify-content: space-between;">${btn('Atrás', { icono: 'izquierda' })}${btn('Crear partida', { v: 'principal' })}</div>
  </div>
</div>`);

const dialogoEditarMovimiento = ({ abierto }) =>
  `${cabDialogo('Editar movimiento', 'Posada El Poney Pisador · 2 noches · 12 de abril')}
      ${cuerpoDialogo([
        ancho2(aviso('Lo creó el avance del 10 al 12 de abril. Si deshaces ese avance, esta edición se perderá.', 'oro', { icono: 'reloj_arena' })),
        campo('Concepto', 'Posada El Poney Pisador · 2 noches'),
        abierto
          ? selectorAbierto({
            etiqueta: 'Categoría',
            valor: 'Alojamiento',
            busqueda: 'al',
            grupos: [
              ['Gastos del personaje', [['Alojamiento', '', true], ['Sobornos y regalos', '']]],
              ['Asentamientos', [['Salarios', ''], ['Rentas y alquileres', ''], ['Víveres del almacén', '']]],
            ],
            contador: '5 de 27',
            crear: 'Nueva categoría “al”',
            alinear: 'derecha',
          })
          : campo('Categoría', 'Alojamiento', { icono: 'abajo' }),
        ancho2(importe('6', 'Plata · mp', '0,6 mo', { etiqueta: 'Importe', ayuda: 'La posada cobró 3 mp por noche, no 1 mp.' })),
        campo('Sale de', 'Bolsa de Tharan', { icono: 'abajo' }),
        campo('Fecha', '12 de abril de 1640 T.E.', { icono: 'calendario' }),
        ancho2(cajaResumen([
          ['Importe anterior', imp('−0,2 mo', { fuerte: false })],
          ['Importe nuevo', imp('−0,6 mo')],
          ['La bolsa queda en', imp('46,118 mo')],
        ])),
        ancho2(nota('Solo cambia este cobro. Para cobrar 0,3 mo por noche en adelante, edita el gasto recurrente.')),
      ])}
      ${pieDialogo(btn('Eliminar', { v: 'peligro', icono: 'x' }), `${btn('Cancelar')}${btn('Guardar cambios', { v: 'principal' })}`)}`;
const personajeEditarMovimiento = () =>
  marcoTharan('Bolsa y movimientos', contenidoBolsa(), { capa: dialogo(700, dialogoEditarMovimiento({ abierto: true })) });

// Alta rápida (patrón de 12 de los 15 selectores con altas): diálogo de 600 px apilado y anclado arriba, por encima del teclado.
const personajeNuevaCategoria = () =>
  marcoTharan('Bolsa y movimientos', contenidoBolsa(), {
    capa: dialogoApilado(
      700,
      dialogoEditarMovimiento({ abierto: false }),
      600,
      `${cabDialogo('Nueva categoría', 'Para «Editar movimiento»: se elegirá al crearla.')}
      <div style="display: flex; flex-direction: column; gap: 6px; padding: 16px 28px 18px; font-family: ${F.ui};">
        <div style="display: flex; align-items: baseline; justify-content: space-between;"><span style="font-size: 14px; font-weight: 600;">Nombre</span><span style="font-size: 13px; color: ${C.suave}; ${num}">18 de 40</span></div>
        <div style="display: flex; align-items: center; height: 48px; padding: 0 14px; background: ${C.campo}; border: 2px solid ${C.oro}; border-radius: 6px; font-size: 16px;">Posadas del camino<span style="display: inline-block; width: 2px; height: 22px; margin-left: 1px; background: ${C.tinta};"></span></div>
        <span style="display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: ${C.bosque};">${ic('check', 16)}No hay otra categoría con este nombre.</span>
        <div style="padding-top: 10px;">${nota('Irá a «Tus categorías» y la verás en todas tus partidas.')}</div>
      </div>
      ${pieDialogo('', `${btn('Cancelar')}${btn('Crear y elegir', { v: 'principal', icono: 'check' })}`)}`,
      { extra: teclado(['Posadas', 'Posadas del camino', 'Posada']) },
    ),
  });

const personajeVenderObjeto = () =>
  marcoTharan('Inventario', contenidoInventario(), {
    capa: dialogo(
      680,
      `${cabDialogo('Vender objeto', 'Esmeralda tallada · tienes 2 en la caja de Bree · valen 12 mo cada una')}
      ${cuerpoDialogo([
        campo('Cantidad', '1', { ayuda: 'Tienes 2' }),
        campo('Entra en', 'Bolsa de Tharan', { icono: 'abajo' }),
        ancho2(importe('110', 'Plata · mp', '11 mo', { etiqueta: 'Precio por unidad' })),
        campo('Comprador (opcional)', 'Joyero de Bree', { icono: 'abajo' }),
        campo('Fecha', '12 de abril de 1640 T.E.', { icono: 'calendario' }),
        ancho2(cajaResumen([
          ['Ingreso en la bolsa', imp('+11 mo')],
          ['Diferencia con el valor anotado', imp('−1 mo')],
          ['La bolsa queda en', imp('57,518 mo')],
          ['El patrimonio queda en', imp('166,118 mo')],
        ])),
      ])}
      ${pieDialogo(nota('Queda 1 esmeralda en el inventario.'), `${btn('Cancelar')}${btn('Vender', { v: 'principal' })}`)}`,
    ),
  });

const personajeRegistrarPago = () =>
  marcoTharan('Deudas y préstamos', contenidoDeudas(), {
    capa: dialogo(
      680,
      `${cabDialogo('Registrar pago', 'Gremio de mercaderes de Bree · debes 42 mo')}
      ${cuerpoDialogo([
        ancho2(importe('150', 'Plata · mp', '15 mo', { etiqueta: 'Importe pagado' })),
        campo('Sale de', 'Bolsa de Tharan', { icono: 'abajo' }),
        campo('Fecha', '12 de abril de 1640 T.E.', { icono: 'calendario' }),
        ancho2(etiquetaCampo('Se aplica a', segmentos(['Intereses y capital', 'Solo capital', 'Solo intereses'], 'Intereses y capital'))),
        ancho2(cajaResumen([
          ['Intereses pendientes', `${antes('2 mo')}${imp('0 mo')}`],
          ['Capital pendiente', `${antes('40 mo')}${imp('27 mo')}`],
          ['La bolsa queda en', imp('31,518 mo')],
        ])),
        ancho2(nota('El 1 de mayo se sumará un 5 % sobre 27 mo: 1,35 mo.')),
      ])}
      ${pieDialogo('', `${btn('Cancelar')}${btn('Registrar pago', { v: 'principal' })}`)}`,
    ),
  });

const resultadoCaja = (texto) =>
  `<div style="display: flex; align-items: center; justify-content: flex-end; height: 48px; padding: 0 14px; background: ${C.oroTinte}; border: 1px solid ${C.oro}; border-radius: 6px; font-family: ${F.ui}; font-size: 18px; font-weight: 600; color: ${C.oroOsc}; ${num}">${texto}</div>`;
const breeAnadirComida = () =>
  marcoBree('Producción', contenidoAlmacen(), {
    capa: dialogo(
      740,
      `${cabDialogo('Añadir víveres', 'Bree · los víveres se guardan en sacos en el almacén')}
      ${cuerpoDialogo([
        ancho2(`<div style="display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); gap: 10px;">${segmentos(['Comprar', 'Recibir sin coste'], 'Comprar')}${segmentos(['Por personas', 'Sacos'], 'Por personas')}</div>`),
        ancho2(`<div style="display: grid; grid-template-columns: minmax(0, 1fr) 110px minmax(0, 1.2fr) 160px; gap: 10px; align-items: end;">${campo('Personas', '100')}${campo('Durante', '1')}${campo('Periodo', 'Meses · 30 días', { icono: 'abajo' })}${etiquetaCampo('Sacos', resultadoCaja('= 100 sacos'))}</div>`),
        campo('Mercado', 'Bree · local, sin espera', { icono: 'abajo' }),
        campo('Fecha', '12 de abril de 1640 T.E.', { icono: 'calendario' }),
        ancho2(importe('4', 'Plata · mp', '0,4 mo', { etiqueta: 'Precio por saco' })),
        ancho2(cajaResumen([
          ['Coste total', imp('−40 mo')],
          ['La caja queda en', imp('300,6 mo')],
          ['Víveres en el almacén', `${antes('310')}${imp('410 de 1.200 sacos')}`],
          ['Días con falta de víveres hasta el 25', `<span style="color: ${C.suave};">de 3 a</span>${imp('0 días')}`],
        ])),
      ])}
      ${pieDialogo(nota('Con otro mercado se crea una caravana y los víveres llegan al volver.'), `${btn('Cancelar')}${btn('Comprar 100 sacos', { v: 'principal' })}`)}`,
    ),
  });

const filaMaterial = (selector, cantidad, disponible) =>
  `<div style="display: grid; grid-template-columns: minmax(0, 1fr) 160px 110px 44px; gap: 10px; align-items: center; font-family: ${F.ui};">${selector}<div style="display: flex; align-items: center; justify-content: flex-end; height: 48px; padding: 0 12px; background: ${C.campo}; border: 1px solid ${C.borde}; border-radius: 6px; font-size: 16px; ${num}">${cantidad}</div><span style="display: inline-flex; align-items: center; gap: 6px; font-size: 14px; color: ${C.bosque};">${ic('check', 16)}${disponible}</span>${btnIcono('x', 'fantasma')}</div>`;
// El resultado de la obra decide el segundo campo: tipo de edificio o de defensa, edificio, recurso y capacidad, o defensa.
const breeNuevaObra = () =>
  marcoBree('Producción', contenidoObras(), {
    capa: dialogo(
      740,
      `${cabDialogo('Nueva obra', 'Bree · el coste y los materiales se descuentan al empezar')}
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 16px; padding: 16px 28px 18px;">
        ${campo('Resultado', 'Construir edificio', { icono: 'abajo' })}
        ${campo('Tipo de edificio', 'Horno', { icono: 'abajo' })}
        ${campo('Nombre', 'Horno comunal', { ayuda: 'También será el nombre del edificio' })}
        ${etiquetaCampo('Empieza', `<div style="display: grid; grid-template-columns: minmax(0, 1fr) 86px; gap: 8px;"><div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; height: 48px; padding: 0 10px; background: ${C.campo}; border: 1px solid ${C.borde}; border-radius: 6px; font-size: 15px; white-space: nowrap;">12 de abril de 1640 T.E.${ic('calendario', 18, C.suave)}</div><div style="display: flex; align-items: center; justify-content: flex-end; height: 48px; padding: 0 10px; background: ${C.campo}; border: 1px solid ${C.borde}; border-radius: 6px; font-size: 16px; ${num}">15 días</div></div>`, 'Termina el 26 de abril')}
        ${ancho2(etiquetaCampo('Materiales', `<div style="display: flex; flex-direction: column; gap: 8px;">
          ${filaMaterial(campo('', 'Piedra', { icono: 'abajo' }).replace('<span style="font-size: 14px; font-weight: 600; color: #2B2118;"></span>', ''), '40 carretadas', 'Hay 180')}
          ${filaMaterial(selectorAbierto({ valor: 'Arcilla', placeholder: 'Buscar recurso', grupos: [['En el almacén de Bree', [['Arcilla', '150 carretadas', true], ['Cerveza', '90 barriles'], ['Hierro', '64 lingotes'], ['Lana', '35 fardos']]]], contador: '21 recursos', crear: 'Nuevo recurso', degradado: true }), '20 carretadas', 'Hay 150')}
          <div>${btn('Añadir material', { v: 'fantasma', icono: 'mas' })}</div>
        </div>`))}
        ${ancho2(importe('35', 'Oro · mo', '35 mo', { etiqueta: 'Coste de mano de obra' }))}
        ${ancho2(cajaResumen([
          ['Se paga al empezar', `${imp('−35 mo')}<span style="color: ${C.suave};">· la caja queda en</span>${imp('305,6 mo')}`, { alto: 40 }],
          ['Al terminar', 'Edificio «Horno comunal» (Horno), inactivo hasta que lo actives en Edificios', { alto: 40 }],
        ]))}
      </div>
      ${pieDialogo(btn('Guardar como planificada', { v: 'fantasma' }), `${btn('Cancelar')}${btn('Empezar obra', { v: 'principal', icono: 'martillo' })}`)}`,
    ),
  });

// Edificio con varios productos: cada uno con su frecuencia; la cantidad es proporcional a los días del periodo.
const cajaCampo = (valor, icono = '') =>
  `<div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; height: 48px; padding: 0 14px; background: ${C.campo}; border: 1px solid ${C.borde}; border-radius: 6px; font-family: ${F.ui}; font-size: 16px; color: ${C.tinta}; white-space: nowrap; ${num}">${valor}${icono ? ic(icono, 18, C.suave) : ''}</div>`;
const filaProduccion = (recurso, cantidad, frecuencia) =>
  `<div style="display: grid; grid-template-columns: minmax(0, 1fr) 170px minmax(0, 1fr) 44px; gap: 10px; align-items: center;">${cajaCampo(recurso, 'abajo')}${cajaCampo(cantidad)}${cajaCampo(frecuencia, 'abajo')}${btnIcono('x', 'fantasma')}</div>`;
const breeEditarEdificio = () =>
  marcoBree('Producción', contenidoEdificios(), {
    capa: dialogo(
      740,
      `${cabDialogo('Editar edificio', 'Bree · Cantera · 2 de 3 canteros')}
      <div style="display: flex; flex-direction: column; gap: 14px; padding: 16px 28px 18px; font-family: ${F.ui};">
        <div style="display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 190px; gap: 16px; align-items: start;">${campo('Nombre', 'Cantera')}${campo('Tipo de edificio', 'Cantera', { icono: 'abajo' })}${campo('Trabajadores necesarios', '3', { ayuda: '2 canteros asignados · 67 %' })}</div>
        ${etiquetaCampo('Estado', segmentos(['Activo', 'Dañado', 'Inactivo', 'Alquilado'], 'Activo'))}
        ${etiquetaCampo(
          'Producción',
          `<div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: grid; grid-template-columns: minmax(0, 1fr) 170px minmax(0, 1fr) 44px; gap: 10px; font-size: 13px; color: ${C.suave};"><span>Recurso</span><span>Cantidad base</span><span>Frecuencia</span><span></span></div>
            ${filaProduccion('Piedra', '25 carretadas', `Semanal · ${diaSemana(7)}`)}
            ${filaProduccion('Arcilla', '10 carretadas', 'Mensual · día 1')}
            <div>${btn('Añadir producto', { v: 'fantasma', icono: 'mas' })}</div>
          </div>`,
        )}
        ${cajaResumen([
          ['Próxima piedra', `${diaSemana(14)} 14 de abril · unas ${imp('17 carretadas')}`],
          ['Próxima arcilla', `1 de mayo · unas ${imp('7 carretadas')}`],
        ])}
        ${nota('Cada producto se suma en su fecha, en proporción a los días del periodo con trabajadores y eventos.')}
      </div>
      ${pieDialogo(btn('Eliminar', { v: 'peligro', icono: 'x' }), `${btn('Cancelar')}${btn('Guardar cambios', { v: 'principal' })}`)}`,
    ),
  });

// ── Animales del asentamiento ────────────────────────────────────────────────
const ANIMALES_BREE = [
  ['Vaca', 'Bovino', '24', 'Hembra', '6 mo'],
  ['Toro', 'Bovino', '1', 'Macho', '12 mo'],
  ['Buey', 'Bovino', '6', 'Macho', '8 mo'],
  ['Caballo de tiro', 'Caballar', '8', 'Grupo mixto', '15 mo'],
  ['Poni', 'Caballar', '5', 'Grupo mixto', '6 mo'],
  ['Oveja', 'Ovino y caprino', '60', 'Hembra', '1,5 mo'],
  ['Carnero', 'Ovino y caprino', '4', 'Macho', '2 mo'],
  ['Cerdo', 'Porcino', '18', 'Grupo mixto', '1,2 mo'],
  ['Gallina', 'Aves de corral', '45', 'Hembra', ''],
  ['Gallo', 'Aves de corral', '3', 'Macho', ''],
  ['Perro pastor', 'Perros y gatos', '4', 'Grupo mixto', ''],
];
const contenidoAnimales = () => `
${cabecera('Animales', { sub: 'Bree · 178 animales: 129 hembras, 14 machos y 35 en grupos mixtos', acciones: btn('Añadir animales', { icono: 'mas' }) })}
${panel(
  'Lista de animales',
  tablaEditable(
    [{ t: 'Animal' }, { t: 'Grupo', w: '170px' }, { t: 'Cantidad', w: '100px', der: true }, { t: 'Género', w: '130px' }, { t: 'Valor por cabeza', w: '150px', der: true }],
    ANIMALES_BREE.map(([animal, grupo, cantidad, genero, valor]) => [animal, `<span style="color: ${C.suave};">${grupo}</span>`, cantidad, genero, valor || `<span style="color: ${C.suave};">—</span>`]),
    { total: ['Total', '', '178', '', imp('473,6 mo')] },
  ),
  { accion: `${desplegable('Todos los tipos')}${desplegable('Todos los géneros')}${btnIcono('buscar')}` },
)}`;
const breeAnimales = () => marcoBree('Animales', contenidoAnimales());
const breeNuevoAnimal = () =>
  marcoBree('Animales', contenidoAnimales(), {
    capa: dialogo(
      660,
      `${cabDialogo('Añadir animales', 'Bree · animales del pueblo')}
      ${cuerpoDialogo([
        selectorAbierto({
          etiqueta: 'Animal',
          valor: 'Cabra',
          busqueda: 'cabr',
          grupos: [['Ovino y caprino', [['Cabra', 'no tienes', true], ['Cabrito', 'no tienes'], ['Macho cabrío', 'no tienes']]]],
          contador: '3 de 57',
          crear: 'Nuevo tipo de animal “cabr”',
        }),
        campo('Cantidad', '6'),
        ancho2(etiquetaCampo('Género', segmentos(['Hembra', 'Macho', 'Grupo mixto'], 'Hembra'))),
        ancho2(importe('10', 'Plata · mp', '1 mo', { etiqueta: 'Valor por cabeza (opcional)' })),
        ancho2(campo('Notas', 'Para leche y queso; las cuida el pastor del redil.', { alto: 76 })),
        ancho2(nota('Si ya tienes ese animal con el mismo género, la cantidad se suma a su fila.')),
      ])}
      ${pieDialogo('', `${btn('Cancelar')}${btn('Añadir', { v: 'principal' })}`)}`,
    ),
  });

// ── Borrar: doble confirmación, igual para todas las tablas ──────────────────
const personajeEliminarMovimiento = () =>
  marcoTharan('Bolsa y movimientos', contenidoBolsa(), {
    capa: dialogo(
      620,
      `${cabDialogo('¿Eliminar este movimiento?', 'Posada El Poney Pisador · 2 noches · 12 de abril')}
      <div style="display: flex; flex-direction: column; gap: 14px; padding: 18px 28px 20px;">
        ${cajaResumen([
          ['Importe', imp('−0,2 mo')],
          ['La bolsa pasará a', imp('46,718 mo')],
        ])}
        ${aviso('Lo creó el avance del 10 al 12 de abril. Si deshaces ese avance, el movimiento volverá a aparecer.', 'oro', { icono: 'reloj_arena' })}
        ${casilla('Sé que esto no se puede deshacer', true)}
        ${nota('El botón rojo no se activa hasta marcar la casilla.')}
      </div>
      ${pieDialogo('', `${btn('Cancelar')}${btn('Eliminar definitivamente', { v: 'peligroLleno', icono: 'x' })}`)}`,
    ),
  });

// ── Armería de la guarnición ─────────────────────────────────────────────────
const ARMERIA_BREE = [
  ['Lanzas', '20', '0,8 mo', '16 mo'],
  ['Arcos largos', '6', '2 mo', '12 mo'],
  ['Flechas · haz de 20', '30', '0,3 mo', '9 mo'],
  ['Espadas cortas', '8', '3 mo', '24 mo'],
  ['Escudos redondos', '12', '1,2 mo', '14,4 mo'],
  ['Cotas de malla', '4', '25 mo', '100 mo'],
  ['Yelmos de hierro', '10', '2,5 mo', '25 mo'],
  ['Jubones de cuero', '12', '1,5 mo', '18 mo'],
  ['Ballestas', '2', '6 mo', '12 mo'],
];
const breeArmeria = () =>
  marcoBree(
    'Personal',
    `${cabPersonal('Armería', 'Añadir a la armería')}
${panel(
  'Armas, armaduras y equipo de combate',
  tablaEditable(
    [{ t: 'Nombre' }, { t: 'Cantidad', w: '110px', der: true }, { t: 'Valor por unidad', w: '160px', der: true }, { t: 'Valor total', w: '150px', der: true }],
    ARMERIA_BREE.map(([nombre, cantidad, unidad, total]) => [nombre, cantidad, unidad, `<span style="font-weight: 600;">${total}</span>`]),
    { total: ['Valor total de la armería', '104', '', imp('230,4 mo')] },
  ),
  { accion: btnIcono('buscar') },
)}`,
  );

// ── Escritura y distribución en el canvas ────────────────────────────────────
const PAGINAS = [
  ['page-1', 'Partida', [
    ['SelectorPartidas', 'Selector de partidas', selectorPartidas],
    ['NuevaPartida', 'Nueva partida · paso 1', nuevaPartida],
    ['NuevaPartidaPersonaje', 'Nueva partida · paso 2', nuevaPartidaPersonaje],
    ['Main', 'Inicio', inicio],
    ['Calendario', 'Calendario', calendario],
    ['AvanzarDiasPrevia', 'Avanzar días · vista previa', avanzarPrevia],
    ['AvanzarDiasResumen', 'Avanzar días · resumen', avanzarResumen],
    ['Ajustes', 'Ajustes y copias', ajustes],
    ['ListasYCatalogos', 'Listas y catálogos', listasYCatalogos],
    ['ListasEliminarCategoria', 'Listas · eliminar opción en uso', listasEliminarCategoria],
  ]],
  ['page-2', 'Personaje', [
    ['PersonajeResumen', 'Personaje · resumen', personajeResumen],
    ['PersonajeBolsa', 'Personaje · bolsa y movimientos', personajeBolsa],
    ['PersonajeNuevoMovimiento', 'Personaje · nuevo movimiento', personajeNuevoMovimiento],
    ['PersonajeTransferencia', 'Personaje · transferencia con saldo negativo', personajeTransferencia],
    ['PersonajeEditarMovimiento', 'Personaje · editar movimiento', personajeEditarMovimiento],
    ['PersonajeNuevaCategoria', 'Personaje · nueva categoría (alta rápida)', personajeNuevaCategoria],
    ['PersonajeEliminarMovimiento', 'Eliminar · doble confirmación', personajeEliminarMovimiento],
    ['PersonajeInventario', 'Personaje · inventario', personajeInventario],
    ['PersonajeVenderObjeto', 'Personaje · vender objeto', personajeVenderObjeto],
    ['PersonajeDeudas', 'Personaje · deudas y préstamos', personajeDeudas],
    ['PersonajeRegistrarPago', 'Personaje · registrar pago', personajeRegistrarPago],
    ['PersonajeGastos', 'Personaje · gastos e ingresos recurrentes', personajeGastos],
    ['PersonajeInversiones', 'Personaje · inversiones', personajeInversiones],
    ['PersonajeHechizos', 'Personaje · hechizos', personajeHechizos],
    ['PersonajeRegistrarIntento', 'Personaje · registrar intento', personajeRegistrarIntento],
  ]],
  ['page-3', 'Asentamiento', [
    ['NuevoAsentamiento', 'Nuevo asentamiento', nuevoAsentamiento],
    ['BreeResumen', 'Asentamiento · resumen', breeResumen],
    ['BreeTesoreria', 'Tesorería · caja y movimientos', breeTesoreria],
    ['BreeImpuestos', 'Tesorería · impuestos y rentas', breeImpuestos],
    ['BreeLocales', 'Tesorería · locales comerciales', breeLocales],
    ['BreeProduccionLocal', 'Tesorería · producción del mes de un local', breeProduccionLocal],
    ['BreeDeudas', 'Tesorería · deudas', breeDeudas],
    ['BreePoblacion', 'Población', breePoblacion],
    ['BreeTrabajadores', 'Personal · trabajadores', breeTrabajadores],
    ['BreeGuarnicion', 'Personal · guarnición', breeGuarnicion],
    ['BreeArmeria', 'Personal · armería', breeArmeria],
    ['BreeEdificios', 'Producción · edificios', breeEdificios],
    ['BreeEditarEdificio', 'Producción · editar edificio', breeEditarEdificio],
    ['BreeAlmacen', 'Producción · almacén', breeAlmacen],
    ['BreeAnadirViveres', 'Producción · añadir víveres', breeAnadirComida],
    ['BreeObras', 'Producción · obras', breeObras],
    ['BreeNuevaObra', 'Producción · nueva obra', breeNuevaObra],
    ['BreeAnimales', 'Animales', breeAnimales],
    ['BreeNuevoAnimal', 'Animales · añadir animales', breeNuevoAnimal],
    ['BreeComercio', 'Comercio', breeComercio],
    ['BreeNuevaCaravana', 'Comercio · nueva caravana', breeNuevaCaravana],
    ['BreeNuevoMercado', 'Comercio · nuevo mercado (alta completa)', breeNuevoMercado],
    ['BreeEventos', 'Eventos narrativos', breeEventos],
    ['BreeNuevoEvento', 'Eventos · nuevo evento', breeNuevoEvento],
  ]],
];
const NOTAS = {
  "page-1": "Partida: selector, alta de partida en 2 pasos, inicio, calendario, «Avanzar días» (vista previa y resumen), ajustes, y listas y catálogos (P7) con la eliminación de una opción en uso (P7b). Tablet horizontal 1180×820.\nDatos de ejemplo: la partida empieza el 1 de enero de 1640 T.E. y está el 12 de abril; «Avanzar días» la lleva al 19. Todas las cifras cuadran entre pantallas. Los estados sin artboard van anotados bajo su vista.\nAltas desde los desplegables: acción en el pie del buscador (J2c), alta rápida sobre el teclado (J2e), alta completa apilada (A10c), y gestión y reasignación en P7 y P7b.",
  "page-2": "Personaje (Tharan): 7 entradas en el menú. Diálogos: nuevo movimiento (compra que entra en el inventario), transferencia con saldo negativo, editar movimiento con el desplegable abierto (buscador «al», «5 de 27» y la acción «+ Nueva categoría “al”» en el pie del buscador), nueva categoría (alta rápida sobre el teclado), eliminar con doble confirmación, vender objeto, registrar pago y registrar intento. El estudio va por hechizo: varios a la vez, con sus intentos buenos y malos y sin contar días. Todo importe se introduce con cantidad y moneda y se calcula en oro. Los movimientos vinculados se editan desde su origen.",
  "page-3": "Asentamiento (Bree): 8 entradas en el menú. Tesorería (caja, impuestos y rentas con los locales comerciales, y deudas), Personal (trabajadores, guarnición y armería) y Producción (edificios, almacén y obras) agrupan pantallas en pestañas. El almacén guarda víveres, madera, piedra, arcilla, hierro, cerveza y lana. Los edificios pueden tener varios productos, cada uno con su frecuencia (la cantera da piedra cada semana y arcilla cada mes); solo extraen, sin gastar recursos. Diálogos: producción del mes de un local, nuevo asentamiento, editar edificio, añadir víveres, nueva obra (desplegable de materiales abierto), añadir animales (57 tipos), nueva caravana (compra, venta o traslado), nuevo mercado (alta completa apilada) y nuevo evento.\nAltas desde los desplegables: acción en el pie del buscador («+ Nuevo recurso» en Nueva obra, «+ Nuevo tipo de animal “cabr”» en Añadir animales) y alta completa apilada (Nuevo mercado sobre Nueva caravana). El alta rápida sobre el teclado y la gestión y reasignación se ven en J2e y P7.",
};
// Estados y variantes sin artboard propio: se anotan bajo su vista.
const ANOTACIONES = {
  "SelectorPartidas": "Sin partidas: «Nueva partida» e «Importar copia» destacados. Importar desde aquí añade la partida; si ya existe, pregunta «Reemplazar» o «Importar como copia». La app abre la última partida usada.",
  "Main": "Avisos: hasta 4 en dos columnas, primero los rojos; con más, «Ver todos (N)». Rojo: falta ocurrida durante un avance o prevista en 7 días o menos, impago, deuda vencida, saldo negativo, obra que no pudo empezar, y caravana o compra que no pudo salir. Ámbar: falta entre 8 y 30 días, deuda que vence en 10 días o menos, pago que el saldo no cubrirá, edificio terminado sin producción y recurso perdido por capacidad. Tocar una tarjeta abre el Resumen de su dominio.",
  "Calendario": "Editar en el detalle del día: elemento pasado → su movimiento (o el formulario de su origen); ocurrencia futura de una regla → la regla, con el aviso «Cambia esta y las próximas ocurrencias»; evento → su formulario; intento → J8; vencimiento → su deuda; producción futura → «Editar edificio» (la pasada no se edita: se corrige con un ajuste de existencias). La producción es una marca por asentamiento y día, y el detalle muestra una tarjeta por edificio con sus productos («Cantera · piedra 17 · arcilla 7 carretadas»); las producciones diarias y las de 0 no se marcan. Se marcan las obras y caravanas al empezar o salir y al terminar o volver, y los eventos al empezar y terminar; los movimientos manuales y las transferencias no se marcan. «Añadir evento o pago» admite eventos de partida, sin efectos (propuesta aceptada por el usuario el 2026-09-17).",
  "AvanzarDiasPrevia": "Se abre sobre la pantalla actual. «Otro…» admite de 1 a 366 días, con aviso si pasa de 90. El cuerpo se desplaza por grupos de dominio. Si un impago necesita una contraparte nueva, avisa «Se añadirá «Trabajadores de Bree» a Personas y entidades».",
  "AvanzarDiasResumen": "«Deshacer avance» restaura la partida de antes del avance y descarta lo hecho después; si hubo cambios, avisa «Se perderán 3 cambios hechos después del avance».",
  "ListasYCatalogos": "Otras listas, con el grupo bajo el nombre: oficios, tipos de edificio, de unidad y de animal; tipos de defensa sin grupo; Recursos con la unidad debajo («carretada / carretadas»), Se usa en «Bree 180 · Archet —» y candado en Víveres, Cerveza, Madera, Piedra y Arcilla; Ubicaciones (Posada El Poney Pisador y Establo de Bree, 1 objeto cada una; Encima y las cajas y almacenes de cada asentamiento en tono suave, «Sale del dominio», sin editar); Personas y entidades: Gremio de mercaderes de Bree · 2 deudas · 72 mo pendientes: 42 de Tharan y 30 de Bree; Hobart Brezal, herrero · 1 deuda · 4 mo · titular de 1 local; Dalen, mercader de Esgaroth · 1 préstamo · 15 mo; Corona de Arthedain · 2 tributos: Bree y Archet; Joyero de Bree · sin usos; Barnabás Mantecona, posadero · 1 deuda saldada, de Bree · titular de 1 local.\n«Editar» abre el alta rápida como «Editar categoría»: «Se usa en 1 movimiento de Tharan», Grupo (solo en las tuyas, con un selector de los 5 grupos), «Eliminar», «Cancelar» y «Guardar cambios». En Recursos abre «Recurso del catálogo»: nombre y unidad en singular y plural.",
  "ListasEliminarCategoria": "Variantes. Recién abierto: «Sus registros pasan a» vacío con «Elige una categoría» y botón rojo desactivado. Sin usos: J2d normal, sin campo ni aviso. Uso opcional (Corona de Arthedain, solo tributos): trae «Dejarlos sin destinatario». Bloqueos en «Editar …», con el motivo bajo «Eliminar»: «Salarios la pone la app al pagar a los trabajadores: puedes renombrarla, pero no eliminarla»; «Madera es una reserva del almacén: puedes renombrarla, pero no eliminarla»; «Hierro tiene 64 lingotes en Bree: déjalo a 0 antes de eliminarlo». Tipo de animal con la misma combinación en el destino: las 6 cabras montesas hembra de Bree se suman a «Cabra · Hembra», que pasa a 12; segmentos «1 mo (Cabra) · 1,2 mo (Cabra montés)» y «Valor anotado de los animales: 486,8 → 485,6 mo». Opción de la app usada en otras partidas: «También cambian 3 movimientos de Los Senderos del Norte».",
  "PersonajeNuevoMovimiento": "«Añadir también al inventario» solo existe con «Gasto». El patrimonio no cambia: los 12 mo pasan de la bolsa al inventario. Si ya hay un objeto con el mismo nombre, ubicación y valor por unidad, se suma a su fila. Con fecha futura el movimiento queda «Programado» (grupo encima del libro, no cuenta en el saldo) y el objeto se crea al aplicarse.",
  "PersonajeTransferencia": "Saldo negativo en una acción manual (decidido por el usuario el 2026-09-16): el resumen lo marca en lacre y, al pulsar «Transferir», el pie pide confirmación; «Revisar» vuelve al formulario. Tras guardar, Inicio muestra en rojo «La bolsa de Tharan está en negativo: −3,482 mo». Sin saldo negativo, el pie es «Cancelar» y «Transferir». Editar cualquiera de los dos movimientos abre este formulario; eliminar borra los dos.",
  "PersonajeEditarMovimiento": "Pie del buscador. «posada»: «Nada coincide con “posada”», «Busca en todas las categorías y grupos.» y botón principal «+ Nueva categoría “posada”». «alojamiento»: pie «“Alojamiento” ya existe», sin acción. En los filtros (J2, A2, J3, A12) no hay pie. El artboard dibuja el panel con el teclado cerrado para enseñar la lista; con teclado, el diálogo sube hasta dejar el campo a 88 px del borde y el panel mide como mucho 296 px. J2c no cambia el tipo (sin segmentos) y solo edita movimientos sueltos: los vinculados abren el formulario de su origen.",
  "PersonajeNuevaCategoria": "Teclado de la tablet: 380 px; quedan 440 px visibles y el diálogo acaba hacia y = 360. Estados: vacío → «Escribe un nombre» y «Crear y elegir» desactivado; duplicado («alojamiento») → «Ya existe «Alojamiento» en Gastos del personaje.» y el botón pasa a «Elegir «Alojamiento»»; parecida («Salario») → línea ámbar «Parecida: «Salarios» (Asentamientos)» con «Elegir esa». Con grupo («Nuevo tipo de animal» desde A12b): Nombre «Cabra montés», «Parecido: «Cabra» (Ovino y caprino)» y Grupo «Ovino y caprino» en un selector sin altas; mide unos 440 px y con teclado el cuerpo se desplaza unos 50 px. Oficio: Nombre «Tonelero» y Plural «Toneleros», con 4 segmentos de grupo. Tras crear, J2c muestra «Posadas del camino» con borde oro 2 s, la ayuda «Categoría nueva · la gestionas en Listas y catálogos», el foco en la cantidad, «Importe anterior −0,2 mo», «Importe nuevo −0,6 mo» y «La bolsa queda en 46,118 mo»; el selector cuenta 28 categorías. La categoría queda creada aunque se cancele J2c.",
  "PersonajeEliminarMovimiento": "«Cancelar» vuelve a «Editar movimiento» con sus datos. Si con el movimiento se compró un objeto, aparece la casilla «Quitar también las 3 athelas del inventario». Casillas de devolución, marcadas por defecto: obra en curso, «Devolver 85 mo a la caja» y «Devolver los materiales al almacén»; caravana en ruta, devolver el pago (compra) o la carga (venta o traslado). Qué se borra con cada registro: tabla «Al eliminar» de la especificación.",
  "PersonajeInventario": "Con un filtro activo el pie dice «Valor de lo filtrado: X mo de 81,6 mo» (con «Encima», 43,6 mo). Los objetos vendidos del todo quedan archivados y se ven con el filtro «Vendidos». La lupa busca en nombre y notas.",
  "PersonajeVenderObjeto": "Cantidad mayor que la que tienes (3): error en lacre bajo el campo, «Tienes 2», y «Vender» desactivado. Editar la venta desde el libro abre este diálogo con los datos cargados y «Eliminar», que borra su movimiento y devuelve las unidades (si el objeto estaba archivado como «Vendido», se restaura).",
  "PersonajeDeudas": "Deuda vencida: badge lacre «Vencida hace 2 días», aviso rojo en Inicio y los intereses siguen corriendo. Grupo «Saldadas» desplegado: tarjetas atenuadas con badge «Saldada el …» y editar (Tharan no tiene; se ve en A2b). El formulario de la deuda tiene fecha de alta, lista sus pagos (editar → J4b con «Eliminar») y tiene «El dinero entra en / sale de» para anotar el préstamo con su movimiento.",
  "PersonajeGastos": "Formulario: segmento Gasto o Ingreso, concepto, importe, categoría, «Sale de / Entra en», frecuencia y primer cobro (propuesta aceptada por el usuario el 2026-09-17). Los interruptores guardan al instante; al reanudar, el próximo cobro se calcula desde hoy.",
  "PersonajeInversiones": "Negocio en «Nueva inversión»: al buscar «molino de entibo» sin coincidencias, botón «+ Nuevo negocio “molino de entibo”»; el campo queda «Molino de Entibo» con la etiqueta «nuevo» y el foco pasa a Descripción. No se guarda nada hasta «Guardar inversión». El formulario tiene «El capital sale de» y «Los beneficios entran en». «Ver los 4 cobros» abre el historial completo.",
  "PersonajeRegistrarIntento": "Solo ofrece hechizos «En estudio»; al editar un intento incluye también su hechizo aunque esté Aprendido, y el pie trae «Eliminar» (si el intento consumió un pergamino, este vuelve a «poseído»). La fecha no puede ser posterior a hoy. Si la búsqueda coincide con un hechizo aprendido, el pie dice «“Hablar con los animales” está aprendido», sin acción. «El pergamino se consume» se activa al elegir un pergamino («De este hechizo · Otros»). «+ Nuevo hechizo “…”» abre el alta rápida: solo el nombre; va a «En estudio», y lista, reino y nivel se completan después en el hechizo.",
  "PersonajeHechizos": "Estudio por hechizo (decidido por el usuario el 2026-09-17): varios hechizos en estudio a la vez; no se cuentan días. Formulario «Hechizo»: Nombre (obligatorio, de 2 a 60 caracteres y único; si es de otra lista, añádela al nombre: «Luz (Caminos de la luz)»), Lista (texto opcional), Reino (segmentos opcionales: Sin reino · Esencia · Canalización · Mentalismo · Híbrido), Nivel (opcional, de 1 a 50), Estado (En estudio · Aprendido), «Aprendido el» (obligatorio con Aprendido, hoy o antes y no antes del último intento; se borra al volver a «En estudio») y Notas. «Eliminar» borra sus intentos; sus pergaminos conservan su nombre y sus objetos siguen en el inventario.",
  "BreeTesoreria": "Primera fila del libro (inicio de la partida): «Saldo inicial», editable y sin «Eliminar». Los movimientos programados salen en un grupo encima del libro. Estado vacío (asentamiento recién creado): solo la fila «Saldo inicial», la frase «Aún no hay movimientos en la caja» y «Nuevo movimiento» centrado.",
  "BreeLocales": "Locales comerciales (decidido por el usuario el 2026-09-17): negocios de terceros que pagan impuestos a la caja; su producción es dinero y no entra en el almacén. Formulario «Local comercial»: Nombre, Tipo (con altas), Titular (opcional, de Personas y entidades), Producción habitual al mes, Estado (Abierto · Cerrado: cerrado no paga) y Notas; «Eliminar» borra sus producciones anotadas y conserva los cobros pasados. Formulario «Tipo de local»: Nombre, Impuesto % sobre lo producido, Mínimo al mes y Día de cobro; eliminarlo se bloquea mientras tenga locales («Herrería tiene 1 local: cámbialo de tipo antes»). Ejemplo: Herrería 1 produce 10 mo → paga 1 mo (10 %); si un mes se anota 1 mo o 0, el 10 % no llega al mínimo y paga 2 mp = 0,2 mo. Cada local paga cada mes una sola vez; el mes de su alta se cobra entero y, si estuvo cerrado todo el mes, no paga.",
  "BreeProduccionLocal": "Producción vacía: cuenta la habitual (10 % de 10 mo = 1 mo, se cobra +1 mo). Anotar 0 si no produjo nada: paga el mínimo (+0,2 mo). Cerrado todo el mes: «no paga». «Usar la habitual» borra la anotación. Solo se anotan meses sin cobrar; un mes ya cobrado se corrige editando su movimiento. El cobro agrupa todos los locales del día: «Impuestos de locales · abril (4)», categoría Impuestos.",
  "BreeDeudas": "Pestaña «Deudas» (decidido por el usuario el 2026-09-16). «Registrar pago» abre J4b con «Sale de: caja de Bree». Las deudas de un asentamiento no cuentan en el patrimonio de Tharan. Impago: el motor crea en «Lo que debe Bree» una deuda con «Trabajadores de Bree» (o «Guarnición de Bree», o el destinatario del tributo), sin interés ni vencimiento, que acumula los impagos sucesivos mientras esté abierta; sale un aviso rojo que lleva a esta pestaña y la cifra «Impagos» cuenta las abiertas.",
  "BreeTrabajadores": "Sobredotación (sin artboard): si un edificio tiene más trabajadores de los necesarios, aviso ámbar; por ejemplo, con 4 canteros, «La cantera tiene 1 cantero de más». La producción no pasa del 100 %.",
  "BreeEditarEdificio": "Producción recurrente (decidido por el usuario el 2026-09-17): solo extracción, sin gastar recursos; varios productos por edificio, cada uno con su frecuencia; cantidad proporcional a los días del periodo según trabajadores, estado y eventos. Ejemplo: una mina con «Piedra · 10 carretadas · Mensual · día 1» y 3 mineros necesarios; si el mes tiene 15 días con 2 mineros y 15 con 3, el día 1 entran 10 × (15 × 2/3 + 15 × 1) ÷ 30 ≈ 8,3 carretadas. Un producto nuevo, o con otro recurso o frecuencia, empieza a sumar el día siguiente y su primera vez sale en proporción al periodo completo (de semanal a mensual el 29 de abril: el 1 de mayo, unas 0,4 carretadas). Cambiar solo la cantidad conserva lo acumulado. Quitar un producto (x): el resumen dice «Se descartan 11 días acumulados de arcilla» y se confirma con «Guardar cambios» (propuesta aceptada por el usuario el 2026-09-17). Si la próxima vez no cabe en el almacén, el resumen añade en ámbar «caben N». Con «Alquilado», Producción se oculta y conserva lo acumulado; la renta se ve en solo lectura con el enlace «en Impuestos y rentas» o, sin renta, «Sin renta · Añádela en Impuestos y rentas». Sin «Una sola vez»: una entrada única se anota con «Añadir existencias».",
  "BreeAlmacen": "Editar una fila abre «Recurso y ajuste de existencias»: unidad en solo lectura con «Cambiar en Listas y catálogos», existencias y capacidad; el ajuste pide motivo; debajo, la lista de ajustes y de entradas. «Añadir existencias» con «+ Nuevo recurso» crea el recurso del catálogo; su fila del almacén aparece al guardar la entrada. Con un mercado que no es el local, crea una caravana («Enviar caravana»). Las entradas manuales no pueden superar la capacidad («Caben 890 sacos más»); lo que excede al producir o llegar una caravana se pierde con aviso ámbar.",
  "BreeAnadirViveres": "1 saco de 30 kg alimenta a 1 persona durante 30 días: 100 personas × 30 días ÷ 30 = 100 sacos. Con «Sacos» se escribe directamente la cantidad («100 sacos»). Con un mercado que no es el local (Fornost · 4 días) el botón pasa a «Enviar caravana», se crea la caravana y los víveres entran al volver, el 20 de abril.",
  "BreeObras": "Programadas: «Empezar obra» con inicio futuro deja la obra con badge «Programada». No descuenta nada hasta su inicio; si ese día falta dinero o materiales, no empieza y da aviso rojo.",
  "BreeNuevaObra": "«Nuevo recurso» (alta completa de 700 px sobre la obra): Nombre «Cal», Unidad «carretada / carretadas» con chips (saco, haz, carretada, lingote, barril, fardo), Existencias en Bree 0 y Capacidad «Sin límite»; sin precio, porque la obra no tiene mercado. Tras crear, la fila dice «Cal · 20 carretadas · Hay 0» en lacre, «Faltan 20 carretadas de cal» y «Empezar obra» se desactiva (queda «Guardar como planificada»); la fila de Cal en el almacén se crea al guardar la obra. Desde una caravana de compra, Existencias no aparece y sale «Entrarán al volver la caravana: 20 carretadas». Si el coste deja la caja por debajo de 0, el pie pasa a «La caja quedará en −X mo» con «Revisar» y «Empezar igualmente». Otros resultados: Mejorar edificio → Edificio; Ampliar almacén → Recurso y capacidad añadida; Construir defensa → Tipo de defensa; Reparar defensa o edificio → cuál.",
  "BreeNuevoAnimal": "Si ya tienes el mismo animal y género, el resumen dice «Se sumarán 6 a tus 24 vacas» y pide qué valor por cabeza queda (mantener, sustituir o media ponderada). «+ Nuevo tipo de animal “cabr”» abre el alta rápida con Grupo.",
  "BreeNuevaCaravana": "Traslado (con 2 o más asentamientos; propuesta aceptada por el usuario el 2026-09-17): destino, días de viaje entre ambos, carga y salida; los recursos salen al salir y entran al llegar, sin dinero. Venta: la carga no puede superar las existencias. Con el mercado local (0 días) se cobra o se paga y los recursos se mueven al momento.",
  "BreeNuevoMercado": "Tras crear, «Nueva caravana» muestra «Cavada Grande · 5 días de viaje» («Mercado nuevo · edítalo en Comercio»), Recurso «Víveres · 0,28 mo el saco», «Vuelve el 22 de abril», «Se paga al salir −28 mo», «La caja queda en 312,6 mo» y «Días con falta de víveres hasta el 25: de 3 a 0 días»; A10 gana la columna «Cavada Grande», con víveres a 0,28 mo y «5 días». El selector de recurso de «Añadir precio» no ofrece «Nuevo recurso». Errores: «fornost» → «Ya existe «Fornost» · 4 días desde Bree.» y el botón pasa a «Elegir «Fornost»»; 0 días → «0 días es el mercado local de Bree, que ya existe»; precio vacío → «Anota el precio de los víveres en Cavada Grande para calcular la caravana». Cancelar con cambios: el pie pasa a «Hay cambios sin guardar» con «Seguir editando» y «Descartar».",
};

const COL = 1300;
const FILA = 1320;
const canvas = { pages: PAGINAS.map(([id, name]) => ({ id, name })), artboards: [], annotations: [], launch: { view: 'canvas', page: 'page-1' } };
const archivos = [];
for (const [pagina, , vistas] of PAGINAS) {
  vistas.forEach(([stem, titulo, render], i) => {
    const file = `${stem}.dc.html`;
    const x = (i % 4) * COL;
    const y = Math.floor(i / 4) * FILA;
    writeFileSync(join(OUT, file), render());
    archivos.push(file);
    canvas.artboards.push({ file, title: titulo, x, y, w: 1180, h: 820, page: pagina });
    if (ANOTACIONES[stem]) canvas.annotations.push({ id: `nota-${stem}`, x, y: y + 860, w: 1180, text: ANOTACIONES[stem], page: pagina });
  });
  canvas.annotations.push({ id: `nota-${pagina}`, x: 0, y: -220, w: 620, text: NOTAS[pagina], page: pagina });
}
writeFileSync(join(OUT, 'canvas.json'), JSON.stringify(canvas, null, 2));
console.log(archivos.map((f) => `--artboard "${join(OUT, f)}"`).join(' '));
