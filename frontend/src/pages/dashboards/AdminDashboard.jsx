import { useEffect, useState } from 'react'
import { Building2, Store, Users, Activity } from 'lucide-react'
import api from '../../services/api'

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm flex items-center gap-4">
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={26} className="text-white" />
      </div>
      <div>
        <p className="text-gray-500 text-sm">{label}</p>
        <p className="text-3xl font-bold text-gray-800">{value ?? '—'}</p>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const [clinicas, setClincias] = useState([])
  const [usuarios, setUsuarios] = useState([])

  useEffect(() => {
    api.get('/clinicas').then(r => setClincias(r.data)).catch(() => {})
    api.get('/usuarios').then(r => setUsuarios(r.data)).catch(() => {})
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Panel de Administración</h2>
        <p className="text-gray-500 text-sm mt-1">Vista global del sistema</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Building2} label="Clínicas"  value={clinicas.length}  color="bg-blue-600" />
        <StatCard icon={Store}     label="Farmacias" value={3}                color="bg-rose-500" />
        <StatCard icon={Users}     label="Usuarios"  value={usuarios.length}  color="bg-purple-600" />
        <StatCard icon={Activity}  label="Sistema"   value="OK"               color="bg-green-500" />
      </div>

      {/* Tabla de clínicas */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Clínicas registradas</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="px-6 py-3 text-left">Nombre</th>
              <th className="px-6 py-3 text-left">Base de datos</th>
              <th className="px-6 py-3 text-left">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {clinicas.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-800">{c.nombre}</td>
                <td className="px-6 py-4 text-gray-500 font-mono text-xs">{c.db_name}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    c.activa ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {c.activa ? 'Activa' : 'Inactiva'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
