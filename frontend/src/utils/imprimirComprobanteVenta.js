const METODO_LABEL = {
  efectivo:      'Efectivo',
  tarjeta:       'Tarjeta de crédito/débito',
  transferencia: 'Transferencia bancaria',
  qr:            'Pago QR',
}

/**
 * Abre una ventana de impresión con el comprobante de venta de farmacia.
 *
 * @param {object} opts
 * @param {object} opts.venta         - Objeto venta devuelto por el backend (id, creado_en, total…)
 * @param {Array}  opts.items         - [{nombre, cantidad, precio_unitario}]
 * @param {number} opts.subtotal
 * @param {number} opts.descuento_pct
 * @param {number} opts.descuento_monto
 * @param {number} opts.total
 * @param {string} opts.metodo_pago
 * @param {string} opts.referencia
 * @param {string} opts.clienteNombre
 * @param {string} opts.vendedorNombre
 * @param {object} opts.farmacia      - { nombre, direccion, telefono }
 */
export function imprimirComprobanteVenta({
  venta,
  items,
  subtotal,
  descuento_pct,
  descuento_monto,
  total,
  metodo_pago,
  referencia,
  clienteNombre,
  vendedorNombre,
  farmacia,
}) {
  const fecha   = new Date(venta.creado_en || Date.now())
  const fechaStr = fecha.toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const horaStr  = fecha.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
  const nroComp  = String(venta.id).padStart(6, '0')

  const filasProductos = items.map(i => {
    const sub = i.cantidad * parseFloat(i.precio_unitario || 0)
    return `
      <tr>
        <td>${i.nombre}</td>
        <td class="center">${i.cantidad}</td>
        <td class="right">Bs. ${parseFloat(i.precio_unitario).toFixed(2)}</td>
        <td class="right bold">Bs. ${sub.toFixed(2)}</td>
      </tr>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Comprobante Venta #${nroComp}</title>
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

    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      border-bottom: 2px solid #be123c;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .logo-area { display: flex; align-items: center; gap: 12px; }
    .logo-circle {
      width: 44px; height: 44px;
      background: #be123c;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-size: 22px;
    }
    .farmacia-nombre { font-size: 18px; font-weight: 700; color: #be123c; }
    .farmacia-sub    { font-size: 11px; color: #64748b; margin-top: 2px; }

    .comp-info { text-align: right; }
    .comp-numero { font-size: 22px; font-weight: 800; color: #be123c; }
    .comp-label  { font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: #94a3b8; }
    .comp-fecha  { font-size: 12px; color: #475569; margin-top: 4px; }

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

    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
    thead tr { background: #be123c; color: #fff; }
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
      background: #be123c;
      color: #fff;
      font-size: 16px;
      font-weight: 800;
      padding: 12px 16px;
    }
    .tot-label { color: #64748b; }
    .tot-row.total-final .tot-label { color: #fecdd3; }
    .descuento-row .tot-val { color: #dc2626; }

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
    .metodo-icon  { font-size: 20px; }
    .metodo-label { font-size: 13px; font-weight: 700; color: #15803d; }
    .metodo-ref   { font-size: 11px; color: #4ade80; }

    .footer {
      text-align: center;
      border-top: 1px dashed #cbd5e1;
      padding-top: 14px;
      color: #94a3b8;
      font-size: 11px;
      line-height: 1.6;
    }
    .footer strong { color: #475569; }

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
      <div class="logo-circle">💊</div>
      <div>
        <div class="farmacia-nombre">${farmacia?.nombre || 'Farmacia'}</div>
        <div class="farmacia-sub">${farmacia?.direccion || ''}</div>
        ${farmacia?.telefono ? `<div class="farmacia-sub">Tel: ${farmacia.telefono}</div>` : ''}
      </div>
    </div>
    <div class="comp-info">
      <div class="comp-label">Comprobante de venta</div>
      <div class="comp-numero">#${nroComp}</div>
      <div class="comp-fecha">${fechaStr} &nbsp;·&nbsp; ${horaStr}</div>
    </div>
  </div>

  <!-- CLIENTE -->
  ${clienteNombre ? `
  <div class="section" style="margin-bottom:14px;">
    <div class="section-title">Cliente</div>
    <div class="field-value" style="font-size:15px;">${clienteNombre}</div>
  </div>` : ''}

  <!-- PRODUCTOS -->
  <table>
    <thead>
      <tr>
        <th style="text-align:left;">Producto</th>
        <th class="center">Cant.</th>
        <th class="right">Precio unit.</th>
        <th class="right">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${filasProductos}
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
      { efectivo: '💵', tarjeta: '💳', transferencia: '🏦', qr: '📱' }[metodo_pago] || '💰'
    }</span>
    <div>
      <div class="metodo-label">${METODO_LABEL[metodo_pago] || metodo_pago}</div>
      ${referencia ? `<div class="metodo-ref">Ref: ${referencia}</div>` : ''}
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <strong>¡Gracias por su compra!</strong><br/>
    Atendido por: ${vendedorNombre || 'Vendedor'} &nbsp;·&nbsp; ${farmacia?.nombre || 'Farmacia'}<br/>
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
