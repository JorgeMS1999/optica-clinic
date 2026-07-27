/**
 * Imprime SOLO los datos del paciente, posicionados para caer sobre el formulario
 * pre-impreso de historia clínica de "Clínica Luz de tu Visión" (tamaño Carta).
 *
 * Coordenadas estimadas desde la foto del formulario. Se ajustan acá abajo:
 *  - GLOBAL.offsetX / offsetY  → mueven TODO (en mm) si la impresora corre el papel.
 *  - CAMPOS[campo] = { x, y, size } → posición individual de cada dato (mm).
 *  - MARCAS = posición de las casillas SÍ/NO (se dibuja una X encima).
 *
 * Modo guías (opts.guias = true): imprime además la cuadrícula y el nombre de cada
 * campo, para verificar la ubicación sin tener el formulario delante.
 */

const PAGE = { w: 216, h: 279 } // Carta, mm

const GLOBAL = { offsetX: 0, offsetY: 0 } // nudge global en mm

// Posición (mm) donde arranca cada dato. size = alto de letra en mm.
// Filas del formulario (calibrado con impresión real): ~52, 60, 68, 76, 84.
const CAMPOS = {
  nro_historia: { x: 168, y: 26,  size: 5 },
  fecha:        { x: 165, y: 52,  size: 3.2 }, // misma fila que Nombre (arriba a la derecha)
  nombre:       { x: 30,  y: 52,  size: 3.6 },
  sexo:         { x: 26,  y: 60,  size: 3.2 },
  edad:         { x: 48,  y: 60,  size: 3.2 },
  fecha_nac:    { x: 82,  y: 60,  size: 3.2 },
  estado_civil: { x: 163, y: 60,  size: 3.2 },
  ocupacion:    { x: 24,  y: 68,  size: 3.2 },
  telefono:     { x: 77,  y: 68,  size: 3.2 },
  carnet:       { x: 150, y: 68,  size: 3.2 },
  direccion:    { x: 34,  y: 76,  size: 3.2 },
}

// Casillas SÍ / NO (centro de cada casilla, mm). Se marca una X.
const MARCAS = {
  alergias: { si: { x: 35, y: 84 }, no: { x: 44, y: 84 } },
  dbt:      { si: { x: 80, y: 84 }, no: { x: 89, y: 84 } },
  hta:      { si: { x: 133, y: 84 }, no: { x: 142, y: 84 } },
  rmto:     { si: { x: 182, y: 84 }, no: { x: 191, y: 84 } },
}

function fmtFecha(d) {
  if (!d) return ''
  const f = new Date(d)
  if (isNaN(f)) return ''
  return `${String(f.getDate()).padStart(2,'0')}/${String(f.getMonth()+1).padStart(2,'0')}/${f.getFullYear()}`
}

