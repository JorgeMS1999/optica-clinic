import { useState, useEffect, useCallback } from 'react'
import { Search, AlertTriangle, Calendar, Package, ChevronDown, ChevronRight, SlidersHorizontal } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import Modal from '../../components/ui/Modal'

function diasHastaVencimiento(fecha) {
  if (!fecha) return null
  const hoy  = new Date()
  const venc = new Date(fecha)
  hoy.setHours(0, 0, 0, 0)
  venc.setHours(0, 0, 0, 0)
  return Math.round((venc - hoy) / (1000 * 60 * 60 * 24))
}

function VencimientoBadge({ fecha }) {
  if (!fecha) return <span className="text-gray-400 text-xs">Sin fecha</span>
  const dias = diasHastaVencimiento(fecha)
  const fechaFmt = new Date(fecha).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })

  if (dias < 0)   return <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">Vencido ({fechaFmt})</span>
  if (dias <= 30) return <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-xs font-medium">{fechaFmt} — {dias}d</span>
  if (dias <= 90) return <span className="px-2 py-0.5 bg-yellow-50 text-yellow-700 rounded-full text-xs font-medium">{fechaFmt} — {dias}d</span>
  return <span className="text-gray-500 text-xs">{fechaFmt}</span>
}

function FilaProducto({ producto, onAjuste }) {
  const [expandido, setExpandido] = useState(false)
  const [lotes, setLotes]         = useState(null)
  const [cargando, setCargando]   = useState(false)

  async function cargarLotes() {
    if (lotes) { setExpandido(v => !v); return }
    setExpandido(true)
    setCargando(true)
    try {
      const { data } = await api.get(`/farmacia/lotes/producto/${producto.id}`)
      setLotes(data)
    } catch { toast.error('Error al cargar lotes') }
    finally { setCargando(false) }
  }

  const stock = parseInt(producto.stock_actual)
  const stockColor =
    stock <= 0            ? 'text-red-600 font-bold'
    : stock <= producto.stock_minimo ? 'text-yellow-600 font-semibold'
    : 'text-green-700 font-semibold'

  return (
    <>
      <tr className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${expandido ? 'bg-blue-50/30' : ''}`}
          onClick={cargarLotes}>
        <td className="px-5 py-3.5">
          <div className="flex items-center gap-2">
            {expandido ? <ChevronDown size={14} className="text-blue-500 flex-shrink-0" /> : <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />}
            <div>
              <p className="font-medium text-gray-800 text-sm">{producto.nombre}</p>
              {producto.codigo && <p className="text-gray-400 text-xs font-mono">{producto.codigo}</p>}
            </div>
          </div>
        </td>
        <td className="px-5 py-3.5 text-gray-500 text-xs">{producto.categoria_nombre || '—'}</td>
        <td className={`px-5 py-3.5 text-sm ${stockColor}`}>
          {stock} <span className="text-xs font-normal text-gray-400">uds.</span>
        </td>
        <td className="px-5 py-3.5 text-gray-400 text-xs">
          mín. {producto.stock_minimo}
        </td>
        <td className="px-5 py-3.5 text-gray-500 text-xs">{producto.lotes_activos || 0} lotes</td>
        <td className="px-5 py-3.5">
          <button
            onClick={e => { e.stopPropagation(); onAjuste(producto) }}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition">
            Ajustar
          </button>
        </td>
      </tr>

      {/* Lotes desplegados */}
      {expandido && (
        <tr>
          <td colSpan={6} className="bg-blue-50/40 px-5 pb-3 pt-0">
            {cargando ? (
              <div className="py-3 text-center text-gray-400 text-xs">Cargando lotes...</div>
            ) : !lotes?.length ? (
              <div className="py-3 text-center text-gray-400 text-xs">Sin lotes activos</div>
            ) : (
              <table className="w-full text-xs mt-1">
                <thead>
                  <tr className="text-gray-400 uppercase">
                    <th className="pb-1.5 text-left pl-6">Lote</th>
                    <th className="pb-1.5 text-left">Proveedor</th>
                    <th className="pb-1.5 text-left">Vencimiento</th>
                    <th className="pb-1.5 text-right">Unidades</th>
                    <th className="pb-1.5 text-right">P. Venta</th>
                    <th className="pb-1.5 text-right pr-2">Recibido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-100">
                  {lotes.map(l => (
                    <tr key={l.id} className="hover:bg-blue-100/30">
                      <td className="py-1.5 pl-6 font-mono text-gray-600">
                        {l.numero_lote || <span className="italic text-gray-400">sin nro.</span>}
                      </td>
                      <td className="py-1.5 text-gray-500">{l.proveedor_nombre || '—'}</td>
                      <td className="py-1.5"><VencimientoBadge fecha={l.fecha_vencimiento} /></td>
                      <td className="py-1.5 text-right font-semibold text-gray-700">{l.cantidad_unidades}</td>
                      <td className="py-1.5 text-right text-gray-600">
                        {l.precio_venta_lote
                          ? <span className="text-blue-700 font-medium">Bs. {parseFloat(l.precio_venta_lote).toFixed(2)}</span>
                          : <span className="text-gray-400 italic">General</span>}
                      </td>
                      <td className="py-1.5 text-right text-gray-400 pr-2">
                        {l.fecha_recepcion
                          ? new Date(l.fecha_recepcion).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

export default function Inventario() {
  const [productos, setProductos]   = useState([])
  const [porVencer, setPorVencer]   = useState([])
  const [busqueda, setBusqueda]     = useState('')
  const [filtro, setFiltro]         = useState('todos')  // todos | bajo_stock | sin_stock | por_vencer
  const [loading, setLoading]       = useState(false)
  const [modalAjuste, setModalAjuste] = useState(null)
  const [ajusteForm, setAjusteForm] = useState({ cantidad: '', motivo: '' })
  const [guardando, setGuardando]   = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      if (filtro === 'por_vencer') {
        const { data } = await api.get('/farmacia/lotes/por-vencer?dias=90')
        setPorVencer(busqueda ? data.filter(l => l.producto_nombre.toLowerCase().includes(busqueda.toLowerCase())) : data)
      } else {
        const params = new URLSearchParams()
        if (busqueda) params.set('q', busqueda)
        if (filtro === 'bajo_stock' || filtro === 'sin_stock') params.set('bajo_stock', '1')
        const { data } = await api.get(`/farmacia/productos?${params}`)
        setProductos(filtro === 'sin_stock' ? data.filter(p => parseInt(p.stock_actual) <= 0) : data)
      }
    } catch { toast.error('Error al cargar inventario') }
    finally { setLoading(false) }
  }, [busqueda, filtro])

  useEffect(() => {
    const t = setTimeout(cargar, 300)
    return () => clearTimeout(t)
  }, [cargar])

  // Contador de "por vencer" siempre visible en el filtro, independiente de cuál esté seleccionado
  const [porVencerCount, setPorVencerCount] = useState(0)
  useEffect(() => {
    api.get('/farmacia/lotes/por-vencer?dias=90').then(r => setPorVencerCount(r.data.length)).catch(() => {})
  }, [])

  async function handleAjuste(e) {
    e.preventDefault()
    if (!ajusteForm.cantidad || !ajusteForm.motivo.trim()) {
      return toast.error('Completa todos los campos')
    }
    setGuardando(true)
    try {
      await api.post('/farmacia/lotes/ajuste', {
        producto_id: modalAjuste.id,
        cantidad:    parseInt(ajusteForm.cantidad),
        motivo:      ajusteForm.motivo,
      })
      toast.success('Ajuste registrado')
      setModalAjuste(null)
      setAjusteForm({ cantidad: '', motivo: '' })
      cargar()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al ajustar')
    } finally { setGuardando(false) }
  }

  const sinStock   = productos.filter(p => parseInt(p.stock_actual) <= 0).length
  const bajoStock  = productos.filter(p => parseInt(p.stock_actual) > 0 && parseInt(p.stock_actual) <= p.stock_minimo).length

  const FILTROS = [
    { key: 'todos',      label: 'Todos' },
    { key: 'bajo_stock', label: `Stock bajo (${bajoStock})` },
    { key: 'sin_stock',  label: `Sin stock (${sinStock})` },
    { key: 'por_vencer', label: `Por vencer (${porVencerCount})` },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Inventario</h2>
          <p className="text-gray-500 text-sm mt-0.5">Control de lotes y vencimientos</p>
        </div>
      </div>

      {/* Alertas */}
      {(sinStock > 0 || bajoStock > 0) && (
        <div className="flex flex-wrap gap-3">
          {sinStock > 0 && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 px-4 py-2.5 rounded-xl text-sm">
              <AlertTriangle size={15} />
              <span><strong>{sinStock}</strong> producto{sinStock > 1 ? 's' : ''} sin stock</span>
            </div>
          )}
          {bajoStock > 0 && (
            <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-100 text-yellow-700 px-4 py-2.5 rounded-xl text-sm">
              <AlertTriangle size={15} />
              <span><strong>{bajoStock}</strong> con stock bajo</span>
            </div>
          )}
        </div>
      )}

      {/* Filtros y búsqueda */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar producto..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-60"
          />
        </div>
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1">
          {FILTROS.map(f => (
            <button key={f.key} onClick={() => setFiltro(f.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                filtro === f.key
                  ? 'bg-blue-700 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando...</div>
        ) : filtro === 'por_vencer' ? (
          porVencer.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              <Calendar size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nada por vencer en los próximos 90 días</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-5 py-3 text-left">Producto</th>
                  <th className="px-5 py-3 text-left">Lote</th>
                  <th className="px-5 py-3 text-left">Vencimiento</th>
                  <th className="px-5 py-3 text-right">Unidades</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {porVencer.map(l => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-800">{l.producto_nombre}</td>
                    <td className="px-5 py-3 text-gray-500 font-mono text-xs">{l.numero_lote || '—'}</td>
                    <td className="px-5 py-3"><VencimientoBadge fecha={l.fecha_vencimiento} /></td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-700">{l.cantidad_unidades}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : productos.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <Package size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No hay productos</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-5 py-3 text-left">Producto</th>
                <th className="px-5 py-3 text-left">Categoría</th>
                <th className="px-5 py-3 text-left">Stock actual</th>
                <th className="px-5 py-3 text-left">Mínimo</th>
                <th className="px-5 py-3 text-left">Lotes</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {productos.map(p => (
                <FilaProducto key={p.id} producto={p} onAjuste={p => { setModalAjuste(p); setAjusteForm({ cantidad: '', motivo: '' }) }} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal ajuste de inventario */}
      <Modal open={!!modalAjuste} onClose={() => setModalAjuste(null)}
        title={`Ajuste de inventario: ${modalAjuste?.nombre}`} size="sm">
        {modalAjuste && (
          <form onSubmit={handleAjuste} className="space-y-4">
            <div className="bg-blue-50 rounded-xl px-4 py-3 text-sm">
              <p className="text-blue-700">
                Stock actual: <strong>{modalAjuste.stock_actual} unidades</strong>
              </p>
              <p className="text-blue-600 text-xs mt-0.5">
                Ingresa un número positivo para añadir, negativo para restar.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cantidad a ajustar <span className="text-red-500">*</span>
              </label>
              <input
                required type="number"
                value={ajusteForm.cantidad}
                onChange={e => setAjusteForm(f => ({ ...f, cantidad: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: -5 o +10"
              />
              {ajusteForm.cantidad !== '' && (
                <p className="text-xs text-gray-500 mt-1">
                  Resultado: {parseInt(modalAjuste.stock_actual) + (parseInt(ajusteForm.cantidad) || 0)} unidades
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motivo <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={ajusteForm.motivo}
                onChange={e => setAjusteForm(f => ({ ...f, motivo: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Merma, corrección de conteo, etc."
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setModalAjuste(null)}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button type="submit" disabled={guardando}
                className="flex-1 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white py-2.5 rounded-xl text-sm font-medium transition">
                {guardando ? 'Guardando...' : 'Registrar ajuste'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
