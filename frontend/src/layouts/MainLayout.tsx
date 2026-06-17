import { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  LayoutDashboard, FolderOpen, SquareStack, Home,
  UserCheck, ShoppingCart, DollarSign, FileText, AlertTriangle,
  BarChart3, Settings, LogOut, ChevronLeft, ChevronRight, ChevronDown,
  Receipt, Shield, Menu, X, Map, Satellite
} from 'lucide-react'
import { ROLE_LABEL } from '@/utils/format'

const loteamentoRoutes = ['/projetos', '/quadras', '/lotes']

function getInitialLevel(pathname: string): number {
  if (pathname.startsWith('/lotes')) return 3
  if (pathname.startsWith('/quadras')) return 2
  if (pathname.startsWith('/projetos')) return 1
  return 0
}

export default function MainLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, logout } = useAuth()

  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openLevel, setOpenLevel] = useState(() => getInitialLevel(location.pathname))

  const isLoteamentoActive = loteamentoRoutes.some(r => location.pathname.startsWith(r))

  useEffect(() => {
    if (!isLoteamentoActive) setOpenLevel(0)
  }, [isLoteamentoActive])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  async function handleLogout() {
    try {
      await logout()
      navigate('/login')
    } catch {
      toast.error('Erro ao fazer logout')
    }
  }

  function navCls(isActive: boolean, mini: boolean, extra?: string) {
    return cn(
      'flex items-center gap-2 py-1.5 rounded-lg text-sm transition-all duration-150',
      isActive ? 'bg-blue-600 text-white font-medium shadow-sm' : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700',
      mini ? 'px-2.5 justify-center' : 'px-2.5',
      extra
    )
  }

  function SidebarNav({ mini }: { mini: boolean }) {
    return (
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">

        <NavLink to="/" end className={({ isActive }) => navCls(isActive, mini)} title={mini ? 'Dashboard' : undefined}>
          <LayoutDashboard size={18} className="shrink-0" />
          {!mini && <span>Dashboard</span>}
        </NavLink>

        {['admin', 'gerencia'].includes(profile?.role || '') && (
          <NavLink to="/proprietarios" className={({ isActive }) => navCls(isActive, mini)} title={mini ? 'Proprietários' : undefined}>
            <Shield size={18} className="shrink-0" />
            {!mini && <span>Proprietários</span>}
          </NavLink>
        )}

        {mini ? (
          <>
            <NavLink to="/projetos" className={({ isActive }) => navCls(isActive, mini)} title="Projetos">
              <FolderOpen size={18} className="shrink-0" />
            </NavLink>
            <NavLink to="/quadras" className={({ isActive }) => navCls(isActive, mini)} title="Quadras">
              <SquareStack size={16} className="shrink-0" />
            </NavLink>
            <NavLink to="/lotes" className={({ isActive }) => navCls(isActive, mini)} title="Lotes">
              <Home size={16} className="shrink-0" />
            </NavLink>
          </>
        ) : (
          <div>
            <button
              onClick={() => setOpenLevel(v => v > 0 ? 0 : 1)}
              className={cn(
                'flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-sm transition-all duration-150',
                isLoteamentoActive ? 'text-blue-700 font-semibold' : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'
              )}
            >
              <FolderOpen size={18} className="shrink-0" />
              <span className="flex-1 text-left">Loteamento</span>
              <ChevronDown size={14} className={cn('shrink-0 transition-transform duration-200', openLevel > 0 ? 'rotate-0' : '-rotate-90')} />
            </button>

            {openLevel >= 1 && (
              <NavLink
                to="/projetos"
                onClick={() => setOpenLevel(v => Math.max(v, 2))}
                className={({ isActive }) => cn(
                  'flex items-center gap-2 py-1.5 pl-7 pr-2.5 rounded-lg text-sm transition-all duration-150',
                  isActive ? 'bg-blue-600 text-white font-medium shadow-sm' : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'
                )}
              >
                <FolderOpen size={15} className="shrink-0" />
                <span>Projetos</span>
              </NavLink>
            )}

            {openLevel >= 2 && (
              <NavLink
                to="/quadras"
                onClick={() => setOpenLevel(v => Math.max(v, 3))}
                className={({ isActive }) => cn(
                  'flex items-center gap-2 py-1.5 pl-9 pr-2.5 rounded-lg text-sm transition-all duration-150',
                  isActive ? 'bg-blue-600 text-white font-medium shadow-sm' : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'
                )}
              >
                <span className="text-gray-300 text-xs">└</span>
                <SquareStack size={14} className="shrink-0" />
                <span>Quadras</span>
              </NavLink>
            )}

            {openLevel >= 3 && (
              <NavLink
                to="/lotes"
                className={({ isActive }) => cn(
                  'flex items-center gap-2 py-1.5 pl-11 pr-2.5 rounded-lg text-sm transition-all duration-150',
                  isActive ? 'bg-blue-600 text-white font-medium shadow-sm' : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'
                )}
              >
                <span className="text-gray-300 text-xs">└</span>
                <Home size={14} className="shrink-0" />
                <span>Lotes</span>
              </NavLink>
            )}
          </div>
        )}

        <NavLink to="/clientes" className={({ isActive }) => navCls(isActive, mini)} title={mini ? 'Clientes' : undefined}>
          <UserCheck size={18} className="shrink-0" />
          {!mini && <span>Clientes</span>}
        </NavLink>

        <NavLink to="/vendas" className={({ isActive }) => navCls(isActive, mini)} title={mini ? 'Vendas' : undefined}>
          <ShoppingCart size={18} className="shrink-0" />
          {!mini && <span>Vendas</span>}
        </NavLink>

        <NavLink to="/financeiro" className={({ isActive }) => navCls(isActive, mini)} title={mini ? 'Financeiro' : undefined}>
          <DollarSign size={18} className="shrink-0" />
          {!mini && <span>Financeiro</span>}
        </NavLink>

        <NavLink to="/promissorias" className={({ isActive }) => navCls(isActive, mini)} title={mini ? 'Promissórias' : undefined}>
          <Receipt size={18} className="shrink-0" />
          {!mini && <span>Promissórias</span>}
        </NavLink>

        <NavLink to="/contratos" className={({ isActive }) => navCls(isActive, mini)} title={mini ? 'Contratos' : undefined}>
          <FileText size={18} className="shrink-0" />
          {!mini && <span>Contratos</span>}
        </NavLink>

        <NavLink to="/inadimplencia" className={({ isActive }) => navCls(isActive, mini)} title={mini ? 'Inadimplência' : undefined}>
          <AlertTriangle size={18} className="shrink-0" />
          {!mini && <span>Inadimplência</span>}
        </NavLink>

        <NavLink to="/demarcacao" className={({ isActive }) => navCls(isActive, mini)} title={mini ? 'Demarcação' : undefined}>
          <Satellite size={18} className="shrink-0" />
          {!mini && <span>Demarcação</span>}
        </NavLink>

        <NavLink to="/relatorios" className={({ isActive }) => navCls(isActive, mini)} title={mini ? 'Relatórios' : undefined}>
          <BarChart3 size={18} className="shrink-0" />
          {!mini && <span>Relatórios</span>}
        </NavLink>

        {profile?.role === 'admin' && (
          <NavLink to="/configuracoes" className={({ isActive }) => navCls(isActive, mini)} title={mini ? 'Configurações' : undefined}>
            <Settings size={18} className="shrink-0" />
            {!mini && <span>Configurações</span>}
          </NavLink>
        )}

      </nav>
    )
  }

  function SidebarFooter({ mini }: { mini: boolean }) {
    return (
      <div className="border-t border-blue-100 p-3">
        {!mini && (
          <div className="mb-2 px-2">
            <p className="text-xs font-medium text-gray-800 truncate">{profile?.nome}</p>
            <p className="text-xs text-blue-500">{ROLE_LABEL[profile?.role || '']}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all w-full',
            mini && 'justify-center'
          )}
          title={mini ? 'Sair' : undefined}
        >
          <LogOut size={16} />
          {!mini && <span>Sair</span>}
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-blue-50/30 overflow-hidden">

      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Drawer mobile */}
      <aside className={cn(
        'fixed top-0 left-0 h-full z-30 flex flex-col bg-white border-r border-blue-100 shadow-lg transition-transform duration-300 ease-in-out w-64 md:hidden',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex items-center justify-between p-4 border-b border-blue-100">
          <div className="flex items-center gap-2">
            <img src="/predo_baranda.png" alt="Pedro Baranda" className="h-10 w-auto object-contain" />
            <span className="text-sm font-semibold text-gray-700 leading-tight">Pedro Baranda</span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <SidebarNav mini={false} />
        <SidebarFooter mini={false} />
      </aside>

      {/* Sidebar desktop/tablet */}
      <aside className={cn(
        'hidden md:flex flex-col bg-white border-r border-blue-100 transition-all duration-300 ease-in-out shrink-0 shadow-sm',
        collapsed ? 'w-16' : 'w-60'
      )}>
        <div className="flex items-center justify-between p-4 border-b border-blue-100">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <img src="/predo_baranda.png" alt="Pedro Baranda" className="h-10 w-auto object-contain" />
              <span className="text-sm font-semibold text-gray-700 leading-tight">Pedro Baranda</span>
            </div>
          )}
          {collapsed && <img src="/predo_baranda.png" alt="Pedro Baranda" className="h-8 w-8 object-contain rounded" />}
          <button
            onClick={() => setCollapsed(v => !v)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors ml-auto shrink-0"
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
        <SidebarNav mini={collapsed} />
        <SidebarFooter mini={collapsed} />
      </aside>

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Header mobile */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-blue-100 shadow-sm shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Menu size={20} />
          </button>
          <img src="/predo_baranda.png" alt="Pedro Baranda" className="h-8 w-auto object-contain" />
          <span className="text-sm font-semibold text-gray-700">Pedro Baranda</span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
