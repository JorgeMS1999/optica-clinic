import { useState, useEffect, useCallback } from 'react'
import { Search, Eye, XCircle, ShoppingCart, ChevronDown, ChevronRight } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import Modal from '../../components/ui/Modal'

function EstadoBadge({ estado }) {
  if (estado === 'completada') return <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">Completada</span>
  if (estado === 'anulada')    return <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-xs font-semibold">Anulada</span>
  return <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">{estado}</span>
}

function MetodoBadge({ metodo }) {
  const map = {
    efectivo:      'bg-green-50 text-green-700',
    tarjeta:       'bg-blue-50 text-blue-700',
    transferencia: 'bg-purple-50 text-purple-700',
    qr:            'bg-yellow-50 text-yellow-700',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[metodo] || 'bg-gray-100 text-gray-600'}`}>
      {metodo}
    </span>
  )
}

function DetalleVenta({ ventaId, onAnular }) {
  const [venta,    setVenta]    = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [anulando, setAnulando] = useState(false)

  useEffect(() => {
    api.get(`/farmacia/ventas/${ventaId}`)
      .then(r => setVenta(r.data))
      .catch(() => toast.error('Error al cargar detalle'))
      .finally(() => setLoading(false))
  }, [ventaId])

  async function confirmarAnular() {
    if (!window.confirm('¿Anular esta venta? El stock será restaurado.')) return
    setAnulando(true)
    try {
      await api.patch(`/farmacia/ventas/${ventaId}/anular`)
      toast.success('Venta anulada y stock restaurado')
      onAnular()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al anular')
    } finally { setAnulando(false) }
  }

  if (loading) return <div className="p-6 text-center text-gray-400">Cargando...</div>
  if (!venta)  return <div className="p-6 text-center text-red-400">Error al cargar</div>

  return (
    <div className="space-y-5">
      {/* Info venta */}
      <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-xl p-4 text-sm">
        <div><span className="text-gray-400">Fecha: </span><span className="font-medium">{new Date(venta.creado_en).toLocaleString('es-BO')}</span></div>
        <div><span className="text-gray-400">Estado: </span><EstadoBadge estado={venta.estado} /></div>
        <div><span className="text-gray-400">Método: </span><MetodoBadge metodo={venta.metodo_pago} /></div>
        {venta.referencia && <div><span className="text-gray-400">Referencia: </span><span className="font-mono text-xs">{venta.referencia}</span></div>}
        {venta.cliente_nombre && <div><span className="text-gray-400">Cliente: </span><span className="font-medium">{venta.cliente_nombre}</span></div>}
      </div>

      {/* Items */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Productos vendidos</p>
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-2 text-left">Producto</th>
                <th className="px-4 py-2 text-right">Cant.</th>
                <th className="px-4 py-2 text-right">P. Unit.</th>
                <th className="px-4 py-2 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(venta.detalle || []).map(d => (
                <tr key={d.id}>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-gray-800">{d.producto_nombre}</p>
                    {d.numero_lote && <p className="text-gray-400 text-xs font-mono">Lote: {d.numero_lote}</p>}
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-600">{d.cantidad}</td>
                  <td className="px-4 py-2.5 text-right text-gray-600">Bs. {parseFloat(d.precio_unitario).toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-gray-800">Bs. {parseFloat(d.subtotal).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totales */}
      <div className="space-y-1.5 text-sm border-t border-gray-100 pt-3">
        <div className="flex justify-between text-gray-500">
          <span>Subtotal</span>
          <span>Bs. {parseFloat(venta.subtotal).toFixed(2)}</span>
        </div>
        {parseFloat(venta.descuento_monto) > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Descuento ({venta.descuento_pct}%)</span>
            <span>- Bs. {parseFloat(venta.descuento_monto).toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-gray-800 text-base pt-1 border-t border-gray-100">
          <span>Total</span>
          <span>Bs. {parseFloat(venta.total).toFixed(2)}</span>
        </div>
      </div>

      {/* Anular */}
      {venta.estado === 'completada' && (
        <button onClick={confirmarAnular} disabled={anulando}
          className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 py-2.5 rounded-xl text-sm font-medium transition">
          <XCircle size={16} />
          {anulando ? 'Anulando...' : 'Anular esta venta'}
        </button>
      )}
    </div>
  )
}

export default function HistorialVentas() {
  const [ventas,      setVentas]      = useState([])
  const [loading,     setLoading]     = useState(false)
  const [fechaDesde,  setFechaDesde]  = useState(new Date().toLocaleDateString('en-CA'))
  const [fechaHasta,  setFechaHasta]  = useState(new Date().toLocaleDateString('en-CA'))
  const [estado,      setEstado]      = useState('completada')
  const [detalle,     setDetalle]     = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ fecha_desde: fechaDesde, fecha_hasta: fechaHasta, estado })
      const { data } = await api.get(`/farmacia/ventas?${params}`)
      setVentas(data)
    } catch { toast.error('Error al cargar ventas') }
    finally { setLoading(false) }
  }, [fechaDesde, fechaHasta, estado])

  useEffect(() => { cargar() }, [cargar])

  const totalRecaudado = ventas.reduce((s, v) => s + parseFloat(v.total || 0), 0)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Historial de Ventas</h2>
        <p className="text-gray-500 text-sm mt-0.5">Registro de todas las ventas realizadas</p>
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
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
          <select value={estado} onChange={e => setEstado(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="completada">Completadas</option>
            <option value="anulada">Anuladas</option>
          </select>
        </div>
        {ventas.length > 0 && estado === 'completada' && (
          <div className="ml-auto bg-green-50 border border-green-100 rounded-xl px-4 py-2.5 text-sm">
            <span className="text-green-600">{ventas.length} ventas · </span>
            <span className="text-green-700 font-bold">Bs. {totalRecaudado.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-400">Cargando...</div>
        ) : ventas.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <ShoppingCart size={40} className="mx-auto mb-3 opacity-30" />
            <p>No hay ventas en este período</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-5 py-3 text-left">#</th>
                <th className="px-5 py-3 text-left">Fecha y hora</th>
                <th className="px-5 py-3 text-left">Cliente</th>
                <th className="px-5 py-3 text-left">Método</th>
                <th className="px-5 py-3 text-right">Items</th>
                <th className="px-5 py-3 text-right">Total</th>
                <th className="px-5 py-3 text-left">Estado</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ventas.map(v => (
                <tr key={v.id} className={`hover:bg-gray-50 ${v.estado === 'anulada' ? 'opacity-60' : ''}`}>
                  <td className="px-5 py-3 font-mono text-gray-400 text-xs">#{v.id}</td>
                  <td className="px-5 py-3 text-gray-600 text-xs">
                    {new Date(v.creado_en).toLocaleString('es-BO', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{v.cliente_nombre || <span className="text-gray-300">—</span>}</td>
                  <td className="px-5 py-3"><MetodoBadge metodo={v.metodo_pago} /></td>
                  <td className="px-5 py-3 text-right text-gray-500">{v.items}</td>
                  <td className="px-5 py-3 text-right font-bold text-gray-800">Bs. {parseFloat(v.total).toFixed(2)}</td>
                  <td className="px-5 py-3"><EstadoBadge estado={v.estado} /></td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => setDetalle(v.id)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={!!detalle} onClose={() => setDetalle(null)}
        title={`Venta #${detalle}`} size="md">
        {detalle && (
          <DetalleVenta ventaId={detalle} onAnular={() => { setDetalle(null); cargar() }} />
        )}
      </Modal>
    </div>
  )
}
