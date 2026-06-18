import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import api from '@/lib/api'
import { Usuario } from '@/types'

interface AuthContextType {
  profile: Usuario | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  isAdmin: boolean
  isFinanceiro: boolean
  isGerencia: boolean
  isProprietario: boolean
  canEdit: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }
    api.get('/auth/me')
      .then((res) => setProfile(res.data.data))
      .catch(() => {
        localStorage.removeItem('token')
        setProfile(null)
      })
      .finally(() => setLoading(false))
  }, [])

  async function login(email: string, password: string) {
    const res = await api.post('/auth/login', { email, senha: password })
    const { token, usuario } = res.data.data
    localStorage.setItem('token', token)
    setProfile(usuario)
  }

  async function logout() {
    localStorage.removeItem('token')
    setProfile(null)
    window.location.href = '/login'
  }

  const role = profile?.role
  return (
    <AuthContext.Provider value={{
      profile,
      loading,
      login,
      logout,
      isAdmin: role === 'admin',
      isFinanceiro: role === 'financeiro',
      isGerencia: role === 'gerencia',
      isProprietario: role === 'proprietario',
      canEdit: ['admin', 'gerencia', 'financeiro'].includes(role || ''),
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