export function imprimirHistoriaClinica(datos = {}, opts = {}) {
  const { offsetX, offsetY } = GLOBAL
  const guias = !!opts.guias

  const edad = datos.fecha_nacimiento
    ? Math.floor((new Date() - new Date(datos.fecha_nacimiento)) / (365.25 * 24 * 60 * 60 * 1000))
    : ''

  const valores = {
    nro_historia: datos.nro_historia != null ? String(datos.nro_historia) : '',
    fecha:        fmtFecha(new Date()),
    nombre:       datos.nombre || '',
    sexo:         datos.sexo === 'M' ? 'Masculino' : datos.sexo === 'F' ? 'Femenino' : '',
    edad:         edad !== '' ? String(edad) : '',
    fecha_nac:    fmtFecha(datos.fecha_nacimiento),
    estado_civil: datos.estado_civil || '',
    ocupacion:    datos.ocupacion || '',
    telefono:     datos.telefono || '',
    carnet:       datos.carnet || '',
    direccion:    datos.direccion || '',
  }

  // Textos de los datos
  let textos = Object.entries(CAMPOS).map(([k, c]) => {
    const v = valores[k]
    if (!v) return ''
    const left = c.x + offsetX
    const top  = c.y + offsetY
    return `<div class="dato" style="left:${left}mm; top:${top}mm; font-size:${c.size}mm;">${v}</div>`
  }).join('')

  // Marcas X en SÍ/NO
  const antecedentes = { alergias: datos.tiene_alergias, dbt: datos.dbt, hta: datos.hta, rmto: datos.rmto }
  let marcas = Object.entries(MARCAS).map(([k, m]) => {
    const val = antecedentes[k]
    if (val !== true && val !== false) return ''
    const pos = val ? m.si : m.no
    return `<div class="marca" style="left:${pos.x + offsetX}mm; top:${pos.y + offsetY}mm;">✕</div>`
  }).join('')

  // Guías opcionales (cuadrícula + nombres de campo)
  let guiaHtml = ''
  if (guias) {
    let grid = ''
    for (let x = 0; x <= PAGE.w; x += 10)
      grid += `<line x1="${x}" y1="0" x2="${x}" y2="${PAGE.h}" stroke="#e5e7eb" stroke-width="0.15"/><text x="${x+0.4}" y="4" font-size="2.6" fill="#93c5fd">${x/10}</text>`
    for (let y = 0; y <= PAGE.h; y += 10)
      grid += `<line x1="0" y1="${y}" x2="${PAGE.w}" y2="${y}" stroke="#e5e7eb" stroke-width="0.15"/><text x="0.6" y="${y+3}" font-size="2.6" fill="#93c5fd">${y/10}</text>`
    const etiquetas = [...Object.entries(CAMPOS).map(([k, c]) =>
        `<div class="guia" style="left:${c.x+offsetX}mm; top:${(c.y+offsetY-3.5)}mm;">${k}</div>`),
      ...Object.entries(MARCAS).flatMap(([k, m]) => [
        `<div class="guia" style="left:${m.si.x+offsetX-1}mm; top:${m.si.y+offsetY-4}mm;">${k}·SÍ</div>`,
      ])].join('')
    guiaHtml = `<svg class="grid" width="${PAGE.w}mm" height="${PAGE.h}mm" viewBox="0 0 ${PAGE.w} ${PAGE.h}" font-family="Arial" font-weight="bold">${grid}</svg>${etiquetas}`
  }

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Historia Clínica ${valores.nombre}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { background: #fff; }
    .hoja { position: relative; width: ${PAGE.w}mm; height: ${PAGE.h}mm; overflow: hidden; }
    .dato  { position: absolute; font-family: Arial, sans-serif; color: #000; white-space: nowrap; line-height: 1; }
    .marca { position: absolute; font-family: Arial, sans-serif; color: #000; font-size: 3.6mm; font-weight: 700; transform: translate(-50%, -60%); }
    .grid  { position: absolute; top: 0; left: 0; }
    .guia  { position: absolute; font-family: Arial, sans-serif; font-size: 2.2mm; color: #ef4444; white-space: nowrap; }
    .aviso { font-family: Arial, sans-serif; font-size: 13px; color: #92400e; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 10px 14px; margin: 10px; }
    @media print {
      .aviso { display: none; }
      @page { size: 216mm 279mm; margin: 0; }
    }
  </style>
</head>
<body>
  <div class="aviso">
    <strong>Importante:</strong> imprimí en <strong>tamaño real (100%)</strong>, sin "ajustar a la página",
    con la hoja de historia clínica pre-impresa cargada en la impresora.
    ${guias ? ' (modo GUÍAS: muestra la cuadrícula y los nombres de campo para verificar)' : ''}
  </div>
  <div class="hoja">
    ${guiaHtml}
    ${textos}
    ${marcas}
  </div>
  <script>window.onload = function(){ window.print(); }</script>
</body>
</html>`

  const ventana = window.open('', '_blank', 'width=820,height=1000')
  if (!ventana) {
    alert('Activa las ventanas emergentes para imprimir.')
    return
  }
  ventana.document.write(html)
  ventana.document.close()
}
