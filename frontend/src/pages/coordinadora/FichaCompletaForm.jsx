import { useState } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'

const CAMPOS = [
  { section: 'Datos personales', fields: [
    { key: 'nombre',           label: 'Nombre completo',  type: 'text',   required: true },
    { key: 'carnet',           label: 'Carnet / CI',      type: 'text',   required: true },
    { key: 'fecha_nacimiento', label: 'Fecha nacimiento', type: 'date' },
    { key: 'sexo',             label: 'Sexo',             type: 'select', options: [{ v:'M', l:'Masculino' },{ v:'F', l:'Femenino' }] },
    { key: 'telefono',         label: 'Teléfono',         type: 'tel' },
    { key: 'telefono_alt',     label: 'Teléfono alt.',    type: 'tel' },
    { key: 'email',            label: 'Correo',           type: 'email' },
    { key: 'direccion',        label: 'Dirección',        type: 'text' },
    { key: 'ocupacion',        label: 'Ocupación',        type: 'text' },
  ]},
  { section: 'Antecedentes médicos', fields: [
    { key: 'antecedentes_oculares',   label: 'Antecedentes oculares',   type: 'textarea' },
    { key: 'antecedentes_familiares', label: 'Antecedentes familiares', type: 'textarea' },
    { key: 'alergias',               label: 'Alergias',                type: 'textarea' },
    { key: 'medicamentos_actuales',  label: 'Medicamentos actuales',   type: 'textarea' },
  ]},
]

export default function FichaCompletaForm({ paciente, onGuardado }) {
  const [form, setForm] = useState({ ...paciente })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await api.put(`/pacientes/${paciente.id}`, form)
      toast.success('Ficha actualizada correctamente')
      onGuardado()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {CAMPOS.map(({ section, fields }) => (
        <div key={section}>
          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 border-b border-gray-100 pb-2">
            {section}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.map(f => (
              <div key={f.key} className={f.type === 'textarea' ? 'sm:col-span-2' : ''}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {f.label} {f.required && <span className="text-red-500">*</span>}
                </label>
                {f.type === 'select' ? (
                  <select
                    value={form[f.key] || ''}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">— Seleccionar —</option>
                    {f.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                ) : f.type === 'textarea' ? (
                  <textarea
                    rows={3}
                    value={form[f.key] || ''}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                ) : (
                  <input
                    type={f.type}
                    required={f.required}
                    value={form[f.key] || ''}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex justify-end pt-2">
        <button
          type="submit" disabled={loading}
          className="bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white px-8 py-2.5 rounded-xl font-medium text-sm transition"
        >
          {loading ? 'Guardando...' : 'Guardar ficha completa'}
        </button>
      </div>
    </form>
  )
}
