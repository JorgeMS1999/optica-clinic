import { createContext, useContext, useState, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

// Respaldo de la sesión del superadmin cuando entra a un establecimiento.
// Se guarda en localStorage (no sessionStorage) para que sobreviva al cierre/reapertura
// del navegador y a pestañas nuevas — así "Volver al panel" nunca queda trabado.
const BK_TOKEN = 'superadmin_bk_token'
const BK_USER  = 'superadmin_bk_usuario'

function limpiarRespaldo() {
  localStorage.removeItem(BK_TOKEN)
  localStorage.removeItem(BK_USER)
  // limpiar también las claves viejas de sessionStorage por compatibilidad
  sessionStorage.removeItem('superadmin_token')
  sessionStorage.removeItem('superadmin_usuario')
}

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    const u = localStorage.getItem('usuario')
    return u ? JSON.parse(u) : null
  })

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('token',   data.token)
    localStorage.setItem('usuario', JSON.stringify(data.usuario))
    limpiarRespaldo()
    setUsuario(data.usuario)
    return data.usuario
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    limpiarRespaldo()
    setUsuario(null)
  }, [])

  // Superadmin entra a una clínica o farmacia
  const entrarEstablecimiento = useCallback(async (tipo, id) => {
    const body = tipo === 'clinica' ? { clinica_id: id } : { farmacia_id: id }
    const { data } = await api.post('/auth/entrar-establecimiento', body)

    // Guardar el respaldo del superadmin SOLO si todavía no hay uno
    // (evita pisar la sesión real si ya estábamos en un contexto)
    if (!localStorage.getItem(BK_TOKEN)) {
      localStorage.setItem(BK_TOKEN, localStorage.getItem('token'))
      localStorage.setItem(BK_USER,  localStorage.getItem('usuario'))
    }

    // Activar el token de contexto
    localStorage.setItem('token',   data.token)
    localStorage.setItem('usuario', JSON.stringify(data.usuario))
    setUsuario(data.usuario)
    return data.usuario
  }, [])

  // Superadmin vuelve al panel principal
  const salirEstablecimiento = useCallback(() => {
    const tokenOriginal   = localStorage.getItem(BK_TOKEN)
    const usuarioOriginal = localStorage.getItem(BK_USER)
    limpiarRespaldo()

    if (tokenOriginal && usuarioOriginal) {
      localStorage.setItem('token',   tokenOriginal)
      localStorage.setItem('usuario', usuarioOriginal)
      setUsuario(JSON.parse(usuarioOriginal))
    } else {
      // Sin respaldo: cerrar sesión para no quedar trabado en el contexto
      localStorage.removeItem('token')
      localStorage.removeItem('usuario')
      setUsuario(null)
    }
  }, [])

  const enContexto = !!(usuario?._modo_contexto)

  return (
    <AuthContext.Provider value={{ usuario, login, logout, entrarEstablecimiento, salirEstablecimiento, enContexto }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
