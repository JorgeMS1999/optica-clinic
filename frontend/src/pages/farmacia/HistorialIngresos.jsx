import { useState, useEffect, useCallback } from 'react'
import { Package, TrendingDown } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

function diasHasta(fecha) {
  if (!fecha) return null
  const hoy  = new Date(); hoy.setHours(0,0,0,0)
  const venc = new Date(fecha); venc.setHours(0,0,0,0)
  return Math.round((venc - hoy) / 86400000)
}

function VencBadge({ fecha }) {
  if (!fecha) return <span className="text-gray-300 text-xs">—</span>
  const d = diasHasta(fecha)
  const fmt = new Date(fecha).toLocaleDateString('es-BO', { day:'2-digit', month:'short', year:'numeric' })
  if (d < 0)    return <span className="text-xs text-red-600 font-semibold">{fmt} ⚠</span>
  if (d <= 30)  return <span className="text-xs text-orange-500 font-medium">{fmt} ({d}d)</span>
  if (d <= 90)  return <span className="text-xs text-yellow-600">{fmt} ({d}d)</span>
  return <span className="text-xs text-gray-500">{fmt}</span>
}

export default function HistorialIngresos() {
  const [data,       setData]       = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [fechaDesde, setFechaDesde] = useState(() => {
    const d = new Date(); d.setDate(1)
    return d.toLocaleDateString('en-CA')
  })
  const [fechaHasta, setFechaHasta] = useState(new Date().toLocaleDateString('en-CA'))

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const { data: res } = await api.get(
        `/farmacia/lotes/ingresos?fecha_desde=${fechaDesde}&fecha_hasta=${fechaHasta}`
      )
      setData(res)
    } catch { toast.error('Error al cargar ingresos') }
    finally { setLoading(false) }
  }, [fechaDesde, fechaHasta])

  useEffect(() => { cargar() }, [cargar])

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Historial de Ingresos</h2>
        <p className="text-gray-500 text-sm mt-0.5">Registro de todos los lotes recibidos (compras)</p>
      </div>

      {/* Filtros */}
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

        {data && (
          <div className="ml-auto flex gap-3">
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2 text-sm text-center">
              <p className="text-blue-400 text-xs">Lotes ingresados</p>
              <p className="text-blue-700 font-bold">{data.resumen.total_lotes}</p>
            </div>
            <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-2 text-sm text-center">
              <p className="text-green-400 text-xs">Total unidades</p>
              <p className="text-green-700 font-bold">{data.resumen.total_unidades}</p>
            </div>
            <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-2 text-sm text-center">
              <p className="text-purple-400 text-xs">Costo total</p>
              <p className="text-purple-700 font-bold">Bs. {parseFloat(data.resumen.costo_total).toFixed(2)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-400">Cargando...</div>
        ) : !data?.lotes?.length ? (
          <div className="p-10 text-center text-gray-400">
            <Package size={40} className="mx-auto mb-3 opacity-30" />
            <p>No hay ingresos en este período</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-5 py-3 text-left">Fecha recepción</th>
                <th className="px-5 py-3 text-left">Producto</th>
                <th className="px-5 py-3 text-left">Nro. Lote</th>
                <th className="px-5 py-3 text-left">Proveedor</th>
                <th className="px-5 py-3 text-left">Vencimiento</th>
                <th className="px-5 py-3 text-right">Presentaciones</th>
                <th className="px-5 py-3 text-right">Unidades</th>
                <th className="px-5 py-3 text-right">Costo unit.</th>
                <th className="px-5 py-3 text-right">Costo total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.lotes.map(l => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-500 text-xs">
                    {l.fecha_recepcion
                      ? new Date(l.fecha_recepcion).toLocaleDateString('es-BO', { day:'2-digit', month:'short', year:'numeric' })
                      : new Date(l.creado_en).toLocaleDateString('es-BO', { day:'2-digit', month:'short', year:'numeric' })}
                  </td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-800">{l.producto_nombre}</p>
                    <p className="text-gray-400 text-xs">{l.unidad_medida}</p>
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-mono text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                      {l.numero_lote || '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{l.proveedor_nombre || '—'}</td>
                  <td className="px-5 py-3"><VencBadge fecha={l.fecha_vencimiento} /></td>
                  <td className="px-5 py-3 text-right text-gray-500 text-xs">
                    {l.cantidad_presentaciones} × {l.unidades_por_presentacion}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-800">{l.cantidad_unidades}</td>
                  <td className="px-5 py-3 text-right text-gray-500">
                    {l.costo_unitario ? `Bs. ${parseFloat(l.costo_unitario).toFixed(2)}` : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-700">
                    {parseFloat(l.costo_total) > 0
                      ? `Bs. ${parseFloat(l.costo_total).toFixed(2)}`
                      : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
              <tr>
                <td colSpan={6} className="px-5 py-3 text-right text-xs text-gray-500 font-medium">TOTALES</td>
                <td className="px-5 py-3 text-right font-bold text-gray-800">{data.resumen.total_unidades}</td>
                <td className="px-5 py-3"></td>
                <td className="px-5 py-3 text-right font-bold text-gray-800">
                  Bs. {parseFloat(data.resumen.costo_total).toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  )
}
