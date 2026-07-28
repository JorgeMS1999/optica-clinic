import { useEffect, useState } from 'react'
import { ClipboardList, Calendar, CreditCard } from 'lucide-react'
import api from '../../services/api'
import Badge from '../../components/ui/Badge'

function Fila({ label, value }) {
  if (value == null || value === '') return null
  return (
    <div className="flex flex-col sm:flex-row sm:gap-2">
      <span className="text-gray-400 text-sm sm:w-36 shrink-0">{label}</span>
      <span className="text-gray-800 text-sm font-medium break-words">{value}</span>
    </div>
  )
}

// Chip SÍ/NO para antecedentes
function ChipSiNo({ label, value }) {
  if (value !== true && value !== false) return null
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${value ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
      {label}: {value ? 'SÍ' : 'NO'}
    </span>
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
        {cita.nro_historia != null && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2 mb-2">
            <span className="text-sm text-blue-700 font-medium">Historia Clínica</span>
            <span className="text-lg font-bold text-blue-700 font-mono">N° {cita.nro_historia}</span>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-gray-50 rounded-xl p-4">
          <Fila label="CI / Carnet"    value={cita.carnet} />
          <Fila label="Edad"           value={edad ? `${edad} años` : null} />
          <Fila label="Sexo"           value={cita.sexo === 'M' ? 'Masculino' : cita.sexo === 'F' ? 'Femenino' : null} />
          <Fila label="Estado civil"   value={cita.estado_civil} />
          <Fila label="Ocupación"      value={cita.ocupacion} />
          <Fila label="Teléfono"       value={cita.telefono} />
          <Fila label="Teléfono alt."  value={cita.telefono_alt} />
          <Fila label="Correo"         value={cita.email} />
          <Fila label="Dirección"      value={cita.direccion} />
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
      {(cita.antecedentes_oculares || cita.antecedentes_familiares || cita.alergias || cita.medicamentos_actuales ||
        cita.tiene_alergias != null || cita.dbt != null || cita.hta != null || cita.rmto != null) && (
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
            <ClipboardList size={14} /> Antecedentes
          </h4>
          <div className="space-y-3 bg-amber-50 border border-amber-100 rounded-xl p-4">
            {(cita.tiene_alergias != null || cita.dbt != null || cita.hta != null || cita.rmto != null) && (
              <div className="flex flex-wrap gap-2">
                <ChipSiNo label="Alergias" value={cita.tiene_alergias} />
                <ChipSiNo label="DBT"      value={cita.dbt} />
                <ChipSiNo label="HTA"      value={cita.hta} />
                <ChipSiNo label="RMTO"     value={cita.rmto} />
              </div>
            )}
            {cita.antecedentes_oculares && (
              <div>
                <p className="text-xs text-amber-600 font-medium">Antecedentes oculares</p>
                <p className="text-sm text-gray-700 break-words">{cita.antecedentes_oculares}</p>
              </div>
            )}
            {cita.antecedentes_familiares && (
              <div>
                <p className="text-xs text-amber-600 font-medium">Antecedentes familiares</p>
                <p className="text-sm text-gray-700 break-words">{cita.antecedentes_familiares}</p>
              </div>
            )}
            {cita.alergias && (
              <div>
                <p className="text-xs text-red-500 font-medium">Alergias (detalle)</p>
                <p className="text-sm text-gray-700 break-words">{cita.alergias}</p>
              </div>
            )}
            {cita.medicamentos_actuales && (
              <div>
                <p className="text-xs text-amber-600 font-medium">Medicamentos actuales</p>
                <p className="text-sm text-gray-700 break-words">{cita.medicamentos_actuales}</p>
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
