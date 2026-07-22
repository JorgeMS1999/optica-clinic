import { useState, useEffect, useCallback } from 'react'
import { Search, UserPlus, ChevronRight, CheckCircle, Clock } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import Modal from '../../components/ui/Modal'
import FichaCompletaForm from './FichaCompletaForm'

export default function Pacientes() {
  const [pacientes, setPacientes] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(false)
  const [modalRapido, setModalRapido] = useState(false)
  const [modalFicha, setModalFicha] = useState(null)
  const [formRapido, setFormRapido] = useState({ nombre: '', carnet: '' })

  const buscar = useCallback(async (q) => {
    setLoading(true)
    try {
      const { data } = await api.get(`/pacientes?q=${encodeURIComponent(q)}`)
      setPacientes(data)
    } catch { toast.error('Error al buscar pacientes') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => buscar(busqueda), 300)
    return () => clearTimeout(t)
  }, [busqueda, buscar])

  async function registroRapido(e) {
    e.preventDefault()
    try {
      const { data } = await api.post('/pacientes/rapido', formRapido)
      toast.success(data.ya_existia ? 'Paciente ya registrado' : 'Paciente registrado')
      setModalRapido(false)
      setFormRapido({ nombre: '', carnet: '' })
      buscar(busqueda)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrar')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Pacientes</h2>
          <p className="text-gray-500 text-sm mt-0.5">Registro y gestión de pacientes</p>
        </div>
        <button
          onClick={() => setModalRapido(true)}
          className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition"
        >
          <UserPlus size={18} /> Registro Rápido
        </button>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre o carnet..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>

      {/* Lista */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Buscando...</div>
        ) : pacientes.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            {busqueda ? 'No se encontraron pacientes' : 'Busca un paciente o haz un registro rápido'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-6 py-3 text-left">Paciente</th>
                <th className="px-6 py-3 text-left">Carnet</th>
                <th className="px-6 py-3 text-left">Teléfono</th>
                <th className="px-6 py-3 text-left">Ficha</th>
                <th className="px-6 py-3 text-left"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pacientes.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-800">{p.nombre}</td>
                  <td className="px-6 py-4 text-gray-600 font-mono">{p.carnet}</td>
                  <td className="px-6 py-4 text-gray-500">{p.telefono || '—'}</td>
                  <td className="px-6 py-4">
                    {p.registrado_completo ? (
                      <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                        <CheckCircle size={14} /> Completa
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-yellow-600 text-xs font-medium">
                        <Clock size={14} /> Pendiente
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setModalFicha(p)}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium ml-auto"
                    >
                      Ver / Editar <ChevronRight size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal registro rápido */}
      <Modal open={modalRapido} onClose={() => setModalRapido(false)} title="Registro Rápido" size="sm">
        <p className="text-gray-500 text-sm mb-5">
          Solo nombre y carnet. La ficha completa se llena antes de la consulta.
        </p>
        <form onSubmit={registroRapido} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
            <input
              required value={formRapido.nombre}
              onChange={e => setFormRapido(f => ({ ...f, nombre: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Juan Pérez"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Carnet / CI</label>
            <input
              required value={formRapido.carnet}
              onChange={e => setFormRapido(f => ({ ...f, carnet: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="1234567"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalRapido(false)}
              className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
              Cancelar
            </button>
            <button type="submit"
              className="flex-1 bg-blue-700 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-800 transition">
              Registrar
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal ficha completa */}
      <Modal open={!!modalFicha} onClose={() => setModalFicha(null)}
        title={`Ficha: ${modalFicha?.nombre}`} size="lg">
        {modalFicha && (
          <FichaCompletaForm
            paciente={modalFicha}
            onGuardado={() => { setModalFicha(null); buscar(busqueda) }}
          />
        )}
      </Modal>
    </div>
  )
}
