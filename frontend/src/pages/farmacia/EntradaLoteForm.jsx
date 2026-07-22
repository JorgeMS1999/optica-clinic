import { useState } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function EntradaLoteForm({ producto, proveedores, onGuardado }) {
  const [form, setForm] = useState({
    numero_lote: '',
    fecha_vencimiento: '',
    fecha_recepcion: new Date().toLocaleDateString('en-CA'),
    proveedor_id: producto.proveedor_id || '',
    cantidad_presentaciones: '',
    unidades_por_presentacion: producto.unidades_por_lote || 1,
    costo_unitario: producto.precio_compra || '',
    precio_venta_lote: '',
    notas: '',
  })
  const [guardando, setGuardando] = useState(false)

  const total_unidades = (parseInt(form.cantidad_presentaciones) || 0)
    * (parseInt(form.unidades_por_presentacion) || 1)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.cantidad_presentaciones || form.cantidad_presentaciones <= 0) {
      return toast.error('Cantidad requerida')
    }
    setGuardando(true)
    try {
      await api.post('/farmacia/lotes/entrada', {
        ...form,
        producto_id: producto.id,
      })
      toast.success(`Lote registrado: ${total_unidades} unidades ingresadas`)
      onGuardado()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrar')
    } finally { setGuardando(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Info del producto */}
      <div className="bg-blue-50 rounded-xl px-4 py-3 text-sm">
        <p className="font-medium text-blue-800">{producto.nombre}</p>
        <p className="text-blue-600 text-xs mt-0.5">
          Presentación: {producto.unidades_por_lote} {producto.unidad_medida}{producto.unidades_por_lote > 1 ? 's' : ''} por unidad
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nro. de lote</label>
          <input value={form.numero_lote}
            onChange={e => setForm(f => ({ ...f, numero_lote: e.target.value }))}
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ej: L-2024-001" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha vencimiento</label>
          <input type="date" value={form.fecha_vencimiento}
            onChange={e => setForm(f => ({ ...f, fecha_vencimiento: e.target.value }))}
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cantidad de presentaciones <span className="text-red-500">*</span>
          </label>
          <input required type="number" min="1" value={form.cantidad_presentaciones}
            onChange={e => setForm(f => ({ ...f, cantidad_presentaciones: e.target.value }))}
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ej: 5 cajas" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Unidades por presentación <span className="text-red-500">*</span>
          </label>
          <input required type="number" min="1" value={form.unidades_por_presentacion}
            onChange={e => setForm(f => ({ ...f, unidades_por_presentacion: e.target.value }))}
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ej: 12 unidades" />
        </div>

        {/* Total calculado */}
        {total_unidades > 0 && (
          <div className="col-span-2 bg-green-50 border border-green-100 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-green-700 text-sm">Total unidades a ingresar</span>
            <span className="text-green-700 font-bold text-xl">{total_unidades}</span>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Costo unitario (Bs.)</label>
          <input type="number" min="0" step="0.01" value={form.costo_unitario}
            onChange={e => setForm(f => ({ ...f, costo_unitario: e.target.value }))}
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0.00" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Precio venta lote
            <span className="text-gray-400 font-normal ml-1">(si difiere del general)</span>
          </label>
          <input type="number" min="0" step="0.01" value={form.precio_venta_lote}
            onChange={e => setForm(f => ({ ...f, precio_venta_lote: e.target.value }))}
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Dejar vacío = precio del producto" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
          <select value={form.proveedor_id}
            onChange={e => setForm(f => ({ ...f, proveedor_id: e.target.value }))}
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">— Sin proveedor —</option>
            {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha recepción</label>
          <input type="date" value={form.fecha_recepcion}
            onChange={e => setForm(f => ({ ...f, fecha_recepcion: e.target.value }))}
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
          <textarea rows={2} value={form.notas}
            onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Observaciones del lote..." />
        </div>
      </div>

      <button type="submit" disabled={guardando}
        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white py-3 rounded-xl font-semibold text-sm transition">
        {guardando ? 'Registrando...' : `Ingresar ${total_unidades || '—'} unidades al stock`}
      </button>
    </form>
  )
}
