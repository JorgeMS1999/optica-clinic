import { useState, useEffect } from 'react'
import { Plus, Edit2, Building2, ToggleLeft, ToggleRight, Loader2, LogIn } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import toast from 'react-hot-toast'
import Modal from '../../components/ui/Modal'
import { useAuth } from '../../contexts/AuthContext'

const FORM_VACIO = { nombre: '', direccion: '', telefono: '', email: '' }

export default function Clinicas() {
  const { entrarEstablecimiento } = useAuth()
  const navigate = useNavigate()
  const [clinicas,   setClinicas]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState(false)
  const [editando,   setEditando]   = useState(null)
  const [form,       setForm]       = useState(FORM_VACIO)
  const [guardando,  setGuardando]  = useState(false)
  const [creando,    setCreando]    = useState(false) // para mostrar spinner largo al crear BD
  const [entrando,   setEntrando]   = useState(null)  // id de clínica en la que estamos entrando

  async function cargar() {
    setLoading(true)
    try {
      const { data } = await api.get('/clinicas')
      setClinicas(data)
    } catch { toast.error('Error al cargar clínicas') }
    finally { setLoading(false) }
  }

  useEffect(() => { cargar() }, [])

  function abrirNueva() {
    setEditando(null)
    setForm(FORM_VACIO)
    setModal(true)
  }

  function abrirEditar(c) {
    setEditando(c)
    setForm({ nombre: c.nombre, direccion: c.direccion || '', telefono: c.telefono || '', email: c.email || '' })
    setModal(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nombre.trim()) return toast.error('El nombre es requerido')
    setGuardando(true)
    if (!editando) setCreando(true)
    try {
      if (editando) {
        await api.put(`/clinicas/${editando.id}`, form)
        toast.success('Clínica actualizada')
      } else {
        await api.post('/clinicas', form)
        toast.success('Clínica creada con su base de datos')
      }
      setModal(false)
      cargar()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar')
    } finally {
      setGuardando(false)
      setCreando(false)
    }
  }

  async function toggleActiva(c) {
    try {
      await api.patch(`/clinicas/${c.id}/activa`, { activa: !c.activa })
      toast.success(c.activa ? 'Clínica desactivada' : 'Clínica activada')
      cargar()
    } catch { toast.error('Error al cambiar estado') }
  }

  async function entrar(c) {
    if (!c.activa) return toast.error('La clínica está inactiva')
    setEntrando(c.id)
    try {
      await entrarEstablecimiento('clinica', c.id)
      toast.success(`Entrando a ${c.nombre}`)
      navigate('/coordinadora/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al entrar')
    } finally {
      setEntrando(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Clínicas</h2>
          <p className="text-gray-500 text-sm mt-0.5">Gestión de establecimientos clínicos</p>
        </div>
        <button onClick={abrirNueva}
          className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition">
          <Plus size={18} /> Nueva Clínica
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-400">Cargando...</div>
        ) : clinicas.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <Building2 size={40} className="mx-auto mb-3 opacity-30" />
            <p>No hay clínicas registradas</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-5 py-3 text-left">Clínica</th>
                <th className="px-5 py-3 text-left">Contacto</th>
                <th className="px-5 py-3 text-left">Base de datos</th>
                <th className="px-5 py-3 text-left">Estado</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clinicas.map(c => (
                <tr key={c.id} className={`hover:bg-gray-50 ${!c.activa ? 'opacity-50' : ''}`}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                        <Building2 size={17} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{c.nombre}</p>
                        {c.direccion && <p className="text-gray-400 text-xs">{c.direccion}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-500 text-xs">
                    <p>{c.telefono || '—'}</p>
                    <p>{c.email || ''}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">{c.db_name}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${c.activa ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {c.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => entrar(c)}
                        disabled={entrando === c.id || !c.activa}
                        title="Entrar como admin de esta clínica"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-semibold rounded-lg transition">
                        {entrando === c.id
                          ? <Loader2 size={13} className="animate-spin" />
                          : <LogIn size={13} />}
                        Entrar
                      </button>
                      <button onClick={() => abrirEditar(c)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => toggleActiva(c)}
                        title={c.activa ? 'Desactivar' : 'Activar'}
                        className={`p-1.5 rounded-lg transition ${c.activa ? 'text-green-500 hover:bg-red-50 hover:text-red-500' : 'text-gray-400 hover:bg-green-50 hover:text-green-600'}`}>
                        {c.activa ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      <Modal open={modal} onClose={() => !guardando && setModal(false)}
        title={editando ? 'Editar Clínica' : 'Nueva Clínica'} size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editando && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700">
              <p className="font-medium mb-1">Se creará automáticamente:</p>
              <ul className="text-xs space-y-0.5 text-blue-600">
                <li>• Una nueva base de datos PostgreSQL</li>
                <li>• Tablas de pacientes, doctores, citas, servicios y pagos</li>
                <li>• 14 servicios oftalmológicos con precio Bs. 0 (configurables)</li>
              </ul>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre <span className="text-red-500">*</span></label>
            <input required value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Clínica Oftalmológica Central" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
            <input value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Dirección completa" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: 2-234567" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="correo@clinica.com" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} disabled={guardando}
              className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-40 transition">
              Cancelar
            </button>
            <button type="submit" disabled={guardando}
              className="flex-1 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white py-2.5 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2">
              {guardando && <Loader2 size={15} className="animate-spin" />}
              {guardando ? (creando ? 'Creando base de datos...' : 'Guardando...') : (editando ? 'Actualizar' : 'Crear Clínica')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
