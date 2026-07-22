import { useState, useEffect } from 'react'
import { Edit2, Check, X, Plus, ClipboardList } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import Modal from '../../components/ui/Modal'

const CAT_COLOR = {
  'Consulta':     'bg-blue-100 text-blue-700',
  'Procedimiento':'bg-purple-100 text-purple-700',
  'Cirugía':      'bg-rose-100 text-rose-700',
}

function fmt(v) {
  return parseFloat(v) === 0 || v == null ? null : `Bs. ${parseFloat(v).toFixed(2)}`
}

function FilaPrecio({ servicio, onGuardado }) {
  const esCirugia = servicio.categoria === 'Cirugía'
  const [editando, setEditando] = useState(false)
  const [precio,   setPrecio]   = useState(parseFloat(servicio.precio).toFixed(2))
  const [porOjo,   setPorOjo]   = useState(servicio.precio_por_ojo != null ? parseFloat(servicio.precio_por_ojo).toFixed(2) : '')
  const [ambosOjos,setAmbosOjos]= useState(servicio.precio_ambos_ojos != null ? parseFloat(servicio.precio_ambos_ojos).toFixed(2) : '')
  const [obs,      setObs]      = useState(servicio.observaciones || '')
  const [saving,   setSaving]   = useState(false)

  async function guardar() {
    if (parseFloat(precio) < 0) return toast.error('Precio inválido')
    setSaving(true)
    try {
      if (esCirugia) {
        await api.patch(`/servicios/${servicio.id}/tarifas`, {
          precio: parseFloat(precio),
          precio_por_ojo: porOjo === '' ? null : parseFloat(porOjo),
          precio_ambos_ojos: ambosOjos === '' ? null : parseFloat(ambosOjos),
          observaciones: obs.trim() || null,
        })
      } else {
        await api.patch(`/servicios/${servicio.id}/precio`, { precio: parseFloat(precio) })
      }
      toast.success('Precio actualizado')
      setEditando(false)
      onGuardado()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error')
    } finally { setSaving(false) }
  }

  function cancelar() {
    setPrecio(parseFloat(servicio.precio).toFixed(2))
    setPorOjo(servicio.precio_por_ojo != null ? parseFloat(servicio.precio_por_ojo).toFixed(2) : '')
    setAmbosOjos(servicio.precio_ambos_ojos != null ? parseFloat(servicio.precio_ambos_ojos).toFixed(2) : '')
    setObs(servicio.observaciones || '')
    setEditando(false)
  }

  if (esCirugia) {
    return (
      <tr className="hover:bg-gray-50 border-b border-gray-100 last:border-0">
        <td className="px-5 py-3.5">
          <p className="font-medium text-gray-800 text-sm">{servicio.nombre}</p>
          {servicio.descripcion && <p className="text-gray-400 text-xs mt-0.5">{servicio.descripcion}</p>}
        </td>
        <td className="px-5 py-3.5">
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${CAT_COLOR[servicio.categoria] || 'bg-gray-100 text-gray-600'}`}>
            {servicio.categoria}
          </span>
        </td>
        <td className="px-5 py-3.5" colSpan={2}>
          {editando ? (
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-[10px] text-gray-400 mb-0.5">Precio lista</label>
                <input type="number" min="0" step="0.50" value={precio} onChange={e => setPrecio(e.target.value)} autoFocus
                  className="w-24 border border-blue-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 text-right font-semibold" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-400 mb-0.5">Por ojo</label>
                <input type="number" min="0" step="0.50" value={porOjo} onChange={e => setPorOjo(e.target.value)}
                  className="w-24 border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 text-right" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-400 mb-0.5">Ambos ojos</label>
                <input type="number" min="0" step="0.50" value={ambosOjos} onChange={e => setAmbosOjos(e.target.value)}
                  className="w-24 border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 text-right" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-400 mb-0.5">Obs.</label>
                <input type="text" value={obs} onChange={e => setObs(e.target.value)}
                  className="w-24 border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                  onKeyDown={e => { if (e.key === 'Enter') guardar(); if (e.key === 'Escape') cancelar() }} />
              </div>
              <button onClick={guardar} disabled={saving} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition"><Check size={16} /></button>
              <button onClick={cancelar} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition"><X size={16} /></button>
            </div>
          ) : (
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-xs text-gray-400">Lista <b className="text-gray-800">{fmt(servicio.precio) || '—'}</b></span>
              <span className="text-xs text-gray-400">Por ojo <b className="text-gray-800">{fmt(servicio.precio_por_ojo) || '—'}</b></span>
              <span className="text-xs text-gray-400">Ambos ojos <b className="text-gray-800">{fmt(servicio.precio_ambos_ojos) || '—'}</b></span>
              {servicio.observaciones && <span className="text-xs text-gray-400">Obs <b className="text-gray-800">{servicio.observaciones}</b></span>}
              <button onClick={() => setEditando(true)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition ml-auto">
                Editar tarifas
              </button>
            </div>
          )}
        </td>
      </tr>
    )
  }

  return (
    <tr className="hover:bg-gray-50 border-b border-gray-100 last:border-0">
      <td className="px-5 py-3.5">
        <p className="font-medium text-gray-800 text-sm">{servicio.nombre}</p>
        {servicio.descripcion && <p className="text-gray-400 text-xs mt-0.5">{servicio.descripcion}</p>}
      </td>
      <td className="px-5 py-3.5">
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${CAT_COLOR[servicio.categoria] || 'bg-gray-100 text-gray-600'}`}>
          {servicio.categoria}
        </span>
      </td>
      <td className="px-5 py-3.5 w-48">
        {editando ? (
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">Bs.</span>
            <input
              type="number" min="0" step="0.50"
              value={precio}
              onChange={e => setPrecio(e.target.value)}
              autoFocus
              className="w-24 border border-blue-300 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-right font-semibold"
              onKeyDown={e => { if (e.key === 'Enter') guardar(); if (e.key === 'Escape') cancelar() }}
            />
            <button onClick={guardar} disabled={saving}
              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition">
              <Check size={16} />
            </button>
            <button onClick={cancelar}
              className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition">
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className={`font-bold text-sm ${parseFloat(servicio.precio) === 0 ? 'text-gray-400' : 'text-gray-800'}`}>
              {parseFloat(servicio.precio) === 0 ? 'Sin precio' : `Bs. ${parseFloat(servicio.precio).toFixed(2)}`}
            </span>
            <button onClick={() => setEditando(true)}
              className="p-1.5 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition opacity-0 group-hover:opacity-100">
              <Edit2 size={13} />
            </button>
          </div>
        )}
      </td>
      <td className="px-5 py-3.5 text-right">
        {!editando && (
          <button onClick={() => setEditando(true)}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition">
            Editar precio
          </button>
        )}
      </td>
    </tr>
  )
}

