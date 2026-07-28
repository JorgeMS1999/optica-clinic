import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import AdminDashboard from './pages/dashboards/AdminDashboard'
import CoordinadoraDashboard from './pages/dashboards/CoordinadoraDashboard'
import DoctorDashboard from './pages/dashboards/DoctorDashboard'
import CajaDashboard from './pages/dashboards/CajaDashboard'
import FarmaciaDashboard from './pages/dashboards/FarmaciaDashboard'
import Pacientes from './pages/coordinadora/Pacientes'
import Citas from './pages/coordinadora/Citas'
import Usuarios from './pages/coordinadora/Usuarios'
import Doctores from './pages/coordinadora/Doctores'
import MisPacientes from './pages/doctor/MisPacientes'
import Consulta from './pages/doctor/Consulta'
import Caja from './pages/caja/Caja'
import Historial from './pages/caja/Historial'
import Productos from './pages/farmacia/Productos'
import Ventas from './pages/farmacia/Ventas'
import Inventario from './pages/farmacia/Inventario'
import HistorialVentas from './pages/farmacia/HistorialVentas'
import Proveedores from './pages/farmacia/Proveedores'
import Clinicas from './pages/admin/Clinicas'
import Farmacias from './pages/admin/Farmacias'
import ReportesAdmin from './pages/admin/Reportes'
import Servicios from './pages/coordinadora/Servicios'
import ReportesClinica from './pages/coordinadora/Reportes'
import ReportesFarmacia from './pages/farmacia/Reportes'
import HistorialIngresos from './pages/farmacia/HistorialIngresos'

const ROL_HOME = {
  superadmin:    '/admin',
  admin_clinica: '/coordinadora/dashboard',
  coordinadora:  '/coordinadora/dashboard',
  doctor:        '/doctor/dashboard',
  cajero:        '/caja',
  admin_farmacia:'/farmacia/dashboard',
}

function HomeRedirect() {
  const { usuario } = useAuth()
  if (!usuario) return <Navigate to="/login" replace />
  // Un cajero puede pertenecer a una clínica o a una farmacia — el token trae cuál
  if (usuario.rol === 'cajero' && usuario.farmacia_db) return <Navigate to="/farmacia/ventas" replace />
  return <Navigate to={ROL_HOME[usuario.rol] || '/login'} replace />
}

// Solo el Dr. Burgos (entre los doctores) puede ver reportes
function SoloBurgos({ children }) {
  const { usuario } = useAuth()
  return usuario?.email?.toLowerCase().includes('burgos')
    ? children
    : <Navigate to="/doctor/dashboard" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<HomeRedirect />} />

      {/* Superadmin */}
      <Route element={
        <ProtectedRoute roles={['superadmin']}>
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="/admin"           element={<AdminDashboard />} />
        <Route path="/admin/clinicas"  element={<Clinicas />} />
        <Route path="/admin/farmacias" element={<Farmacias />} />
        <Route path="/admin/usuarios"  element={<Usuarios />} />
        <Route path="/admin/reportes"  element={<ReportesAdmin />} />
      </Route>

      {/* Coordinadora / Admin clínica */}
      <Route element={
        <ProtectedRoute roles={['coordinadora', 'admin_clinica']}>
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="/coordinadora/dashboard" element={<CoordinadoraDashboard />} />
        <Route path="/coordinadora/citas"     element={<Citas />} />
        <Route path="/coordinadora/pacientes" element={<Pacientes />} />
        <Route path="/coordinadora/usuarios"  element={<Usuarios />} />
        <Route path="/coordinadora/doctores"  element={<Doctores />} />
        <Route path="/coordinadora/servicios" element={<Servicios />} />
        <Route path="/coordinadora/reportes"  element={<ReportesClinica />} />
      </Route>

      {/* Doctor */}
      <Route element={
        <ProtectedRoute roles={['doctor']}>
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="/doctor/dashboard"          element={<DoctorDashboard />} />
        <Route path="/doctor/pacientes"          element={<MisPacientes />} />
        <Route path="/doctor/consulta/:citaId"   element={<Consulta />} />
        <Route path="/doctor/reportes"           element={<SoloBurgos><ReportesClinica /></SoloBurgos>} />
      </Route>

      {/* Cajero */}
      <Route element={
        <ProtectedRoute roles={['cajero']}>
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="/caja"           element={<CajaDashboard />} />
        <Route path="/caja/cobro"     element={<Caja />} />
        <Route path="/caja/historial" element={<Historial />} />
      </Route>

      {/* Farmacia — admin_farmacia ve todo */}
      <Route element={
        <ProtectedRoute roles={['admin_farmacia']}>
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="/farmacia/dashboard"   element={<FarmaciaDashboard />} />
        <Route path="/farmacia/productos"   element={<Productos />} />
        <Route path="/farmacia/inventario"  element={<Inventario />} />
        <Route path="/farmacia/proveedores"  element={<Proveedores />} />
        <Route path="/farmacia/ingresos"    element={<HistorialIngresos />} />
        <Route path="/farmacia/reportes"    element={<ReportesFarmacia />} />
        <Route path="/farmacia/usuarios"    element={<Usuarios />} />
      </Route>

      {/* Punto de venta de farmacia — admin_farmacia y cajero (de farmacia) */}
      <Route element={
        <ProtectedRoute roles={['admin_farmacia', 'cajero']}>
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="/farmacia/ventas"      element={<Ventas />} />
        <Route path="/farmacia/historial"   element={<HistorialVentas />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
