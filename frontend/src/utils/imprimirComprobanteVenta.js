const METODO_LABEL = {
  efectivo:      'Efectivo',
  tarjeta:       'Tarjeta',
  transferencia: 'Transferencia',
  qr:            'Pago QR',
}

/**
 * Abre una ventana de impresión con el comprobante de venta de farmacia,
 * en formato ticket angosto (rollo 80mm), como las facturas pequeñas.
 *
 * @param {object} opts
 * @param {object} opts.venta         - { id, creado_en, total… }
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
  const fecha    = new Date(venta.creado_en || Date.now())
  const fechaStr = fecha.toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const horaStr  = fecha.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
  const nroComp  = String(venta.id).padStart(6, '0')

  const filasProductos = items.map(i => {
    const precio = parseFloat(i.precio_unitario || 0)
    const sub    = i.cantidad * precio
    return `
      <div class="item">
        <div class="item-nombre">${i.nombre}</div>
        <div class="item-detalle">
          <span>${i.cantidad} x ${precio.toFixed(2)}</span>
          <span class="bold">Bs. ${sub.toFixed(2)}</span>
        </div>
      </div>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Ticket #${nroComp}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    html, body { background: #fff; }

    body {
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.45;
      color: #000;
      width: 80mm;
      margin: 0 auto;
      padding: 4mm 5mm;
    }

    .center { text-align: center; }
    .right  { text-align: right; }
    .bold   { font-weight: 700; }

    .nombre    { font-size: 15px; font-weight: 700; }
    .sub       { font-size: 11px; }
    .muted     { color: #444; }

    .sep {
      border: none;
      border-top: 1px dashed #000;
      margin: 6px 0;
    }

    .meta { font-size: 11px; }
    .meta-row { display: flex; justify-content: space-between; }

    .item { margin-bottom: 5px; }
    .item-nombre { font-weight: 700; }
    .item-detalle { display: flex; justify-content: space-between; }

    .tot-row {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
    }
    .tot-total {
      font-size: 15px;
      font-weight: 700;
      margin-top: 3px;
      padding-top: 4px;
      border-top: 1px solid #000;
    }

    .metodo { font-size: 12px; margin-top: 4px; }

    .footer {
      text-align: center;
      font-size: 10.5px;
      color: #222;
      margin-top: 6px;
      line-height: 1.5;
    }

    @media print {
      @page { size: 80mm auto; margin: 0; }
      body  { width: 80mm; padding: 3mm 5mm; }
    }
  </style>
</head>
<body>

  <!-- CABECERA -->
  <div class="center">
    <div class="nombre">${farmacia?.nombre || 'Farmacia'}</div>
    ${farmacia?.direccion ? `<div class="sub muted">${farmacia.direccion}</div>` : ''}
    ${farmacia?.telefono  ? `<div class="sub muted">Tel: ${farmacia.telefono}</div>` : ''}
  </div>

  <hr class="sep" />

  <!-- DATOS DEL COMPROBANTE -->
  <div class="meta">
    <div class="meta-row"><span>Comprobante</span><span class="bold">#${nroComp}</span></div>
    <div class="meta-row"><span>Fecha</span><span>${fechaStr} ${horaStr}</span></div>
    ${clienteNombre ? `<div class="meta-row"><span>Cliente</span><span>${clienteNombre}</span></div>` : ''}
    ${vendedorNombre ? `<div class="meta-row"><span>Atendió</span><span>${vendedorNombre}</span></div>` : ''}
  </div>

  <hr class="sep" />

  <!-- PRODUCTOS -->
  ${filasProductos}

  <hr class="sep" />

  <!-- TOTALES -->
  <div class="tot-row"><span>Subtotal</span><span>Bs. ${subtotal.toFixed(2)}</span></div>
  ${descuento_monto > 0
    ? `<div class="tot-row"><span>Descuento (${descuento_pct}%)</span><span>- Bs. ${descuento_monto.toFixed(2)}</span></div>`
    : ''}
  <div class="tot-row tot-total"><span>TOTAL</span><span>Bs. ${total.toFixed(2)}</span></div>

  <!-- MÉTODO -->
  <div class="metodo">
    Pago: <span class="bold">${METODO_LABEL[metodo_pago] || metodo_pago}</span>${referencia ? ` · Ref: ${referencia}` : ''}
  </div>

  <hr class="sep" />

  <!-- FOOTER -->
  <div class="footer">
    ¡Gracias por su compra!<br/>
    Este comprobante es válido como constancia de pago
  </div>

  <script>
    window.onload = function () {
      window.print();
      window.onafterprint = function () { window.close(); };
    };
  </script>
</body>
</html>`

  // Ventana amplia para que el panel de impresión del navegador se vea completo.
  // El tamaño real del papel lo controla @page { size: 80mm auto }.
  const ventana = window.open('', '_blank', 'width=820,height=900')
  if (!ventana) {
    alert('Activa las ventanas emergentes para imprimir el comprobante.')
    return
  }
  ventana.document.write(html)
  ventana.document.close()
}
