/**
 * Genera y descarga un archivo Excel (.xls) a partir de encabezados y filas.
 * No necesita ninguna librería: crea un HTML con una <table> que Excel abre
 * respetando columnas. Compatible con Excel de escritorio y móvil.
 *
 * @param {string}   nombreArchivo  nombre sin extensión (se agrega .xls)
 * @param {string[]} encabezados    títulos de columna
 * @param {Array[]}  filas          arreglo de arreglos (una fila = una celda por columna)
 */
export function exportarExcel(nombreArchivo, encabezados, filas) {
  const esc = v => String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const thead = `<tr>${encabezados
    .map(h => `<th style="background:#1e3a8a;color:#fff;padding:6px 10px;border:1px solid #cbd5e1;text-align:left">${esc(h)}</th>`)
    .join('')}</tr>`

  const tbody = filas
    .map(f => `<tr>${f
      .map(c => `<td style="border:1px solid #e2e8f0;padding:4px 10px">${esc(c)}</td>`)
      .join('')}</tr>`)
    .join('')

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8"></head>
<body><table>${thead}${tbody}</table></body></html>`

  const blob = new Blob(['﻿', html], { type: 'application/vnd.ms-excel' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${nombreArchivo}.xls`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
