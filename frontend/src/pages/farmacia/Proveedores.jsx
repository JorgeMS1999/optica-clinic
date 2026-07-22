import { useState, useEffect } from 'react'
import { Plus, Edit2, Truck } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import Modal from '../../components/ui/Modal'

const FORM_VACIO = { nombre: '', contacto: '', telefono: '', email: '', direccion: '' }

export default function Proveedores() {
  const [proveedores, setProveedores] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [modal,       setModal]       = useState(false)
  const [editando,    setEditando]    = useState(null)
  const [form,        setForm]        = useState(FORM_VACIO)
  const [guardando,   setGuardando]   = useState(false)

  async function cargar() {
    setLoading(true)
    try {
      const { data } = await api.get('/farmacia/proveedores')
      setProveedores(data)
    } catch { toast.error('Error al cargar proveedores') }
    finally { setLoading(false) }
  }

  useEffect(() => { cargar() }, [])

  function abrirNuevo() {
    setEditando(null)
    setForm(FORM_VACIO)
    setModal(true)
  }

  function abrirEditar(p) {
    setEditando(p)
    setForm({
      nombre:    p.nombre,
      contacto:  p.contacto  || '',
      telefono:  p.telefono  || '',
      email:     p.email     || '',
      direccion: p.direccion || '',
    })
    setModal(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nombre.trim()) return toast.error('El nombre es requerido')
    setGuardando(true)
    try {
      if (editando) {
        await api.put(`/farmacia/proveedores/${editando.id}`, form)
        toast.success('Proveedor actualizado')
      } else {
        await api.post('/farmacia/proveedores', form)
        toast.success('Proveedor creado')
      }
      setModal(false)
      cargar()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar')
    } finally { setGuardando(false) }
  }

  const campo = (label, key, placeholder = '', type = 'text') => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder={placeholder} />
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Proveedores</h2>
          <p className="text-gray-500 text-sm mt-0.5">Empresas y distribuidores de productos</p>
        </div>
        <button onClick={abrirNuevo}
          className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition">
          <Plus size={18} /> Nuevo Proveedor
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-400">Cargando...</div>
        ) : proveedores.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <Truck size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No hay proveedores registrados</p>
            <p className="text-sm mt-1">Agrega uno para asignarlo a tus productos</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-5 py-3 text-left">Proveedor</th>
                <th className="px-5 py-3 text-left">Contacto</th>
                <th className="px-5 py-3 text-left">Teléfono</th>
                <th className="px-5 py-3 text-left">Email</th>
                <th className="px-5 py-3 text-left">Dirección</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {proveedores.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                        <Truck size={14} className="text-indigo-600" />
                      </div>
                      <span className="font-semibold text-gray-800">{p.nombre}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">{p.contacto || '—'}</td>
                  <td className="px-5 py-3.5 text-gray-500">{p.telefono || '—'}</td>
                  <td className="px-5 py-3.5 text-gray-500">{p.email || '—'}</td>
                  <td className="px-5 py-3.5 text-gray-400 text-xs max-w-xs truncate">{p.direccion || '—'}</td>
                  <td className="px-5 py-3.5 text-right">
                    <button onClick={() => abrirEditar(p)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                      <Edit2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)}
        title={editando ? 'Editar Proveedor' : 'Nuevo Proveedor'} size="sm">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre <span className="text-red-500">*</span></label>
            <input required value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nombre de la empresa o distribuidor" />
          </div>
          {campo('Persona de contacto', 'contacto', 'Nombre del representante')}
          <div className="grid grid-cols-2 gap-3">
            {campo('Teléfono', 'telefono', 'Ej: 70012345')}
            {campo('Email', 'email', 'correo@proveedor.com', 'email')}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
            <input value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Dirección del proveedor" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)}
              className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
              Cancelar
            </button>
            <button type="submit" disabled={guardando}
              className="flex-1 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white py-2.5 rounded-xl text-sm font-medium transition">
              {guardando ? 'Guardando...' : (editando ? 'Actualizar' : 'Crear Proveedor')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
