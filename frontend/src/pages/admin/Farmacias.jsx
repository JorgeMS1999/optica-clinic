import { useState, useEffect } from 'react'
import { Plus, Edit2, ShoppingBag, ToggleLeft, ToggleRight, Loader2, LogIn } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import toast from 'react-hot-toast'
import Modal from '../../components/ui/Modal'
import { useAuth } from '../../contexts/AuthContext'

const FORM_VACIO = { nombre: '', direccion: '', telefono: '', email: '' }

export default function Farmacias() {
  const { entrarEstablecimiento } = useAuth()
  const navigate = useNavigate()
  const [farmacias,  setFarmacias]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState(false)
  const [editando,   setEditando]   = useState(null)
  const [form,       setForm]       = useState(FORM_VACIO)
  const [guardando,  setGuardando]  = useState(false)
  const [creando,    setCreando]    = useState(false)
  const [entrando,   setEntrando]   = useState(null)

  async function cargar() {
    setLoading(true)
    try {
      const { data } = await api.get('/farmacias')
      setFarmacias(data)
    } catch { toast.error('Error al cargar farmacias') }
    finally { setLoading(false) }
  }

  useEffect(() => { cargar() }, [])

  function abrirNueva() {
    setEditando(null)
    setForm(FORM_VACIO)
    setModal(true)
  }

  function abrirEditar(f) {
    setEditando(f)
    setForm({ nombre: f.nombre, direccion: f.direccion || '', telefono: f.telefono || '', email: f.email || '' })
    setModal(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nombre.trim()) return toast.error('El nombre es requerido')
    setGuardando(true)
    if (!editando) setCreando(true)
    try {
      if (editando) {
        await api.put(`/farmacias/${editando.id}`, form)
        toast.success('Farmacia actualizada')
      } else {
        await api.post('/farmacias', form)
        toast.success('Farmacia creada con su base de datos')
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

  async function toggleActiva(f) {
    try {
      await api.patch(`/farmacias/${f.id}/activa`, { activa: !f.activa })
      toast.success(f.activa ? 'Farmacia desactivada' : 'Farmacia activada')
      cargar()
    } catch { toast.error('Error al cambiar estado') }
  }

  async function entrar(f) {
    if (!f.activa) return toast.error('La farmacia está inactiva')
    setEntrando(f.id)
    try {
      await entrarEstablecimiento('farmacia', f.id)
      toast.success(`Entrando a ${f.nombre}`)
      navigate('/farmacia/dashboard')
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
          <h2 className="text-2xl font-bold text-gray-800">Farmacias</h2>
          <p className="text-gray-500 text-sm mt-0.5">Gestión de establecimientos farmacéuticos</p>
        </div>
        <button onClick={abrirNueva}
          className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition">
          <Plus size={18} /> Nueva Farmacia
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-400">Cargando...</div>
        ) : farmacias.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <ShoppingBag size={40} className="mx-auto mb-3 opacity-30" />
            <p>No hay farmacias registradas</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-5 py-3 text-left">Farmacia</th>
                <th className="px-5 py-3 text-left">Contacto</th>
                <th className="px-5 py-3 text-left">Base de datos</th>
                <th className="px-5 py-3 text-left">Estado</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {farmacias.map(f => (
                <tr key={f.id} className={`hover:bg-gray-50 ${!f.activa ? 'opacity-50' : ''}`}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-rose-100 rounded-xl flex items-center justify-center shrink-0">
                        <ShoppingBag size={17} className="text-rose-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{f.nombre}</p>
                        {f.direccion && <p className="text-gray-400 text-xs">{f.direccion}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-500 text-xs">
                    <p>{f.telefono || '—'}</p>
                    <p>{f.email || ''}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">{f.db_name}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${f.activa ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {f.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => entrar(f)}
                        disabled={entrando === f.id || !f.activa}
                        title="Entrar como admin de esta farmacia"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white text-xs font-semibold rounded-lg transition">
                        {entrando === f.id
                          ? <Loader2 size={13} className="animate-spin" />
                          : <LogIn size={13} />}
                        Entrar
                      </button>
                      <button onClick={() => abrirEditar(f)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => toggleActiva(f)}
                        title={f.activa ? 'Desactivar' : 'Activar'}
                        className={`p-1.5 rounded-lg transition ${f.activa ? 'text-green-500 hover:bg-red-50 hover:text-red-500' : 'text-gray-400 hover:bg-green-50 hover:text-green-600'}`}>
                        {f.activa ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modal} onClose={() => !guardando && setModal(false)}
        title={editando ? 'Editar Farmacia' : 'Nueva Farmacia'} size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editando && (
            <div className="bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 text-sm text-rose-700">
              <p className="font-medium mb-1">Se creará automáticamente:</p>
              <ul className="text-xs space-y-0.5 text-rose-600">
                <li>• Una nueva base de datos PostgreSQL</li>
                <li>• Tablas de productos, lotes, ventas y proveedores</li>
                <li>• 10 categorías de productos por defecto</li>
              </ul>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre <span className="text-red-500">*</span></label>
            <input required value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Farmacia Central" />
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
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} disabled={guardando}
              className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-40 transition">
              Cancelar
            </button>
            <button type="submit" disabled={guardando}
              className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white py-2.5 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2">
              {guardando && <Loader2 size={15} className="animate-spin" />}
              {guardando ? (creando ? 'Creando base de datos...' : 'Guardando...') : (editando ? 'Actualizar' : 'Crear Farmacia')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
