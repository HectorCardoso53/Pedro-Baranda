import { useQuery } from '@tanstack/react-query'
import { painelProprietarioService } from '@/services/api.service'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/utils/format'
import { Home, DollarSign, AlertTriangle, TrendingUp, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

const LOTE_STATUS: Record<string, string> = {
  disponivel: 'Disponível', reservado: 'Reservado', vendido: 'Vendido', bloqueado: 'Bloqueado'
}
const LOTE_STATUS_COLOR: Record<string, string> = {
  disponivel: 'bg-green-100 text-green-800', reservado: 'bg-yellow-100 text-yellow-800',
  vendido: 'bg-blue-100 text-blue-800', bloqueado: 'bg-red-100 text-red-800',
}

export default function PainelProprietario() {
  const { profile, logout } = useAuth()
  const navigate = useNavigate()

  const { data: resumo } = useQuery({ queryKey: ['prop-resumo'], queryFn: painelProprietarioService.resumo })
  const { data: lotes = [] } = useQuery({ queryKey: ['prop-lotes'], queryFn: painelProprietarioService.lotes })
  const { data: repasses = [] } = useQuery({ queryKey: ['prop-repasses'], queryFn: painelProprietarioService.repasses })

  const r = resumo as any

  async function handleLogout() {
    await logout()
    navigate('/login')
    toast.info('Sessão encerrada')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#1a2b4a] text-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">PEDRO BARANDA</h1>
          <p className="text-blue-200 text-sm">Painel do Proprietário — {profile?.nome}</p>
        </div>
        <Button variant="ghost" className="text-white hover:bg-white/10" onClick={handleLogout}>
          <LogOut size={16} className="mr-2" />Sair
        </Button>
      </div>

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Visão Geral</h2>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total de Lotes', value: r?.totalLotes || 0, sub: `${r?.lotesDisponiveis || 0} disponíveis`, icon: Home, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Valor Recebido', value: formatCurrency(r?.valorRecebido || 0), sub: 'total de pagamentos', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Total Repasses', value: formatCurrency(r?.valorRepasses || 0), sub: `${r?.repassesPendentes || 0} pendentes`, icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Inadimplentes', value: r?.inadimplentes || 0, sub: 'parcelas vencidas', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
          ].map((card) => (
            <Card key={card.label} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{card.label}</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">{card.value}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
                  </div>
                  <div className={`p-2.5 rounded-lg ${card.bg}`}>
                    <card.icon className={`${card.color} w-5 h-5`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Lotes */}
        <Card>
          <CardHeader><CardTitle className="text-base">Meus Lotes</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Lote Nº</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Valor Base</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(lotes as any[]).map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">Lote {l.numero}</TableCell>
                    <TableCell>{l.area} m²</TableCell>
                    <TableCell>{formatCurrency(l.valorBase)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${LOTE_STATUS_COLOR[l.status] || 'bg-gray-100 text-gray-600'}`}>
                        {LOTE_STATUS[l.status] || l.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Repasses */}
        <Card>
          <CardHeader><CardTitle className="text-base">Repasses Recebidos</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Período</TableHead>
                  <TableHead>Total Recebido</TableHead>
                  <TableHead>Valor Repasse</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data Pagto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(repasses as any[]).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.periodo}</TableCell>
                    <TableCell>{formatCurrency(r.totalRecebido)}</TableCell>
                    <TableCell className="font-medium text-green-700">{formatCurrency(r.totalRepasse)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.status === 'pago' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {r.status === 'pago' ? 'Pago' : 'Pendente'}
                      </span>
                    </TableCell>
                    <TableCell>{r.pagamento ? formatDate(r.pagamento) : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Aviso de privacidade */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
          <strong>Nota:</strong> Este painel exibe informações agregadas do seu patrimônio. Dados de compradores, contratos individuais e parcelas não são exibidos neste painel por política de privacidade.
        </div>
      </div>
    </div>
  )
}
