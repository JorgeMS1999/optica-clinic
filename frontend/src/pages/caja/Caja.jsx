import { useState, useEffect, useCallback } from 'react'
import { CreditCard, DollarSign, Banknote, Landmark, ShieldCheck, Receipt } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import FormularioPago from './FormularioPago'

const METODO_ICON = {
  efectivo:     { icon: Banknote,   label: 'Efectivo',      color: 'text-green-600' },
  tarjeta:      { icon: CreditCard, label: 'Tarjeta',       color: 'text-blue-600'  },
  transferencia:{ icon: Landmark,   label: 'Transferencia', color: 'text-purple-600'},
  seguro:       { icon: ShieldCheck,label: 'Seguro',        color: 'text-orange-600'},
}

export default function Caja() {
  const [pendientes, setPendientes] = useState([])
  const [resumen, setResumen]       = useState(null)
  const [loading, setLoading]       = useState(false)
  const [modal, setModal]           = useState(null) // cita seleccionada para cobrar

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [pend, res] = await Promise.all([
        api.get('/pagos/pendientes'),
        api.get('/pagos/resumen-dia'),
      ])
      setPendientes(pend.data)
      setResumen(res.data)
    } catch { toast.error('Error al cargar datos') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  function onPagado() {
    setModal(null)
    cargar()
    toast.success('Pago registrado correctamente')
  }

  const total = parseFloat(resumen?.total_recaudado || 0)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Caja</h2>
        <p className="text-gray-500 text-sm mt-0.5">
          {new Date().toLocaleDateString('es', { weekday:'long', day:'numeric', month:'long' })}
        </p>
      </div>

      {/* Resumen del día */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm col-span-2 lg:col-span-1">
          <p className="text-gray-400 text-xs mb-1">Total recaudado hoy</p>
          <p className="text-3xl font-bold text-gray-800">
            Bs. {total.toFixed(2)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {resumen?.total_pagos || 0} {resumen?.total_pagos === '1' ? 'pago' : 'pagos'}
          </p>
        </div>

        {Object.entries(METODO_ICON).map(([key, { icon: Icon, label, color }]) => (
          <div key={key} className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Icon size={16} className={color} />
              <p className="text-gray-400 text-xs">{label}</p>
            </div>
            <p className="text-xl font-bold text-gray-800">
              Bs. {parseFloat(resumen?.[key] || 0).toFixed(2)}
            </p>
          </div>
        ))}
      </div>

      {resumen?.total_descuentos > 0 && (
        <div className="bg-yellow-50 border border-yellow-100 rounded-xl px-4 py-3 text-sm text-yellow-700">
          Total en descuentos aplicados hoy: <strong>Bs. {parseFloat(resumen.total_descuentos).toFixed(2)}</strong>
        </div>
      )}

      {/* Cola de cobro */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Pendientes de cobro</h3>
          <span className="bg-red-100 text-red-600 text-xs font-bold px-2.5 py-1 rounded-full">
            {pendientes.length}
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando...</div>
        ) : pendientes.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <Receipt size={36} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No hay citas pendientes de cobro</p>
            <p className="text-sm">Las citas atendidas aparecen aquí</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {pendientes.map(c => (
              <div key={c.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-800">{c.paciente_nombre}</p>
                    <Badge value={c.tipo} />
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <p className="text-gray-400 text-xs">CI: {c.carnet}</p>
                    <p className="text-gray-400 text-xs">•</p>
                    <p className="text-gray-400 text-xs">{c.doctor_nombre}</p>
                    <p className="text-gray-400 text-xs">•</p>
                    <p className="text-gray-400 text-xs font-mono">{c.hora?.slice(0,5)}</p>
                  </div>
                  {c.motivo && <p className="text-gray-500 text-xs mt-1 truncate">"{c.motivo}"</p>}
                </div>

                <button
                  onClick={() => setModal(c)}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition shrink-0"
                >
                  <DollarSign size={16} /> Cobrar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal cobro */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal ? `Cobrar: ${modal.paciente_nombre}` : ''}
        size="lg"
      >
        {modal && (
          <FormularioPago cita={modal} onPagado={onPagado} />
        )}
      </Modal>
    </div>
  )
}
