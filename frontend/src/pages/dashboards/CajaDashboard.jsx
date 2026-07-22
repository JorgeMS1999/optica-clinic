// Redirige a la página principal de caja
import { Navigate } from 'react-router-dom'
export default function CajaDashboard() {
  return <Navigate to="/caja/cobro" replace />
}
