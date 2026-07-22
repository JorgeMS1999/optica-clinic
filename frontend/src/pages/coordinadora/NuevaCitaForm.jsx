import { useState, useEffect } from 'react'
import { UserPlus } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

const HORAS = Array.from({ length: 22 }, (_, i) => {
  const h = Math.floor(i / 2) + 7
  const m = i % 2 === 0 ? '00' : '30'
  return `${String(h).padStart(2,'0')}:${m}`
})

export default function NuevaCitaForm({ fechaDefault, onGuardada }) {
  const [doctores, setDoctores] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [pacientes, setPacientes] = useState([])
  const [form, setForm] = useState({
    paciente_id: '', doctor_id: '', fecha: fechaDefault,
    hora: '08:00', tipo: 'consulta', motivo: '', notas_coord: ''
  })
  const [loading, setLoading] = useState(false)
  const [nuevoPaciente, setNuevoPaciente] = useState(null) // { nombre, carnet } mientras se crea
  const [creandoPaciente, setCreandoPaciente] = useState(false)

  useEffect(() => {
    api.get('/doctores').then(r => setDoctores(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (busqueda.length < 2) { setPacientes([]); return }
    const t = setTimeout(async () => {
      const { data } = await api.get(`/pacientes?q=${encodeURIComponent(busqueda)}`)
      setPacientes(data)
    }, 300)
    return () => clearTimeout(t)
  }, [busqueda])

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
    setLoading(true)
    try {
      await api.post('/citas', form)
      toast.success('Cita programada correctamente')
      onGuardada()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear cita')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Búsqueda de paciente */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Paciente <span className="text-red-500">*</span>
        </label>
        <input
          type="text" placeholder="Buscar por nombre o carnet..."
          value={busqueda}
          onChange={e => { setBusqueda(e.target.value); setForm(f => ({ ...f, paciente_id: '' })) }}
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {pacientes.length > 0 && !form.paciente_id && (
          <div className="border border-gray-200 rounded-xl mt-1 shadow-sm max-h-40 overflow-y-auto">
            {pacientes.map(p => (
              <button key={p.id} type="button"
                onClick={() => { setForm(f => ({ ...f, paciente_id: p.id })); setBusqueda(p.nombre) ; setPacientes([]) }}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition border-b border-gray-100 last:border-0"
              >
                <span className="font-medium">{p.nombre}</span>
                <span className="text-gray-400 ml-2">{p.carnet}</span>
              </button>
            ))}
          </div>
        )}
        {form.paciente_id && (
          <p className="text-xs text-green-600 mt-1 font-medium">✓ Paciente seleccionado</p>
        )}

        {/* Sin resultados: ofrecer crear paciente nuevo */}
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
                <p className="text-[10px] text-gray-400">Podrás completar más datos (fecha de nacimiento, antecedentes, etc.) luego desde "Pacientes".</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Doctor */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Doctor <span className="text-red-500">*</span>
        </label>
        <select required value={form.doctor_id}
          onChange={e => setForm(f => ({ ...f, doctor_id: e.target.value }))}
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">— Seleccionar doctor —</option>
          {doctores.map(d => <option key={d.id} value={d.id}>{d.nombre} — {d.especialidad}</option>)}
        </select>
      </div>

      {/* Fecha y Hora */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha <span className="text-red-500">*</span></label>
          <input type="date" required value={form.fecha}
            onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hora <span className="text-red-500">*</span></label>
          <select required value={form.hora}
            onChange={e => setForm(f => ({ ...f, hora: e.target.value }))}
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
      </div>

      {/* Tipo */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo <span className="text-red-500">*</span></label>
        <div className="grid grid-cols-3 gap-2">
          {['consulta','procedimiento','cirugia'].map(t => (
            <button key={t} type="button"
              onClick={() => setForm(f => ({ ...f, tipo: t }))}
              className={`py-2.5 rounded-xl text-sm font-medium border transition
                ${form.tipo === t
                  ? 'bg-blue-700 text-white border-blue-700'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Motivo */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de consulta</label>
        <textarea rows={2} value={form.motivo}
          onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))}
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="Descripción breve del motivo..." />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notas coordinadora</label>
        <textarea rows={2} value={form.notas_coord}
          onChange={e => setForm(f => ({ ...f, notas_coord: e.target.value }))}
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="Notas internas..." />
      </div>

      <button type="submit" disabled={loading}
        className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white py-3 rounded-xl font-semibold text-sm transition">
        {loading ? 'Guardando...' : 'Programar Cita'}
      </button>
    </form>
  )
}
