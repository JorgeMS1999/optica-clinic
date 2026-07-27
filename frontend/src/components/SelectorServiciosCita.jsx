import { useState, useRef, useEffect } from 'react'
import { Search, Trash2, Tag } from 'lucide-react'

/**
 * Selector de servicios/procedimientos para el registro de una cita.
 * Buscador con autocompletado: trae el precio del catálogo automáticamente
 * y lo deja editar ahí mismo (descuentos o servicios de precio variable).
 *
 * props:
 *  - servicios: catálogo [{ id, nombre, precio, precio_por_ojo, precio_ambos_ojos, categoria, observaciones }]
 *  - value: líneas seleccionadas [{ servicio_id, precio_cobrado, notas, _nombre, _categoria, _precio_base }]
 *  - onChange(lineas)
 *  - tipoSugerido: 'consulta' | 'procedimiento' | 'cirugia'  (para el acceso rápido)
 */

const CAT_POR_TIPO = { consulta: 'Consulta', procedimiento: 'Procedimiento', cirugia: 'Cirugía' }
const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export default function SelectorServiciosCita({ servicios = [], value = [], onChange, tipoSugerido }) {
  const [q, setQ] = useState('')
  const [abierto, setAbierto] = useState(false)
  const boxRef = useRef(null)

  const yaElegido = id => value.some(l => l.servicio_id === id)

  // Cerrar el desplegable al hacer clic afuera
  useEffect(() => {
    function onDoc(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setAbierto(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  function agregar(servicio_id) {
    const srv = servicios.find(s => s.id === parseInt(servicio_id))
    if (!srv || yaElegido(srv.id)) return
    onChange([...value, {
      servicio_id:    srv.id,
      precio_cobrado: parseFloat(srv.precio) || 0,
      notas:          '',
      _nombre:        srv.nombre,
      _categoria:     srv.categoria,
      _precio_base:   parseFloat(srv.precio) || 0,
    }])
    setQ('')
    setAbierto(false)   // cerrar el desplegable al elegir un servicio
  }

  function quitar(servicio_id) {
    onChange(value.filter(l => l.servicio_id !== servicio_id))
  }

  function setPrecio(servicio_id, precio) {
    onChange(value.map(l =>
      l.servicio_id === servicio_id ? { ...l, precio_cobrado: precio === '' ? '' : parseFloat(precio) || 0 } : l
    ))
  }

  function tarifasDe(servicio_id) {
    const s = servicios.find(sv => sv.id === servicio_id)
    if (!s || s.categoria !== 'Cirugía') return []
    const t = []
    if (s.precio != null && parseFloat(s.precio) > 0) t.push({ label: 'Lista',      valor: parseFloat(s.precio) })
    if (s.precio_por_ojo != null)                     t.push({ label: 'Por ojo',    valor: parseFloat(s.precio_por_ojo) })
    if (s.precio_ambos_ojos != null)                  t.push({ label: 'Ambos ojos', valor: parseFloat(s.precio_ambos_ojos) })
    return t
  }

  // Filtrado por lo que se escribe, agrupado por categoría
  const filtrados = servicios.filter(s => norm(s.nombre).includes(norm(q)))
  const grupos = filtrados.reduce((acc, s) => {
    const cat = s.categoria || 'Otros'
    ;(acc[cat] = acc[cat] || []).push(s)
    return acc
  }, {})
  // Mostrar primero la categoría que coincide con el tipo de cita
  const catSugerida = CAT_POR_TIPO[tipoSugerido]
  const ordenCats = Object.keys(grupos).sort((a, b) =>
    (a === catSugerida ? -1 : 0) - (b === catSugerida ? -1 : 0))

  const total = value.reduce((s, l) => s + (parseFloat(l.precio_cobrado) || 0), 0)

  return (
    <div className="space-y-3">
      {/* Buscador con autocompletado */}
      <div className="relative" ref={boxRef}>
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={q}
          onChange={e => { setQ(e.target.value); setAbierto(true) }}
          onFocus={() => setAbierto(true)}
          placeholder="Escribí para buscar un servicio, procedimiento o cirugía…"
          className="w-full border border-gray-300 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />

        {abierto && (
          <div className="absolute z-40 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
            {filtrados.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-400">Sin resultados para "{q}"</p>
            ) : (
              ordenCats.map(cat => (
                <div key={cat}>
                  <p className="sticky top-0 bg-gray-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    {cat}
                  </p>
                  {grupos[cat].map(s => {
                    const elegido = yaElegido(s.id)
                    return (
                      <button
                        key={s.id} type="button"
                        disabled={elegido}
                        onClick={() => agregar(s.id)}
                        className={`w-full flex items-center justify-between gap-3 px-4 py-2 text-sm text-left border-b border-gray-50 last:border-0 transition
                          ${elegido ? 'opacity-40 cursor-not-allowed' : 'hover:bg-blue-50'}`}
                      >
                        <span className="text-gray-700 truncate">{s.nombre}</span>
                        <span className="text-xs text-gray-400 shrink-0">
                          {parseFloat(s.precio) > 0 ? `Bs. ${parseFloat(s.precio).toFixed(2)}` : 'variable'}
                          {elegido ? ' · agregado' : ''}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Líneas elegidas */}
      {value.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center text-gray-400 text-sm">
          Sin servicios. Buscá arriba el procedimiento, examen o cirugía a realizar.
        </div>
      ) : (
        <div className="space-y-2">
          {value.map(l => {
            const tarifas = tarifasDe(l.servicio_id)
            const esVariable = !l._precio_base
            const modificado = !esVariable && parseFloat(l.precio_cobrado) !== l._precio_base
            return (
              <div key={l.servicio_id} className="border border-gray-200 rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{l._nombre}</p>
                    <span className="text-[11px] text-gray-400">{l._categoria}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs text-gray-400">Bs.</span>
                    <input
                      type="number" min="0" step="0.01"
                      value={l.precio_cobrado}
                      onChange={e => setPrecio(l.servicio_id, e.target.value)}
                      placeholder="0.00"
                      className={`w-28 text-right border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400
                        ${esVariable ? 'border-amber-300 bg-amber-50' : 'border-gray-200'}`}
                    />
                  </div>

                  <button type="button" onClick={() => quitar(l.servicio_id)}
                    className="text-gray-300 hover:text-red-500 transition p-1 shrink-0">
                    <Trash2 size={15} />
                  </button>
                </div>

                {/* Ayudas: precio variable, precio base modificado, tarifas de cirugía */}
                {(esVariable || modificado || tarifas.length > 0) && (
                  <div className="flex items-center gap-1.5 flex-wrap mt-1.5 pl-0.5">
                    {esVariable && (
                      <span className="text-[10px] text-amber-600 flex items-center gap-1">
                        <Tag size={10} /> Precio variable — ingresá el monto
                      </span>
                    )}
                    {modificado && (
                      <span className="text-[10px] text-gray-400">
                        Precio de lista: <span className="line-through">Bs. {l._precio_base.toFixed(2)}</span>
                      </span>
                    )}
                    {tarifas.map(t => (
                      <button key={t.label} type="button"
                        onClick={() => setPrecio(l.servicio_id, t.valor)}
                        className={`text-[10px] px-2 py-0.5 rounded-full border transition
                          ${parseFloat(l.precio_cobrado) === t.valor
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

          {/* Total */}
          <div className="flex justify-between items-center bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">
            <span className="text-sm text-blue-700 font-medium">
              {value.length} servicio{value.length > 1 ? 's' : ''}
            </span>
            <span className="text-blue-700 font-bold">Total: Bs. {total.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
