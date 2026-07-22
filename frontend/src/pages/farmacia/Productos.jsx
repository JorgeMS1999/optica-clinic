import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Package, AlertTriangle, Edit2 } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import Modal from '../../components/ui/Modal'
import EntradaLoteForm from './EntradaLoteForm'

function StockBadge({ stock, minimo }) {
  if (stock <= 0)      return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">Sin stock</span>
  if (stock <= minimo) return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">Stock bajo</span>
  return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">{stock} uds.</span>
}

const FORM_VACIO = {
  codigo: '', nombre: '', descripcion: '', categoria_id: '', proveedor_id: '',
  unidad_medida: 'unidad', unidades_por_lote: 1,
  precio_compra: '', precio_venta: '', stock_minimo: 5, requiere_lote: true
}

export default function Productos() {
  const [productos, setProductos]   = useState([])
  const [categorias, setCategorias] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [busqueda, setBusqueda]     = useState('')
  const [bajoStock, setBajoStock]   = useState(false)
  const [loading, setLoading]       = useState(false)
  const [modalProd, setModalProd]   = useState(false)
  const [modalLote, setModalLote]   = useState(null)
  const [editando, setEditando]     = useState(null)
  const [form, setForm]             = useState(FORM_VACIO)
  const [guardando, setGuardando]   = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (busqueda) params.set('q', busqueda)
      if (bajoStock) params.set('bajo_stock', '1')
      const { data } = await api.get(`/farmacia/productos?${params}`)
      setProductos(data)
    } catch { toast.error('Error al cargar productos') }
    finally { setLoading(false) }
  }, [busqueda, bajoStock])

  useEffect(() => {
    const t = setTimeout(cargar, 300)
    return () => clearTimeout(t)
  }, [cargar])

  useEffect(() => {
    api.get('/farmacia/productos/util/categorias').then(r => setCategorias(r.data)).catch(() => {})
    api.get('/farmacia/proveedores').then(r => setProveedores(r.data)).catch(() => {})
  }, [])

  function abrirEditar(p) {
    setEditando(p)
    setForm({
      codigo: p.codigo || '', nombre: p.nombre, descripcion: p.descripcion || '',
      categoria_id: p.categoria_id || '', proveedor_id: p.proveedor_id || '',
      unidad_medida: p.unidad_medida, unidades_por_lote: p.unidades_por_lote,
      precio_compra: p.precio_compra, precio_venta: p.precio_venta,
      stock_minimo: p.stock_minimo, requiere_lote: p.requiere_lote
    })
    setModalProd(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setGuardando(true)
    try {
      if (editando) {
        await api.put(`/farmacia/productos/${editando.id}`, { ...form, activo: true })
        toast.success('Producto actualizado')
      } else {
        await api.post('/farmacia/productos', form)
        toast.success('Producto creado')
      }
      setModalProd(false)
      setEditando(null)
      setForm(FORM_VACIO)
      cargar()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar')
    } finally { setGuardando(false) }
  }

  const sinStock = productos.filter(p => parseInt(p.stock_actual) <= 0).length
  const bajoStockCount = productos.filter(p => parseInt(p.stock_actual) > 0 && parseInt(p.stock_actual) <= p.stock_minimo).length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Productos</h2>
          <p className="text-gray-500 text-sm mt-0.5">Catálogo e inventario</p>
        </div>
        <button onClick={() => { setEditando(null); setForm(FORM_VACIO); setModalProd(true) }}
          className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition">
          <Plus size={18} /> Nuevo Producto
        </button>
      </div>

      {/* Alertas de stock */}
      {(sinStock > 0 || bajoStockCount > 0) && (
        <div className="flex gap-3">
          {sinStock > 0 && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 px-4 py-2.5 rounded-xl text-sm">
              <AlertTriangle size={16} />
              <span><strong>{sinStock}</strong> producto{sinStock > 1 ? 's' : ''} sin stock</span>
            </div>
          )}
          {bajoStockCount > 0 && (
            <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-100 text-yellow-700 px-4 py-2.5 rounded-xl text-sm">
              <AlertTriangle size={16} />
              <span><strong>{bajoStockCount}</strong> con stock bajo</span>
            </div>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Buscar producto o código..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button onClick={() => setBajoStock(b => !b)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition
            ${bajoStock ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
          <AlertTriangle size={16} /> Stock bajo
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando...</div>
        ) : productos.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <Package size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No hay productos registrados</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-5 py-3 text-left">Producto</th>
                <th className="px-5 py-3 text-left">Categoría</th>
                <th className="px-5 py-3 text-left">Presentación</th>
                <th className="px-5 py-3 text-right">P. Venta</th>
                <th className="px-5 py-3 text-left">Stock</th>
                <th className="px-5 py-3 text-left">Lotes</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {productos.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-800">{p.nombre}</p>
                    {p.codigo && <p className="text-gray-400 text-xs font-mono">{p.codigo}</p>}
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{p.categoria_nombre || '—'}</td>
                  <td className="px-5 py-3 text-gray-500 text-xs">
                    {p.unidades_por_lote > 1
                      ? `${p.unidades_por_lote} uds. / ${p.unidad_medida}`
                      : p.unidad_medida}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-800">
                    Bs. {parseFloat(p.precio_venta).toFixed(2)}
                  </td>
                  <td className="px-5 py-3">
                    <StockBadge stock={parseInt(p.stock_actual)} minimo={p.stock_minimo} />
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{p.lotes_activos || 0} activos</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => setModalLote(p)}
                        className="text-xs text-green-600 hover:text-green-800 font-medium border border-green-200 hover:bg-green-50 px-3 py-1.5 rounded-lg transition">
                        + Entrada
                      </button>
                      <button onClick={() => abrirEditar(p)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                        <Edit2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal producto */}
      <Modal open={modalProd} onClose={() => { setModalProd(false); setEditando(null) }}
        title={editando ? 'Editar Producto' : 'Nuevo Producto'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre <span className="text-red-500">*</span></label>
              <input required value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nombre del producto" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
              <input value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: GTM001" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <select value={form.categoria_id} onChange={e => setForm(f => ({ ...f, categoria_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— Sin categoría —</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
              <select value={form.proveedor_id} onChange={e => setForm(f => ({ ...f, proveedor_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— Sin proveedor —</option>
                {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unidad de medida</label>
              <select value={form.unidad_medida} onChange={e => setForm(f => ({ ...f, unidad_medida: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {['unidad','caja','frasco','tubo','ampolla','sobre','blíster'].map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unidades por presentación
                <span className="text-gray-400 font-normal ml-1">(ej: caja×12)</span>
              </label>
              <input type="number" min="1" value={form.unidades_por_lote}
                onChange={e => setForm(f => ({ ...f, unidades_por_lote: parseInt(e.target.value) || 1 }))}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio compra (Bs.)</label>
              <input type="number" min="0" step="0.01" value={form.precio_compra}
                onChange={e => setForm(f => ({ ...f, precio_compra: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio venta (Bs.) <span className="text-red-500">*</span></label>
              <input required type="number" min="0" step="0.01" value={form.precio_venta}
                onChange={e => setForm(f => ({ ...f, precio_venta: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock mínimo</label>
              <input type="number" min="0" value={form.stock_minimo}
                onChange={e => setForm(f => ({ ...f, stock_minimo: parseInt(e.target.value) || 0 }))}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex items-center gap-3 pt-5">
              <input type="checkbox" id="req_lote" checked={form.requiere_lote}
                onChange={e => setForm(f => ({ ...f, requiere_lote: e.target.checked }))}
                className="w-4 h-4 rounded text-blue-600" />
              <label htmlFor="req_lote" className="text-sm text-gray-700">Requiere control de lote</label>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setModalProd(false); setEditando(null) }}
              className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
              Cancelar
            </button>
            <button type="submit" disabled={guardando}
              className="flex-1 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white py-2.5 rounded-xl text-sm font-medium transition">
              {guardando ? 'Guardando...' : (editando ? 'Actualizar' : 'Crear Producto')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal entrada de lote */}
      <Modal open={!!modalLote} onClose={() => setModalLote(null)}
        title={`Entrada de stock: ${modalLote?.nombre}`} size="md">
        {modalLote && (
          <EntradaLoteForm
            producto={modalLote}
            proveedores={proveedores}
            onGuardado={() => { setModalLote(null); cargar() }}
          />
        )}
      </Modal>
    </div>
  )
}
