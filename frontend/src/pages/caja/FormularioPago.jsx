import { useState, useEffect } from 'react'
import { Plus, Trash2, CreditCard, Banknote, Landmark, ShieldCheck, CheckCircle, Printer } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import Badge from '../../components/ui/Badge'
import { useAuth } from '../../contexts/AuthContext'
import { imprimirComprobante } from '../../utils/imprimirComprobante'

const METODOS = [
  { key: 'efectivo',      label: 'Efectivo',       icon: Banknote    },
  { key: 'tarjeta',       label: 'Tarjeta',        icon: CreditCard  },
  { key: 'transferencia', label: 'Transferencia',  icon: Landmark    },
  { key: 'seguro',        label: 'Seguro médico',  icon: ShieldCheck },
]

export default function FormularioPago({ cita, onPagado }) {
  const { usuario } = useAuth()
  const [servicios, setServicios]     = useState([])
  const [lineas, setLineas]           = useState([])
  const [descuento_pct, setDescuento] = useState(0)
  const [metodo_pago, setMetodo]      = useState('efectivo')
  const [referencia, setReferencia]   = useState('')
  const [notas, setNotas]             = useState('')
  const [guardando, setGuardando]     = useState(false)
  const [clinica, setClinica]         = useState(null)
  const [confirmado, setConfirmado]   = useState(null) // datos del pago tras confirmar

  // Cargar catálogo de servicios + info de clínica
  useEffect(() => {
    api.get('/servicios').then(r => {
      setServicios(r.data)
      const tipo  = cita.tipo
      const categoriaPorTipo = { consulta: 'consulta', procedimiento: 'procedimiento', cirugia: 'cirugía' }
      const match = r.data.find(s =>
        s.categoria.toLowerCase() === (categoriaPorTipo[tipo] || tipo) ||
        s.nombre.toLowerCase().includes(tipo)
      )
      if (match) {
        setLineas([{
          servicio_id:     match.id,
          nombre:          match.nombre,
          precio_unitario: parseFloat(match.precio),
          cantidad:        1,
          descuento_item:  0,
        }])
      }
    }).catch(() => {})

    api.get('/clinicas').then(r => {
      // Superadmin recibe TODAS las clínicas; elegir la del contexto por id.
      setClinica(r.data.find(c => c.id === usuario?.clinica_id) || r.data[0] || null)
    }).catch(() => {})
  }, [cita.tipo, usuario?.clinica_id])

  // Pre-cargar servicios de la consulta si existen
  useEffect(() => {
    if (cita.servicios_consulta?.length && servicios.length) {
      const fromConsulta = cita.servicios_consulta.map(sc => {
        const srv = servicios.find(s => s.id === sc.servicio_id)
        return {
          servicio_id:     sc.servicio_id,
          nombre:          sc.servicio_nombre || srv?.nombre || 'Servicio',
          precio_unitario: parseFloat(sc.precio_cobrado || srv?.precio || 0),
          cantidad:        1,
          descuento_item:  0,
        }
      })
      if (fromConsulta.length) setLineas(fromConsulta)
    }
  }, [cita.servicios_consulta, servicios])

  function agregarLinea() {
    if (!servicios.length) return
    const s = servicios[0]
    setLineas(l => [...l, {
      servicio_id:     s.id,
      nombre:          s.nombre,
      precio_unitario: parseFloat(s.precio),
      cantidad:        1,
      descuento_item:  0,
    }])
  }

  function updateLinea(idx, key, val) {
    setLineas(l => l.map((item, i) => {
      if (i !== idx) return item
      if (key === 'servicio_id') {
        const s = servicios.find(sv => sv.id === parseInt(val))
        return s
          ? { ...item, servicio_id: s.id, nombre: s.nombre, precio_unitario: parseFloat(s.precio) }
          : item
      }
      return { ...item, [key]: ['precio_unitario','descuento_item','cantidad'].includes(key)
        ? parseFloat(val) || 0 : val }
    }))
  }

  function tarifasDe(servicio_id) {
    const s = servicios.find(sv => sv.id === servicio_id)
    if (!s || s.categoria !== 'Cirugía') return []
    const opciones = []
    if (s.precio != null)             opciones.push({ label: 'Lista',      valor: parseFloat(s.precio) })
    if (s.precio_por_ojo != null)     opciones.push({ label: 'Por ojo',    valor: parseFloat(s.precio_por_ojo) })
    if (s.precio_ambos_ojos != null)  opciones.push({ label: 'Ambos ojos', valor: parseFloat(s.precio_ambos_ojos) })
    return opciones
  }

  function quitarLinea(idx) {
    setLineas(l => l.filter((_, i) => i !== idx))
  }

  const subtotal       = lineas.reduce((s, l) => s + (l.precio_unitario * l.cantidad) - (l.descuento_item || 0), 0)
  const descuento_monto = subtotal * (descuento_pct / 100)
  const total          = Math.max(0, subtotal - descuento_monto)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!lineas.length) return toast.error('Agrega al menos un servicio')
    setGuardando(true)
    try {
      const { data: pago } = await api.post('/pagos', {
        cita_id:     cita.id,
        paciente_id: cita.paciente_id,
        servicios:   lineas,
        descuento_pct,
        metodo_pago,
        referencia,
        notas,
      })
      setConfirmado(pago)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrar pago')
    } finally {
      setGuardando(false)
    }
  }

  function handleImprimir() {
    imprimirComprobante({
      pago:            confirmado,
      cita,
      lineas,
      subtotal,
      descuento_pct,
      descuento_monto,
      total,
      metodo_pago,
      referencia,
      notas,
      cajeroNombre:    usuario?.nombre,
      clinica,
    })
  }

  // ── PANTALLA DE ÉXITO ──────────────────────────────────────────────────
  if (confirmado) {
    return (
      <div className="flex flex-col items-center gap-5 py-4 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle size={36} className="text-green-500" />
        </div>
        <div>
          <p className="text-xl font-bold text-gray-800">¡Pago registrado!</p>
          <p className="text-gray-500 text-sm mt-1">
            {cita.paciente_nombre} · <span className="font-semibold text-green-600">Bs. {total.toFixed(2)}</span>
          </p>
        </div>

        {/* Resumen compacto */}
        <div className="w-full bg-gray-50 rounded-2xl p-4 text-left space-y-2">
          {lineas.map((l, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-gray-600">{l.nombre} × {l.cantidad}</span>
              <span className="font-medium">Bs. {((l.precio_unitario * l.cantidad) - (l.descuento_item || 0)).toFixed(2)}</span>
            </div>
          ))}
          {descuento_monto > 0 && (
            <div className="flex justify-between text-sm text-red-500">
              <span>Descuento ({descuento_pct}%)</span>
              <span>− Bs. {descuento_monto.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2">
            <span>Total</span>
            <span className="text-green-600">Bs. {total.toFixed(2)}</span>
          </div>
          <p className="text-xs text-gray-400 pt-1">
            Método: {METODOS.find(m => m.key === metodo_pago)?.label}
            {referencia ? ` · Ref: ${referencia}` : ''}
          </p>
        </div>

        <div className="flex gap-3 w-full">
          <button
            onClick={handleImprimir}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white py-3 rounded-xl font-semibold text-sm transition"
          >
            <Printer size={18} />
            Imprimir comprobante
          </button>
          <button
            onClick={onPagado}
            className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 py-3 rounded-xl font-semibold text-sm transition"
          >
            Listo
          </button>
        </div>
      </div>
    )
  }

  // ── FORMULARIO PRINCIPAL ───────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Info de la cita */}
      <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-4">
        <div className="flex-1">
          <p className="font-semibold text-gray-800">{cita.paciente_nombre}</p>
          <p className="text-gray-400 text-xs">CI: {cita.carnet} · Dr. {cita.doctor_nombre} · {cita.hora?.slice(0,5)}</p>
        </div>
        <Badge value={cita.tipo} />
      </div>

      {/* Servicios */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Servicios cobrados</label>
          <button type="button" onClick={agregarLinea}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium">
            <Plus size={16} /> Agregar
          </button>
        </div>

        {lineas.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center text-gray-400 text-sm">
            Agrega los servicios prestados
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs text-gray-400 font-medium px-1">
              <span className="col-span-4">Servicio</span>
              <span className="col-span-2 text-right">Precio</span>
              <span className="col-span-1 text-center">Cant.</span>
              <span className="col-span-2 text-right">Desc. Bs.</span>
              <span className="col-span-2 text-right">Subtotal</span>
              <span className="col-span-1"></span>
            </div>
            {lineas.map((l, idx) => {
              const sub = (l.precio_unitario * l.cantidad) - (l.descuento_item || 0)
              const tarifas = tarifasDe(l.servicio_id)
              return (
                <div key={idx} className="bg-gray-50 rounded-xl px-3 py-2 space-y-1.5">
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4">
                      <select value={l.servicio_id}
                        onChange={e => updateLinea(idx, 'servicio_id', e.target.value)}
                        className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                        {servicios.map(s => (
                          <option key={s.id} value={s.id}>{s.nombre}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <input type="number" min="0" step="0.01" value={l.precio_unitario}
                        onChange={e => updateLinea(idx, 'precio_unitario', e.target.value)}
                        className="w-full text-xs text-right border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div className="col-span-1">
                      <input type="number" min="1" step="1" value={l.cantidad}
                        onChange={e => updateLinea(idx, 'cantidad', e.target.value)}
                        className="w-full text-xs text-center border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div className="col-span-2">
                      <input type="number" min="0" step="0.01" value={l.descuento_item}
                        onChange={e => updateLinea(idx, 'descuento_item', e.target.value)}
                        className="w-full text-xs text-right border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div className="col-span-2 text-right text-sm font-semibold text-gray-800">
                      Bs. {sub.toFixed(2)}
                    </div>
                    <div className="col-span-1 text-right">
                      <button type="button" onClick={() => quitarLinea(idx)}
                        className="text-red-400 hover:text-red-600 transition p-1">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {tarifas.length > 0 && (
                    <div className="flex items-center gap-1.5 pl-1">
                      <span className="text-[10px] text-gray-400">Tarifa:</span>
                      {tarifas.map(t => (
                        <button key={t.label} type="button"
                          onClick={() => updateLinea(idx, 'precio_unitario', t.valor)}
                          className={`text-[10px] px-2 py-0.5 rounded-full border transition
                            ${l.precio_unitario === t.valor
                              ? 'bg-blue-700 text-white border-blue-700'
                              : 'border-gray-300 text-gray-500 hover:bg-gray-100'}`}>
                          {t.label} · Bs. {t.valor.toFixed(2)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Descuento y totales */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-600">Subtotal</label>
          <span className="font-medium text-gray-800">Bs. {subtotal.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <label className="text-sm text-gray-600 shrink-0">Descuento global (%)</label>
          <div className="flex items-center gap-2">
            <input type="number" min="0" max="100" step="0.5" value={descuento_pct}
              onChange={e => setDescuento(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
              className="w-20 text-right border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <span className="text-sm text-gray-500">= Bs. {descuento_monto.toFixed(2)}</span>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-gray-200 pt-3">
          <span className="font-bold text-gray-800">TOTAL</span>
          <span className="text-2xl font-bold text-green-600">Bs. {total.toFixed(2)}</span>
        </div>
      </div>

      {/* Método de pago */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Método de pago</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {METODOS.map(({ key, label, icon: Icon }) => (
            <button key={key} type="button" onClick={() => setMetodo(key)}
              className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-sm font-medium transition
                ${metodo_pago === key
                  ? 'bg-blue-700 text-white border-blue-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              <Icon size={20} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {['tarjeta','transferencia','seguro'].includes(metodo_pago) && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {metodo_pago === 'seguro' ? 'Nro. de póliza / autorización' : 'Nro. de comprobante'}
          </label>
          <input type="text" value={referencia} onChange={e => setReferencia(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Referencia de pago..." />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
        <textarea rows={2} value={notas} onChange={e => setNotas(e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="Observaciones del pago..." />
      </div>

      <button type="submit" disabled={guardando || !lineas.length}
        className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white py-3.5 rounded-xl font-bold text-base transition">
        {guardando
          ? 'Registrando...'
          : <><CreditCard size={20} /> Confirmar Pago — Bs. {total.toFixed(2)}</>
        }
      </button>
    </form>
  )
}
