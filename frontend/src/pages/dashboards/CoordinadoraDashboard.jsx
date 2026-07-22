import { useEffect, useState } from 'react'
import { Calendar, UserCheck, Clock, CheckCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../../services/api'

export default function CoordinadoraDashboard() {
  const [resumen, setResumen] = useState(null)
  const [citas, setCitas] = useState([])

  useEffect(() => {
    api.get('/citas/hoy/resumen').then(r => setResumen(r.data)).catch(() => {})
    const hoy = new Date().toLocaleDateString('en-CA')
    api.get(`/citas?fecha=${hoy}`).then(r => setCitas(r.data.slice(0,5))).catch(() => {})
  }, [])

  const fecha = new Date().toLocaleDateString('es', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 capitalize">
          {fecha}
        </h2>
        <p className="text-gray-500 text-sm mt-0.5">Panel de coordinación</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Calendar,    label: 'Citas hoy',      value: resumen?.total,      color: 'bg-blue-600' },
          { icon: Clock,       label: 'En espera',       value: resumen?.en_espera,  color: 'bg-yellow-500' },
          { icon: UserCheck,   label: 'Atendidos',       value: resumen?.atendidas,  color: 'bg-green-500' },
          { icon: CheckCircle, label: 'Programadas',     value: resumen?.programadas,color: 'bg-purple-600' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl p-6 shadow-sm flex items-center gap-4">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${color}`}>
              <Icon size={26} className="text-white" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">{label}</p>
              <p className="text-3xl font-bold text-gray-800">{value ?? '—'}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Próximas citas del día */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Citas de hoy</h3>
          <Link to="/coordinadora/citas" className="text-sm text-blue-600 hover:underline font-medium">
            Ver todas →
          </Link>
        </div>
        {citas.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No hay citas para hoy</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-6 py-3 text-left">Hora</th>
                <th className="px-6 py-3 text-left">Paciente</th>
                <th className="px-6 py-3 text-left">Doctor</th>
                <th className="px-6 py-3 text-left">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {citas.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-mono font-medium">{c.hora?.slice(0,5)}</td>
                  <td className="px-6 py-3 font-medium text-gray-800">{c.paciente_nombre}</td>
                  <td className="px-6 py-3 text-gray-600">{c.doctor_nombre}</td>
                  <td className="px-6 py-3">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      {c.estado.replace('_',' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
