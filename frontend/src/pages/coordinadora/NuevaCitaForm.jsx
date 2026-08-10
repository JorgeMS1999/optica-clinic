import { useState, useEffect } from 'react'
import { UserPlus, User, CalendarDays, Stethoscope, ClipboardList, Printer } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import SelectorServiciosCita from '../../components/SelectorServiciosCita'
import { useAuth } from '../../contexts/AuthContext'
import { imprimirTicketCita } from '../../utils/imprimirTicketCita'
import Modal from '../../components/ui/Modal'
import FichaCompletaForm from './FichaCompletaForm'

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

const LABEL = 'block text-sm font-medium text-gray-700 mb-1.5'
const INPUT = 'w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

export default function NuevaCitaForm({ fechaDefault, onGuardada, cita = null }) {
  const editando = !!cita?.id
  const { usuario } = useAuth()

  const [doctores, setDoctores]   = useState([])
  const [servicios, setServicios] = useState([])   // catálogo
  const [clinica, setClinica]     = useState(null)
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
  const [modalNuevoPac, setModalNuevoPac] = useState(false)  // modal registro completo de paciente
  const [proxHC, setProxHC] = useState(null)                 // próximo N° historia para el nuevo

  const totalServicios = selServicios.reduce((s, l) => s + (parseFloat(l.precio_cobrado) || 0), 0)

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

  async function abrirNuevoPaciente() {
    try {
      const { data } = await api.get('/pacientes/proximo-historia')
      setProxHC(data.proximo)
    } catch { setProxHC(null) }
    setModalNuevoPac(true)
  }

  function onNuevoPacienteGuardado(p) {
    setModalNuevoPac(false)
    if (p?.id) {
      setForm(f => ({ ...f, paciente_id: p.id }))
      setBusqueda(p.nombre)
      setPacienteHC(p.nro_historia)
      setPacientes([])
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.paciente_id) return toast.error('Selecciona un paciente')
    if (!form.doctor_id)   return toast.error('Selecciona un doctor')

    const payload = {
      ...form,
      servicios: selServicios.map(s => ({
        servicio_id:    s.servicio_id,
        precio_cobrado: parseFloat(s.precio_cobrado) || 0,
        notas:          s.notas || null,
      })),
    }

    setLoading(true)
    try {
      if (editando) {
        await api.put(`/citas/${cita.id}`, payload)
        toast.success('Cita actualizada')
      } else {
        await api.post('/citas', payload)
        toast.success(
          totalServicios > 0
            ? `Cita agendada — queda por cobrar Bs. ${totalServicios.toFixed(2)}`
            : 'Cita programada correctamente'
        )
      }
      onGuardada()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar la cita')
    } finally {
      setLoading(false)
    }
  }

  // Reimprimir el comprobante de la cita. Si tiene cobro registrado usa esos datos;
  // si no, imprime igual con los servicios de la cita.
  async function handleReimprimir(formato = 'ticket') {
    let data = null
    try { const r = await api.get(`/pagos/cita/${cita.id}`); data = r.data } catch { /* sin pago */ }

    const doctorNombre = citaInfo?.doctor_nombre ||
      doctores.find(d => String(d.id) === String(form.doctor_id))?.nombre

    if (data && data.pago) {
      const pg = data.pago
      imprimirTicketCita({
        clinica,
        pago: pg,
        paciente:     { nombre: pg.paciente_nombre, carnet: pg.carnet, nro_historia: pg.nro_historia },
        doctorNombre: pg.doctor_nombre,
        fecha:        (pg.cita_fecha || '').split('T')[0],
        hora:         pg.cita_hora,
        tipo:         citaInfo?.tipo || form.tipo,
        servicios:    data.detalle.map(d => ({ nombre: d.servicio_nombre, precio: parseFloat(d.precio_unitario) || 0 })),
        subtotal:        parseFloat(pg.subtotal) || 0,
        descuento_monto: parseFloat(pg.descuento_monto) || 0,
        total:           parseFloat(pg.total) || 0,
        metodo_pago:     pg.metodo_pago,
        referencia:      pg.referencia,
        cajeroNombre:    usuario?.nombre,
      }, { formato })
    } else {
      imprimirTicketCita({
        clinica,
        pago: { id: cita.id, creado_en: new Date().toISOString() },
        paciente:     { nombre: busqueda || citaInfo?.paciente_nombre, carnet: citaInfo?.carnet, nro_historia: citaInfo?.nro_historia },
        doctorNombre,
        fecha:        form.fecha,
        hora:         form.hora,
        tipo:         citaInfo?.tipo || form.tipo,
        servicios:    selServicios.map(s => ({ nombre: s._nombre, precio: parseFloat(s.precio_cobrado) || 0 })),
        subtotal:        totalServicios,
        descuento_monto: 0,
        total:           totalServicios,
        metodo_pago:     '',
        referencia:      '',
        cajeroNombre:    usuario?.nombre,
      }, { formato })
    }
  }

  return (
    <>
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
                type="text" placeholder="Buscar por nombre, carnet o N° historia..."
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
              <button type="button" onClick={abrirNuevoPaciente}
                className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium">
                <UserPlus size={14} /> No se encontró — registrar paciente nuevo
              </button>
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
            El precio se trae del catálogo y podés ajustarlo aquí mismo. El cobro se hace
            aparte con el botón <strong>Cobrar</strong> en la lista de citas.
          </p>

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
      <div className="sticky bottom-0 z-20 -mx-6 px-6 py-4 bg-white border-t border-gray-100 flex items-center gap-3">
        <div className="flex items-center gap-2 text-gray-400 text-xs flex-1">
          <ClipboardList size={14} />
          {selServicios.length > 0
            ? `${selServicios.length} servicio(s) · Bs. ${totalServicios.toFixed(2)}`
            : 'Sin servicios registrados'}
        </div>
        {editando && (
          <>
            <button type="button" onClick={() => handleReimprimir('ticket')}
              className="flex items-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-3 rounded-xl font-semibold text-sm transition">
              <Printer size={16} /> Ticket
            </button>
            <button type="button" onClick={() => handleReimprimir('carta')}
              className="flex items-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-3 rounded-xl font-semibold text-sm transition">
              <Printer size={16} /> Carta
            </button>
          </>
        )}
        <button type="submit" disabled={loading}
          className="bg-blue-700 hover:bg-blue-800 text-white px-8 py-3 rounded-xl font-semibold text-sm transition shadow-sm disabled:opacity-60">
          {loading ? 'Guardando...' : editando ? 'Guardar cambios' : 'Programar Cita'}
        </button>
      </div>
    </form>

    {/* Registro completo de un paciente nuevo (desde la cita) */}
    {modalNuevoPac && (
      <Modal open onClose={() => setModalNuevoPac(false)} title="Nuevo Paciente" size="xl">
        <FichaCompletaForm
          paciente={{ nombre: busqueda }}
          proximoHC={proxHC}
          onGuardado={onNuevoPacienteGuardado}
        />
      </Modal>
    )}
    </>
  )
}
