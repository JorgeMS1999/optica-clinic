const METODO_LABEL = {
  efectivo:      'Efectivo',
  tarjeta:       'Tarjeta de crédito/débito',
  transferencia: 'Transferencia bancaria',
  seguro:        'Seguro médico',
}

/**
 * Abre una ventana de impresión con el comprobante de pago.
 *
 * @param {object} opts
 * @param {object} opts.pago        - Objeto pago devuelto por el backend (id, creado_en, etc.)
 * @param {object} opts.cita        - Datos de la cita (paciente_nombre, carnet, doctor_nombre, tipo, hora)
 * @param {Array}  opts.lineas      - Servicios cobrados [{nombre, cantidad, precio_unitario, descuento_item}]
 * @param {number} opts.subtotal
 * @param {number} opts.descuento_pct
 * @param {number} opts.descuento_monto
 * @param {number} opts.total
 * @param {string} opts.metodo_pago
 * @param {string} opts.referencia
 * @param {string} opts.notas
 * @param {string} opts.cajeroNombre
 * @param {object} opts.clinica     - { nombre, direccion, telefono }
 */
export function imprimirComprobante({
  pago,
  cita,
  lineas,
  subtotal,
  descuento_pct,
  descuento_monto,
  total,
  metodo_pago,
  referencia,
  notas,
  cajeroNombre,
  clinica,
}) {
  const fecha = new Date(pago.creado_en || Date.now())
  const fechaStr = fecha.toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const horaStr  = fecha.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
  const nroComp  = String(pago.id).padStart(6, '0')

  const tipoLabel = { consulta: 'Consulta', procedimiento: 'Procedimiento', cirugia: 'Cirugía' }

  const filasServicios = lineas.map(l => {
    const sub = (l.precio_unitario * l.cantidad) - (l.descuento_item || 0)
    return `
      <tr>
        <td>${l.nombre}</td>
        <td class="center">${l.cantidad}</td>
        <td class="right">Bs. ${parseFloat(l.precio_unitario).toFixed(2)}</td>
        ${l.descuento_item > 0
          ? `<td class="right text-red">-Bs. ${parseFloat(l.descuento_item).toFixed(2)}</td>`
          : `<td class="right gray">—</td>`}
        <td class="right bold">Bs. ${sub.toFixed(2)}</td>
      </tr>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Comprobante #${nroComp}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 13px;
      color: #1a1a2e;
      background: #fff;
      padding: 32px;
      max-width: 720px;
      margin: 0 auto;
    }

    /* ── CABECERA ── */
    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      border-bottom: 2px solid #1e3a8a;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .logo-area { display: flex; align-items: center; gap: 12px; }
    .logo-circle {
      width: 44px; height: 44px;
      background: #1e3a8a;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-size: 22px;
    }
    .clinica-nombre { font-size: 18px; font-weight: 700; color: #1e3a8a; }
    .clinica-sub    { font-size: 11px; color: #64748b; margin-top: 2px; }

    .comp-info { text-align: right; }
    .comp-numero { font-size: 22px; font-weight: 800; color: #1e3a8a; }
    .comp-label  { font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: #94a3b8; }
    .comp-fecha  { font-size: 12px; color: #475569; margin-top: 4px; }

    /* ── SECCIÓN ── */
    .section {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px 16px;
      margin-bottom: 14px;
    }
    .section-title {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .06em;
      color: #94a3b8;
      margin-bottom: 8px;
    }
    .field-row { display: flex; gap: 8px; align-items: baseline; margin-bottom: 4px; }
    .field-label { font-size: 11px; color: #64748b; min-width: 70px; }
    .field-value { font-size: 13px; font-weight: 600; color: #1e293b; }
    .badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
      background: #dbeafe;
      color: #1d4ed8;
    }

    /* ── TABLA SERVICIOS ── */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
    }
    thead tr { background: #1e3a8a; color: #fff; }
    thead th {
      padding: 8px 10px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: .04em;
      font-weight: 600;
    }
    tbody tr:nth-child(even) { background: #f1f5f9; }
    tbody td { padding: 8px 10px; font-size: 13px; }
    .center { text-align: center; }
    .right  { text-align: right; }
    .bold   { font-weight: 700; }
    .gray   { color: #94a3b8; }
    .text-red { color: #dc2626; }

    /* ── TOTALES ── */
    .totales {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 14px;
    }
    .tot-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 16px;
      font-size: 13px;
      border-bottom: 1px solid #f1f5f9;
    }
    .tot-row:last-child { border-bottom: none; }
    .tot-row.total-final {
      background: #1e3a8a;
      color: #fff;
      font-size: 16px;
      font-weight: 800;
      padding: 12px 16px;
    }
    .tot-label { color: #64748b; }
    .tot-row.total-final .tot-label { color: #bfdbfe; }
    .descuento-row .tot-val { color: #dc2626; }

    /* ── MÉTODO DE PAGO ── */
    .metodo-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 10px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 14px;
    }
    .metodo-icon { font-size: 20px; }
    .metodo-label { font-size: 13px; font-weight: 700; color: #15803d; }
    .metodo-ref   { font-size: 11px; color: #4ade80; }

    /* ── NOTAS ── */
    .notas-box {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 12px;
      color: #92400e;
      margin-bottom: 14px;
    }

    /* ── FOOTER ── */
    .footer {
      text-align: center;
      border-top: 1px dashed #cbd5e1;
      padding-top: 14px;
      color: #94a3b8;
      font-size: 11px;
      line-height: 1.6;
    }
    .footer strong { color: #475569; }

    /* ── PRINT ── */
    @media print {
      body { padding: 16px; }
      @page { margin: 8mm; size: A4; }
    }
  </style>
</head>
<body>

  <!-- CABECERA -->
  <div class="header">
    <div class="logo-area">
      <div class="logo-circle">👁</div>
      <div>
        <div class="clinica-nombre">${clinica?.nombre || 'Óptica Clínica'}</div>
        <div class="clinica-sub">${clinica?.direccion || ''}</div>
        ${clinica?.telefono ? `<div class="clinica-sub">Tel: ${clinica.telefono}</div>` : ''}
      </div>
    </div>
    <div class="comp-info">
      <div class="comp-label">Comprobante de pago</div>
      <div class="comp-numero">#${nroComp}</div>
      <div class="comp-fecha">${fechaStr} &nbsp;·&nbsp; ${horaStr}</div>
    </div>
  </div>

  <!-- PACIENTE Y ATENCIÓN -->
  <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:14px;">
    <div class="section">
      <div class="section-title">Paciente</div>
      <div class="field-row">
        <span class="field-value" style="font-size:15px;">${cita.paciente_nombre}</span>
      </div>
      <div class="field-row">
        <span class="field-label">CI / Carnet:</span>
        <span class="field-value">${cita.carnet}</span>
      </div>
    </div>
    <div class="section">
      <div class="section-title">Atención médica</div>
      <div class="field-row">
        <span class="field-label">Doctor:</span>
        <span class="field-value">${cita.doctor_nombre}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Tipo:</span>
        <span class="badge">${tipoLabel[cita.tipo] || cita.tipo}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Hora cita:</span>
        <span class="field-value">${cita.hora?.slice(0, 5) || '—'}</span>
      </div>
    </div>
  </div>

  <!-- SERVICIOS -->
  <table>
    <thead>
      <tr>
        <th style="text-align:left;">Servicio</th>
        <th class="center">Cant.</th>
        <th class="right">Precio unit.</th>
        <th class="right">Descuento</th>
        <th class="right">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${filasServicios}
    </tbody>
  </table>

  <!-- TOTALES -->
  <div class="totales">
    <div class="tot-row">
      <span class="tot-label">Subtotal</span>
      <span>Bs. ${subtotal.toFixed(2)}</span>
    </div>
    ${descuento_monto > 0 ? `
    <div class="tot-row descuento-row">
      <span class="tot-label">Descuento (${descuento_pct}%)</span>
      <span class="tot-val">− Bs. ${descuento_monto.toFixed(2)}</span>
    </div>` : ''}
    <div class="tot-row total-final">
      <span class="tot-label">TOTAL PAGADO</span>
      <span>Bs. ${total.toFixed(2)}</span>
    </div>
  </div>

  <!-- MÉTODO DE PAGO -->
  <div class="metodo-box">
    <span class="metodo-icon">${
      { efectivo: '💵', tarjeta: '💳', transferencia: '🏦', seguro: '🛡️' }[metodo_pago] || '💰'
    }</span>
    <div>
      <div class="metodo-label">${METODO_LABEL[metodo_pago] || metodo_pago}</div>
      ${referencia ? `<div class="metodo-ref">Ref: ${referencia}</div>` : ''}
    </div>
  </div>

  ${notas ? `<div class="notas-box"><strong>Nota:</strong> ${notas}</div>` : ''}

  <!-- FOOTER -->
  <div class="footer">
    <strong>¡Gracias por su visita!</strong><br/>
    Atendido por: ${cajeroNombre || 'Cajero'} &nbsp;·&nbsp; ${clinica?.nombre || 'Óptica Clínica'}<br/>
    <span style="font-size:10px; color:#cbd5e1;">Este comprobante es válido como constancia de pago</span>
  </div>

  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>`

  const ventana = window.open('', '_blank', 'width=800,height=900')
  if (!ventana) {
    alert('Activa las ventanas emergentes para imprimir el comprobante.')
    return
  }
  ventana.document.write(html)
  ventana.document.close()
}
