import { useState, useEffect } from 'react'
import { CreditCard, Printer, CheckCircle } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import { imprimirTicketCita } from '../../utils/imprimirTicketCita'

const METODOS = [
  { key: 'efectivo',      label: 'Efectivo' },
  { key: 'qr',            label: 'QR' },
  { key: 'transferencia', label: 'Transferencia' },
  { key: 'seguro',        label: 'Seguro' },
]

const NO_SPINNER = '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'

// Modal para cobrar (o abonar) el saldo de una cita.
// `cita` es la fila de la lista (trae saldo, total_servicios, pago_total, etc.)
export default function CobrarCitaModal({ cita, onClose, onCobrado }) {
  const { usuario } = useAuth()
  const saldo = Math.max(0, parseFloat(cita?.saldo ?? (parseFloat(cita?.total_servicios || 0) - parseFloat(cita?.pago_total || 0))))
  const yaCobrado = parseFloat(cita?.pago_total || 0)
  const total = parseFloat(cita?.total_servicios || 0)

  const [monto, setMonto]         = useState(saldo)
  const [metodo, setMetodo]       = useState('efectivo')
  const [referencia, setReferencia] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [clinica, setClinica]     = useState(null)
  const [servicios, setServicios] = useState([])
  const [hecho, setHecho]         = useState(null)   // { abono, saldo_restante } tras cobrar

  useEffect(() => {
    api.get('/clinicas')
      .then(r => setClinica(r.data.find(c => c.id === usuario?.clinica_id) || r.data[0] || null))
      .catch(() => {})
    api.get(`/citas/${cita.id}`)
      .then(r => setServicios((r.data.servicios || []).map(s => ({ nombre: s.servicio_nombre, precio: parseFloat(s.precio_cobrado) || 0 }))))
      .catch(() => {})
  }, [cita.id, usuario?.clinica_id])

  const montoValido = Math.min(Math.max(parseFloat(monto) || 0, 0), saldo)

  async function cobrar() {
    if (montoValido <= 0) return toast.error('Ingresá un monto a cobrar')
    setProcesando(true)
    try {
      const { data } = await api.post('/pagos/abono', {
        cita_id:     cita.id,
        monto:       montoValido,
        metodo_pago: metodo,
        referencia:  referencia || null,
      })
      setHecho({ abono: Number(data.abono), saldo_restante: Number(data.saldo_restante), pago: data.pago })
      toast.success(data.completo ? 'Pago completado' : `Cobrado Bs. ${Number(data.abono).toFixed(2)}`)
      onCobrado && onCobrado()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al cobrar')
    } finally {
      setProcesando(false)
    }
  }

  function imprimir(formato = 'ticket') {
    imprimirTicketCita({
      clinica,
      pago:            hecho?.pago || { id: cita.id, creado_en: new Date().toISOString() },
      paciente:        { nombre: cita.paciente_nombre, carnet: cita.carnet, nro_historia: cita.nro_historia },
      doctorNombre:    cita.doctor_nombre,
      fecha:           String(cita.fecha).slice(0, 10),
      hora:            cita.hora,
      tipo:            cita.tipo,
      servicios,
      subtotal:        hecho ? hecho.abono : montoValido,
      descuento_monto: 0,
      total:           hecho ? hecho.abono : montoValido,
      metodo_pago:     metodo,
      referencia,
      cajeroNombre:    usuario?.nombre,
    }, { formato })
  }

  // Pantalla de confirmación tras cobrar
  if (hecho) {
    return (
      <div className="flex flex-col items-center gap-4 py-3 text-center">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle size={30} className="text-green-500" />
        </div>
        <div>
          <p className="text-lg font-bold text-gray-800">
            {hecho.saldo_restante <= 0 ? '¡Pago completo!' : 'Abono registrado'}
          </p>
          <p className="text-gray-500 text-sm mt-1">
            Cobrado <span className="font-semibold text-green-600">Bs. {hecho.abono.toFixed(2)}</span>
            {hecho.saldo_restante > 0 && <> · falta <span className="font-semibold text-yellow-700">Bs. {hecho.saldo_restante.toFixed(2)}</span></>}
          </p>
        </div>
        <div className="w-full flex gap-2">
          <button onClick={() => imprimir('ticket')}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white py-2.5 rounded-xl font-semibold text-sm transition">
            <Printer size={16} /> Ticket
          </button>
          <button onClick={() => imprimir('carta')}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white py-2.5 rounded-xl font-semibold text-sm transition">
            <Printer size={16} /> Carta
          </button>
        </div>
        <button onClick={onClose}
          className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 py-2.5 rounded-xl font-semibold text-sm transition">
          Listo
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Paciente + resumen de montos */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
        <p className="font-semibold text-gray-800">{cita.paciente_nombre}</p>
        {servicios.length > 0 && (
          <p className="text-xs text-gray-500">{servicios.map(s => s.nombre).join(', ')}</p>
        )}
        <div className="flex justify-between text-sm pt-1">
          <span className="text-gray-500">Precio total</span>
          <span className="font-medium">Bs. {total.toFixed(2)}</span>
        </div>
        {yaCobrado > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Ya cobrado</span>
            <span className="font-medium text-green-600">Bs. {yaCobrado.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-bold border-t border-gray-200 pt-2">
          <span>Saldo</span>
          <span className="text-yellow-700">Bs. {saldo.toFixed(2)}</span>
        </div>
      </div>

      {/* Monto a cobrar */}
      <div>
        <label className="block text-xs text-gray-500 mb-1.5">Monto a cobrar ahora</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Bs.</span>
          <input type="number" min="0" step="1" value={monto}
            onChange={e => setMonto(e.target.value)}
            className={`w-full border border-gray-300 rounded-xl pl-10 pr-3 py-2.5 text-lg font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 ${NO_SPINNER}`} />
        </div>
        {montoValido < saldo && (
          <p className="text-[11px] text-yellow-700 mt-1">Quedará faltando Bs. {(saldo - montoValido).toFixed(2)}</p>
        )}
      </div>

      {/* Método de pago */}
      <div>
        <label className="block text-xs text-gray-500 mb-1.5">Método de pago</label>
        <div className="grid grid-cols-4 gap-2">
          {METODOS.map(m => (
            <button key={m.key} type="button" onClick={() => setMetodo(m.key)}
              className={`py-2 rounded-lg text-[11px] font-medium border transition
                ${metodo === m.key ? 'bg-blue-700 text-white border-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {['qr', 'transferencia', 'seguro'].includes(metodo) && (
        <input type="text" value={referencia} onChange={e => setReferencia(e.target.value)}
          placeholder={metodo === 'seguro' ? 'Nro. póliza / autorización' : 'Nro. de comprobante / referencia'}
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      )}

      <button onClick={cobrar} disabled={procesando || montoValido <= 0}
        className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white py-3 rounded-xl font-bold text-sm transition">
        <CreditCard size={18} />
        {procesando ? 'Cobrando...' : `Cobrar Bs. ${montoValido.toFixed(2)}`}
      </button>
    </div>
  )
}
