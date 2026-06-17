import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import api from '@/lib/api'
import { Usuario } from '@/types'

interface AuthContextType {
  user: User | null
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
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        try {
          const res = await api.get('/auth/me')
          setProfile(res.data.data)
        } catch {
          setProfile(null)
        }
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  async function login(email: string, password: string) {
    const cred = await signInWithEmailAndPassword(auth, email, password)
    const token = await cred.user.getIdToken()
    const res = await api.post('/auth/login', { idToken: token })
    setProfile(res.data.data)
  }

  async function logout() {
    await signOut(auth)
    setProfile(null)
  }

  const role = profile?.role
  return (
    <AuthContext.Provider value={{
      user,
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
