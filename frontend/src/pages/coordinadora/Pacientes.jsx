import { useState, useEffect, useCallback } from 'react'
import { Search, UserPlus, ChevronRight, CheckCircle, Clock, Ruler } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import Modal from '../../components/ui/Modal'
import FichaCompletaForm from './FichaCompletaForm'
import { imprimirCalibracionHC } from '../../utils/imprimirCalibracion'

export default function Pacientes() {
  const [pacientes, setPacientes] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(false)
  const [modalNuevo, setModalNuevo] = useState(false)
  const [modalFicha, setModalFicha] = useState(null)
  const [proximoHC, setProximoHC] = useState(null)

  const buscar = useCallback(async (q) => {
    setLoading(true)
    try {
      const { data } = await api.get(`/pacientes?q=${encodeURIComponent(q)}`)
      setPacientes(data)
    } catch { toast.error('Error al buscar pacientes') }
    finally { setLoading(false) }
  }, [])

  const cargarProximoHC = useCallback(() => {
    api.get('/pacientes/proximo-historia').then(r => setProximoHC(r.data.proximo)).catch(() => {})
  }, [])

  useEffect(() => {
    const t = setTimeout(() => buscar(busqueda), 300)
    return () => clearTimeout(t)
  }, [busqueda, buscar])

  useEffect(() => { cargarProximoHC() }, [cargarProximoHC])

  function abrirRegistro() {
    cargarProximoHC()
    setModalNuevo(true)
  }

  async function abrirFicha(p) {
    try {
      const { data } = await api.get(`/pacientes/${p.id}`)
      setModalFicha(data)
    } catch {
      setModalFicha(p)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Pacientes</h2>
          <p className="text-gray-500 text-sm mt-0.5">Registro y gestión de pacientes</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={imprimirCalibracionHC}
            title="Imprime una hoja de reglas (cm) para calibrar la impresión sobre el formulario"
            className="flex items-center gap-2 border border-gray-300 text-gray-600 hover:bg-gray-50 px-4 py-2.5 rounded-xl font-medium text-sm transition"
          >
            <Ruler size={17} /> Calibrar HC
          </button>
          <button
            onClick={abrirRegistro}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition"
          >
            <UserPlus size={18} /> Nuevo Paciente
          </button>
        </div>
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
                <th className="px-6 py-3 text-left">HC N°</th>
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
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold font-mono">
                      {p.nro_historia ?? '—'}
                    </span>
                  </td>
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
                      onClick={() => abrirFicha(p)}
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

      {/* Modal nuevo paciente (ficha completa) */}
      <Modal open={modalNuevo} onClose={() => setModalNuevo(false)} title="Nuevo Paciente" size="xl">
        <FichaCompletaForm
          paciente={null}
          proximoHC={proximoHC}
          onGuardado={() => { setModalNuevo(false); buscar(busqueda); cargarProximoHC() }}
        />
      </Modal>

      {/* Modal ficha completa (editar) */}
      <Modal open={!!modalFicha} onClose={() => setModalFicha(null)}
        title={`Ficha: ${modalFicha?.nombre}`} size="xl">
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
