import { useEffect, useState } from 'react'
import { ClipboardList, Calendar, CreditCard } from 'lucide-react'
import api from '../../services/api'
import Badge from '../../components/ui/Badge'

function Fila({ label, value }) {
  if (!value) return null
  return (
    <div className="flex gap-2">
      <span className="text-gray-400 text-sm w-40 shrink-0">{label}</span>
      <span className="text-gray-800 text-sm font-medium">{value}</span>
    </div>
  )
}

export default function DetallePaciente({ cita }) {
  const [historial, setHistorial] = useState([])

  useEffect(() => {
    api.get(`/pacientes/${cita.paciente_id}/historial`)
      .then(r => setHistorial(r.data))
      .catch(() => {})
  }, [cita.paciente_id])

  const edad = cita.fecha_nacimiento
    ? Math.floor((new Date() - new Date(cita.fecha_nacimiento)) / (365.25 * 24 * 60 * 60 * 1000))
    : null

  return (
    <div className="space-y-6">
      {/* Datos básicos */}
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Datos del paciente</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-gray-50 rounded-xl p-4">
          <Fila label="CI / Carnet"    value={cita.carnet} />
          <Fila label="Edad"           value={edad ? `${edad} años` : null} />
          <Fila label="Sexo"           value={cita.sexo === 'M' ? 'Masculino' : cita.sexo === 'F' ? 'Femenino' : null} />
          <Fila label="Teléfono"       value={cita.telefono} />
        </div>
      </div>

      {/* Cita actual */}
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Cita actual</h4>
        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-3">
            <Badge value={cita.tipo} />
            <Badge value={cita.estado} />
          </div>
          {cita.motivo && (
            <p className="text-sm text-gray-700">
              <span className="text-gray-400">Motivo: </span>{cita.motivo}
            </p>
          )}
        </div>
      </div>

      {/* Antecedentes médicos */}
      {(cita.antecedentes_oculares || cita.alergias || cita.medicamentos_actuales) && (
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
            <ClipboardList size={14} /> Antecedentes
          </h4>
          <div className="space-y-2 bg-amber-50 border border-amber-100 rounded-xl p-4">
            {cita.antecedentes_oculares && (
              <div>
                <p className="text-xs text-amber-600 font-medium">Antecedentes oculares</p>
                <p className="text-sm text-gray-700">{cita.antecedentes_oculares}</p>
              </div>
            )}
            {cita.alergias && (
              <div>
                <p className="text-xs text-red-500 font-medium">Alergias</p>
                <p className="text-sm text-gray-700">{cita.alergias}</p>
              </div>
            )}
            {cita.medicamentos_actuales && (
              <div>
                <p className="text-xs text-amber-600 font-medium">Medicamentos actuales</p>
                <p className="text-sm text-gray-700">{cita.medicamentos_actuales}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Historial de citas previas */}
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
          <Calendar size={14} /> Historial de visitas
        </h4>
        {historial.length === 0 ? (
          <p className="text-gray-400 text-sm">Primera visita del paciente</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {historial.map(h => (
              <div key={h.id}
                className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 font-mono text-xs">
                    {new Date(h.fecha + 'T12:00:00').toLocaleDateString('es')}
                  </span>
                  <Badge value={h.tipo} />
                  <Badge value={h.estado} />
                </div>
                {h.pago_total && (
                  <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                    <CreditCard size={12} />
                    Bs. {parseFloat(h.pago_total).toFixed(2)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
