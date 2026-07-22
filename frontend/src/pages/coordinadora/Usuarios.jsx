import { useState, useEffect, useCallback } from 'react'
import { UserPlus, ToggleLeft, ToggleRight, ShieldCheck } from 'lucide-react'
import api from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'
import Modal from '../../components/ui/Modal'

const ROL_LABEL = {
  superadmin:    'Super Admin',
  admin_clinica: 'Admin Clínica',
  coordinadora:  'Coordinadora',
  doctor:        'Doctor',
  cajero:        'Cajero',
  admin_farmacia:'Admin Farmacia',
}

const ROL_COLOR = {
  superadmin:    'bg-purple-100 text-purple-700',
  admin_clinica: 'bg-blue-100 text-blue-700',
  coordinadora:  'bg-green-100 text-green-700',
  doctor:        'bg-cyan-100 text-cyan-700',
  cajero:        'bg-orange-100 text-orange-700',
  admin_farmacia:'bg-rose-100 text-rose-700',
}

// Qué roles puede crear cada rol
// Los doctores se registran desde la pantalla "Doctores" (crea también su perfil médico)
const PUEDE_CREAR = {
  superadmin:    ['admin_clinica', 'admin_farmacia', 'coordinadora', 'cajero'],
  admin_clinica: ['coordinadora', 'cajero'],
  coordinadora:  ['cajero'],
  admin_farmacia:['cajero'],
}

const FORM_VACIO = { nombre: '', email: '', password: '', rol: '', clinica_id: '', farmacia_id: '' }

export default function Usuarios() {
  const { usuario } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [clinicas, setClincias] = useState([])
  const [farmacias, setFarmacias] = useState([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(FORM_VACIO)
  const [guardando, setGuardando] = useState(false)

  const rolesPermitidos = PUEDE_CREAR[usuario?.rol] || []

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/usuarios')
      setUsuarios(data)
    } catch { toast.error('Error al cargar usuarios') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    cargar()
    if (usuario?.rol === 'superadmin') {
      api.get('/clinicas').then(r => setClincias(r.data)).catch(() => {})
      api.get('/farmacias').then(r => setFarmacias(r.data)).catch(() => {})
    }
  }, [cargar, usuario])

  async function toggleActivo(id, activo) {
    try {
      await api.patch(`/usuarios/${id}/activo`, { activo: !activo })
      toast.success(activo ? 'Usuario desactivado' : 'Usuario activado')
      cargar()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al actualizar')
    }
  }

  async function handleCrear(e) {
    e.preventDefault()
    if (!form.rol) return toast.error('Selecciona un rol')
    setGuardando(true)
    try {
      await api.post('/usuarios', form)
      toast.success('Usuario creado correctamente')
      setModal(false)
      setForm(FORM_VACIO)
      cargar()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear usuario')
    } finally {
      setGuardando(false)
    }
  }

  // Determina si el rol seleccionado requiere clínica o farmacia (solo superadmin asigna)
  const rolNecesitaClinica  = ['admin_clinica','coordinadora','doctor','cajero'].includes(form.rol)
  const rolNecesitaFarmacia = ['admin_farmacia'].includes(form.rol)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Usuarios</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            {usuario?.rol === 'coordinadora'
              ? 'Puedes crear usuarios cajero para tu clínica'
              : 'Gestión de usuarios del establecimiento'}
          </p>
        </div>
        {rolesPermitidos.length > 0 && (
          <button
            onClick={() => setModal(true)}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition"
          >
            <UserPlus size={18} /> Nuevo Usuario
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando...</div>
        ) : usuarios.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No hay usuarios registrados</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-6 py-3 text-left">Usuario</th>
                <th className="px-6 py-3 text-left">Rol</th>
                <th className="px-6 py-3 text-left">Establecimiento</th>
                <th className="px-6 py-3 text-left">Creado</th>
                <th className="px-6 py-3 text-left">Estado</th>
                {(usuario?.rol === 'superadmin' || usuario?.rol === 'admin_clinica' || usuario?.rol === 'admin_farmacia') && (
                  <th className="px-6 py-3 text-left">Acción</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {usuarios.map(u => (
                <tr key={u.id} className={`hover:bg-gray-50 ${!u.activo ? 'opacity-50' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-700 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {u.nombre[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{u.nombre}</p>
                        <p className="text-gray-400 text-xs">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${ROL_COLOR[u.rol] || 'bg-gray-100 text-gray-600'}`}>
                      {ROL_LABEL[u.rol] || u.rol}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-sm">
                    {u.clinica || u.farmacia || <span className="text-purple-500 font-medium flex items-center gap-1"><ShieldCheck size={14}/> Global</span>}
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs">
                    {new Date(u.creado_en).toLocaleDateString('es')}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  {(usuario?.rol === 'superadmin' || usuario?.rol === 'admin_clinica' || usuario?.rol === 'admin_farmacia') && (
                    <td className="px-6 py-4">
                      {u.rol !== 'superadmin' && (
                        <button
                          onClick={() => toggleActivo(u.id, u.activo)}
                          className={`flex items-center gap-1 text-xs font-medium transition ${u.activo ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}
                        >
                          {u.activo ? <><ToggleRight size={18}/> Desactivar</> : <><ToggleLeft size={18}/> Activar</>}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal crear usuario */}
      <Modal open={modal} onClose={() => { setModal(false); setForm(FORM_VACIO) }} title="Nuevo Usuario" size="sm">
        <form onSubmit={handleCrear} className="space-y-4">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo <span className="text-red-500">*</span></label>
            <input required value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nombre completo" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico <span className="text-red-500">*</span></label>
            <input required type="email" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="correo@ejemplo.com" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña <span className="text-red-500">*</span></label>
            <input required type="password" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Mínimo 8 caracteres" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rol <span className="text-red-500">*</span></label>
            <select required value={form.rol}
              onChange={e => setForm(f => ({ ...f, rol: e.target.value, clinica_id: '', farmacia_id: '' }))}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">— Seleccionar rol —</option>
              {rolesPermitidos.map(r => (
                <option key={r} value={r}>{ROL_LABEL[r]}</option>
              ))}
            </select>
          </div>

          {/* Solo superadmin asigna establecimiento */}
          {usuario?.rol === 'superadmin' && rolNecesitaClinica && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Clínica <span className="text-red-500">*</span></label>
              <select required value={form.clinica_id}
                onChange={e => setForm(f => ({ ...f, clinica_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— Seleccionar clínica —</option>
                {clinicas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
          )}

          {usuario?.rol === 'superadmin' && rolNecesitaFarmacia && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Farmacia <span className="text-red-500">*</span></label>
              <select required value={form.farmacia_id}
                onChange={e => setForm(f => ({ ...f, farmacia_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— Seleccionar farmacia —</option>
                {farmacias.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
              </select>
            </div>
          )}

          {/* Info para roles no superadmin */}
          {usuario?.rol !== 'superadmin' && form.rol && (
            <div className="bg-blue-50 text-blue-700 text-xs rounded-xl px-4 py-3">
              El usuario será asignado automáticamente a tu establecimiento.
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setModal(false); setForm(FORM_VACIO) }}
              className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
              Cancelar
            </button>
            <button type="submit" disabled={guardando}
              className="flex-1 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white py-2.5 rounded-xl text-sm font-medium transition">
              {guardando ? 'Creando...' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
