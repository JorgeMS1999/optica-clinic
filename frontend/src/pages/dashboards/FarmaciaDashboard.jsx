import { useState, useEffect } from 'react'
import { ShoppingCart, Package, TrendingUp, AlertTriangle, DollarSign } from 'lucide-react'
import api from '../../services/api'

function StatCard({ icon: Icon, label, value, sub, color = 'blue' }) {
  const colors = {
    blue:   'bg-blue-50   text-blue-700   border-blue-100',
    green:  'bg-green-50  text-green-700  border-green-100',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    red:    'bg-red-50    text-red-700    border-red-100',
  }
  return (
    <div className={`rounded-2xl border p-5 ${colors[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{label}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          {sub && <p className="text-xs opacity-70 mt-1">{sub}</p>}
        </div>
        <div className="opacity-60 mt-0.5">
          <Icon size={28} />
        </div>
      </div>
    </div>
  )
}

export default function FarmaciaDashboard() {
  const [resumen, setResumen] = useState(null)
  const [alertas, setAlertas] = useState({ sin_stock: 0, bajo_stock: 0 })
  const [loading, setLoading] = useState(true)
  const hoy = new Date().toLocaleDateString('en-CA')

  useEffect(() => {
    async function cargar() {
      setLoading(true)
      try {
        const [resumenRes, productosRes] = await Promise.all([
          api.get(`/farmacia/ventas/resumen-dia?fecha=${hoy}`),
          api.get('/farmacia/productos?bajo_stock=1'),
        ])
        setResumen(resumenRes.data)
        const prods = productosRes.data
        setAlertas({
          sin_stock:  prods.filter(p => parseInt(p.stock_actual) <= 0).length,
          bajo_stock: prods.filter(p => parseInt(p.stock_actual) > 0 && parseInt(p.stock_actual) <= p.stock_minimo).length,
        })
      } catch { /* silencioso */ }
      finally { setLoading(false) }
    }
    cargar()
  }, [hoy])

  const fechaDisplay = new Date().toLocaleDateString('es-BO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Dashboard — Farmacia</h2>
        <p className="text-gray-500 text-sm mt-0.5 capitalize">{fechaDisplay}</p>
      </div>

      {/* Alertas de stock */}
      {(alertas.sin_stock > 0 || alertas.bajo_stock > 0) && (
        <div className="flex flex-wrap gap-3">
          {alertas.sin_stock > 0 && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
              <AlertTriangle size={16} />
              <span><strong>{alertas.sin_stock}</strong> producto{alertas.sin_stock > 1 ? 's' : ''} sin stock — ¡requiere reposición!</span>
            </div>
          )}
          {alertas.bajo_stock > 0 && (
            <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-100 text-yellow-700 px-4 py-3 rounded-xl text-sm font-medium">
              <AlertTriangle size={16} />
              <span><strong>{alertas.bajo_stock}</strong> producto{alertas.bajo_stock > 1 ? 's' : ''} con stock bajo</span>
            </div>
          )}
        </div>
      )}

      {/* Stats del día */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-gray-100 rounded-2xl h-28 animate-pulse" />
          ))}
        </div>
      ) : resumen ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={ShoppingCart}
            label="Ventas hoy"
            value={resumen.total_ventas || 0}
            sub="transacciones"
            color="blue"
          />
          <StatCard
            icon={DollarSign}
            label="Total recaudado"
            value={`Bs. ${parseFloat(resumen.total_recaudado || 0).toFixed(2)}`}
            sub={resumen.total_descuentos > 0 ? `Desc. Bs. ${parseFloat(resumen.total_descuentos).toFixed(2)}` : 'Sin descuentos'}
            color="green"
          />
          <StatCard
            icon={TrendingUp}
            label="Efectivo"
            value={`Bs. ${parseFloat(resumen.efectivo || 0).toFixed(2)}`}
            color="blue"
          />
          <StatCard
            icon={Package}
            label="Tarjeta / Transf."
            value={`Bs. ${(parseFloat(resumen.tarjeta || 0) + parseFloat(resumen.transferencia || 0)).toFixed(2)}`}
            color="yellow"
          />
        </div>
      ) : null}

      {/* Accesos rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a href="/farmacia/ventas"
          className="bg-green-600 hover:bg-green-700 text-white rounded-2xl p-6 transition group">
          <ShoppingCart size={32} className="mb-3 opacity-80" />
          <h3 className="font-bold text-lg">Nueva Venta</h3>
          <p className="text-green-100 text-sm mt-1">Registrar venta en punto de caja</p>
        </a>
        <a href="/farmacia/productos"
          className="bg-blue-700 hover:bg-blue-800 text-white rounded-2xl p-6 transition group">
          <Package size={32} className="mb-3 opacity-80" />
          <h3 className="font-bold text-lg">Productos</h3>
          <p className="text-blue-100 text-sm mt-1">Catálogo e ingreso de lotes</p>
        </a>
        <a href="/farmacia/inventario"
          className="bg-purple-600 hover:bg-purple-700 text-white rounded-2xl p-6 transition group">
          <TrendingUp size={32} className="mb-3 opacity-80" />
          <h3 className="font-bold text-lg">Inventario</h3>
          <p className="text-purple-100 text-sm mt-1">Lotes, vencimientos y ajustes</p>
        </a>
      </div>

      {/* Resumen por método (si hay ventas) */}
      {resumen && parseFloat(resumen.total_recaudado) > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-4 text-sm uppercase tracking-wide">Desglose por método de pago</h3>
          <div className="space-y-3">
            {[
              { label: 'Efectivo',       val: resumen.efectivo,       color: 'bg-green-500' },
              { label: 'Tarjeta',        val: resumen.tarjeta,        color: 'bg-blue-500' },
              { label: 'Transferencia',  val: resumen.transferencia,  color: 'bg-purple-500' },
            ].map(({ label, val, color }) => {
              const monto = parseFloat(val || 0)
              const total_r = parseFloat(resumen.total_recaudado) || 1
              const pct = Math.round((monto / total_r) * 100)
              if (monto <= 0) return null
              return (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-28">{label}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm font-semibold text-gray-700 w-28 text-right">Bs. {monto.toFixed(2)}</span>
                  <span className="text-xs text-gray-400 w-10 text-right">{pct}%</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
