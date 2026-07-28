import { useState, useEffect, useCallback } from 'react'
import { Search, Eye } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'

export default function MisPacientes() {
  const [busqueda, setBusqueda] = useState('')
  const [pacientes, setPacientes] = useState([])
  const [loading, setLoading] = useState(false)
  const [historialModal, setHistorialModal] = useState(null)
  const [historial, setHistorial] = useState([])

  const buscar = useCallback(async (q) => {
    setLoading(true)
    try {
      const { data } = await api.get(`/pacientes?q=${encodeURIComponent(q)}`)
      setPacientes(data)
    } catch { toast.error('Error al buscar') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => buscar(busqueda), 300)
    return () => clearTimeout(t)
  }, [busqueda, buscar])

  async function verHistorial(paciente) {
    setHistorialModal(paciente)
    try {
      const { data } = await api.get(`/pacientes/${paciente.id}/historial`)
      setHistorial(data)
    } catch { toast.error('Error al cargar historial') }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Mis Pacientes</h2>
        <p className="text-gray-500 text-sm mt-0.5">Busca pacientes y revisa su historial</p>
      </div>

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

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Buscando...</div>
        ) : pacientes.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            {busqueda ? 'Sin resultados' : 'Escribe un nombre o carnet para buscar'}
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
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
                  <td className="px-6 py-4 font-medium text-gray-800 whitespace-nowrap">{p.nombre}</td>
                  <td className="px-6 py-4 text-gray-600 font-mono whitespace-nowrap">{p.carnet}</td>
                  <td className="px-6 py-4 text-gray-500 whitespace-nowrap">{p.telefono || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                      p.registrado_completo ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {p.registrado_completo ? 'Completa' : 'Pendiente'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => verHistorial(p)}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium ml-auto whitespace-nowrap"
                    >
                      <Eye size={16} /> Historial
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      <Modal
        open={!!historialModal}
        onClose={() => { setHistorialModal(null); setHistorial([]) }}
        title={`Historial: ${historialModal?.nombre}`}
        size="lg"
      >
        {historial.length === 0 ? (
          <p className="text-gray-400 text-center py-8">Primera visita del paciente</p>
        ) : (
          <div className="space-y-3">
            {historial.map(h => (
              <div key={h.id} className="border border-gray-100 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 font-mono text-sm">
                    {new Date(h.fecha + 'T12:00:00').toLocaleDateString('es', {
                      day: '2-digit', month: 'short', year: 'numeric'
                    })}
                  </span>
                  <Badge value={h.tipo} />
                  <Badge value={h.estado} />
                </div>
                {h.pago_total && (
                  <span className="text-green-600 text-sm font-semibold">
                    Bs. {parseFloat(h.pago_total).toFixed(2)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}
