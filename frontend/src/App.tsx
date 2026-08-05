import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import MainLayout from './layouts/MainLayout'
import AuthLayout from './layouts/AuthLayout'
import Login from './pages/auth/Login'
import Dashboard from './pages/dashboard/Dashboard'
import Proprietarios from './pages/proprietarios/Proprietarios'
import Projetos from './pages/projetos/Projetos'
import Quadras from './pages/quadras/Quadras'
import Lotes from './pages/lotes/Lotes'
import Clientes from './pages/clientes/Clientes'
import Vendas from './pages/vendas/Vendas'
import VendaDetalhes from './pages/vendas/VendaDetalhes'
import Financeiro from './pages/financeiro/Financeiro'
import Promissorias from './pages/promissorias/Promissorias'
import Contratos from './pages/contratos/Contratos'
import Inadimplencia from './pages/inadimplencia/Inadimplencia'
import Relatorios from './pages/relatorios/Relatorios'
import PainelProprietario from './pages/proprietario/PainelProprietario'
import Configuracoes from './pages/configuracoes/Configuracoes'
import MapaLoteamento from './pages/mapa/MapaLoteamento'
import MapaDemarcacao from './pages/mapa/MapaDemarcacao'
import LoadingSpinner from './components/common/LoadingSpinner'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  if (loading) return <LoadingSpinner />
  if (!profile) return <Navigate to="/login" replace />
  return <>{children}</>
}

function ProprietarioRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  if (loading) return <LoadingSpinner />
  if (!profile) return <Navigate to="/login" replace />
  if (profile?.role === 'proprietario') return <Navigate to="/painel-proprietario" replace />
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  if (loading) return <LoadingSpinner />
  if (!profile) return <Navigate to="/login" replace />
  if (profile.role !== 'admin') return <Navigate to="/vendas" replace />
  return <>{children}</>
}

function SemVendedorRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  if (loading) return <LoadingSpinner />
  if (!profile) return <Navigate to="/login" replace />
  if (profile.role === 'vendedor') return <Navigate to="/vendas" replace />
  return <>{children}</>
}

export default function App() {
  const { isProprietario, loading } = useAuth()
  if (loading) return <LoadingSpinner />

  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
      </Route>

      <Route element={<PrivateRoute><MainLayout /></PrivateRoute>}>
        {isProprietario ? (
          <>
            <Route path="/painel-proprietario" element={<PainelProprietario />} />
            <Route path="*" element={<Navigate to="/painel-proprietario" replace />} />
          </>
        ) : (
          <>
            <Route path="/" element={<SemVendedorRoute><Dashboard /></SemVendedorRoute>} />
            <Route path="/proprietarios" element={<ProprietarioRoute><Proprietarios /></ProprietarioRoute>} />
            <Route path="/projetos" element={<Projetos />} />
            <Route path="/quadras" element={<Quadras />} />
            <Route path="/lotes" element={<Lotes />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/vendas" element={<Vendas />} />
            <Route path="/vendas/:id" element={<VendaDetalhes />} />
            <Route path="/financeiro" element={<SemVendedorRoute><Financeiro /></SemVendedorRoute>} />
            <Route path="/promissorias" element={<Promissorias />} />
            <Route path="/contratos" element={<Contratos />} />
            <Route path="/inadimplencia" element={<SemVendedorRoute><Inadimplencia /></SemVendedorRoute>} />
            <Route path="/mapa" element={<MapaLoteamento />} />
            <Route path="/demarcacao" element={<AdminRoute><MapaDemarcacao /></AdminRoute>} />
            <Route path="/relatorios" element={<SemVendedorRoute><Relatorios /></SemVendedorRoute>} />
            <Route path="/configuracoes" element={<AdminRoute><Configuracoes /></AdminRoute>} />
            <Route path="*" element={<Navigate to="/vendas" replace />} />
          </>
        )}
      </Route>
    </Routes>
  )
}
