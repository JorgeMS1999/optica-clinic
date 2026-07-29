import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, ShoppingCart, Plus, Minus, Trash2, CheckCircle, Printer, Package } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import { imprimirComprobanteVenta } from '../../utils/imprimirComprobanteVenta'

const METODOS = [
  { key: 'efectivo',      label: 'Efectivo' },
  { key: 'tarjeta',       label: 'Tarjeta' },
  { key: 'transferencia', label: 'Transferencia' },
  { key: 'qr',            label: 'QR' },
]

const NO_SPINNER = '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'

function ItemCarrito({ item, onCantidad, onPrecio, onEliminar }) {
  const precioInvalido = !(parseFloat(item.precio_unitario) > 0)
  const totalLinea = item.cantidad * parseFloat(item.precio_unitario || 0)
  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      {/* Nombre + eliminar */}
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-gray-800 text-sm leading-snug break-words flex-1 min-w-0">{item.nombre}</p>
        <button onClick={() => onEliminar(item.producto_id)}
          className="text-gray-300 hover:text-red-500 transition shrink-0 mt-0.5">
          <Trash2 size={15} />
        </button>
      </div>

      {/* Cantidad + precio unitario */}
      <div className="flex items-center justify-between gap-2 mt-2">
        <div className="flex items-center gap-1.5">
          <button onClick={() => onCantidad(item.producto_id, item.cantidad - 1)}
            className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
            <Minus size={13} />
          </button>
          <span className="w-7 text-center text-sm font-bold text-gray-700">{item.cantidad}</span>
          <button onClick={() => onCantidad(item.producto_id, item.cantidad + 1)}
            disabled={item.cantidad >= item.stock_actual}
            className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 flex items-center justify-center transition">
            <Plus size={13} />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400">Bs.</span>
          <input
            type="number" min="0" step="0.01"
            value={item.precio_unitario}
            onChange={e => onPrecio(item.producto_id, e.target.value)}
            className={`w-20 text-right text-sm font-semibold rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 border ${NO_SPINNER}
              ${precioInvalido ? 'border-red-300 bg-red-50 text-red-700' : 'border-gray-200 text-gray-800'}`}
          />
        </div>
      </div>

      {/* Stock disponible + total de la línea */}
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[11px] text-gray-400">{item.stock_actual} disp.</span>
        {precioInvalido
          ? <span className="text-[11px] text-red-500 font-medium">Ponle un precio</span>
          : <span className="text-xs font-semibold text-gray-600">= Bs. {totalLinea.toFixed(2)}</span>}
      </div>
    </div>
  )
}

