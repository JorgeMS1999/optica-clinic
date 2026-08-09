import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Eye, Activity, Microscope, ClipboardList,
  Stethoscope, CheckCircle, AlertTriangle, Save, Search
} from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

/* ─────────────────── Helpers ─────────────────── */
function Seccion({ icon: Icon, titulo, color = 'blue', children }) {
  const colores = {
    blue:   'border-blue-200   bg-blue-50   text-blue-700',
    teal:   'border-teal-200   bg-teal-50   text-teal-700',
    purple: 'border-purple-200 bg-purple-50 text-purple-700',
    amber:  'border-amber-200  bg-amber-50  text-amber-700',
    green:  'border-green-200  bg-green-50  text-green-700',
    rose:   'border-rose-200   bg-rose-50   text-rose-700',
  }
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className={`flex items-center gap-2.5 px-5 py-3.5 border-b ${colores[color]}`}>
        <Icon size={17} />
        <h3 className="font-semibold text-sm">{titulo}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function Campo({ label, children, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  )
}

const INPUT = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white'
const TEXTAREA = `${INPUT} resize-none`

/* ─────────── Buscador de códigos CIE-10 ─────────── */
function BuscadorCIE({ onSelect, disabled }) {
  const [q, setQ]           = useState('')
  const [res, setRes]       = useState([])
  const [abierto, setAbierto] = useState(false)

  useEffect(() => {
    if (q.trim().length < 2) { setRes([]); return }
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get(`/cie?q=${encodeURIComponent(q)}`)
        setRes(data); setAbierto(true)
      } catch { setRes([]) }
    }, 250)
    return () => clearTimeout(t)
  }, [q])

  if (disabled) return null
  return (
    <div className="relative mb-2">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          onFocus={() => res.length && setAbierto(true)}
          placeholder="Buscar CIE-10 por código o enfermedad (ej: cataratas, H25, glaucoma)..."
          className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
        />
      </div>
      {abierto && res.length > 0 && (
        <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
          {res.map(c => (
            <button key={c.codigo} type="button"
              onClick={() => { onSelect(c); setQ(''); setRes([]); setAbierto(false) }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b border-gray-100 last:border-0 flex gap-2">
              <span className="font-mono font-bold text-blue-700 shrink-0">{c.codigo}</span>
              <span className="text-gray-700">{c.descripcion}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─────────────────── Tabla OD / OI ─────────────────── */
function TablaOjos({ titulo, campos, form, setForm }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{titulo}</p>
      <div className="grid grid-cols-3 gap-1 text-xs text-center mb-1 text-gray-400 font-medium">
        <span></span>
        <span>OD (derecho)</span>
        <span>OI (izquierdo)</span>
      </div>
      {campos.map(({ label, od, oi, type = 'text', step }) => (
        <div key={label} className="grid grid-cols-3 gap-2 mb-2 items-center">
          <span className="text-xs text-gray-500 font-medium text-right pr-2">{label}</span>
          <input
            type={type} step={step}
            value={form[od] || ''}
            onChange={e => setForm(f => ({ ...f, [od]: e.target.value }))}
            className={INPUT}
            placeholder="—"
          />
          <input
            type={type} step={step}
            value={form[oi] || ''}
            onChange={e => setForm(f => ({ ...f, [oi]: e.target.value }))}
            className={INPUT}
            placeholder="—"
          />
        </div>
      ))}
    </div>
  )
}

/* ─────────────────── Selector de servicios ─────────────────── */
function SelectorServicios({ servicios, seleccionados, onChange }) {
  function toggleServicio(srv) {
    const existe = seleccionados.find(s => s.servicio_id === srv.id)
    if (existe) {
      onChange(seleccionados.filter(s => s.servicio_id !== srv.id))
    } else {
      onChange([...seleccionados, {
        servicio_id:    srv.id,
        precio_cobrado: parseFloat(srv.precio),
        notas:          '',
        _nombre:        srv.nombre,
        _categoria:     srv.categoria,
      }])
    }
  }

  function cambiarPrecio(servicio_id, precio) {
    onChange(seleccionados.map(s =>
      s.servicio_id === servicio_id ? { ...s, precio_cobrado: parseFloat(precio) || 0 } : s
    ))
  }

  // Agrupar por categoría
  const grupos = servicios.reduce((acc, srv) => {
    const cat = srv.categoria || 'Otros'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(srv)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      {Object.entries(grupos).map(([cat, items]) => (
        <div key={cat}>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{cat}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {items.map(srv => {
              const sel = seleccionados.find(s => s.servicio_id === srv.id)
              return (
                <div
                  key={srv.id}
                  className={`border rounded-xl p-3 transition cursor-pointer ${
                    sel ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => toggleServicio(srv)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        sel ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                      }`}>
                        {sel && <CheckCircle size={10} className="text-white" />}
                      </div>
                      <span className="text-sm text-gray-700 font-medium">{srv.nombre}</span>
                    </div>
                  </div>
                  {sel && (
                    <div className="mt-2 space-y-1.5" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Precio:</span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-400">Bs.</span>
                          <input
                            type="number" min="0" step="0.01"
                            value={sel.precio_cobrado}
                            onChange={e => cambiarPrecio(srv.id, e.target.value)}
                            className="w-24 border border-blue-200 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
                          />
                        </div>
                        {parseFloat(srv.precio) !== sel.precio_cobrado && (
                          <span className="text-xs text-gray-400 line-through">Bs. {parseFloat(srv.precio).toFixed(2)}</span>
                        )}
                      </div>
                      {srv.categoria === 'Cirugía' && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {[
                            srv.precio != null && { label: 'Lista', valor: parseFloat(srv.precio) },
                            srv.precio_por_ojo != null && { label: 'Por ojo', valor: parseFloat(srv.precio_por_ojo) },
                            srv.precio_ambos_ojos != null && { label: 'Ambos ojos', valor: parseFloat(srv.precio_ambos_ojos) },
                          ].filter(Boolean).map(t => (
                            <button key={t.label} type="button"
                              onClick={() => cambiarPrecio(srv.id, t.valor)}
                              className={`text-[10px] px-2 py-0.5 rounded-full border transition
                                ${sel.precio_cobrado === t.valor
                                  ? 'bg-blue-700 text-white border-blue-700'
                                  : 'border-gray-300 text-gray-500 hover:bg-gray-100'}`}>
                              {t.label} · Bs. {t.valor.toFixed(2)}
                            </button>
                          ))}
                          {srv.observaciones && (
                            <span className="text-[10px] text-gray-400">Obs: {srv.observaciones}</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
      {seleccionados.length > 0 && (
        <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 flex justify-between items-center">
          <span className="text-green-700 text-sm font-medium">
            {seleccionados.length} servicio{seleccionados.length > 1 ? 's' : ''} seleccionado{seleccionados.length > 1 ? 's' : ''}
          </span>
          <span className="text-green-700 font-bold">
            Total: Bs. {seleccionados.reduce((s, i) => s + (parseFloat(i.precio_cobrado) || 0), 0).toFixed(2)}
          </span>
        </div>
      )}
    </div>
  )
}

/* ─────────────────── Componente principal ─────────────────── */
const FORM_VACIO = {
  motivo_consulta: '', enfermedad_actual: '',
  av_od_sc: '', av_oi_sc: '', av_od_cc: '', av_oi_cc: '',
  rx_od_esfera: '', rx_od_cilindro: '', rx_od_eje: '',
  rx_oi_esfera: '', rx_oi_cilindro: '', rx_oi_eje: '',
  pio_od: '', pio_oi: '', metodo_pio: 'Tonómetro de aplanación',
  biomicroscopia_od: '', biomicroscopia_oi: '',
  fondo_ojo_od: '', fondo_ojo_oi: '',
  diagnostico: '', plan_tratamiento: '', medicacion: '', proxima_cita: '',
  observaciones: '',
}

export default function Consulta() {
  const { citaId } = useParams()
  const navigate   = useNavigate()

  const [cita,         setCita]         = useState(null)
  const [paciente,     setPaciente]     = useState(null)
  const [servicios,    setServicios]    = useState([])
  const [consultaId,   setConsultaId]   = useState(null)
  const [form,         setForm]         = useState(FORM_VACIO)
  const [selServicios, setSelServicios] = useState([])
  const [loading,      setLoading]      = useState(true)
  const [guardando,    setGuardando]    = useState(false)
  const [soloLectura,  setSoloLectura]  = useState(false)

  useEffect(() => {
    async function cargar() {
      setLoading(true)
      try {
        const [citaRes, srvRes] = await Promise.all([
          api.get(`/citas/${citaId}`),
          api.get('/servicios'),
        ])
        const c = citaRes.data
        setCita(c)
        setServicios(srvRes.data)

        // Datos del paciente
        try {
          const pRes = await api.get(`/pacientes/${c.paciente_id}`)
          setPaciente(pRes.data)
        } catch { /* no crítico */ }

        // Consulta existente
        const exRes = await api.get(`/consultas/cita/${citaId}`)
        if (exRes.data) {
          const ex = exRes.data
          setConsultaId(ex.id)
          setForm({
            motivo_consulta:  ex.motivo_consulta  || '',
            enfermedad_actual: ex.enfermedad_actual || '',
            av_od_sc: ex.av_od_sc || '', av_oi_sc: ex.av_oi_sc || '',
            av_od_cc: ex.av_od_cc || '', av_oi_cc: ex.av_oi_cc || '',
            rx_od_esfera:  ex.rx_od_esfera  || '', rx_od_cilindro: ex.rx_od_cilindro || '', rx_od_eje: ex.rx_od_eje || '',
            rx_oi_esfera:  ex.rx_oi_esfera  || '', rx_oi_cilindro: ex.rx_oi_cilindro || '', rx_oi_eje: ex.rx_oi_eje || '',
            pio_od: ex.pio_od || '', pio_oi: ex.pio_oi || '', metodo_pio: ex.metodo_pio || 'Tonómetro de aplanación',
            biomicroscopia_od: ex.biomicroscopia_od || '', biomicroscopia_oi: ex.biomicroscopia_oi || '',
            fondo_ojo_od: ex.fondo_ojo_od || '', fondo_ojo_oi: ex.fondo_ojo_oi || '',
            diagnostico: ex.diagnostico || '', plan_tratamiento: ex.plan_tratamiento || '',
            medicacion: ex.medicacion || '', proxima_cita: ex.proxima_cita?.split('T')[0] || '',
            observaciones: ex.observaciones || '',
          })
          setSelServicios((ex.servicios || []).map(s => ({
            servicio_id:    s.servicio_id,
            precio_cobrado: parseFloat(s.precio_cobrado),
            notas:          s.notas || '',
            _nombre:        s.servicio_nombre,
          })))
          if (c.estado === 'atendida') setSoloLectura(true)
        }
      } catch (err) {
        toast.error('Error al cargar la cita')
        navigate('/doctor/dashboard')
      } finally { setLoading(false) }
    }
    cargar()
  }, [citaId, navigate])

  function set(campo) {
    return e => setForm(f => ({ ...f, [campo]: e.target.value }))
  }

  // Agrega un código CIE-10 al diagnóstico (sin escribir a mano)
  function agregarCIE(c) {
    const texto = `${c.codigo} - ${c.descripcion}`
    setForm(f => {
      const actual = (f.diagnostico || '').replace(/\s+$/, '')
      if (actual.includes(c.codigo)) return f   // evitar duplicados
      return { ...f, diagnostico: actual ? `${actual}\n${texto}` : texto }
    })
  }

  async function handleGuardar(e) {
    e.preventDefault()
    if (!form.diagnostico.trim()) return toast.error('El diagnóstico es obligatorio')
    setGuardando(true)
    try {
      const payload = { ...form, cita_id: parseInt(citaId), servicios: selServicios }
      if (consultaId) {
        await api.put(`/consultas/${consultaId}`, payload)
        toast.success('Consulta actualizada')
      } else {
        const { data } = await api.post('/consultas', payload)
        setConsultaId(data.id)
        toast.success('Consulta guardada — cita marcada como atendida')
        setSoloLectura(true)
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar')
    } finally { setGuardando(false) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-gray-400">
          <Stethoscope size={40} className="mx-auto mb-3 opacity-30 animate-pulse" />
          <p>Cargando consulta...</p>
        </div>
      </div>
    )
  }

  const edad = paciente?.fecha_nacimiento
    ? Math.floor((new Date() - new Date(paciente.fecha_nacimiento)) / (365.25 * 24 * 60 * 60 * 1000))
    : null

  return (
    <form onSubmit={handleGuardar} className="space-y-5 pb-10">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate('/doctor/dashboard')}
          className="p-2 hover:bg-gray-100 rounded-xl transition text-gray-500">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-800">Consulta Oftalmológica</h2>
          <p className="text-gray-500 text-sm">
            {cita?.fecha} · {cita?.hora?.slice(0,5)} · {cita?.doctor_nombre}
          </p>
        </div>
        {soloLectura && (
          <span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <CheckCircle size={13} /> Consulta completada
          </span>
        )}
        {!soloLectura && (
          <button type="submit" disabled={guardando}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition">
            <Save size={16} />
            {guardando ? 'Guardando...' : 'Guardar consulta'}
          </button>
        )}
      </div>

      {/* Tarjeta del paciente */}
      <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-wrap gap-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center shrink-0">
            <span className="text-cyan-700 font-bold text-lg">
              {cita?.paciente_nombre?.[0]?.toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-bold text-gray-800 text-lg">{cita?.paciente_nombre}</p>
            <p className="text-gray-500 text-sm">CI: {cita?.carnet}{edad ? ` · ${edad} años` : ''}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-sm self-center">
          {paciente?.telefono    && <span className="text-gray-500">📞 {paciente.telefono}</span>}
          {paciente?.sexo        && <span className="text-gray-500">{paciente.sexo === 'M' ? 'Masculino' : 'Femenino'}</span>}
          {cita?.motivo          && <span className="text-gray-500 italic">"{cita.motivo}"</span>}
        </div>

        {/* Antecedentes si existen */}
        {(paciente?.antecedentes_oculares || paciente?.alergias || paciente?.medicamentos_actuales) && (
          <div className="w-full bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex flex-wrap gap-4 text-sm">
            {paciente.antecedentes_oculares && (
              <div>
                <span className="text-amber-600 font-medium text-xs uppercase">Antec. oculares: </span>
                <span className="text-gray-700">{paciente.antecedentes_oculares}</span>
              </div>
            )}
            {paciente.alergias && (
              <div>
                <span className="text-red-500 font-medium text-xs uppercase flex items-center gap-1 inline-flex">
                  <AlertTriangle size={11} /> Alergias:
                </span>
                <span className="text-gray-700 ml-1">{paciente.alergias}</span>
              </div>
            )}
            {paciente.medicamentos_actuales && (
              <div>
                <span className="text-amber-600 font-medium text-xs uppercase">Medicamentos: </span>
                <span className="text-gray-700">{paciente.medicamentos_actuales}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sección 1: Motivo y Anamnesis */}
      <Seccion icon={ClipboardList} titulo="Motivo y Anamnesis" color="blue">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Campo label="Motivo de consulta">
            <textarea rows={3} value={form.motivo_consulta} onChange={set('motivo_consulta')}
              disabled={soloLectura} className={TEXTAREA}
              placeholder="¿Por qué consulta el paciente?" />
          </Campo>
          <Campo label="Enfermedad actual">
            <textarea rows={3} value={form.enfermedad_actual} onChange={set('enfermedad_actual')}
              disabled={soloLectura} className={TEXTAREA}
              placeholder="Descripción del problema actual..." />
          </Campo>
        </div>
      </Seccion>

      {/* Sección 2: Agudeza Visual */}
      <Seccion icon={Eye} titulo="Agudeza Visual" color="teal">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <TablaOjos
            titulo="Sin corrección (SC)"
            form={form} setForm={soloLectura ? (fn => fn) : setForm}
            campos={[
              { label: 'Visión lejana', od: 'av_od_sc', oi: 'av_oi_sc' },
              { label: 'Visión cercana', od: 'av_od_cc', oi: 'av_oi_cc' },
            ]}
          />
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Refracción</p>
            <div className="grid grid-cols-3 gap-1 text-xs text-center mb-1 text-gray-400 font-medium">
              <span></span>
              <span>OD (derecho)</span>
              <span>OI (izquierdo)</span>
            </div>
            {[
              { label: 'Esfera', od: 'rx_od_esfera',   oi: 'rx_oi_esfera',   type: 'number', step: '0.25' },
              { label: 'Cilindro', od: 'rx_od_cilindro', oi: 'rx_oi_cilindro', type: 'number', step: '0.25' },
              { label: 'Eje (°)', od: 'rx_od_eje',     oi: 'rx_oi_eje',     type: 'number', step: '1' },
            ].map(({ label, od, oi, type, step }) => (
              <div key={label} className="grid grid-cols-3 gap-2 mb-2 items-center">
                <span className="text-xs text-gray-500 font-medium text-right pr-2">{label}</span>
                <input type={type} step={step}
                  value={form[od] || ''} onChange={set(od)} disabled={soloLectura}
                  className={INPUT} placeholder="—" />
                <input type={type} step={step}
                  value={form[oi] || ''} onChange={set(oi)} disabled={soloLectura}
                  className={INPUT} placeholder="—" />
              </div>
            ))}
          </div>
        </div>
      </Seccion>

      {/* Sección 3: PIO */}
      <Seccion icon={Activity} titulo="Presión Intraocular (PIO)" color="purple">
        <div className="grid grid-cols-3 gap-4 items-end">
          <Campo label="PIO Ojo Derecho (mmHg)">
            <input type="number" step="0.1" value={form.pio_od} onChange={set('pio_od')}
              disabled={soloLectura} className={INPUT} placeholder="—" />
          </Campo>
          <Campo label="PIO Ojo Izquierdo (mmHg)">
            <input type="number" step="0.1" value={form.pio_oi} onChange={set('pio_oi')}
              disabled={soloLectura} className={INPUT} placeholder="—" />
          </Campo>
          <Campo label="Método">
            <select value={form.metodo_pio} onChange={set('metodo_pio')}
              disabled={soloLectura} className={INPUT}>
              {['Tonómetro de aplanación','Tonómetro de no contacto','Tonopen','Icare'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </Campo>
        </div>
      </Seccion>

      {/* Sección 4: Exploración */}
      <Seccion icon={Microscope} titulo="Exploración" color="amber">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Biomicroscopía</p>
            <div className="space-y-3">
              <Campo label="Ojo Derecho (OD)">
                <textarea rows={3} value={form.biomicroscopia_od} onChange={set('biomicroscopia_od')}
                  disabled={soloLectura} className={TEXTAREA}
                  placeholder="Córnea, conjuntiva, cristalino, cámara anterior..." />
              </Campo>
              <Campo label="Ojo Izquierdo (OI)">
                <textarea rows={3} value={form.biomicroscopia_oi} onChange={set('biomicroscopia_oi')}
                  disabled={soloLectura} className={TEXTAREA}
                  placeholder="Córnea, conjuntiva, cristalino, cámara anterior..." />
              </Campo>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Fondo de Ojo</p>
            <div className="space-y-3">
              <Campo label="Ojo Derecho (OD)">
                <textarea rows={3} value={form.fondo_ojo_od} onChange={set('fondo_ojo_od')}
                  disabled={soloLectura} className={TEXTAREA}
                  placeholder="Papila, mácula, vasos, retina periférica..." />
              </Campo>
              <Campo label="Ojo Izquierdo (OI)">
                <textarea rows={3} value={form.fondo_ojo_oi} onChange={set('fondo_ojo_oi')}
                  disabled={soloLectura} className={TEXTAREA}
                  placeholder="Papila, mácula, vasos, retina periférica..." />
              </Campo>
            </div>
          </div>
        </div>
      </Seccion>

      {/* Sección 5: Diagnóstico y Plan */}
      <Seccion icon={Stethoscope} titulo="Diagnóstico y Plan de Tratamiento" color="rose">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Campo label="Diagnóstico *" className="md:col-span-2">
            <BuscadorCIE disabled={soloLectura} onSelect={agregarCIE} />
            <textarea rows={3} required value={form.diagnostico} onChange={set('diagnostico')}
              disabled={soloLectura} className={TEXTAREA}
              placeholder="Escribí a mano o usá el buscador CIE-10 de arriba..." />
            {!soloLectura && (
              <p className="text-[11px] text-gray-400 mt-1">Podés buscar el código CIE-10 y se agrega solo; igual podés editar el texto a mano.</p>
            )}
          </Campo>
          <Campo label="Plan de tratamiento">
            <textarea rows={3} value={form.plan_tratamiento} onChange={set('plan_tratamiento')}
              disabled={soloLectura} className={TEXTAREA}
              placeholder="Indicaciones y procedimientos a seguir..." />
          </Campo>
          <Campo label="Medicación / Receta">
            <textarea rows={3} value={form.medicacion} onChange={set('medicacion')}
              disabled={soloLectura} className={TEXTAREA}
              placeholder="Fármacos, dosis, duración..." />
          </Campo>
          <Campo label="Observaciones adicionales">
            <textarea rows={2} value={form.observaciones} onChange={set('observaciones')}
              disabled={soloLectura} className={TEXTAREA}
              placeholder="Notas adicionales del doctor..." />
          </Campo>
          <Campo label="Próxima cita (fecha recomendada)">
            <input type="date" value={form.proxima_cita} onChange={set('proxima_cita')}
              disabled={soloLectura} className={INPUT} />
          </Campo>
        </div>
      </Seccion>

      {/* Sección 6: Servicios realizados */}
      <Seccion icon={CheckCircle} titulo="Servicios realizados (para facturación)" color="green">
        <SelectorServicios
          servicios={servicios}
          seleccionados={selServicios}
          onChange={soloLectura ? () => {} : setSelServicios}
        />
        {soloLectura && selServicios.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-4">No se registraron servicios</p>
        )}
      </Seccion>

      {/* Botón guardar abajo también */}
      {!soloLectura && (
        <div className="flex justify-end pt-2">
          <button type="submit" disabled={guardando}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white px-8 py-3 rounded-xl font-bold text-sm transition shadow-sm">
            <Save size={17} />
            {guardando ? 'Guardando...' : 'Guardar consulta y marcar como atendida'}
          </button>
        </div>
      )}

      {soloLectura && (
        <div className="flex justify-center pt-2">
          <button type="button" onClick={() => setSoloLectura(false)}
            className="text-sm text-blue-600 hover:underline">
            Editar esta consulta
          </button>
        </div>
      )}
    </form>
  )
}
