import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { relatoriosService } from '@/services/api.service'
import PageHeader from '@/components/common/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/utils/format'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { FileText, TrendingUp, Home, AlertTriangle } from 'lucide-react'

export default function Relatorios() {
  const [aba, setAba] = useState('lotes')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  const { data: lotes } = useQuery({ queryKey: ['rel-lotes'], queryFn: relatoriosService.lotes })
  const { data: inadimplencia } = useQuery({ queryKey: ['rel-inadimplencia'], queryFn: relatoriosService.inadimplencia })
  const { data: repasses } = useQuery({ queryKey: ['rel-repasses'], queryFn: relatoriosService.repasses })
  const { data: vendas, refetch: refetchVendas } = useQuery({
    queryKey: ['rel-vendas', dataInicio, dataFim],
    queryFn: () => relatoriosService.vendas({ dataInicio, dataFim }),
    enabled: false,
  })

  const l = lotes as any
  const lotesData = l ? [
    { name: 'Disponível', value: l.disponivel, fill: '#16a34a' },
    { name: 'Vendido', value: l.vendido, fill: '#1e3a6e' },
    { name: 'Reservado', value: l.reservado, fill: '#f59e0b' },
    { name: 'Bloqueado', value: l.bloqueado, fill: '#ef4444' },
  ] : []

  const abas = [
    { id: 'lotes', label: 'Lotes', icon: Home },
    { id: 'vendas', label: 'Vendas', icon: TrendingUp },
    { id: 'inadimplencia', label: 'Inadimplência', icon: AlertTriangle },
    { id: 'repasses', label: 'Repasses', icon: FileText },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Relatórios" description="Análises e exportações de dados" />

      <div className="flex gap-2 border-b">
        {abas.map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${aba === a.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <a.icon size={14} />{a.label}
          </button>
        ))}
      </div>

      {aba === 'lotes' && l && (
        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Distribuição dos Lotes</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={lotesData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                    {lotesData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Resumo</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Total de lotes', value: l.total },
                { label: 'Disponíveis', value: l.disponivel, color: 'text-green-700' },
                { label: 'Vendidos', value: l.vendido, color: 'text-blue-700' },
                { label: 'Reservados', value: l.reservado, color: 'text-yellow-700' },
                { label: 'Valor disponível', value: formatCurrency(l.valorTotalDisponivel), color: 'text-green-700' },
              ].map((item) => (
                <div key={item.label} className="flex justify-between py-2 border-b last:border-0">
                  <span className="text-gray-600">{item.label}</span>
                  <span className={`font-semibold ${item.color || ''}`}>{item.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {aba === 'vendas' && (
        <div className="space-y-4">
          <div className="flex gap-3 items-end">
            <div className="space-y-1">
              <Label>Data início</Label>
              <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Data fim</Label>
              <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </div>
            <Button onClick={() => refetchVendas()}>Filtrar</Button>
          </div>
          {vendas && (
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Total de vendas', value: (vendas as any).total },
                { label: 'Valor total', value: formatCurrency((vendas as any).valorTotal) },
                { label: 'Ativas', value: (vendas as any).porStatus?.ativa },
                { label: 'Quitadas', value: (vendas as any).porStatus?.quitada },
              ].map((item) => (
                <Card key={item.label}>
                  <CardContent className="pt-4">
                    <p className="text-xs text-gray-500">{item.label}</p>
                    <p className="text-xl font-bold mt-1">{item.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {aba === 'inadimplencia' && inadimplencia && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Parcelas vencidas', value: (inadimplencia as any).total },
            { label: 'Valor total em atraso', value: formatCurrency((inadimplencia as any).valorTotal) },
          ].map((item) => (
            <Card key={item.label}>
              <CardContent className="pt-4">
                <p className="text-xs text-gray-500">{item.label}</p>
                <p className="text-2xl font-bold mt-1 text-red-600">{item.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {aba === 'repasses' && repasses && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total repasses', value: (repasses as any).total },
            { label: 'Pendentes', value: (repasses as any).pendentes, color: 'text-yellow-700' },
            { label: 'Pagos', value: (repasses as any).pagos, color: 'text-green-700' },
            { label: 'Valor total', value: formatCurrency((repasses as any).valorTotal) },
          ].map((item) => (
            <Card key={item.label}>
              <CardContent className="pt-4">
                <p className="text-xs text-gray-500">{item.label}</p>
                <p className={`text-2xl font-bold mt-1 ${item.color || ''}`}>{item.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
