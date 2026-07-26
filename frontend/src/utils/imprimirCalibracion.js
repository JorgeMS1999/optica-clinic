/**
 * Genera una hoja de calibración tamaño Carta (216 × 279 mm) con una cuadrícula
 * en centímetros y números en los 4 bordes.
 *
 * Uso: imprimirla en TAMAÑO REAL (100%, sin "ajustar a la página"), superponerla
 * con el formulario de historia clínica pre-impreso y anotar en qué coordenada
 * (X = horizontal, Y = vertical, en cm) cae cada campo. Con esos números se arma
 * el molde de impresión exacto.
 */
export function imprimirCalibracionHC() {
  const W = 216, H = 279  // Carta, en mm

  let grid = ''
  // Líneas verticales cada 5 mm (mayores cada 10 mm)
  for (let x = 0; x <= W; x += 5) {
    const major = x % 10 === 0
    grid += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="${major ? '#60a5fa' : '#e2e8f0'}" stroke-width="${major ? 0.25 : 0.12}"/>`
  }
  // Líneas horizontales cada 5 mm (mayores cada 10 mm)
  for (let y = 0; y <= H; y += 5) {
    const major = y % 10 === 0
    grid += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${major ? '#60a5fa' : '#e2e8f0'}" stroke-width="${major ? 0.25 : 0.12}"/>`
  }

  let labels = ''
  // Números X (cm) arriba y abajo
  for (let x = 0; x <= W; x += 10) {
    const cm = x / 10
    labels += `<text x="${x + 0.6}" y="4"        font-size="3" fill="#1d4ed8">${cm}</text>`
    labels += `<text x="${x + 0.6}" y="${H - 1.5}" font-size="3" fill="#1d4ed8">${cm}</text>`
  }
  // Números Y (cm) izquierda y derecha
  for (let y = 0; y <= H; y += 10) {
    const cm = y / 10
    labels += `<text x="0.8"        y="${y + 3}" font-size="3" fill="#1d4ed8">${cm}</text>`
    labels += `<text x="${W - 4.5}" y="${y + 3}" font-size="3" fill="#1d4ed8">${cm}</text>`
  }

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Calibración Historia Clínica — Carta</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { background: #fff; }
    .aviso {
      font-family: Arial, sans-serif; font-size: 13px; color: #92400e;
      background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px;
      padding: 10px 14px; margin: 10px;
    }
    svg { display: block; }
    @media print {
      .aviso { display: none; }
      @page { size: 216mm 279mm; margin: 0; }
      html, body { width: 216mm; height: 279mm; }
    }
  </style>
</head>
<body>
  <div class="aviso">
    <strong>Importante:</strong> imprimí en <strong>tamaño real (100%)</strong>, sin
    "ajustar a la página". Números en <strong>centímetros</strong>. X = horizontal,
    Y = vertical.
  </div>

  <svg width="216mm" height="279mm" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"
       font-family="Arial, sans-serif" font-weight="bold">
    ${grid}
    ${labels}
  </svg>

  <script>
    window.onload = function () { window.print(); }
  </script>
</body>
</html>`

  const ventana = window.open('', '_blank', 'width=820,height=1000')
  if (!ventana) {
    alert('Activa las ventanas emergentes para imprimir la hoja de calibración.')
    return
  }
  ventana.document.write(html)
  ventana.document.close()
}
