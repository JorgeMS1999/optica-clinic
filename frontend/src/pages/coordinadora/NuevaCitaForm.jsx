import { useState, useEffect } from 'react'
import { UserPlus, User, CalendarDays, Stethoscope, ClipboardList, CreditCard, Printer, CheckCircle } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import SelectorServiciosCita from '../../components/SelectorServiciosCita'
import { useAuth } from '../../contexts/AuthContext'
import { imprimirTicketCita } from '../../utils/imprimirTicketCita'

// Horarios cada 10 minutos, de 07:00 a 22:00 (10 de la noche)
const HORAS = (() => {
  const slots = []
  for (let min = 7 * 60; min <= 22 * 60; min += 10) {
    slots.push(`${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`)
  }
  return slots
})()

const TIPOS = [
  { key: 'consulta',      label: 'Consulta' },
  { key: 'procedimiento', label: 'Procedimiento' },
  { key: 'cirugia',       label: 'Cirugía' },
]

const METODOS_PAGO = [
  { key: 'efectivo',      label: 'Efectivo' },
  { key: 'qr',            label: 'QR' },
  { key: 'transferencia', label: 'Transf.' },
  { key: 'seguro',        label: 'Seguro' },
]

const LABEL = 'block text-sm font-medium text-gray-700 mb-1.5'
const INPUT = 'w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

