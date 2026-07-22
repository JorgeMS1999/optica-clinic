import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children, roles }) {
  const { usuario } = useAuth()
  if (!usuario) return <Navigate to="/login" replace />
  // Superadmin puede acceder a cualquier ruta (también en modo contexto)
  if (usuario.rol === 'superadmin') return children
  if (roles && !roles.includes(usuario.rol)) return <Navigate to="/login" replace />
  return children
}
