import { useState, useEffect, useCallback } from 'react'
import { Building2, ShoppingBag, TrendingUp, Activity } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

function EstablecimientoCard({ nombre, stats, tipo }) {
  const isClinica = tipo === 'clinica'
  return (
    <div className={`bg-white rounded-2xl shadow-sm p-5 border-l-4 ${isClinica ? 'border-blue-500' : 'border-rose-500'}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isClinica ? 'bg-blue-100' : 'bg-rose-100'}`}>
          {isClinica
            ? <Building2 size={17} className="text-blue-600" />
            : <ShoppingBag size={17} className="text-rose-600" />}
        </div>
        <p className="font-semibold text-gray-800">{nombre}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {isClinica ? (
          <>
            <div className="text-center bg-blue-50 rounded-xl p-3">
              <p className="text-2xl font-bold text-blue-700">{stats.atenciones || 0}</p>
              <p className="text-xs text-blue-500 mt-0.5">Atenciones</p>
            </div>
            <div className="text-center bg-green-50 rounded-xl p-3">
              <p className="text-2xl font-bold text-green-700">
                Bs. {parseFloat(stats.ingresos || 0).toFixed(0)}
              </p>
              <p className="text-xs text-green-500 mt-0.5">Ingresos</p>
            </div>
          </>
        ) : (
          <>
            <div className="text-center bg-rose-50 rounded-xl p-3">
              <p className="text-2xl font-bold text-rose-700">{stats.ventas || 0}</p>
              <p className="text-xs text-rose-500 mt-0.5">Ventas</p>
            </div>
            <div className="text-center bg-green-50 rounded-xl p-3">
              <p className="text-2xl font-bold text-green-700">
                Bs. {parseFloat(stats.ingresos || 0).toFixed(0)}
              </p>
              <p className="text-xs text-green-500 mt-0.5">Ingresos</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function ReportesAdmin() {
  const [data,       setData]       = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [fechaDesde, setFechaDesde] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toLocaleDateString('en-CA')
  })
  const [fechaHasta, setFechaHasta] = useState(new Date().toLocaleDateString('en-CA'))

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const { data: res } = await api.get(
        `/admin/reportes/global?fecha_desde=${fechaDesde}&fecha_hasta=${fechaHasta}`
      )
      setData(res)
    } catch { toast.error('Error al cargar reporte global') }
    finally { setLoading(false) }
  }, [fechaDesde, fechaHasta])

  useEffect(() => { cargar() }, [cargar])

  const totalIngresos = data
    ? (parseFloat(data.total_clinicas.ingresos) + parseFloat(data.total_farmacias.ingresos))
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Reportes Globales</h2>
        <p className="text-gray-500 text-sm mt-0.5">Vista consolidada de toda la red</p>
      </div>

      {/* Selector fechas */}
      <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Desde</label>
          <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Hasta</label>
          <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button onClick={cargar} disabled={loading}
          className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-sm font-medium transition">
          {loading ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      {loading && !data && (
        <div className="bg-white rounded-2xl p-10 text-center text-gray-400">
          Consultando todas las bases de datos...
        </div>
      )}

      {data && (
        <>
          {/* Resumen global */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-2xl p-5">
              <p className="text-sm opacity-80">Ingresos totales</p>
              <p className="text-3xl font-bold mt-1">Bs. {totalIngresos.toFixed(2)}</p>
              <p className="text-xs opacity-60 mt-1">Clínicas + Farmacias</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-5 border border-blue-100">
              <div className="flex items-center gap-2 mb-1">
                <Activity size={15} className="text-blue-500" />
                <p className="text-sm text-gray-500">Atenciones clínicas</p>
              </div>
              <p className="text-3xl font-bold text-gray-800">{data.total_clinicas.atenciones}</p>
              <p className="text-xs text-gray-400 mt-1">Bs. {parseFloat(data.total_clinicas.ingresos).toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-5 border border-rose-100">
              <div className="flex items-center gap-2 mb-1">
                <ShoppingBag size={15} className="text-rose-500" />
                <p className="text-sm text-gray-500">Ventas farmacia</p>
              </div>
              <p className="text-3xl font-bold text-gray-800">{data.total_farmacias.ventas}</p>
              <p className="text-xs text-gray-400 mt-1">Bs. {parseFloat(data.total_farmacias.ingresos).toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={15} className="text-green-500" />
                <p className="text-sm text-gray-500">Establecimientos</p>
              </div>
              <p className="text-3xl font-bold text-gray-800">
                {data.clinicas.length + data.farmacias.length}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {data.clinicas.length} clínicas · {data.farmacias.length} farmacias
              </p>
            </div>
          </div>

          {/* Por clínica */}
          {data.clinicas.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Building2 size={16} className="text-blue-500" /> Clínicas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.clinicas.map(c => (
                  <EstablecimientoCard key={c.id} nombre={c.nombre} stats={c} tipo="clinica" />
                ))}
              </div>
            </div>
          )}

          {/* Por farmacia */}
          {data.farmacias.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <ShoppingBag size={16} className="text-rose-500" /> Farmacias
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.farmacias.map(f => (
                  <EstablecimientoCard key={f.id} nombre={f.nombre} stats={f} tipo="farmacia" />
                ))}
              </div>
            </div>
          )}

          {/* Tabla comparativa */}
          {(data.clinicas.length + data.farmacias.length) > 1 && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100">
                <h3 className="font-semibold text-gray-700 text-sm">Comparativo de ingresos</h3>
              </div>
              <div className="p-5 space-y-2">
                {[...data.clinicas.map(c => ({ nombre: c.nombre, ingresos: parseFloat(c.ingresos || 0), tipo: 'Clínica' })),
                  ...data.farmacias.map(f => ({ nombre: f.nombre, ingresos: parseFloat(f.ingresos || 0), tipo: 'Farmacia' })),
                ].sort((a, b) => b.ingresos - a.ingresos).map(item => {
                  const pct = totalIngresos > 0 ? Math.round((item.ingresos / totalIngresos) * 100) : 0
                  return (
                    <div key={item.nombre} className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-16 text-center ${
                        item.tipo === 'Clínica' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'
                      }`}>{item.tipo}</span>
                      <span className="text-sm text-gray-700 flex-1">{item.nombre}</span>
                      <div className="w-40 bg-gray-100 rounded-full h-2">
                        <div className={`h-2 rounded-full ${item.tipo === 'Clínica' ? 'bg-blue-500' : 'bg-rose-500'}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-sm font-bold text-gray-800 w-32 text-right">
                        Bs. {item.ingresos.toFixed(2)}
                      </span>
                      <span className="text-xs text-gray-400 w-10 text-right">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
