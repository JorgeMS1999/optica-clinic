import { useState, useEffect, useCallback } from 'react'
import { BarChart2, DollarSign, Users, Activity, TrendingUp, Download, Stethoscope, Layers, Eye, ClipboardList } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { exportarExcel } from '../../utils/exportarExcel'

function StatCard({ label, value, sub, color = 'blue' }) {
  const c = {
    blue:   'bg-blue-50   border-blue-100   text-blue-700',
    green:  'bg-green-50  border-green-100  text-green-700',
    purple: 'bg-purple-50 border-purple-100 text-purple-700',
    amber:  'bg-amber-50  border-amber-100  text-amber-700',
  }
  return (
    <div className={`rounded-2xl border p-5 ${c[color]}`}>
      <p className="text-sm font-medium opacity-75">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-1">{sub}</p>}
    </div>
  )
}

function BarraRanking({ label, value, max, formato = v => v }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="text-sm text-gray-700 w-48 truncate shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-semibold text-gray-700 w-28 text-right shrink-0">{formato(value)}</span>
    </div>
  )
}

const ESTADO_LABEL = {
  programada: 'Programadas', confirmada: 'Confirmadas', en_espera: 'En espera',
  en_consulta: 'En consulta', atendida: 'Atendidas', cancelada: 'Canceladas', no_asistio: 'No asistió'
}
const ESTADO_COLOR = {
  atendida: 'bg-green-500', programada: 'bg-blue-400', confirmada: 'bg-blue-600',
  en_espera: 'bg-yellow-400', en_consulta: 'bg-purple-500',
  cancelada: 'bg-gray-400', no_asistio: 'bg-red-400',
}