const FORM_VACIO = { nombre: '', descripcion: '', categoria_id: '', precio: '0' }

export default function Servicios() {
  const [servicios,   setServicios]   = useState([])
  const [categorias,  setCategorias]  = useState([])
  const [loading,     setLoading]     = useState(true)
  const [modal,       setModal]       = useState(false)
  const [form,        setForm]        = useState(FORM_VACIO)
  const [guardando,   setGuardando]   = useState(false)

  async function cargar() {
    setLoading(true)
    try {
      const [srvRes, catRes] = await Promise.all([
        api.get('/servicios'),
        api.get('/servicios/categorias'),
      ])
      setServicios(srvRes.data)
      setCategorias(catRes.data)
    } catch { toast.error('Error al cargar') }
    finally { setLoading(false) }
  }

  useEffect(() => { cargar() }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nombre.trim() || !form.categoria_id) return toast.error('Nombre y categoría requeridos')
    setGuardando(true)
    try {
      await api.post('/servicios', { ...form, precio: parseFloat(form.precio) || 0 })
      toast.success('Servicio creado')
      setModal(false)
      setForm(FORM_VACIO)
      cargar()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear')
    } finally { setGuardando(false) }
  }

  // Agrupar por categoría
  const grupos = servicios.reduce((acc, s) => {
    const cat = s.categoria || 'Otros'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(s)
    return acc
  }, {})

  const sinPrecio = servicios.filter(s => parseFloat(s.precio) === 0).length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Servicios</h2>
          <p className="text-gray-500 text-sm mt-0.5">Configura los precios por servicio de esta clínica</p>
        </div>
        <button onClick={() => { setForm(FORM_VACIO); setModal(true) }}
          className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition">
          <Plus size={18} /> Nuevo Servicio
        </button>
      </div>

      {sinPrecio > 0 && (
        <div className="bg-yellow-50 border border-yellow-100 text-yellow-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <Edit2 size={15} />
          <span><strong>{sinPrecio}</strong> servicio{sinPrecio > 1 ? 's' : ''} sin precio asignado — haz clic en "Editar precio" para configurarlos.</span>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl p-10 text-center text-gray-400">Cargando servicios...</div>
      ) : (
        Object.entries(grupos).map(([cat, items]) => (
          <div key={cat} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className={`px-5 py-3 border-b flex items-center gap-2 ${CAT_COLOR[cat] || 'bg-gray-50 text-gray-600'}`}>
              <ClipboardList size={15} />
              <h3 className="font-semibold text-sm">{cat}</h3>
              <span className="ml-auto text-xs opacity-70">{items.length} servicio{items.length > 1 ? 's' : ''}</span>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {items.map(s => (
                  <FilaPrecio key={s.id} servicio={s} onGuardado={cargar} />
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Nuevo Servicio" size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre <span className="text-red-500">*</span></label>
            <input required value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nombre del servicio" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría <span className="text-red-500">*</span></label>
            <select required value={form.categoria_id} onChange={e => setForm(f => ({ ...f, categoria_id: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">— Seleccionar —</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <input value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Opcional" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Precio (Bs.)</label>
            <input type="number" min="0" step="0.50" value={form.precio}
              onChange={e => setForm(f => ({ ...f, precio: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)}
              className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
              Cancelar
            </button>
            <button type="submit" disabled={guardando}
              className="flex-1 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white py-2.5 rounded-xl text-sm font-medium transition">
              {guardando ? 'Guardando...' : 'Crear Servicio'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