/* ─────────── Tarjeta de producto de la grilla ─────────── */
function ProductoCard({ p, onAgregar }) {
  const stock = parseInt(p.stock_actual)
  const sinStock  = stock <= 0
  const stockBajo = stock > 0 && stock <= p.stock_minimo
  const sinPrecio = parseFloat(p.precio_venta) === 0

  return (
    <button
      type="button"
      disabled={sinStock}
      onClick={() => onAgregar(p)}
      className={`group relative text-left bg-white border rounded-2xl overflow-hidden transition shadow-sm
        ${sinStock
          ? 'border-gray-100 opacity-60 cursor-not-allowed'
          : 'border-gray-100 hover:border-blue-300 hover:shadow-md active:scale-[0.98]'}`}
    >
      {/* Imagen */}
      <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
        {p.imagen
          ? <img src={p.imagen} alt={p.nombre} className="w-full h-full object-cover" />
          : <Package size={34} className="text-gray-200" />}
      </div>

      {/* Badge de stock */}
      <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold
        ${sinStock ? 'bg-red-100 text-red-700'
          : stockBajo ? 'bg-yellow-100 text-yellow-700'
          : 'bg-green-100 text-green-700'}`}>
        {sinStock ? 'Sin stock' : `${stock} uds.`}
      </span>

      {/* Info */}
      <div className="p-2.5">
        <p className="text-sm font-medium text-gray-800 leading-tight line-clamp-2 min-h-[2.5rem]">
          {p.nombre}
        </p>
        <div className="flex items-end justify-between mt-1.5">
          {sinPrecio
            ? <span className="text-amber-600 text-xs font-semibold">Sin precio</span>
            : <span className="text-blue-700 font-bold text-sm">Bs. {parseFloat(p.precio_venta).toFixed(2)}</span>}
          {!sinStock && (
            <span className="text-[11px] text-gray-400 opacity-0 group-hover:opacity-100 transition flex items-center gap-0.5">
              <Plus size={12} /> agregar
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

export default function Ventas() {
  const { usuario } = useAuth()
  const [productos, setProductos]   = useState([])
  const [categorias, setCategorias] = useState([])
  const [categoriaSel, setCategoriaSel] = useState('')
  const [busqueda, setBusqueda]     = useState('')
  const [cargando, setCargando]     = useState(false)
  const [carrito, setCarrito]       = useState([])
  const [descuento, setDescuento]   = useState(0)
  const [metodo, setMetodo]         = useState('efectivo')
  const [referencia, setReferencia] = useState('')
  const [clienteNombre, setClienteNombre] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [ventaOk, setVentaOk]       = useState(null) // { venta, snapshot }
  const [farmacia, setFarmacia]     = useState(null)
  const searchRef = useRef(null)

  useEffect(() => {
    api.get('/farmacias').then(r => {
      // Superadmin recibe TODAS las farmacias; elegir la del contexto por id.
      const mia = r.data.find(f => f.id === usuario?.farmacia_id) || r.data[0] || null
      setFarmacia(mia)
    }).catch(() => {})
    api.get('/farmacia/productos/util/categorias').then(r => setCategorias(r.data)).catch(() => {})
  }, [usuario?.farmacia_id])

  // Cargar productos según búsqueda y categoría (con debounce en la búsqueda)
  const cargarProductos = useCallback(async () => {
    setCargando(true)
    try {
      const params = new URLSearchParams()
      if (busqueda) params.set('q', busqueda)
      if (categoriaSel) params.set('categoria_id', categoriaSel)
      const { data } = await api.get(`/farmacia/productos?${params}`)
      setProductos(data)
    } catch { /* silencioso */ }
    finally { setCargando(false) }
  }, [busqueda, categoriaSel])

  useEffect(() => {
    const t = setTimeout(cargarProductos, 250)
    return () => clearTimeout(t)
  }, [cargarProductos])

  function agregarAlCarrito(p) {
    if (parseInt(p.stock_actual) <= 0) return toast.error('Sin stock')
    setCarrito(prev => {
      const existe = prev.find(i => i.producto_id === p.id)
      if (existe) {
        if (existe.cantidad >= parseInt(p.stock_actual)) {
          toast.error('Sin stock suficiente')
          return prev
        }
        return prev.map(i => i.producto_id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i)
      }
      return [...prev, {
        producto_id:     p.id,
        nombre:          p.nombre,
        precio_unitario: parseFloat(p.precio_venta).toFixed(2),
        cantidad:        1,
        stock_actual:    parseInt(p.stock_actual),
      }]
    })
  }

  function cambiarCantidad(id, nueva) {
    if (nueva <= 0) return eliminarItem(id)
    setCarrito(prev => prev.map(i =>
      i.producto_id === id ? { ...i, cantidad: Math.min(nueva, i.stock_actual) } : i
    ))
  }

  function cambiarPrecio(id, precio) {
    setCarrito(prev => prev.map(i => i.producto_id === id ? { ...i, precio_unitario: precio } : i))
  }

  function eliminarItem(id) {
    setCarrito(prev => prev.filter(i => i.producto_id !== id))
  }

  const subtotal        = carrito.reduce((s, i) => s + i.cantidad * parseFloat(i.precio_unitario || 0), 0)
  const descuento_monto = subtotal * (parseFloat(descuento) / 100)
  const total           = Math.max(0, subtotal - descuento_monto)
  const hayPrecioInvalido = carrito.some(i => !(parseFloat(i.precio_unitario) > 0))

  async function procesarVenta() {
    if (!carrito.length) return toast.error('Carrito vacío')
    if (!metodo)         return toast.error('Seleccione método de pago')
    if (hayPrecioInvalido) return toast.error('Hay un producto sin precio en el carrito — complétalo antes de cobrar')
    setProcesando(true)
    try {
      const snapshot = {
        items:           carrito.map(i => ({ ...i })),
        subtotal,
        descuento_pct:   parseFloat(descuento) || 0,
        descuento_monto,
        total,
        metodo_pago:     metodo,
        referencia:      referencia || '',
        clienteNombre:   clienteNombre || '',
      }
      const { data } = await api.post('/farmacia/ventas', {
        cliente_nombre:  clienteNombre || null,
        items: carrito.map(i => ({
          producto_id:     i.producto_id,
          cantidad:        i.cantidad,
          precio_unitario: parseFloat(i.precio_unitario),
          descuento_item:  0,
        })),
        descuento_pct: parseFloat(descuento) || 0,
        metodo_pago:   metodo,
        referencia:    referencia || null,
      })
      setVentaOk({ venta: data, snapshot })
      setCarrito([])
      setDescuento(0)
      setReferencia('')
      setClienteNombre('')
      setMetodo('efectivo')
      cargarProductos() // refrescar stock en la grilla
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al procesar venta')
    } finally { setProcesando(false) }
  }

  // ── PANTALLA DE ÉXITO ──────────────────────────────────────────────
  if (ventaOk) {
    const { venta, snapshot } = ventaOk

    function handleImprimir() {
      imprimirComprobanteVenta({
        venta,
        items:           snapshot.items,
        subtotal:        snapshot.subtotal,
        descuento_pct:   snapshot.descuento_pct,
        descuento_monto: snapshot.descuento_monto,
        total:           snapshot.total,
        metodo_pago:     snapshot.metodo_pago,
        referencia:      snapshot.referencia,
        clienteNombre:   snapshot.clienteNombre,
        vendedorNombre:  usuario?.nombre,
        farmacia,
      })
    }

    return (
      <div className="max-w-md mx-auto mt-10 space-y-5">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle size={36} className="text-green-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">¡Venta registrada!</h2>
            <p className="text-gray-500 text-sm mt-1">
              Venta #{venta.id}
              {snapshot.clienteNombre && ` · ${snapshot.clienteNombre}`}
              {' · '}
              <span className="font-semibold text-green-600">Bs. {snapshot.total.toFixed(2)}</span>
            </p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
          {snapshot.items.map((i, idx) => (
            <div key={idx} className="flex justify-between text-sm">
              <span className="text-gray-600">{i.nombre} × {i.cantidad}</span>
              <span className="font-medium">
                Bs. {(i.cantidad * parseFloat(i.precio_unitario || 0)).toFixed(2)}
              </span>
            </div>
          ))}
          {snapshot.descuento_monto > 0 && (
            <div className="flex justify-between text-sm text-red-500">
              <span>Descuento ({snapshot.descuento_pct}%)</span>
              <span>− Bs. {snapshot.descuento_monto.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2">
            <span>Total</span>
            <span className="text-green-600">Bs. {snapshot.total.toFixed(2)}</span>
          </div>
          <p className="text-xs text-gray-400 pt-1">
            Método: {METODOS.find(m => m.key === snapshot.metodo_pago)?.label}
            {snapshot.referencia ? ` · Ref: ${snapshot.referencia}` : ''}
          </p>
        </div>

        <div className="flex gap-3">
          <button onClick={handleImprimir}
            className="flex-1 flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-xl font-semibold text-sm transition">
            <Printer size={18} /> Imprimir comprobante
          </button>
          <button onClick={() => setVentaOk(null)}
            className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 py-3 rounded-xl font-semibold text-sm transition">
            Nueva venta
          </button>
        </div>
      </div>
    )
  }

  // ── PANTALLA DE VENTA (POS) ────────────────────────────────────────
  return (
    <div className="flex flex-col lg:flex-row gap-5 lg:h-full lg:min-h-0">

      {/* Panel izquierdo — catálogo */}
      <div className="flex-1 min-w-0 flex flex-col gap-3 lg:min-h-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Nueva Venta</h2>
            <p className="text-gray-500 text-sm mt-0.5">Toca un producto para agregarlo</p>
          </div>
        </div>

        {/* Buscador */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Buscar por nombre o código..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            autoFocus
            className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
          {busqueda && (
            <button onClick={() => setBusqueda('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filtros por categoría */}
        <div className="flex gap-2 overflow-x-auto pb-1 shrink-0">
          <button onClick={() => setCategoriaSel('')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition border
              ${categoriaSel === '' ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
            Todas
          </button>
          {categorias.map(c => (
            <button key={c.id} onClick={() => setCategoriaSel(String(c.id))}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition border
                ${categoriaSel === String(c.id) ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
              {c.nombre}
            </button>
          ))}
        </div>

        {/* Grilla de productos */}
        <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto pr-1">
          {cargando ? (
            <div className="min-h-[240px] flex items-center justify-center text-gray-400 text-sm">Cargando productos...</div>
          ) : productos.length === 0 ? (
            <div className="min-h-[240px] flex items-center justify-center text-gray-300">
              <div className="text-center">
                <Package size={48} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No hay productos que coincidan</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {productos.map(p => (
                <ProductoCard key={p.id} p={p} onAgregar={agregarAlCarrito} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Panel derecho — carrito */}
      <div className="w-full lg:w-80 flex flex-col bg-white rounded-2xl shadow-sm overflow-hidden shrink-0 lg:min-h-0">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-blue-600" />
            <h3 className="font-semibold text-gray-800">Carrito</h3>
            {carrito.length > 0 && (
              <span className="ml-auto bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {carrito.reduce((s, i) => s + i.cantidad, 0)} uds.
              </span>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="px-5 overflow-y-auto min-h-[260px] max-h-[50vh] lg:max-h-none lg:flex-1 lg:min-h-[260px]">
          {carrito.length === 0 ? (
            <div className="flex items-center justify-center text-gray-300 text-sm text-center py-10">
              El carrito está vacío
            </div>
          ) : (
            carrito.map(item => (
              <ItemCarrito
                key={item.producto_id}
                item={item}
                onCantidad={cambiarCantidad}
                onPrecio={cambiarPrecio}
                onEliminar={eliminarItem}
              />
            ))
          )}
        </div>

        {/* Footer con totales y pago */}
        <div className="border-t border-gray-100 px-5 py-4 space-y-3">
          <input
            type="text"
            placeholder="Nombre del cliente (opcional)"
            value={clienteNombre}
            onChange={e => setClienteNombre(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 flex-1">Descuento %</span>
            <input
              type="number" min="0" max="100" step="0.5"
              value={descuento}
              onChange={e => setDescuento(e.target.value)}
              className={`w-20 border border-gray-200 rounded-xl px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-400 ${NO_SPINNER}`}
            />
          </div>

          <div className="space-y-1.5 text-sm pt-1">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>Bs. {subtotal.toFixed(2)}</span>
            </div>
            {descuento_monto > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Descuento ({descuento}%)</span>
                <span>- Bs. {descuento_monto.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-800 text-base pt-1 border-t border-gray-100">
              <span>Total</span>
              <span>Bs. {total.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {METODOS.map(m => (
              <button key={m.key} onClick={() => setMetodo(m.key)}
                className={`py-2 rounded-xl text-xs font-medium transition ${
                  metodo === m.key ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {m.label}
              </button>
            ))}
          </div>

          {(metodo === 'tarjeta' || metodo === 'transferencia' || metodo === 'qr') && (
            <input
              type="text"
              placeholder="Nro. referencia / comprobante"
              value={referencia}
              onChange={e => setReferencia(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          )}

          <button
            onClick={procesarVenta}
            disabled={procesando || !carrito.length || hayPrecioInvalido}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white py-3 rounded-xl font-bold text-sm transition"
          >
            {procesando ? 'Procesando...' : hayPrecioInvalido ? 'Falta poner un precio' : `Cobrar Bs. ${total.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  )
}