export default function ReportesClinica() {
  const [data,       setData]       = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [fechaDesde, setFechaDesde] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toLocaleDateString('en-CA')
  })
  const [fechaHasta, setFechaHasta] = useState(new Date().toLocaleDateString('en-CA'))

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const { data: res } = await api.get(
        `/pagos/reporte?fecha_desde=${fechaDesde}&fecha_hasta=${fechaHasta}`
      )
      setData(res)
    } catch { toast.error('Error al cargar reporte') }
    finally { setLoading(false) }
  }, [fechaDesde, fechaHasta])

  useEffect(() => { cargar() }, [cargar])

  const [exportando, setExportando] = useState(false)
  async function descargarExcel() {
    setExportando(true)
    try {
      const { data: rows } = await api.get(
        `/pagos?fecha_desde=${fechaDesde}&fecha_hasta=${fechaHasta}&limit=5000`
      )
      if (!rows.length) { toast('No hay registros en el período'); return }
      const encabezados = ['Fecha', 'Hora', 'Paciente', 'Carnet', 'Tipo', 'Método de pago', 'Descuento (Bs)', 'Total (Bs)']
      const filas = rows.map(r => [
        new Date(r.creado_en).toLocaleDateString('es'),
        r.cita_hora ? String(r.cita_hora).slice(0, 5) : '',
        r.paciente_nombre,
        r.carnet || '',
        r.cita_tipo || '',
        r.metodo_pago,
        parseFloat(r.descuento_monto || 0).toFixed(2),
        parseFloat(r.total).toFixed(2),
      ])
      exportarExcel(`reporte_${fechaDesde}_a_${fechaHasta}`, encabezados, filas)
      toast.success(`${rows.length} registros descargados`)
    } catch {
      toast.error('Error al exportar')
    } finally {
      setExportando(false)
    }
  }

  const maxServicio  = data ? Math.max(...data.por_servicio.map(s => parseFloat(s.total)), 1) : 1
  const maxDoctor    = data ? Math.max(...data.por_doctor.map(d => parseInt(d.atenciones)), 1) : 1
  const totalCitas   = data ? data.por_estado.reduce((s, e) => s + parseInt(e.cantidad), 0) : 0
  const maxCategoria = data?.por_categoria ? Math.max(...data.por_categoria.map(c => parseFloat(c.total)), 1) : 1
  const maxDiag      = data?.top_diagnosticos ? Math.max(...data.top_diagnosticos.map(d => parseInt(d.cantidad)), 1) : 1

  const TIPO_CITA = {
    consulta:      { label: 'Consultas',       color: 'text-green-600', icon: Stethoscope },
    procedimiento: { label: 'Procedimientos',  color: 'text-amber-600', icon: Activity },
    cirugia:       { label: 'Cirugías',        color: 'text-rose-600',  icon: Layers },
  }
  const totSexo = data?.por_sexo ? data.por_sexo.reduce((s, x) => s + parseInt(x.cantidad), 0) : 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Reportes — Clínica</h2>
        <p className="text-gray-500 text-sm mt-0.5">Atenciones e ingresos por período</p>
      </div>

      {/* Selector de fechas */}
      <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Desde</label>
          <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Hasta</label>
          <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button onClick={cargar} disabled={loading}
          className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-sm font-medium transition">
          {loading ? 'Cargando...' : 'Actualizar'}
        </button>
        <button onClick={descargarExcel} disabled={exportando}
          className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-xl text-sm font-medium transition ml-auto">
          <Download size={16} />
          {exportando ? 'Generando...' : 'Descargar Excel'}
        </button>
      </div>

      {loading && !data && (
        <div className="bg-white rounded-2xl p-10 text-center text-gray-400">Generando reporte...</div>
      )}

      {data && (
        <>
          {/* Tarjetas resumen */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total ingresos"   value={`Bs. ${parseFloat(data.summary.total_ingresos).toFixed(2)}`} color="green" />
            <StatCard label="Pagos registrados" value={data.summary.total_pagos} sub="transacciones" color="blue" />
            <StatCard label="Promedio por pago" value={`Bs. ${parseFloat(data.summary.promedio).toFixed(2)}`} color="purple" />
            <StatCard label="Total citas"       value={data.extra?.total_citas ?? totalCitas} sub="en el período" color="amber" />
          </div>

          {/* Tarjetas de actividad clínica */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Consultas realizadas" value={data.extra?.total_consultas ?? 0} sub="registradas por el médico" color="blue" />
            <StatCard label="Citas atendidas"       value={data.extra?.citas_atendidas ?? 0} sub="del total del período" color="green" />
            <StatCard label="Pacientes nuevos"       value={data.extra?.pacientes_nuevos ?? 0} sub="registrados en el período" color="purple" />
            <StatCard label="Descuentos aplicados"   value={`Bs. ${parseFloat(data.summary.total_descuentos).toFixed(2)}`} color="amber" />
          </div>

          {/* Citas por tipo */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <ClipboardList size={16} className="text-blue-500" /> Citas por tipo
            </h3>
            {!data.por_tipo || data.por_tipo.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">Sin citas en el período</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {data.por_tipo.map(t => {
                  const cfg = TIPO_CITA[t.tipo] || { label: t.tipo, color: 'text-gray-600', icon: ClipboardList }
                  const Icon = cfg.icon
                  return (
                    <div key={t.tipo} className="border border-gray-100 rounded-xl p-4 flex items-center gap-3">
                      <Icon size={26} className={cfg.color} />
                      <div>
                        <p className={`text-2xl font-bold ${cfg.color}`}>{t.cantidad}</p>
                        <p className="text-xs text-gray-500">{cfg.label}</p>
                        <p className="text-[11px] text-gray-400">{t.atendidas} atendidas</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Métodos de pago */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <DollarSign size={16} className="text-green-500" /> Métodos de pago
              </h3>
              {data.por_metodo.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">Sin datos</p>
              ) : (
                <div className="space-y-1">
                  {data.por_metodo.map(m => (
                    <BarraRanking
                      key={m.metodo_pago}
                      label={m.metodo_pago.charAt(0).toUpperCase() + m.metodo_pago.slice(1)}
                      value={parseFloat(m.total)}
                      max={parseFloat(data.summary.total_ingresos) || 1}
                      formato={v => `Bs. ${v.toFixed(2)}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Estado de citas */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Activity size={16} className="text-blue-500" /> Citas por estado
              </h3>
              {data.por_estado.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">Sin citas en el período</p>
              ) : (
                <div className="space-y-2">
                  {data.por_estado.map(e => {
                    const pct = totalCitas > 0 ? Math.round((parseInt(e.cantidad) / totalCitas) * 100) : 0
                    return (
                      <div key={e.estado} className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${ESTADO_COLOR[e.estado] || 'bg-gray-400'}`} />
                        <span className="text-sm text-gray-600 flex-1">{ESTADO_LABEL[e.estado] || e.estado}</span>
                        <div className="w-24 bg-gray-100 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${ESTADO_COLOR[e.estado] || 'bg-gray-400'}`}
                            style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-sm font-semibold text-gray-700 w-8 text-right">{e.cantidad}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Ingresos por doctor */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Users size={16} className="text-cyan-500" /> Atenciones por doctor
              </h3>
              {data.por_doctor.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">Sin datos</p>
              ) : (
                <div className="space-y-1">
                  {data.por_doctor.map(d => (
                    <div key={d.nombre} className="flex items-center gap-3 py-1.5">
                      <span className="text-sm text-gray-700 flex-1 truncate">{d.nombre}</span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        {d.atenciones} atenc.
                      </span>
                      <span className="text-sm font-semibold text-gray-800 w-32 text-right">
                        Bs. {parseFloat(d.ingresos).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top servicios */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <TrendingUp size={16} className="text-purple-500" /> Servicios más cobrados
              </h3>
              {data.por_servicio.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">Sin servicios cobrados</p>
              ) : (
                <div className="space-y-1">
                  {data.por_servicio.slice(0, 8).map(s => (
                    <BarraRanking
                      key={s.nombre}
                      label={s.nombre}
                      value={parseFloat(s.total)}
                      max={maxServicio}
                      formato={v => `Bs. ${v.toFixed(2)}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Servicios/exámenes por categoría */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Layers size={16} className="text-indigo-500" /> Exámenes y servicios por categoría
              </h3>
              {!data.por_categoria || data.por_categoria.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">Sin servicios cobrados</p>
              ) : (
                <div className="space-y-1">
                  {data.por_categoria.map(c => (
                    <div key={c.categoria} className="flex items-center gap-3 py-1.5">
                      <span className="text-sm text-gray-700 flex-1 truncate">{c.categoria}</span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
                        {c.cantidad}
                      </span>
                      <div className="w-24 bg-gray-100 rounded-full h-1.5 shrink-0">
                        <div className="bg-indigo-500 h-1.5 rounded-full"
                          style={{ width: `${Math.round((parseFloat(c.total) / maxCategoria) * 100)}%` }} />
                      </div>
                      <span className="text-sm font-semibold text-gray-800 w-28 text-right shrink-0">
                        Bs. {parseFloat(c.total).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Distribución por sexo */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Users size={16} className="text-pink-500" /> Pacientes atendidos por sexo
              </h3>
              {totSexo === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">Sin pacientes atendidos</p>
              ) : (
                <div className="space-y-3 pt-2">
                  {data.por_sexo.map(s => {
                    const label = s.sexo === 'M' ? 'Masculino' : s.sexo === 'F' ? 'Femenino' : 'Sin dato'
                    const color = s.sexo === 'M' ? 'bg-blue-500' : s.sexo === 'F' ? 'bg-pink-500' : 'bg-gray-400'
                    const pct = Math.round((parseInt(s.cantidad) / totSexo) * 100)
                    return (
                      <div key={s.sexo || 'nd'}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">{label}</span>
                          <span className="font-semibold text-gray-800">{s.cantidad} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5">
                          <div className={`${color} h-2.5 rounded-full`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Diagnósticos más frecuentes */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Eye size={16} className="text-cyan-500" /> Diagnósticos más frecuentes
            </h3>
            {!data.top_diagnosticos || data.top_diagnosticos.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">Aún no hay consultas con diagnóstico en el período</p>
            ) : (
              <div className="space-y-1">
                {data.top_diagnosticos.map((d, i) => (
                  <div key={i} className="flex items-center gap-3 py-1.5">
                    <span className="text-xs text-gray-400 w-5 shrink-0">{i + 1}.</span>
                    <span className="text-sm text-gray-700 flex-1 truncate" title={d.diagnostico}>{d.diagnostico}</span>
                    <div className="w-28 bg-gray-100 rounded-full h-1.5 shrink-0">
                      <div className="bg-cyan-500 h-1.5 rounded-full"
                        style={{ width: `${Math.round((parseInt(d.cantidad) / maxDiag) * 100)}%` }} />
                    </div>
                    <span className="text-sm font-semibold text-gray-700 w-10 text-right shrink-0">{d.cantidad}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tabla detalle de descuentos */}
          {parseFloat(data.summary.total_descuentos) > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-sm text-amber-700">
              Total en descuentos aplicados: <strong>Bs. {parseFloat(data.summary.total_descuentos).toFixed(2)}</strong>
            </div>
          )}
        </>
      )}
    </div>
  )
}
