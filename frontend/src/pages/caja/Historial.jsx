import { useState, useEffect, useCallback } from 'react'
import { Search, XCircle, Receipt } from 'lucide-react'
import api from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'

const METODO_COLOR = {
  efectivo:     'bg-green-100 text-green-700',
  tarjeta:      'bg-blue-100 text-blue-700',
  transferencia:'bg-purple-100 text-purple-700',
  seguro:       'bg-orange-100 text-orange-700',
}

export default function Historial() {
  const { usuario } = useAuth()
  const [pagos, setPagos]     = useState([])
  const [loading, setLoading] = useState(false)
  const [detalle, setDetalle] = useState(null)
  const [filtros, setFiltros] = useState({
    fecha_desde: new Date().toLocaleDateString('en-CA'),
    fecha_hasta: new Date().toLocaleDateString('en-CA'),
    metodo_pago: '',
    estado: 'pagado',
  })

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      Object.entries(filtros).forEach(([k, v]) => v && params.set(k, v))
      const { data } = await api.get(`/pagos?${params}`)
      setPagos(data)
    } catch { toast.error('Error al cargar historial') }
    finally { setLoading(false) }
  }, [filtros])

  useEffect(() => { cargar() }, [cargar])

  async function verDetalle(pago) {
    try {
      const { data } = await api.get(`/pagos/${pago.id}`)
      setDetalle(data)
    } catch { toast.error('Error al cargar detalle') }
  }

  async function anularPago(id) {
    if (!window.confirm('¿Anular este pago? Esta acción no se puede deshacer.')) return
    try {
      await api.patch(`/pagos/${id}/anular`)
      toast.success('Pago anulado')
      setDetalle(null)
      cargar()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al anular')
    }
  }

  const totalFiltrado = pagos.reduce((sum, p) => sum + parseFloat(p.total), 0)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Historial de Pagos</h2>
        <p className="text-gray-500 text-sm mt-0.5">Consulta y gestión de cobros</p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl shadow-sm p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Desde</label>
          <input type="date" value={filtros.fecha_desde}
            onChange={e => setFiltros(f => ({ ...f, fecha_desde: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Hasta</label>
          <input type="date" value={filtros.fecha_hasta}
            onChange={e => setFiltros(f => ({ ...f, fecha_hasta: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Método</label>
          <select value={filtros.metodo_pago}
            onChange={e => setFiltros(f => ({ ...f, metodo_pago: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Todos</option>
            <option value="efectivo">Efectivo</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="transferencia">Transferencia</option>
            <option value="seguro">Seguro</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Estado</label>
          <select value={filtros.estado}
            onChange={e => setFiltros(f => ({ ...f, estado: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="pagado">Pagados</option>
            <option value="anulado">Anulados</option>
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <span className="text-sm text-gray-500">{pagos.length} registros</span>
          {pagos.length > 0 && filtros.estado === 'pagado' && (
            <span className="font-bold text-green-600 text-sm">
              Total: Bs. {totalFiltrado.toFixed(2)}
            </span>
          )}
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando...</div>
        ) : pagos.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <Receipt size={36} className="mx-auto mb-3 opacity-30" />
            <p>Sin registros para los filtros seleccionados</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-gray-500 uppercase text-xs">
              <tr className="border-b border-gray-100">
                <th className="px-6 py-3 text-left">Fecha / Hora</th>
                <th className="px-6 py-3 text-left">Paciente</th>
                <th className="px-6 py-3 text-left">Tipo</th>
                <th className="px-6 py-3 text-left">Método</th>
                <th className="px-6 py-3 text-right">Descuento</th>
                <th className="px-6 py-3 text-right">Total</th>
                <th className="px-6 py-3 text-left">Estado</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pagos.map(p => (
                <tr key={p.id} className={`hover:bg-gray-50 ${p.estado === 'anulado' ? 'opacity-50' : ''}`}>
                  <td className="px-6 py-3">
                    <p className="font-mono text-xs text-gray-500">
                      {new Date(p.creado_en).toLocaleDateString('es')}
                    </p>
                    <p className="font-mono text-xs text-gray-400">
                      {new Date(p.creado_en).toLocaleTimeString('es', { hour:'2-digit', minute:'2-digit' })}
                    </p>
                  </td>
                  <td className="px-6 py-3">
                    <p className="font-medium text-gray-800">{p.paciente_nombre}</p>
                    <p className="text-gray-400 text-xs">{p.carnet}</p>
                  </td>
                  <td className="px-6 py-3"><Badge value={p.cita_tipo} /></td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${METODO_COLOR[p.metodo_pago] || 'bg-gray-100 text-gray-600'}`}>
                      {p.metodo_pago}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right text-orange-600 text-sm">
                    {parseFloat(p.descuento_monto) > 0 ? `- Bs. ${parseFloat(p.descuento_monto).toFixed(2)}` : '—'}
                  </td>
                  <td className="px-6 py-3 text-right font-bold text-gray-800">
                    Bs. {parseFloat(p.total).toFixed(2)}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      p.estado === 'pagado' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                    }`}>
                      {p.estado}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button onClick={() => verDetalle(p)}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal detalle */}
      <Modal open={!!detalle} onClose={() => setDetalle(null)}
        title={detalle ? `Recibo #${detalle.id}` : ''} size="md">
        {detalle && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Paciente</span>
                <span className="font-medium">{detalle.paciente_nombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">CI</span>
                <span className="font-mono">{detalle.carnet}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Fecha</span>
                <span>{new Date(detalle.creado_en).toLocaleString('es')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Método</span>
                <span className="capitalize">{detalle.metodo_pago}</span>
              </div>
              {detalle.referencia && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Referencia</span>
                  <span className="font-mono">{detalle.referencia}</span>
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Servicios</p>
              <div className="space-y-1">
                {detalle.detalle?.map((d, i) => (
                  <div key={i} className="flex justify-between text-sm py-1.5 border-b border-gray-100">
                    <span className="text-gray-700">{d.servicio_nombre} ×{d.cantidad}</span>
                    <span className="font-medium">Bs. {parseFloat(d.subtotal).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1 text-sm border-t pt-3">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span>Bs. {parseFloat(detalle.subtotal).toFixed(2)}</span>
              </div>
              {parseFloat(detalle.descuento_monto) > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>Descuento ({detalle.descuento_pct}%)</span>
                  <span>- Bs. {parseFloat(detalle.descuento_monto).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg text-green-600 pt-1">
                <span>TOTAL</span>
                <span>Bs. {parseFloat(detalle.total).toFixed(2)}</span>
              </div>
            </div>

            {detalle.notas && (
              <p className="text-xs text-gray-400 bg-gray-50 rounded-xl p-3">{detalle.notas}</p>
            )}

            {['superadmin','admin_clinica'].includes(usuario?.rol) && detalle.estado === 'pagado' && (
              <button onClick={() => anularPago(detalle.id)}
                className="w-full flex items-center justify-center gap-2 border border-red-300 text-red-600 hover:bg-red-50 py-2.5 rounded-xl text-sm font-medium transition">
                <XCircle size={16} /> Anular pago
              </button>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
