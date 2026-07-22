import { useEffect, useState, useCallback } from 'react'
import { CheckCircle, Clock, Stethoscope, Users, ChevronLeft, ChevronRight, Eye, FileText } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import toast from 'react-hot-toast'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import DetallePaciente from './DetallePaciente'

const DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function toLocalISO(date) {
  return date.toLocaleDateString('en-CA')
}

const ESTADOS_DOCTOR = ['en_espera','en_consulta','atendida','no_asistio']
const ESTADO_LABEL = {
  en_espera:   'Llamar',
  en_consulta: 'En consulta',
  atendida:    'Atendida',
  no_asistio:  'No asistió',
}
const SIGUIENTE_ESTADO = {
  programada:  'en_espera',
  confirmada:  'en_espera',
  en_espera:   'en_consulta',
  en_consulta: 'atendida',
}

export default function DoctorDashboard() {
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const [perfil, setPerfil]   = useState(null)
  const [resumen, setResumen] = useState(null)
  const [citas, setCitas]     = useState([])
  const [fecha, setFecha]     = useState(toLocalISO(new Date()))
  const [loading, setLoading] = useState(false)
  const [detalle, setDetalle] = useState(null)

  useEffect(() => {
    api.get('/doctores/mi-perfil').then(r => setPerfil(r.data)).catch(() => {})
    api.get('/doctores/mi-resumen').then(r => setResumen(r.data)).catch(() => {})
  }, [])

  const cargarAgenda = useCallback(async (f) => {
    setLoading(true)
    try {
      const { data } = await api.get(`/doctores/mi-agenda?fecha=${f}`)
      setCitas(data)
    } catch { toast.error('Error al cargar agenda') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { cargarAgenda(fecha) }, [fecha, cargarAgenda])

  function cambiarDia(delta) {
    const d = new Date(fecha + 'T12:00:00')
    d.setDate(d.getDate() + delta)
    setFecha(toLocalISO(d))
  }

  async function avanzarEstado(cita) {
    const siguiente = SIGUIENTE_ESTADO[cita.estado]
    if (!siguiente) return
    try {
      await api.patch(`/citas/${cita.id}/estado`, { estado: siguiente })
      cargarAgenda(fecha)
      api.get('/doctores/mi-resumen').then(r => setResumen(r.data)).catch(() => {})
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al actualizar')
    }
  }

  async function marcarNoAsistio(citaId) {
    try {
      await api.patch(`/citas/${citaId}/estado`, { estado: 'no_asistio' })
      toast.success('Marcado como no asistió')
      cargarAgenda(fecha)
    } catch { toast.error('Error al actualizar') }
  }

  const fechaObj = new Date(fecha + 'T12:00:00')
  const esHoy = fecha === toLocalISO(new Date())

  const stats = [
    { icon: Users,       label: 'Total hoy',    value: resumen?.total,      color: 'bg-blue-600' },
    { icon: Clock,       label: 'Pendientes',   value: resumen?.pendientes, color: 'bg-yellow-500' },
    { icon: Stethoscope, label: 'En consulta',  value: resumen?.en_consulta,color: 'bg-purple-600' },
    { icon: CheckCircle, label: 'Atendidos',    value: resumen?.atendidas,  color: 'bg-green-500' },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm p-6 flex items-center gap-4">
        <div className="w-14 h-14 bg-cyan-100 rounded-2xl flex items-center justify-center shrink-0">
          <Stethoscope size={28} className="text-cyan-700" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            {perfil?.nombre || usuario?.nombre}
          </h2>
          <p className="text-gray-500 text-sm">{perfil?.especialidad || 'Oftalmología'}</p>
        </div>
      </div>

      {/* Stats — solo se muestran para hoy */}
      {esHoy && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color} shrink-0`}>
                <Icon size={22} className="text-white" />
              </div>
              <div>
                <p className="text-gray-500 text-xs">{label}</p>
                <p className="text-2xl font-bold text-gray-800">{value ?? '—'}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Navegador de fecha */}
      <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-4">
        <button onClick={() => cambiarDia(-1)}
          className="p-2 hover:bg-gray-100 rounded-xl transition">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1 text-center">
          <p className="font-semibold text-gray-800">
            {DIAS[fechaObj.getDay()]}, {fechaObj.getDate()} de {MESES[fechaObj.getMonth()]} {fechaObj.getFullYear()}
          </p>
          {esHoy && <span className="text-xs text-blue-600 font-medium">Hoy</span>}
        </div>
        <button onClick={() => cambiarDia(1)}
          className="p-2 hover:bg-gray-100 rounded-xl transition">
          <ChevronRight size={20} />
        </button>
        <input type="date" value={fecha}
          onChange={e => setFecha(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {/* Lista de pacientes del día */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-2xl p-8 text-center text-gray-400">Cargando agenda...</div>
        ) : citas.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center text-gray-400">
            <Stethoscope size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">Sin citas para este día</p>
          </div>
        ) : (
          citas.map((c, idx) => (
            <div key={c.id}
              className={`bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4 border-l-4 transition
                ${c.estado === 'atendida'    ? 'border-green-400 opacity-70' :
                  c.estado === 'en_consulta' ? 'border-purple-500' :
                  c.estado === 'en_espera'   ? 'border-yellow-400' :
                  c.estado === 'no_asistio'  ? 'border-gray-300 opacity-50' :
                  'border-blue-400'}`}
            >
              {/* Número y hora */}
              <div className="text-center shrink-0 w-12">
                <p className="text-2xl font-bold text-gray-300">#{idx + 1}</p>
                <p className="text-xs font-mono text-gray-500 mt-0.5">{c.hora?.slice(0,5)}</p>
              </div>

              {/* Info paciente */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-800 truncate">{c.paciente_nombre}</p>
                  <Badge value={c.tipo} />
                  {!c.registrado_completo && (
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                      Ficha incompleta
                    </span>
                  )}
                </div>
                <p className="text-gray-400 text-xs mt-0.5">CI: {c.carnet} {c.telefono ? `• ${c.telefono}` : ''}</p>
                {c.motivo && <p className="text-gray-500 text-sm mt-1 truncate">"{c.motivo}"</p>}
              </div>

              {/* Estado */}
              <div className="shrink-0">
                <Badge value={c.estado} />
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Ver detalle del paciente */}
                <button
                  onClick={() => setDetalle(c)}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition"
                  title="Ver detalle del paciente"
                >
                  <Eye size={18} />
                </button>

                {/* Ver / abrir consulta */}
                {(c.estado === 'en_consulta' || c.estado === 'atendida') && (
                  <button
                    onClick={() => navigate(`/doctor/consulta/${c.id}`)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap
                      ${c.estado === 'en_consulta'
                        ? 'bg-purple-600 hover:bg-purple-700 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                  >
                    <FileText size={15} />
                    {c.estado === 'en_consulta' ? 'Registrar consulta' : 'Ver consulta'}
                  </button>
                )}

                {/* Llamar / Iniciar */}
                {(c.estado === 'programada' || c.estado === 'confirmada' || c.estado === 'en_espera') && (
                  <button
                    onClick={() => avanzarEstado(c)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap
                      ${c.estado === 'en_espera'
                        ? 'bg-purple-600 hover:bg-purple-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                  >
                    {c.estado === 'en_espera' ? 'Iniciar consulta' : 'Llamar paciente'}
                  </button>
                )}

                {/* No asistió */}
                {['programada','confirmada','en_espera'].includes(c.estado) && (
                  <button
                    onClick={() => marcarNoAsistio(c.id)}
                    className="px-3 py-2 rounded-xl text-xs font-medium border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition"
                  >
                    No asistió
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal detalle paciente */}
      <Modal
        open={!!detalle}
        onClose={() => setDetalle(null)}
        title={detalle ? `Paciente: ${detalle.paciente_nombre}` : ''}
        size="lg"
      >
        {detalle && <DetallePaciente cita={detalle} />}
      </Modal>
    </div>
  )
}
