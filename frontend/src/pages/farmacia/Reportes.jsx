import { useState, useEffect, useCallback } from 'react'
import { ShoppingCart, DollarSign, TrendingUp, Package } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

function StatCard({ label, value, sub, color = 'blue' }) {
  const c = {
    blue:   'bg-blue-50   border-blue-100   text-blue-700',
    green:  'bg-green-50  border-green-100  text-green-700',
    purple: 'bg-purple-50 border-purple-100 text-purple-700',
    rose:   'bg-rose-50   border-rose-100   text-rose-700',
  }
  return (
    <div className={`rounded-2xl border p-5 ${c[color]}`}>
      <p className="text-sm font-medium opacity-75">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-1">{sub}</p>}
    </div>
  )
}

function BarraRanking({ label, sub, value, max, formato = v => v, color = 'bg-blue-500' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700 font-medium truncate">{label}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
      <div className="w-32 bg-gray-100 rounded-full h-2 shrink-0">
        <div className={`${color} h-2 rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-bold text-gray-700 w-28 text-right shrink-0">{formato(value)}</span>
    </div>
  )
}

export default function ReportesFarmacia() {
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
        `/farmacia/ventas/reporte?fecha_desde=${fechaDesde}&fecha_hasta=${fechaHasta}`
      )
      setData(res)
    } catch { toast.error('Error al cargar reporte') }
    finally { setLoading(false) }
  }, [fechaDesde, fechaHasta])

  useEffect(() => { cargar() }, [cargar])

  const maxProducto = data ? Math.max(...data.top_productos.map(p => parseFloat(p.total_ingresos)), 1) : 1
  const maxDia      = data ? Math.max(...data.por_dia.map(d => parseFloat(d.total)), 1) : 1

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Reportes — Farmacia</h2>
        <p className="text-gray-500 text-sm mt-0.5">Ventas y productos por período</p>
      </div>

      {/* Selector de fechas */}
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
        <div className="bg-white rounded-2xl p-10 text-center text-gray-400">Generando reporte...</div>
      )}

      {data && (
        <>
          {/* Tarjetas resumen */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total ingresos"    value={`Bs. ${parseFloat(data.summary.total_ingresos).toFixed(2)}`} color="green" />
            <StatCard label="Ventas realizadas" value={data.summary.total_ventas} sub="transacciones" color="blue" />
            <StatCard label="Ticket promedio"   value={`Bs. ${parseFloat(data.summary.ticket_promedio).toFixed(2)}`} color="purple" />
            <StatCard label="Total descuentos"  value={`Bs. ${parseFloat(data.summary.total_descuentos).toFixed(2)}`} color="rose" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Métodos de pago */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <DollarSign size={16} className="text-green-500" /> Por método de pago
              </h3>
              {data.por_metodo.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">Sin ventas en el período</p>
              ) : (
                <div className="space-y-1">
                  {data.por_metodo.map(m => (
                    <BarraRanking
                      key={m.metodo_pago}
                      label={m.metodo_pago.charAt(0).toUpperCase() + m.metodo_pago.slice(1)}
                      sub={`${m.cantidad} venta${m.cantidad > 1 ? 's' : ''}`}
                      value={parseFloat(m.total)}
                      max={parseFloat(data.summary.total_ingresos) || 1}
                      formato={v => `Bs. ${v.toFixed(2)}`}
                      color="bg-green-500"
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Ventas por día */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <TrendingUp size={16} className="text-blue-500" /> Ventas por día
              </h3>
              {data.por_dia.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">Sin ventas en el período</p>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {data.por_dia.map(d => (
                    <BarraRanking
                      key={d.fecha}
                      label={new Date(d.fecha + 'T12:00:00').toLocaleDateString('es-BO', { weekday: 'short', day: '2-digit', month: 'short' })}
                      sub={`${d.ventas} venta${d.ventas > 1 ? 's' : ''}`}
                      value={parseFloat(d.total)}
                      max={maxDia}
                      formato={v => `Bs. ${v.toFixed(2)}`}
                      color="bg-blue-500"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Top productos */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Package size={16} className="text-purple-500" /> Productos más vendidos (top 15)
            </h3>
            {data.top_productos.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">Sin ventas en el período</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8">
                {data.top_productos.map((p, i) => (
                  <div key={p.nombre} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <span className="text-gray-300 font-bold w-6 text-right shrink-0 text-sm">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 font-medium truncate">{p.nombre}</p>
                      <p className="text-xs text-gray-400">{p.unidades} uds. · {p.num_ventas} ventas</p>
                    </div>
                    <div className="w-20 bg-gray-100 rounded-full h-1.5 shrink-0">
                      <div className="bg-purple-500 h-1.5 rounded-full"
                        style={{ width: `${Math.round((parseFloat(p.total_ingresos) / maxProducto) * 100)}%` }} />
                    </div>
                    <span className="text-sm font-bold text-gray-800 w-28 text-right shrink-0">
                      Bs. {parseFloat(p.total_ingresos).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
