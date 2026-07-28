const METODO_LABEL = {
  efectivo:      'Efectivo',
  qr:            'Pago QR',
  transferencia: 'Transferencia',
  seguro:        'Seguro',
  tarjeta:       'Tarjeta',
}

/**
 * Comprobante de cobro de una cita (clínica), en formato ticket angosto (80mm),
 * igual que el de farmacia.
 *
 * @param {object} opts
 * @param {object} opts.clinica       - { nombre, direccion, telefono }
 * @param {object} opts.pago          - { id, creado_en, total... }
 * @param {object} opts.paciente      - { nombre, carnet, nro_historia }
 * @param {string} opts.doctorNombre
 * @param {string} opts.fecha         - fecha de la cita (YYYY-MM-DD)
 * @param {string} opts.hora
 * @param {Array}  opts.servicios     - [{ nombre, precio }]
 * @param {number} opts.subtotal
 * @param {number} opts.descuento_monto
 * @param {number} opts.total
 * @param {string} opts.metodo_pago
 * @param {string} opts.referencia
 * @param {string} opts.cajeroNombre
 */
export function imprimirTicketCita({
  clinica,
  pago,
  paciente,
  doctorNombre,
  fecha,
  hora,
  servicios,
  subtotal,
  descuento_monto,
  total,
  metodo_pago,
  referencia,
  cajeroNombre,
}) {
  const emitido  = new Date(pago?.creado_en || Date.now())
  const fechaStr = emitido.toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const horaStr  = emitido.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
  const nroComp  = String(pago?.id ?? 0).padStart(6, '0')

  const filas = servicios.map(s => {
    const precio = parseFloat(s.precio ?? s.precio_cobrado ?? 0)
    return `
      <div class="item">
        <div class="item-nombre">${s.nombre ?? s._nombre ?? 'Servicio'}</div>
        <div class="item-detalle"><span></span><span class="bold">Bs. ${precio.toFixed(2)}</span></div>
      </div>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Comprobante #${nroComp}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { background: #fff; }
    body {
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 12px; line-height: 1.45; color: #000;
      width: 80mm; margin: 0 auto; padding: 4mm 5mm;
    }
    .center { text-align: center; }
    .bold   { font-weight: 700; }
    .nombre { font-size: 15px; font-weight: 700; }
    .sub    { font-size: 11px; color: #444; }
    .sep    { border: none; border-top: 1px dashed #000; margin: 6px 0; }
    .meta   { font-size: 11px; }
    .meta-row { display: flex; justify-content: space-between; }
    .item { margin-bottom: 5px; }
    .item-nombre { font-weight: 700; }
    .item-detalle { display: flex; justify-content: space-between; }
    .tot-row { display: flex; justify-content: space-between; font-size: 12px; }
    .tot-total { font-size: 15px; font-weight: 700; margin-top: 3px; padding-top: 4px; border-top: 1px solid #000; }
    .metodo { font-size: 12px; margin-top: 4px; }
    .footer { text-align: center; font-size: 10.5px; color: #222; margin-top: 6px; line-height: 1.5; }
    @media print { @page { size: 80mm auto; margin: 0; } body { width: 80mm; padding: 3mm 5mm; } }
  </style>
</head>
<body>
  <div class="center">
    <div class="nombre">${clinica?.nombre || 'Clínica'}</div>
    ${clinica?.direccion ? `<div class="sub">${clinica.direccion}</div>` : ''}
    ${clinica?.telefono  ? `<div class="sub">Tel: ${clinica.telefono}</div>` : ''}
  </div>

  <hr class="sep" />

  <div class="meta">
    <div class="meta-row"><span>Comprobante</span><span class="bold">#${nroComp}</span></div>
    <div class="meta-row"><span>Fecha</span><span>${fechaStr} ${horaStr}</span></div>
    ${paciente?.nro_historia != null ? `<div class="meta-row"><span>Historia Cl.</span><span class="bold">N° ${paciente.nro_historia}</span></div>` : ''}
    ${paciente?.nombre ? `<div class="meta-row"><span>Paciente</span><span>${paciente.nombre}</span></div>` : ''}
    ${paciente?.carnet ? `<div class="meta-row"><span>CI</span><span>${paciente.carnet}</span></div>` : ''}
    ${doctorNombre ? `<div class="meta-row"><span>Doctor</span><span>${doctorNombre}</span></div>` : ''}
    ${fecha ? `<div class="meta-row"><span>Cita</span><span>${fecha}${hora ? ' ' + String(hora).slice(0,5) : ''}</span></div>` : ''}
  </div>

  <hr class="sep" />

  ${filas}

  <hr class="sep" />

  <div class="tot-row"><span>Subtotal</span><span>Bs. ${subtotal.toFixed(2)}</span></div>
  ${descuento_monto > 0
    ? `<div class="tot-row"><span>Descuento</span><span>- Bs. ${descuento_monto.toFixed(2)}</span></div>`
    : ''}
  <div class="tot-row tot-total"><span>TOTAL</span><span>Bs. ${total.toFixed(2)}</span></div>

  ${metodo_pago ? `<div class="metodo">
    Pago: <span class="bold">${METODO_LABEL[metodo_pago] || metodo_pago}</span>${referencia ? ` · Ref: ${referencia}` : ''}
  </div>` : ''}

  <hr class="sep" />

  <div class="footer">
    ${cajeroNombre ? `Atendido por: ${cajeroNombre}<br/>` : ''}
    ¡Gracias por su visita!<br/>
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

  const ventana = window.open('', '_blank', 'width=820,height=900')
  if (!ventana) {
    alert('Activa las ventanas emergentes para imprimir el comprobante.')
    return
  }
  ventana.document.write(html)
  ventana.document.close()
}
