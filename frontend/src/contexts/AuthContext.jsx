import { createContext, useContext, useState, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    const u = localStorage.getItem('usuario')
    return u ? JSON.parse(u) : null
  })

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('token',   data.token)
    localStorage.setItem('usuario', JSON.stringify(data.usuario))
    // Limpiar contexto anterior si existía
    sessionStorage.removeItem('superadmin_token')
    sessionStorage.removeItem('superadmin_usuario')
    setUsuario(data.usuario)
    return data.usuario
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    sessionStorage.removeItem('superadmin_token')
    sessionStorage.removeItem('superadmin_usuario')
    setUsuario(null)
  }, [])

  // Superadmin entra a una clínica o farmacia
  const entrarEstablecimiento = useCallback(async (tipo, id) => {
    try {
      const body = tipo === 'clinica' ? { clinica_id: id } : { farmacia_id: id }
      const { data } = await api.post('/auth/entrar-establecimiento', body)

      // Guardar token superadmin original
      sessionStorage.setItem('superadmin_token',   localStorage.getItem('token'))
      sessionStorage.setItem('superadmin_usuario', localStorage.getItem('usuario'))

      // Activar el nuevo token de contexto
      localStorage.setItem('token',   data.token)
      localStorage.setItem('usuario', JSON.stringify(data.usuario))
      setUsuario(data.usuario)
      return data.usuario
    } catch (err) {
      throw err
    }
  }, [])

  // Superadmin vuelve al panel principal
  const salirEstablecimiento = useCallback(() => {
    const tokenOriginal   = sessionStorage.getItem('superadmin_token')
    const usuarioOriginal = sessionStorage.getItem('superadmin_usuario')
    if (!tokenOriginal) return

    localStorage.setItem('token',   tokenOriginal)
    localStorage.setItem('usuario', usuarioOriginal)
    sessionStorage.removeItem('superadmin_token')
    sessionStorage.removeItem('superadmin_usuario')
    setUsuario(JSON.parse(usuarioOriginal))
  }, [])

  const enContexto = !!(usuario?._modo_contexto)

  return (
    <AuthContext.Provider value={{ usuario, login, logout, entrarEstablecimiento, salirEstablecimiento, enContexto }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
