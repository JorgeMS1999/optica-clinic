const METODO_LABEL = {
  efectivo:      'Efectivo',
  qr:            'Pago QR',
  transferencia: 'Transferencia',
  seguro:        'Seguro',
  tarjeta:       'Tarjeta',
}

function fmtFecha(d) {
  const f = new Date(d)
  return {
    fecha: f.toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    hora:  f.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
  }
}

/**
 * Imprime el comprobante de una cita.
 * @param datos  { clinica, pago, paciente, doctorNombre, fecha, hora, servicios, subtotal, descuento_monto, total, metodo_pago, referencia, cajeroNombre }
 * @param opts   { formato: 'ticket' (80mm, por defecto) | 'carta' (media hoja Carta) }
 */
export function imprimirTicketCita(datos = {}, opts = {}) {
  const {
    clinica, pago, paciente, doctorNombre, fecha, hora, servicios = [],
    subtotal = 0, descuento_monto = 0, total = 0, metodo_pago, referencia, cajeroNombre,
  } = datos
  const formato = opts.formato === 'carta' ? 'carta' : 'ticket'

  const emitido = new Date(pago?.creado_en || Date.now())
  const { fecha: fechaStr, hora: horaStr } = fmtFecha(emitido)
  const nroComp = String(pago?.id ?? 0).padStart(6, '0')
  const precioDe = s => parseFloat(s.precio ?? s.precio_cobrado ?? 0) || 0
  const nombreDe = s => s.nombre ?? s._nombre ?? 'Servicio'

  const html = formato === 'carta'
    ? htmlCarta()
    : htmlTicket()

  const ventana = window.open('', '_blank', 'width=860,height=1000')
  if (!ventana) { alert('Activa las ventanas emergentes para imprimir.'); return }
  ventana.document.write(html)
  ventana.document.close()

  // ───────────────── TICKET 80mm ─────────────────
  function htmlTicket() {
    const filas = servicios.map(s => `
      <div class="item">
        <div class="item-nombre">${nombreDe(s)}</div>
        <div class="item-detalle"><span></span><span class="bold">Bs. ${precioDe(s).toFixed(2)}</span></div>
      </div>`).join('')
    return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/><title>Comprobante #${nroComp}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; } html,body{background:#fff;}
  body { font-family:'Consolas','Courier New',monospace; font-size:12px; line-height:1.45; color:#000; width:80mm; margin:0 auto; padding:4mm 5mm; }
  .center{text-align:center;} .bold{font-weight:700;} .sub{font-size:11px;color:#444;}
  .nombre{font-size:15px;font-weight:700;}
  .sep{border:none;border-top:1px dashed #000;margin:6px 0;}
  .meta{font-size:11px;} .meta-row{display:flex;justify-content:space-between;}
  .item{margin-bottom:5px;} .item-nombre{font-weight:700;} .item-detalle{display:flex;justify-content:space-between;}
  .tot-row{display:flex;justify-content:space-between;font-size:12px;}
  .tot-total{font-size:15px;font-weight:700;margin-top:3px;padding-top:4px;border-top:1px solid #000;}
  .metodo{font-size:12px;margin-top:4px;}
  .footer{text-align:center;font-size:10.5px;color:#222;margin-top:6px;line-height:1.5;}
  @media print { @page { size:80mm auto; margin:0; } body{width:80mm;padding:3mm 5mm;} }
</style></head><body>
  <div class="center"><div class="nombre">${clinica?.nombre || 'Clínica'}</div>
    ${clinica?.direccion ? `<div class="sub">${clinica.direccion}</div>` : ''}
    ${clinica?.telefono ? `<div class="sub">Tel: ${clinica.telefono}</div>` : ''}</div>
  <hr class="sep"/>
  <div class="meta">
    <div class="meta-row"><span>Comprobante</span><span class="bold">#${nroComp}</span></div>
    <div class="meta-row"><span>Fecha</span><span>${fechaStr} ${horaStr}</span></div>
    ${paciente?.nro_historia != null ? `<div class="meta-row"><span>Historia Cl.</span><span class="bold">N° ${paciente.nro_historia}</span></div>` : ''}
    ${paciente?.nombre ? `<div class="meta-row"><span>Paciente</span><span>${paciente.nombre}</span></div>` : ''}
    ${paciente?.carnet ? `<div class="meta-row"><span>CI</span><span>${paciente.carnet}</span></div>` : ''}
    ${doctorNombre ? `<div class="meta-row"><span>Doctor</span><span>${doctorNombre}</span></div>` : ''}
    ${fecha ? `<div class="meta-row"><span>Cita</span><span>${fecha}${hora ? ' ' + String(hora).slice(0,5) : ''}</span></div>` : ''}
  </div>
  <hr class="sep"/>
  ${filas}
  <hr class="sep"/>
  <div class="tot-row"><span>Subtotal</span><span>Bs. ${subtotal.toFixed(2)}</span></div>
  ${descuento_monto > 0 ? `<div class="tot-row"><span>Descuento</span><span>- Bs. ${descuento_monto.toFixed(2)}</span></div>` : ''}
  <div class="tot-row tot-total"><span>TOTAL</span><span>Bs. ${total.toFixed(2)}</span></div>
  ${metodo_pago ? `<div class="metodo">Pago: <span class="bold">${METODO_LABEL[metodo_pago] || metodo_pago}</span>${referencia ? ` · Ref: ${referencia}` : ''}</div>` : ''}
  <hr class="sep"/>
  <div class="footer">${cajeroNombre ? `Atendido por: ${cajeroNombre}<br/>` : ''}¡Gracias por su visita!<br/>Válido como constancia de pago</div>
  <script>window.onload=function(){window.print();window.onafterprint=function(){window.close();}}</script>
</body></html>`
  }

  // ───────────────── MEDIA HOJA CARTA ─────────────────
  function htmlCarta() {
    const filas = servicios.map(s => `
      <tr><td>${nombreDe(s)}</td><td class="r">Bs. ${precioDe(s).toFixed(2)}</td></tr>`).join('')
    return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/><title>Comprobante #${nroComp}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; } html,body{background:#fff;}
  body { font-family:'Segoe UI',Arial,sans-serif; color:#111; }
  .media { width:100%; padding:10mm 12mm 6mm; }
  .cut { border-top:1px dashed #999; text-align:center; color:#999; font-size:10px; padding-top:2px; margin-top:8mm; }
  .head { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #1d6a35; padding-bottom:6px; }
  .cname { font-size:21px; font-weight:800; color:#1d6a35; }
  .csub  { font-size:13px; color:#555; margin-top:2px; }
  .rright { text-align:right; }
  .rlabel { font-size:12px; letter-spacing:.08em; color:#888; }
  .rnum   { font-size:22px; font-weight:800; color:#1d6a35; }
  .rfecha { font-size:14px; color:#555; }
  .rinfo { display:flex; flex-wrap:wrap; gap:6px 22px; font-size:14.5px; margin:10px 0; }
  .rinfo b { color:#333; }
  table { width:100%; border-collapse:collapse; margin-top:4px; font-size:15px; }
  th { text-align:left; background:#eef6ef; color:#1d6a35; padding:6px 8px; font-size:13px; text-transform:uppercase; }
  td { padding:6px 8px; border-bottom:1px solid #eee; }
  .r { text-align:right; }
  .tot { margin-top:8px; margin-left:auto; width:55%; }
  .tot > div { display:flex; justify-content:space-between; font-size:15px; padding:2px 8px; }
  .tfin { font-weight:800; font-size:18px; border-top:2px solid #1d6a35; margin-top:3px; padding-top:4px !important; color:#1d6a35; }
  .met { margin-top:8px; font-size:14.5px; }
  .foot { margin-top:8px; font-size:13px; color:#666; }
  @media print { @page { size:Letter; margin:0; } }
</style></head><body>
  <div class="media">
    <div class="head">
      <div>
        <div class="cname">${clinica?.nombre || 'Clínica'}</div>
        <div class="csub">${clinica?.direccion || ''}${clinica?.telefono ? ' · Tel: ' + clinica.telefono : ''}</div>
      </div>
      <div class="rright">
        <div class="rlabel">COMPROBANTE</div>
        <div class="rnum">#${nroComp}</div>
        <div class="rfecha">${fechaStr} ${horaStr}</div>
      </div>
    </div>
    <div class="rinfo">
      ${paciente?.nro_historia != null ? `<span><b>HC N°:</b> ${paciente.nro_historia}</span>` : ''}
      ${paciente?.nombre ? `<span><b>Paciente:</b> ${paciente.nombre}</span>` : ''}
      ${paciente?.carnet ? `<span><b>CI:</b> ${paciente.carnet}</span>` : ''}
      ${doctorNombre ? `<span><b>Doctor:</b> ${doctorNombre}</span>` : ''}
      ${fecha ? `<span><b>Cita:</b> ${fecha}${hora ? ' ' + String(hora).slice(0,5) : ''}</span>` : ''}
    </div>
    <table>
      <thead><tr><th>Servicio</th><th class="r">Precio</th></tr></thead>
      <tbody>${filas}</tbody>
    </table>
    <div class="tot">
      ${descuento_monto > 0 ? `<div><span>Subtotal</span><span>Bs. ${subtotal.toFixed(2)}</span></div><div><span>Descuento</span><span>- Bs. ${descuento_monto.toFixed(2)}</span></div>` : ''}
      <div class="tfin"><span>TOTAL</span><span>Bs. ${total.toFixed(2)}</span></div>
    </div>
    ${metodo_pago ? `<div class="met">Pago: <b>${METODO_LABEL[metodo_pago] || metodo_pago}</b>${referencia ? ` · Ref: ${referencia}` : ''}</div>` : ''}
    <div class="foot">${cajeroNombre ? `Atendido por: ${cajeroNombre} · ` : ''}¡Gracias por su visita! — Válido como constancia de pago</div>
    <div class="cut">✂ — — — — — cortar aquí — — — — —</div>
  </div>
  <script>window.onload=function(){window.print();window.onafterprint=function(){window.close();}}</script>
</body></html>`
  }
}
