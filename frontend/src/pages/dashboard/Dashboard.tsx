import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '@/services/api.service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import PageHeader from '@/components/common/PageHeader'
import { formatCurrency } from '@/utils/format'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts'
import { Home, TrendingUp, AlertTriangle, DollarSign, ShoppingCart, CheckCircle, Clock, XCircle } from 'lucide-react'

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: dashboardService.geral })
  const { data: vendasMes } = useQuery({ queryKey: ['dashboard-vendas-mes'], queryFn: dashboardService.vendasMes })
  const { data: receitaMes } = useQuery({ queryKey: ['dashboard-receita-mes'], queryFn: dashboardService.receitaMes })
  const { data: lotesStatus } = useQuery({ queryKey: ['dashboard-lotes-status'], queryFn: dashboardService.lotesStatus })

  if (isLoading) return (
    <div className="space-y-6">
      <div className="h-8 bg-gray-200 animate-pulse rounded w-48" />
      <div className="grid grid-cols-4 gap-4">
        {Array(4).fill(0).map((_, i) => <div key={i} className="h-28 bg-gray-200 animate-pulse rounded-xl" />)}
      </div>
    </div>
  )

  const statCards = [
    { label: 'Total de Lotes', value: stats?.totalLotes || 0, sub: `${stats?.lotesDisponiveis || 0} disponíveis`, icon: Home, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Vendas Ativas', value: stats?.vendasAtivas || 0, sub: `${stats?.vendasMes || 0} este mês`, icon: ShoppingCart, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Receita do Mês', value: formatCurrency(stats?.receitaMes || 0), sub: 'pagamentos recebidos', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Inadimplentes', value: stats?.inadimplentes || 0, sub: 'parcelas vencidas', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Visão geral da operação" />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
                </div>
                <div className={`p-2.5 rounded-lg ${card.bg}`}>
                  <card.icon className={`${card.color} w-5 h-5`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status dos Lotes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Disponíveis', value: stats?.lotesDisponiveis, color: 'bg-green-500' },
          { label: 'Vendidos', value: stats?.lotesVendidos, color: 'bg-blue-600' },
          { label: 'Reservados', value: stats?.lotesReservados, color: 'bg-yellow-500' },
          { label: 'Bloqueados', value: stats?.lotesBloqueados, color: 'bg-red-500' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-3 bg-white rounded-lg p-4 border">
            <div className={`w-3 h-3 rounded-full ${item.color}`} />
            <div>
              <p className="text-xs text-gray-500">{item.label}</p>
              <p className="text-lg font-bold">{item.value || 0}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico Receita */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Receita Mensal</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={receitaMes || []}>
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="receita" fill="#1e3a6e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico Lotes */}
        <Card>
          <CardHeader><CardTitle className="text-base">Status dos Lotes</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={lotesStatus || []} dataKey="total" nameKey="status" cx="50%" cy="50%" outerRadius={75} label={({ status, total }) => `${total}`}>
                  {(lotesStatus || []).map((entry: any, index: number) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico Vendas */}
      <Card>
        <CardHeader><CardTitle className="text-base">Vendas por Mês (últimos 6 meses)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={vendasMes || []}>
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="total" stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }} name="Vendas" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
