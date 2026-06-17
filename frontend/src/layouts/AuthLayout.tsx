import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export default function AuthLayout() {
  const { user, loading, isProprietario } = useAuth()
  if (loading) return null
  if (user) return <Navigate to={isProprietario ? '/painel-proprietario' : '/'} replace />

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Outlet />
      </div>
    </div>
  )
}
