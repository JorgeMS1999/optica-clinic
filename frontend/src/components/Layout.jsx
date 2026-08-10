import { useState, useEffect } from 'react'
import { NavLink, useNavigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'
import {
  LayoutDashboard, Calendar, Users, UserCheck, ClipboardList,
  CreditCard, Package, BarChart2, LogOut,
  Menu, X, ChevronDown, ChevronLeft, Building2, ShoppingBag, Truck, History,
  TrendingDown, ArrowLeft, Stethoscope
} from 'lucide-react'

// Menú según rol
const MENUS = {
  superadmin: [
    { label: 'Panel General',   icon: LayoutDashboard, to: '/admin',           end: true },
    { label: 'Clínicas',        icon: Building2,       to: '/admin/clinicas' },
    { label: 'Farmacias',       icon: ShoppingBag,     to: '/admin/farmacias' },
    { label: 'Usuarios',        icon: Users,           to: '/admin/usuarios' },
    { label: 'Reportes',        icon: BarChart2,       to: '/admin/reportes' },
  ],
  admin_clinica: [
    { label: 'Dashboard',       icon: LayoutDashboard, to: '/coordinadora/dashboard', end: true },
    { label: 'Citas',           icon: Calendar,        to: '/coordinadora/citas' },
    { label: 'Pacientes',       icon: UserCheck,       to: '/coordinadora/pacientes' },
    { label: 'Doctores',        icon: Stethoscope,     to: '/coordinadora/doctores' },
    { label: 'Usuarios',        icon: Users,           to: '/coordinadora/usuarios' },
    { label: 'Servicios',       icon: ClipboardList,   to: '/coordinadora/servicios' },
    { label: 'Reportes',        icon: BarChart2,       to: '/coordinadora/reportes' },
  ],
  coordinadora: [
    { label: 'Dashboard',       icon: LayoutDashboard, to: '/coordinadora/dashboard', end: true },
    { label: 'Citas',           icon: Calendar,        to: '/coordinadora/citas' },
    { label: 'Pacientes',       icon: UserCheck,       to: '/coordinadora/pacientes' },
    { label: 'Doctores',        icon: Stethoscope,     to: '/coordinadora/doctores' },
    { label: 'Usuarios',        icon: Users,           to: '/coordinadora/usuarios' },
  ],
  doctor: [
    { label: 'Mi Agenda',       icon: LayoutDashboard, to: '/doctor/dashboard', end: true },
    { label: 'Mis Pacientes',   icon: UserCheck,       to: '/doctor/pacientes' },
  ],
  cajero: [
    { label: 'Cobrar',          icon: CreditCard,      to: '/caja/cobro', end: true },
    { label: 'Historial',       icon: ClipboardList,   to: '/caja/historial' },
  ],
  cajero_farmacia: [
    { label: 'Nueva Venta',     icon: CreditCard,      to: '/farmacia/ventas', end: true },
    { label: 'Historial Ventas',icon: History,         to: '/farmacia/historial' },
  ],
  admin_farmacia: [
    { label: 'Dashboard',       icon: LayoutDashboard, to: '/farmacia/dashboard',   end: true },
    { label: 'Nueva Venta',     icon: CreditCard,      to: '/farmacia/ventas',      end: true },
    { label: 'Historial Ventas',icon: History,         to: '/farmacia/historial' },
    { label: 'Productos',       icon: Package,         to: '/farmacia/productos' },
    { label: 'Inventario',      icon: ClipboardList,   to: '/farmacia/inventario' },
    { label: 'Proveedores',     icon: Truck,           to: '/farmacia/proveedores' },
    { label: 'Ingresos',        icon: TrendingDown,    to: '/farmacia/ingresos' },
    { label: 'Usuarios',        icon: Users,           to: '/farmacia/usuarios' },
    { label: 'Reportes',        icon: BarChart2,       to: '/farmacia/reportes' },
  ],
}

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

export default function Layout() {
  const { usuario, logout, enContexto, salirEstablecimiento } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [estabNombre, setEstabNombre] = useState(null) // nombre real del establecimiento

  // Traer el nombre real de la clínica/farmacia (no depende de re-loguearse).
  // Superadmin recibe TODAS: se elige la del contexto por id.
  useEffect(() => {
    const fid = usuario?.farmacia_id, cid = usuario?.clinica_id
    if (usuario?.farmacia_db) {
      api.get('/farmacias')
        .then(r => setEstabNombre((r.data.find(f => f.id === fid) || r.data[0])?.nombre || null))
        .catch(() => {})
    } else if (usuario?.clinica_db) {
      api.get('/clinicas')
        .then(r => setEstabNombre((r.data.find(c => c.id === cid) || r.data[0])?.nombre || null))
        .catch(() => {})
    }
  }, [usuario?.farmacia_db, usuario?.clinica_db, usuario?.farmacia_id, usuario?.clinica_id])

  // Superadmin en contexto: mostrar menú del establecimiento que está visitando
  let menuRol = usuario?.rol
  if (usuario?.rol === 'superadmin' && enContexto) {
    menuRol = usuario.clinica_db ? 'admin_clinica' : 'admin_farmacia'
  }
  // Un cajero de farmacia usa un menú distinto al cajero de clínica
  if (usuario?.rol === 'cajero' && usuario.farmacia_db) {
    menuRol = 'cajero_farmacia'
  }
  let menu = MENUS[menuRol] || []
  // Solo el Dr. Burgos (entre los doctores) tiene acceso a Reportes
  if (usuario?.rol === 'doctor' && usuario?.email?.toLowerCase().includes('burgos')) {
    menu = [...menu, { label: 'Reportes', icon: BarChart2, to: '/doctor/reportes' }]
  }

  // Logo: fundación en el panel del superadmin; clínica cuando se opera un establecimiento
  const logoSrc = (usuario?.rol === 'superadmin' && !enContexto)
    ? '/fundacion-logo.png'
    : '/clinica-logo.png'

  function handleLogout() {
    logout()
    toast.success('Sesión cerrada')
    navigate('/login')
  }

  function handleSalir() {
    salirEstablecimiento()
    toast.success('Volviste al panel de superadmin')
    navigate('/admin')
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      {/* Banner de contexto superadmin */}
      {enContexto && (
        <div className="bg-amber-400 text-amber-900 px-5 py-2 flex items-center justify-between shrink-0 z-50">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="text-lg">{usuario.contexto_tipo === 'clinica' ? '🏥' : '💊'}</span>
            <span>Estás operando en:</span>
            <span className="font-bold">{usuario.contexto_nombre}</span>
            <span className="bg-amber-300 text-amber-800 px-2 py-0.5 rounded-full text-xs ml-1 uppercase tracking-wide">
              {usuario.contexto_tipo}
            </span>
          </div>
          <button
            onClick={handleSalir}
            className="flex items-center gap-1.5 bg-amber-900/10 hover:bg-amber-900/20 text-amber-900 font-semibold text-sm px-3 py-1.5 rounded-lg transition"
          >
            <ArrowLeft size={15} />
            Volver al panel principal
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <aside className={`
        ${sidebarOpen ? 'w-64' : 'w-16'}
        bg-blue-900 text-white flex flex-col transition-all duration-300 shrink-0
      `}>
        {/* Logo + botón para contraer / expandir (arriba) */}
        <div className={`flex items-center px-3 py-4 border-b border-blue-800 ${sidebarOpen ? 'gap-3' : 'justify-center'}`}>
          {sidebarOpen ? (
            <>
              <div className="w-10 h-10 bg-white rounded-full shrink-0 overflow-hidden flex items-center justify-center">
                <img src={logoSrc} alt="Logo" className="w-full h-full object-cover" />
              </div>
              <span className="font-bold text-base leading-tight line-clamp-2">
                {estabNombre || usuario?.clinica_nombre || usuario?.farmacia_nombre || 'Óptica Clínica'}
              </span>
              <button onClick={() => setSidebarOpen(false)}
                className="ml-auto shrink-0 text-blue-300 hover:text-white transition p-1"
                title="Contraer menú">
                <ChevronLeft size={20} />
              </button>
            </>
          ) : (
            <button onClick={() => setSidebarOpen(true)}
              className="w-10 h-10 bg-white rounded-full shrink-0 overflow-hidden flex items-center justify-center ring-2 ring-transparent hover:ring-blue-400 transition"
              title="Expandir menú">
              <img src={logoSrc} alt="Expandir menú" className="w-full h-full object-cover" />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {menu.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end ?? false}
              title={!sidebarOpen ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center py-3 mx-2 rounded-xl transition text-sm font-medium
                ${sidebarOpen ? 'gap-3 px-4' : 'justify-center px-0'}
                ${isActive
                  ? 'bg-blue-700 text-white'
                  : 'text-blue-200 hover:bg-blue-800 hover:text-white'}`
              }
            >
              <item.icon size={20} className="shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            {usuario?.clinica_db && (
              <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                {usuario.clinica_nombre || estabNombre || usuario.clinica_db.replace('optica_clinica_', 'Clínica ')}
              </span>
            )}
            {usuario?.farmacia_db && (
              <span className="bg-rose-50 text-rose-700 px-3 py-1 rounded-full text-xs font-medium">
                {usuario.farmacia_nombre || estabNombre || usuario.farmacia_db.replace('optica_farmacia_', 'Farmacia ')}
              </span>
            )}
          </div>

          {/* Usuario */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(s => !s)}
              className="flex items-center gap-3 hover:bg-gray-50 px-3 py-2 rounded-xl transition"
            >
              <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center text-white text-sm font-bold">
                {usuario?.nombre?.[0]?.toUpperCase()}
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-800 leading-tight">{usuario?.nombre}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROL_COLOR[usuario?.rol]}`}>
                  {ROL_LABEL[usuario?.rol]}
                </span>
              </div>
              <ChevronDown size={16} className="text-gray-400" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-50">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-xl transition"
                >
                  <LogOut size={16} />
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
    </div>
  )
}