export default function NuevaCitaForm({ fechaDefault, onGuardada, cita = null }) {
  const editando = !!cita?.id
  const { usuario } = useAuth()

  const [doctores, setDoctores]   = useState([])
  const [servicios, setServicios] = useState([])   // catálogo
  const [clinica, setClinica]     = useState(null)
  const [comprobante, setComprobante] = useState(null) // datos para el ticket tras cobrar
  const [citaInfo, setCitaInfo]   = useState(null)     // datos de la cita cargada (modo edición)
  const [busqueda, setBusqueda]   = useState('')
  const [pacientes, setPacientes] = useState([])
  const [form, setForm] = useState({
    paciente_id: '', doctor_id: '', fecha: fechaDefault,
    hora: '08:00', tipo: 'consulta', motivo: '', notas_coord: ''
  })
  const [selServicios, setSelServicios] = useState([])
  const [pacienteHC, setPacienteHC] = useState(null)   // N° historia del paciente elegido
  const [loading, setLoading] = useState(false)
  const [nuevoPaciente, setNuevoPaciente] = useState(null)
  const [creandoPaciente, setCreandoPaciente] = useState(false)

  // Cobro al registrar la cita (se paga en el acto, no queda pendiente)
  const [metodoPago, setMetodoPago]         = useState('efectivo')
  const [referenciaPago, setReferenciaPago] = useState('')
  const [descuentoBs, setDescuentoBs]       = useState(0)   // descuento neto en Bs.

  const totalServicios = selServicios.reduce((s, l) => s + (parseFloat(l.precio_cobrado) || 0), 0)
  const descuentoMonto = Math.min(Math.max(parseFloat(descuentoBs) || 0, 0), totalServicios)
  const totalCobrar    = Math.max(0, totalServicios - descuentoMonto)

  // Catálogo de doctores, servicios e info de la clínica (para el comprobante)
  useEffect(() => {
    api.get('/doctores').then(r => setDoctores(r.data)).catch(() => {})
    api.get('/servicios').then(r => setServicios(r.data)).catch(() => {})
    api.get('/clinicas')
      .then(r => setClinica(r.data.find(c => c.id === usuario?.clinica_id) || r.data[0] || null))
      .catch(() => {})
  }, [usuario?.clinica_id])

  // Precarga en modo edición
  useEffect(() => {
    if (!editando) return
    async function cargar() {
      try {
        const { data } = await api.get(`/citas/${cita.id}`)
        setCitaInfo(data)
        setPacienteHC(data.nro_historia)
        setForm({
          paciente_id: data.paciente_id,
          doctor_id:   data.doctor_id,
          fecha:       (data.fecha || '').split('T')[0] || fechaDefault,
          hora:        (data.hora || '08:00').slice(0, 5),
          tipo:        data.tipo || 'consulta',
          motivo:      data.motivo || '',
          notas_coord: data.notas_coord || '',
        })
        setBusqueda(data.paciente_nombre || '')
        setSelServicios((data.servicios || []).map(s => ({
          servicio_id:    s.servicio_id,
          precio_cobrado: parseFloat(s.precio_cobrado) || 0,
          notas:          s.notas || '',
          _nombre:        s.servicio_nombre,
          _categoria:     s.categoria,
          _precio_base:   parseFloat(s.precio_base) || 0,
        })))
      } catch {
        toast.error('No se pudo cargar la cita')
      }
    }
    cargar()
  }, [editando, cita?.id, fechaDefault])

  useEffect(() => {
    if (busqueda.length < 2 || form.paciente_id) { setPacientes([]); return }
    const t = setTimeout(async () => {
      const { data } = await api.get(`/pacientes?q=${encodeURIComponent(busqueda)}`)
      setPacientes(data)
    }, 300)
    return () => clearTimeout(t)
  }, [busqueda, form.paciente_id])

  async function handleCrearPaciente() {
    if (!nuevoPaciente?.nombre?.trim() || !nuevoPaciente?.carnet?.trim()) {
      return toast.error('Nombre y carnet son requeridos')
    }
    setCreandoPaciente(true)
    try {
      const { data } = await api.post('/pacientes/rapido', nuevoPaciente)
      toast.success(data.ya_existia ? 'Paciente ya existía, seleccionado' : 'Paciente creado')
      setForm(f => ({ ...f, paciente_id: data.id }))
      setBusqueda(data.nombre)
      setPacienteHC(data.nro_historia)
      setNuevoPaciente(null)
      setPacientes([])
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear paciente')
    } finally { setCreandoPaciente(false) }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.paciente_id) return toast.error('Selecciona un paciente')
    if (!form.doctor_id)   return toast.error('Selecciona un doctor')

    const cobra = !editando && totalServicios > 0

    const payload = {
      ...form,
      servicios: selServicios.map(s => ({
        servicio_id:    s.servicio_id,
        precio_cobrado: parseFloat(s.precio_cobrado) || 0,
        notas:          s.notas || null,
      })),
    }
    if (cobra) {
      payload.cobro = {
        metodo_pago:     metodoPago,
        descuento_monto: descuentoMonto,
        referencia:      referenciaPago || null,
      }
    }

    setLoading(true)
    try {
      if (editando) {
        await api.put(`/citas/${cita.id}`, payload)
        toast.success('Cita actualizada')
        onGuardada()
        return
      }

      const { data: nuevaCita } = await api.post('/citas', payload)

      if (cobra && nuevaCita.pago) {
        // Datos del paciente (HC y carnet) para el comprobante
        let pac = { nombre: busqueda }
        try { const { data } = await api.get(`/pacientes/${form.paciente_id}`); pac = data } catch { /* no crítico */ }
        const doctorNombre = doctores.find(d => String(d.id) === String(form.doctor_id))?.nombre

        setComprobante({
          pago:            nuevaCita.pago,
          servicios:       selServicios.map(s => ({ nombre: s._nombre, precio: parseFloat(s.precio_cobrado) || 0 })),
          subtotal:        totalServicios,
          descuento_monto: descuentoMonto,
          total:           totalCobrar,
          metodo_pago:     metodoPago,
          referencia:      referenciaPago,
          paciente:        pac,
          doctorNombre,
          fecha:           form.fecha,
          hora:            form.hora,
        })
        toast.success(`Cita registrada y cobrada — Bs. ${totalCobrar.toFixed(2)}`)
      } else {
        toast.success('Cita programada correctamente')
        onGuardada()
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar la cita')
    } finally {
      setLoading(false)
    }
  }

  function handleImprimir() {
    imprimirTicketCita({
      clinica,
      pago:            comprobante.pago,
      paciente:        comprobante.paciente,
      doctorNombre:    comprobante.doctorNombre,
      fecha:           comprobante.fecha,
      hora:            comprobante.hora,
      servicios:       comprobante.servicios,
      subtotal:        comprobante.subtotal,
      descuento_monto: comprobante.descuento_monto,
      total:           comprobante.total,
      metodo_pago:     comprobante.metodo_pago,
      referencia:      comprobante.referencia,
      cajeroNombre:    usuario?.nombre,
    })
  }

  // Imprimir el comprobante de la cita. Si tiene cobro registrado usa esos datos;
  // si no, imprime igual con los servicios de la cita.
  async function handleReimprimir() {
    let data = null
    try { const r = await api.get(`/pagos/cita/${cita.id}`); data = r.data } catch { /* sin pago */ }

    const doctorNombre = citaInfo?.doctor_nombre ||
      doctores.find(d => String(d.id) === String(form.doctor_id))?.nombre

    if (data && data.pago) {
      // Con cobro registrado
      const pg = data.pago
      imprimirTicketCita({
        clinica,
        pago: pg,
        paciente:     { nombre: pg.paciente_nombre, carnet: pg.carnet, nro_historia: pg.nro_historia },
        doctorNombre: pg.doctor_nombre,
        fecha:        (pg.cita_fecha || '').split('T')[0],
        hora:         pg.cita_hora,
        servicios:    data.detalle.map(d => ({ nombre: d.servicio_nombre, precio: parseFloat(d.precio_unitario) || 0 })),
        subtotal:        parseFloat(pg.subtotal) || 0,
        descuento_monto: parseFloat(pg.descuento_monto) || 0,
        total:           parseFloat(pg.total) || 0,
        metodo_pago:     pg.metodo_pago,
        referencia:      pg.referencia,
        cajeroNombre:    usuario?.nombre,
      })
    } else {
      // Sin cobro: imprimir con los servicios de la cita
      imprimirTicketCita({
        clinica,
        pago: { id: cita.id, creado_en: new Date().toISOString() },
        paciente:     { nombre: busqueda || citaInfo?.paciente_nombre, carnet: citaInfo?.carnet, nro_historia: citaInfo?.nro_historia },
        doctorNombre,
        fecha:        form.fecha,
        hora:         form.hora,
        servicios:    selServicios.map(s => ({ nombre: s._nombre, precio: parseFloat(s.precio_cobrado) || 0 })),
        subtotal:        totalServicios,
        descuento_monto: 0,
        total:           totalServicios,
        metodo_pago:     '',
        referencia:      '',
        cajeroNombre:    usuario?.nombre,
      })
    }
  }

  // Pantalla de confirmación con opción de imprimir (tras cobrar)
  if (comprobante) {
    return (
      <div className="flex flex-col items-center gap-5 py-4 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle size={36} className="text-green-500" />
        </div>
        <div>
          <p className="text-xl font-bold text-gray-800">¡Cita registrada y cobrada!</p>
          <p className="text-gray-500 text-sm mt-1">
            {comprobante.paciente?.nombre}
            {' · '}
            <span className="font-semibold text-green-600">Bs. {comprobante.total.toFixed(2)}</span>
          </p>
        </div>

        <div className="w-full bg-gray-50 rounded-2xl p-4 text-left space-y-2">
          {comprobante.servicios.map((s, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-gray-600">{s.nombre}</span>
              <span className="font-medium">Bs. {s.precio.toFixed(2)}</span>
            </div>
          ))}
          {comprobante.descuento_monto > 0 && (
            <div className="flex justify-between text-sm text-red-500">
              <span>Descuento</span>
              <span>− Bs. {comprobante.descuento_monto.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2">
            <span>Total</span>
            <span className="text-green-600">Bs. {comprobante.total.toFixed(2)}</span>
          </div>
          <p className="text-xs text-gray-400 pt-1">
            Método: {METODOS_PAGO.find(m => m.key === comprobante.metodo_pago)?.label || comprobante.metodo_pago}
            {comprobante.referencia ? ` · Ref: ${comprobante.referencia}` : ''}
          </p>
        </div>

        <div className="flex gap-3 w-full">
          <button onClick={handleImprimir}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white py-3 rounded-xl font-semibold text-sm transition">
            <Printer size={18} /> Imprimir comprobante
          </button>
          <button onClick={onGuardada}
            className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 py-3 rounded-xl font-semibold text-sm transition">
            Listo
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-x-8 gap-y-6">

        {/* ── Columna izquierda: datos de la cita ── */}
        <div className="space-y-5">
          <div className="flex items-center gap-2 text-gray-700">
            <CalendarDays size={16} className="text-blue-600" />
            <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Datos de la cita</h4>
          </div>

          {/* Paciente */}
          <div>
            <label className={LABEL}>Paciente <span className="text-red-500">*</span></label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text" placeholder="Buscar por nombre o carnet..."
                value={busqueda}
                onChange={e => { setBusqueda(e.target.value); setForm(f => ({ ...f, paciente_id: '' })) }}
                className={`${INPUT} pl-9`}
              />
            </div>
            {pacientes.length > 0 && !form.paciente_id && (
              <div className="border border-gray-200 rounded-xl mt-1 shadow-sm max-h-40 overflow-y-auto">
                {pacientes.map(p => (
                  <button key={p.id} type="button"
                    onClick={() => { setForm(f => ({ ...f, paciente_id: p.id })); setBusqueda(p.nombre); setPacienteHC(p.nro_historia); setPacientes([]) }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition border-b border-gray-100 last:border-0 flex items-center gap-2">
                    {p.nro_historia != null && (
                      <span className="inline-flex items-center justify-center min-w-[1.9rem] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs font-bold font-mono">
                        {p.nro_historia}
                      </span>
                    )}
                    <span className="font-medium">{p.nombre}</span>
                    <span className="text-gray-400 ml-auto">{p.carnet}</span>
                  </button>
                ))}
              </div>
            )}
            {form.paciente_id && (
              <p className="text-xs text-green-600 mt-1 font-medium">
                ✓ Seleccionado{pacienteHC != null ? ` · Historia Clínica N° ${pacienteHC}` : ''}
              </p>
            )}

            {busqueda.length >= 2 && pacientes.length === 0 && !form.paciente_id && (
              <div className="mt-2">
                {!nuevoPaciente ? (
                  <button type="button"
                    onClick={() => setNuevoPaciente({ nombre: busqueda, carnet: '' })}
                    className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium">
                    <UserPlus size={14} /> No se encontró — crear paciente nuevo
                  </button>
                ) : (
                  <div className="border border-blue-200 bg-blue-50 rounded-xl p-3 space-y-2">
                    <input type="text" placeholder="Nombre completo" value={nuevoPaciente.nombre}
                      onChange={e => setNuevoPaciente(np => ({ ...np, nombre: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <input type="text" placeholder="Carnet de identidad" value={nuevoPaciente.carnet}
                      onChange={e => setNuevoPaciente(np => ({ ...np, carnet: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <div className="flex gap-2">
                      <button type="button" onClick={handleCrearPaciente} disabled={creandoPaciente}
                        className="flex-1 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white text-xs font-medium py-2 rounded-lg transition">
                        {creandoPaciente ? 'Creando...' : 'Crear y usar este paciente'}
                      </button>
                      <button type="button" onClick={() => setNuevoPaciente(null)}
                        className="flex-1 border border-gray-300 text-gray-600 text-xs font-medium py-2 rounded-lg hover:bg-gray-50 transition">
                        Cancelar
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400">Podrás completar más datos luego desde "Pacientes".</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Doctor */}
          <div>
            <label className={LABEL}>Doctor <span className="text-red-500">*</span></label>
            <select required value={form.doctor_id}
              onChange={e => setForm(f => ({ ...f, doctor_id: e.target.value }))}
              className={INPUT}>
              <option value="">— Seleccionar doctor —</option>
              {doctores.map(d => <option key={d.id} value={d.id}>{d.nombre} — {d.especialidad}</option>)}
            </select>
          </div>

          {/* Fecha y hora */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Fecha <span className="text-red-500">*</span></label>
              <input type="date" required value={form.fecha}
                onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Hora <span className="text-red-500">*</span></label>
              <select required value={form.hora}
                onChange={e => setForm(f => ({ ...f, hora: e.target.value }))}
                className={INPUT}>
                {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>

          {/* Tipo */}
          <div>
            <label className={LABEL}>Tipo de atención <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-3 gap-2">
              {TIPOS.map(t => (
                <button key={t.key} type="button"
                  onClick={() => setForm(f => ({ ...f, tipo: t.key }))}
                  className={`py-2.5 rounded-xl text-sm font-medium border transition
                    ${form.tipo === t.key
                      ? 'bg-blue-700 text-white border-blue-700'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Columna derecha: procedimientos + notas ── */}
        <div className="space-y-5">
          <div className="flex items-center gap-2 text-gray-700">
            <Stethoscope size={16} className="text-blue-600" />
            <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Procedimientos / servicios
            </h4>
          </div>

          <SelectorServiciosCita
            servicios={servicios}
            value={selServicios}
            onChange={setSelServicios}
            tipoSugerido={form.tipo}
          />

          <p className="text-[11px] text-gray-400 -mt-2">
            El precio se trae del catálogo y podés ajustarlo aquí mismo (descuentos o precio variable).
          </p>

          {/* Cobro — se paga al registrar la cita */}
          {!editando && totalServicios > 0 && (
            <div className="border border-gray-200 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center gap-2">
                <CreditCard size={15} className="text-blue-600" />
                <span className="text-sm font-semibold text-gray-700">Pago</span>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Método de pago <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-4 gap-2">
                  {METODOS_PAGO.map(m => (
                    <button key={m.key} type="button" onClick={() => setMetodoPago(m.key)}
                      className={`py-2 rounded-lg text-xs font-medium border transition
                        ${metodoPago === m.key
                          ? 'bg-blue-700 text-white border-blue-700'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {['qr','transferencia','seguro'].includes(metodoPago) && (
                <input type="text" value={referenciaPago}
                  onChange={e => setReferenciaPago(e.target.value)}
                  placeholder={metodoPago === 'seguro' ? 'Nro. póliza / autorización' : 'Nro. de comprobante / referencia'}
                  className={INPUT} />
              )}

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">Descuento Bs.</span>
                  <span className="text-xs text-gray-400">−</span>
                  <input type="number" min="0" step="1" value={descuentoBs}
                    onChange={e => setDescuentoBs(e.target.value)}
                    placeholder="0"
                    className="w-24 border border-gray-200 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-gray-400">Total a cobrar</p>
                  <p className="text-lg font-bold text-green-600">Bs. {totalCobrar.toFixed(2)}</p>
                </div>
              </div>
              {descuentoMonto > 0 && (
                <p className="text-[11px] text-gray-400 text-right -mt-1">
                  {totalServicios.toFixed(2)} − {descuentoMonto.toFixed(2)} de descuento
                </p>
              )}
            </div>
          )}

          <div>
            <label className={LABEL}>Motivo</label>
            <textarea rows={2} value={form.motivo}
              onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))}
              className={`${INPUT} resize-none`}
              placeholder="Descripción breve del motivo..." />
          </div>

          <div>
            <label className={LABEL}>Notas internas</label>
            <textarea rows={2} value={form.notas_coord}
              onChange={e => setForm(f => ({ ...f, notas_coord: e.target.value }))}
              className={`${INPUT} resize-none`}
              placeholder="Notas de coordinación..." />
          </div>
        </div>
      </div>

      {/* Acción — barra fija abajo */}
      <div className="sticky bottom-0 z-20 -mx-6 -mb-6 px-6 py-4 bg-white border-t border-gray-100 flex items-center gap-3">
        <div className="flex items-center gap-2 text-gray-400 text-xs flex-1">
          <ClipboardList size={14} />
          {selServicios.length > 0
            ? `${selServicios.length} servicio(s) · Bs. ${selServicios.reduce((s, l) => s + (parseFloat(l.precio_cobrado) || 0), 0).toFixed(2)}`
            : 'Sin servicios registrados'}
        </div>
        {editando && (
          <button type="button" onClick={handleReimprimir}
            className="flex items-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-3 rounded-xl font-semibold text-sm transition">
            <Printer size={16} /> Imprimir
          </button>
        )}
        <button type="submit" disabled={loading}
          className={`text-white px-8 py-3 rounded-xl font-semibold text-sm transition shadow-sm disabled:opacity-60
            ${!editando && totalServicios > 0 ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-700 hover:bg-blue-800'}`}>
          {loading
            ? 'Guardando...'
            : editando
              ? 'Guardar cambios'
              : totalServicios > 0
                ? `Cobrar Bs. ${totalCobrar.toFixed(2)}`
                : 'Programar Cita'}
        </button>
      </div>
    </form>
  )
}
