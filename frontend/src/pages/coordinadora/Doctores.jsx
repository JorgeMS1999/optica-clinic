import { useState, useEffect, useCallback } from 'react'
import { UserPlus, Clock, Plus, Trash2, Phone, Mail, Stethoscope } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import Modal from '../../components/ui/Modal'

const DIAS = [
  { valor: 1, label: 'Lunes' },
  { valor: 2, label: 'Martes' },
  { valor: 3, label: 'Miércoles' },
  { valor: 4, label: 'Jueves' },
  { valor: 5, label: 'Viernes' },
  { valor: 6, label: 'Sábado' },
  { valor: 7, label: 'Domingo' },
]
const DIA_LABEL = Object.fromEntries(DIAS.map(d => [d.valor, d.label]))

const FORM_VACIO = { nombre: '', email: '', password: '', especialidad: 'Oftalmología', telefono: '' }
const HORARIO_VACIO = { dia: 1, inicio: '08:00', fin: '12:00' }

function HorariosEditor({ horarios, onChange }) {
  function agregar() {
    onChange([...horarios, { ...HORARIO_VACIO }])
  }
  function actualizar(idx, key, val) {
    onChange(horarios.map((h, i) => i === idx ? { ...h, [key]: key === 'dia' ? parseInt(val) : val } : h))
  }
  function quitar(idx) {
    onChange(horarios.filter((_, i) => i !== idx))
  }
  return (
    <div className="space-y-2">
      {horarios.map((h, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <select value={h.dia} onChange={e => actualizar(idx, 'dia', e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
            {DIAS.map(d => <option key={d.valor} value={d.valor}>{d.label}</option>)}
          </select>
          <input type="time" value={h.inicio} onChange={e => actualizar(idx, 'inicio', e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <span className="text-gray-400 text-xs">a</span>
          <input type="time" value={h.fin} onChange={e => actualizar(idx, 'fin', e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button type="button" onClick={() => quitar(idx)} className="text-red-400 hover:text-red-600 p-1">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button type="button" onClick={agregar}
        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium">
        <Plus size={14} /> Agregar horario
      </button>
    </div>
  )
}

function TarjetaDoctor({ doctor, onGuardado }) {
  const [editando, setEditando] = useState(false)
  const [horarios, setHorarios] = useState(
    (doctor.horarios || []).map(h => ({ dia: h.dia, inicio: h.inicio?.slice(0, 5), fin: h.fin?.slice(0, 5) }))
  )
  const [saving, setSaving] = useState(false)

  async function guardarHorarios() {
    setSaving(true)
    try {
      await api.put(`/doctores/${doctor.id}/horarios`, { horarios })
      toast.success('Horarios actualizados')
      setEditando(false)
      onGuardado()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar horarios')
    } finally { setSaving(false) }
  }

  const horariosOrdenados = [...(doctor.horarios || [])].sort((a, b) => a.dia - b.dia)

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-cyan-100 rounded-full flex items-center justify-center text-cyan-700 font-bold shrink-0">
            <Stethoscope size={20} />
          </div>
          <div>
            <p className="font-semibold text-gray-800">{doctor.nombre}</p>
            <p className="text-gray-400 text-xs">{doctor.especialidad}</p>
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-1 text-xs text-gray-500">
        {doctor.email && <p className="flex items-center gap-1.5"><Mail size={12} /> {doctor.email}</p>}
        {doctor.telefono && <p className="flex items-center gap-1.5"><Phone size={12} /> {doctor.telefono}</p>}
      </div>

      <div className="mt-4 border-t border-gray-100 pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-600 flex items-center gap-1.5"><Clock size={13} /> Horario de atención</span>
          {!editando && (
            <button onClick={() => setEditando(true)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
              Editar
            </button>
          )}
        </div>

        {editando ? (
          <div className="space-y-2">
            <HorariosEditor horarios={horarios} onChange={setHorarios} />
            <div className="flex gap-2 pt-1">
              <button onClick={guardarHorarios} disabled={saving}
                className="flex-1 bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium py-2 rounded-lg transition">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button onClick={() => { setEditando(false); setHorarios((doctor.horarios || []).map(h => ({ dia: h.dia, inicio: h.inicio?.slice(0, 5), fin: h.fin?.slice(0, 5) }))) }}
                className="flex-1 border border-gray-300 text-gray-600 text-xs font-medium py-2 rounded-lg hover:bg-gray-50 transition">
                Cancelar
              </button>
            </div>
          </div>
        ) : horariosOrdenados.length === 0 ? (
          <p className="text-xs text-gray-400">Sin horario configurado</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {horariosOrdenados.map((h, i) => (
              <span key={i} className="bg-cyan-50 text-cyan-700 text-xs px-2.5 py-1 rounded-full">
                {DIA_LABEL[h.dia]} {h.inicio?.slice(0, 5)}–{h.fin?.slice(0, 5)}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Doctores() {
  const [doctores, setDoctores] = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(false)
  const [form, setForm]         = useState(FORM_VACIO)
  const [horarios, setHorarios] = useState([{ ...HORARIO_VACIO }])
  const [guardando, setGuardando] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/doctores')
      setDoctores(data)
    } catch { toast.error('Error al cargar doctores') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nombre.trim() || !form.email.trim() || !form.password.trim()) {
      return toast.error('Nombre, email y contraseña son requeridos')
    }
    setGuardando(true)
    try {
      await api.post('/doctores', { ...form, horarios })
      toast.success('Doctor registrado correctamente')
      setModal(false)
      setForm(FORM_VACIO)
      setHorarios([{ ...HORARIO_VACIO }])
      cargar()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrar doctor')
    } finally { setGuardando(false) }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Doctores</h2>
          <p className="text-gray-500 text-sm mt-0.5">Registra médicos y configura su horario de atención</p>
        </div>
        <button onClick={() => setModal(true)}
          className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition">
          <UserPlus size={18} /> Nuevo Doctor
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-10 text-center text-gray-400">Cargando doctores...</div>
      ) : doctores.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center text-gray-400">
          No hay doctores registrados. Crea el primero con "Nuevo Doctor".
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {doctores.map(d => <TarjetaDoctor key={d.id} doctor={d} onGuardado={cargar} />)}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Nuevo Doctor" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo <span className="text-red-500">*</span></label>
              <input required value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Dr. / Dra. Nombre Apellido" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico <span className="text-red-500">*</span></label>
              <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="correo@ejemplo.com" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña <span className="text-red-500">*</span></label>
              <input required type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Mínimo 8 caracteres" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Especialidad</label>
              <input value={form.especialidad} onChange={e => setForm(f => ({ ...f, especialidad: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Horario de atención (opcional)</label>
            <HorariosEditor horarios={horarios} onChange={setHorarios} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)}
              className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
              Cancelar
            </button>
            <button type="submit" disabled={guardando}
              className="flex-1 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white py-2.5 rounded-xl text-sm font-medium transition">
              {guardando ? 'Guardando...' : 'Registrar Doctor'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
