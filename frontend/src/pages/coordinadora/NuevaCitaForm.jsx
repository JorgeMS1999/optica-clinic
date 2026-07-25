import { useState, useEffect } from 'react'
import { UserPlus, User, CalendarDays, Stethoscope, ClipboardList } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import SelectorServiciosCita from '../../components/SelectorServiciosCita'

const HORAS = Array.from({ length: 22 }, (_, i) => {
  const h = Math.floor(i / 2) + 7
  const m = i % 2 === 0 ? '00' : '30'
  return `${String(h).padStart(2,'0')}:${m}`
})

const TIPOS = [
  { key: 'consulta',      label: 'Consulta' },
  { key: 'procedimiento', label: 'Procedimiento' },
  { key: 'cirugia',       label: 'Cirugía' },
]

const LABEL = 'block text-sm font-medium text-gray-700 mb-1.5'
const INPUT = 'w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

export default function NuevaCitaForm({ fechaDefault, onGuardada, cita = null }) {
  const editando = !!cita?.id

  const [doctores, setDoctores]   = useState([])
  const [servicios, setServicios] = useState([])   // catálogo
  const [busqueda, setBusqueda]   = useState('')
  const [pacientes, setPacientes] = useState([])
  const [form, setForm] = useState({
    paciente_id: '', doctor_id: '', fecha: fechaDefault,
    hora: '08:00', tipo: 'consulta', motivo: '', notas_coord: ''
  })
  const [selServicios, setSelServicios] = useState([])
  const [loading, setLoading] = useState(false)
  const [nuevoPaciente, setNuevoPaciente] = useState(null)
  const [creandoPaciente, setCreandoPaciente] = useState(false)

  // Catálogo de doctores y servicios
  useEffect(() => {
    api.get('/doctores').then(r => setDoctores(r.data)).catch(() => {})
    api.get('/servicios').then(r => setServicios(r.data)).catch(() => {})
  }, [])

  // Precarga en modo edición
  useEffect(() => {
    if (!editando) return
    async function cargar() {
      try {
        const { data } = await api.get(`/citas/${cita.id}`)
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
        toast.success('Cita programada correctamente')
      }
      onGuardada()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar la cita')
    } finally {
      setLoading(false)
    }
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
                    onClick={() => { setForm(f => ({ ...f, paciente_id: p.id })); setBusqueda(p.nombre); setPacientes([]) }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition border-b border-gray-100 last:border-0">
                    <span className="font-medium">{p.nombre}</span>
                    <span className="text-gray-400 ml-2">{p.carnet}</span>
                  </button>
                ))}
              </div>
            )}
            {form.paciente_id && (
              <p className="text-xs text-green-600 mt-1 font-medium">✓ Paciente seleccionado</p>
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
        <button type="submit" disabled={loading}
          className="bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white px-8 py-3 rounded-xl font-semibold text-sm transition shadow-sm">
          {loading ? 'Guardando...' : editando ? 'Guardar cambios' : 'Programar Cita'}
        </button>
      </div>
    </form>
  )
}
