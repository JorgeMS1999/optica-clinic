import { useState, useEffect, useCallback } from 'react'
import { Plus, ChevronLeft, ChevronRight, Calendar, Pencil, List, CalendarDays } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import NuevaCitaForm from './NuevaCitaForm'

const DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const ESTADOS = ['programada','confirmada','en_espera','en_consulta','atendida','cancelada','no_asistio']

function toLocalISO(date) {
  return date.toLocaleDateString('en-CA') // YYYY-MM-DD en zona local
}

function fmtFechaCorta(iso) {
  const d = new Date(String(iso).slice(0, 10) + 'T12:00:00')
  return `${DIAS[d.getDay()]} ${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`
}

export default function Citas() {
  const [fecha, setFecha] = useState(toLocalISO(new Date()))
  const [verTodas, setVerTodas] = useState(false)   // false = por día, true = todas
  const [citas, setCitas] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalNueva, setModalNueva] = useState(false)
  const [citaEditar, setCitaEditar] = useState(null)

  const cargarCitas = useCallback(async () => {
    setLoading(true)
    try {
      const url = verTodas ? '/citas' : `/citas?fecha=${fecha}`
      const { data } = await api.get(url)
      setCitas(data)
    } catch { toast.error('Error al cargar citas') }
    finally { setLoading(false) }
  }, [verTodas, fecha])

  useEffect(() => { cargarCitas() }, [cargarCitas])

  function cambiarDia(delta) {
    const d = new Date(fecha + 'T12:00:00')
    d.setDate(d.getDate() + delta)
    setFecha(toLocalISO(d))
  }

  async function cambiarEstado(citaId, estado) {
    try {
      await api.patch(`/citas/${citaId}/estado`, { estado })
      toast.success('Estado actualizado')
      cargarCitas()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al actualizar')
    }
  }

  const fechaObj = new Date(fecha + 'T12:00:00')
  const esHoy = fecha === toLocalISO(new Date())

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Citas</h2>
          <p className="text-gray-500 text-sm mt-0.5">Agenda y programación</p>
        </div>
        <button
          onClick={() => setModalNueva(true)}
          className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition"
        >
          <Plus size={18} /> Nueva Cita
        </button>
      </div>

      {/* Toggle: por día / todas */}
      <div className="flex gap-2">
        <button onClick={() => setVerTodas(false)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition
            ${!verTodas ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
          <CalendarDays size={16} /> Por día
        </button>
        <button onClick={() => setVerTodas(true)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition
            ${verTodas ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
          <List size={16} /> Todas
        </button>
      </div>

      {/* Navegador de fecha (solo en modo por día) */}
      {!verTodas && (
        <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-4">
          <button onClick={() => cambiarDia(-1)} className="p-2 hover:bg-gray-100 rounded-xl transition">
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1 text-center">
            <p className="font-semibold text-gray-800 text-lg">
              {DIAS[fechaObj.getDay()]}, {fechaObj.getDate()} de {MESES[fechaObj.getMonth()]} {fechaObj.getFullYear()}
            </p>
            {esHoy && <span className="text-xs text-blue-600 font-medium">Hoy</span>}
          </div>
          <button onClick={() => cambiarDia(1)} className="p-2 hover:bg-gray-100 rounded-xl transition">
            <ChevronRight size={20} />
          </button>
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      )}

      {/* Resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: verTodas ? 'Total citas' : 'Total', value: citas.filter(c => !['cancelada','no_asistio'].includes(c.estado)).length, color: 'text-blue-700' },
          { label: 'Consultas',     value: citas.filter(c => c.tipo === 'consulta').length,      color: 'text-green-600' },
          { label: 'Procedimientos',value: citas.filter(c => c.tipo === 'procedimiento').length, color: 'text-amber-600' },
          { label: 'Cirugías',      value: citas.filter(c => c.tipo === 'cirugia').length,       color: 'text-rose-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl shadow-sm p-4 text-center">
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            <p className="text-gray-500 text-xs mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Lista de citas */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando...</div>
        ) : citas.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Calendar size={36} className="mx-auto mb-2 opacity-40" />
            <p>{verTodas ? 'No hay citas registradas' : 'No hay citas para este día'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[880px]">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                {verTodas && <th className="px-4 py-3 text-left">Fecha</th>}
                <th className="px-4 py-3 text-left">Hora</th>
                <th className="px-6 py-3 text-left">Paciente</th>
                <th className="px-6 py-3 text-left">Doctor</th>
                <th className="px-6 py-3 text-left">Tipo</th>
                <th className="px-6 py-3 text-left">Estado</th>
                <th className="px-6 py-3 text-left">Pago</th>
                <th className="px-6 py-3 text-left">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {citas.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  {verTodas && (
                    <td className="px-4 py-4 text-gray-600 whitespace-nowrap">{fmtFechaCorta(c.fecha)}</td>
                  )}
                  <td className="px-4 py-4 font-mono font-medium text-gray-800 whitespace-nowrap">{c.hora?.slice(0,5)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="font-medium text-gray-800">{c.paciente_nombre}</p>
                    <p className="text-gray-400 text-xs">{c.carnet}</p>
                  </td>
                  <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{c.doctor_nombre}</td>
                  <td className="px-6 py-4">
                    <Badge value={c.tipo} />
                    {c.servicios_nombres && (
                      <p className="text-xs text-gray-500 mt-1 max-w-[200px]">{c.servicios_nombres}</p>
                    )}
                  </td>
                  <td className="px-6 py-4"><Badge value={c.estado} /></td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {c.pagado ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                        Pagado · Bs. {parseFloat(c.pago_total).toFixed(2)}
                      </span>
                    ) : parseFloat(c.total_servicios) > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                        Por cobrar · Bs. {parseFloat(c.total_servicios).toFixed(2)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-400">
                        Sin cobro
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <select
                        value={c.estado}
                        onChange={e => cambiarEstado(c.id, e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {ESTADOS.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                      </select>
                      <button
                        onClick={() => setCitaEditar(c)}
                        title="Editar cita e imprimir"
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      >
                        <Pencil size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      <Modal
        open={modalNueva || !!citaEditar}
        onClose={() => { setModalNueva(false); setCitaEditar(null) }}
        title={citaEditar ? 'Editar Cita' : 'Nueva Cita'}
        size="xl"
      >
        <NuevaCitaForm
          key={citaEditar?.id || 'nueva'}
          fechaDefault={fecha}
          cita={citaEditar}
          onGuardada={() => { setModalNueva(false); setCitaEditar(null); cargarCitas() }}
        />
      </Modal>
    </div>
  )
}
