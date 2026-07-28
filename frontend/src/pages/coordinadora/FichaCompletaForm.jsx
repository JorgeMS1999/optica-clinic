import { useState } from 'react'
import { Hash, Printer, Grid3x3 } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { imprimirHistoriaClinica } from '../../utils/imprimirHistoriaClinica'

const INPUT = 'w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const LABEL = 'block text-sm font-medium text-gray-700 mb-1'

/* Toggle SÍ / NO (tres estados: null = sin marcar) */
function SiNo({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between border border-gray-200 rounded-xl px-3 py-2">
      <span className="text-sm text-gray-700 font-medium">{label}</span>
      <div className="flex gap-1">
        {[{ v: true, l: 'SÍ' }, { v: false, l: 'NO' }].map(o => (
          <button key={String(o.v)} type="button"
            onClick={() => onChange(value === o.v ? null : o.v)}
            className={`px-3 py-1 rounded-lg text-xs font-bold border transition
              ${value === o.v
                ? (o.v ? 'bg-red-600 text-white border-red-600' : 'bg-green-600 text-white border-green-600')
                : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
            {o.l}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function FichaCompletaForm({ paciente, proximoHC, onGuardado }) {
  const editando = !!paciente?.id

  const calcEdad = (fnac) => fnac
    ? String(Math.floor((new Date() - new Date(fnac)) / (365.25 * 24 * 60 * 60 * 1000)))
    : ''

  const [form, setForm] = useState(() => {
    const fnac = paciente?.fecha_nacimiento ? String(paciente.fecha_nacimiento).split('T')[0] : ''
    return {
      nro_historia:            paciente?.nro_historia ?? proximoHC ?? '',
      nombre:                  paciente?.nombre || '',
      carnet:                  paciente?.carnet || '',
      fecha_nacimiento:        fnac,
      edad:                    calcEdad(fnac),
      sexo:                    paciente?.sexo || '',
      estado_civil:            paciente?.estado_civil || '',
      ocupacion:               paciente?.ocupacion || '',
      telefono:                paciente?.telefono || '',
      telefono_alt:            paciente?.telefono_alt || '',
      email:                   paciente?.email || '',
      direccion:               paciente?.direccion || '',
      tiene_alergias:          paciente?.tiene_alergias ?? null,
      dbt:                     paciente?.dbt ?? null,
      hta:                     paciente?.hta ?? null,
      rmto:                    paciente?.rmto ?? null,
      antecedentes_oculares:   paciente?.antecedentes_oculares || '',
      antecedentes_familiares: paciente?.antecedentes_familiares || '',
      alergias:                paciente?.alergias || '',
      medicamentos_actuales:   paciente?.medicamentos_actuales || '',
    }
  })
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nombre.trim()) {
      return toast.error('El nombre es obligatorio')
    }
    // Si solo pusieron la edad (sin fecha), derivar una fecha de nacimiento aproximada
    let fecha_nacimiento = form.fecha_nacimiento
    if (!fecha_nacimiento && form.edad) {
      const e2 = parseInt(form.edad)
      if (e2 > 0 && e2 < 120) fecha_nacimiento = `${new Date().getFullYear() - e2}-01-01`
    }
    const payload = { ...form, fecha_nacimiento }

    setLoading(true)
    try {
      if (editando) {
        await api.put(`/pacientes/${paciente.id}`, payload)
        toast.success('Ficha actualizada correctamente')
        onGuardado()
      } else {
        const { data } = await api.post('/pacientes', payload)
        toast.success(`Paciente registrado — Historia Clínica N° ${data.nro_historia}`)
        onGuardado(data)
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* N° de Historia Clínica */}
      <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
        <Hash size={18} className="text-blue-600 shrink-0" />
        <label className="text-sm font-semibold text-blue-700 shrink-0">N° Historia Clínica</label>
        <input
          type="number" min="1" value={form.nro_historia}
          onChange={e => set('nro_historia', e.target.value)}
          className="w-28 border border-blue-200 rounded-lg px-3 py-1.5 text-lg font-bold text-blue-700 font-mono text-center focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <span className="text-xs text-gray-400">se asigna solo, podés cambiarlo</span>
      </div>

      {/* Datos personales */}
      <div>
        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 border-b border-gray-100 pb-2">
          Datos personales
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className={LABEL}>Nombre completo <span className="text-red-500">*</span></label>
            <input required value={form.nombre} onChange={e => set('nombre', e.target.value)} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>CI / Carnet</label>
            <input value={form.carnet} onChange={e => set('carnet', e.target.value)} className={INPUT} placeholder="opcional" />
          </div>
          <div>
            <label className={LABEL}>Fecha de nacimiento</label>
            <input type="date" value={form.fecha_nacimiento}
              onChange={e => {
                const v = e.target.value
                setForm(f => ({ ...f, fecha_nacimiento: v, edad: v ? calcEdad(v) : f.edad }))
              }}
              className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Edad</label>
            <input type="number" min="0" max="120" value={form.edad}
              onChange={e => set('edad', e.target.value)}
              placeholder="años" className={INPUT} />
            <p className="text-[11px] text-gray-400 mt-0.5">Podés poner solo la edad, sin fecha</p>
          </div>
          <div>
            <label className={LABEL}>Sexo</label>
            <select value={form.sexo} onChange={e => set('sexo', e.target.value)} className={INPUT}>
              <option value="">— Seleccionar —</option>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
            </select>
          </div>
          <div>
            <label className={LABEL}>Estado civil</label>
            <select value={form.estado_civil} onChange={e => set('estado_civil', e.target.value)} className={INPUT}>
              <option value="">— Seleccionar —</option>
              {['Soltero/a','Casado/a','Divorciado/a','Viudo/a','Concubino/a'].map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Profesión / Ocupación</label>
            <input value={form.ocupacion} onChange={e => set('ocupacion', e.target.value)} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Celular</label>
            <input value={form.telefono} onChange={e => set('telefono', e.target.value)} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Teléfono alt.</label>
            <input value={form.telefono_alt} onChange={e => set('telefono_alt', e.target.value)} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Correo</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={INPUT} />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className={LABEL}>Dirección domiciliaria</label>
            <input value={form.direccion} onChange={e => set('direccion', e.target.value)} className={INPUT} />
          </div>
        </div>
      </div>

      {/* Antecedentes rápidos SÍ/NO */}
      <div>
        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 border-b border-gray-100 pb-2">
          Antecedentes
        </h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SiNo label="Alergias" value={form.tiene_alergias} onChange={v => set('tiene_alergias', v)} />
          <SiNo label="DBT"      value={form.dbt}  onChange={v => set('dbt', v)} />
          <SiNo label="HTA"      value={form.hta}  onChange={v => set('hta', v)} />
          <SiNo label="RMTO"     value={form.rmto} onChange={v => set('rmto', v)} />
        </div>
      </div>

      {/* Detalle de antecedentes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL}>Antecedentes oculares</label>
          <textarea rows={2} value={form.antecedentes_oculares} onChange={e => set('antecedentes_oculares', e.target.value)} className={`${INPUT} resize-none`} />
        </div>
        <div>
          <label className={LABEL}>Antecedentes familiares</label>
          <textarea rows={2} value={form.antecedentes_familiares} onChange={e => set('antecedentes_familiares', e.target.value)} className={`${INPUT} resize-none`} />
        </div>
        <div>
          <label className={LABEL}>Alergias (detalle)</label>
          <textarea rows={2} value={form.alergias} onChange={e => set('alergias', e.target.value)} className={`${INPUT} resize-none`} placeholder="¿A qué es alérgico?" />
        </div>
        <div>
          <label className={LABEL}>Medicamentos actuales</label>
          <textarea rows={2} value={form.medicamentos_actuales} onChange={e => set('medicamentos_actuales', e.target.value)} className={`${INPUT} resize-none`} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100">
        <div className="flex gap-2">
          <button type="button" onClick={() => imprimirHistoriaClinica(form)}
            className="flex items-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2.5 rounded-xl text-sm font-medium transition">
            <Printer size={16} /> Imprimir HC
          </button>
          <button type="button" onClick={() => imprimirHistoriaClinica(form, { guias: true })}
            title="Imprime los datos con una cuadrícula y los nombres de campo, para verificar la ubicación"
            className="flex items-center gap-2 text-gray-400 hover:text-gray-600 px-2 py-2.5 rounded-xl text-xs font-medium transition">
            <Grid3x3 size={15} /> Prueba con guías
          </button>
        </div>
        <button type="submit" disabled={loading}
          className="bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white px-8 py-2.5 rounded-xl font-medium text-sm transition">
          {loading ? 'Guardando...' : editando ? 'Guardar ficha' : 'Registrar paciente'}
        </button>
      </div>
    </form>
  )
}
