import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { relatoriosService } from '@/services/api.service'
import PageHeader from '@/components/common/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/utils/format'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid,
} from 'recharts'
import { Home, TrendingUp, AlertTriangle, FileText, DollarSign, CheckCircle, Clock, XCircle } from 'lucide-react'

function KpiCard({ label, value, icon: Icon, color, sub }: { label: string; value: string | number; icon: any; color: string; sub?: string }) {
  return (
    <Card className={`border-l-4 ${color}`}>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold mt-1 text-gray-800">{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
          </div>
          <div className={`p-2 rounded-lg bg-opacity-10 ${color.replace('border-', 'bg-').replace('-600', '-100').replace('-500', '-100')}`}>
            <Icon size={20} className={color.replace('border-l-4 border-', 'text-')} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
    </div>
  )
}

const CUSTOM_TOOLTIP = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border rounded-lg shadow-lg p-3 text-sm">
      {label && <p className="font-semibold text-gray-700 mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.fill || p.color }}>
          {p.name}: <strong>{typeof p.value === 'number' && p.value > 100 ? formatCurrency(p.value) : p.value}</strong>
        </p>
      ))}
    </div>
  )
}

export default function Relatorios() {
  const [aba, setAba] = useState('lotes')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  const { data: lotes } = useQuery({ queryKey: ['rel-lotes'], queryFn: relatoriosService.lotes })
  const { data: inadimplencia } = useQuery({ queryKey: ['rel-inadimplencia'], queryFn: relatoriosService.inadimplencia })
  const { data: repasses } = useQuery({ queryKey: ['rel-repasses'], queryFn: relatoriosService.repasses })
  const { data: vendas, refetch: refetchVendas, isFetched: vendasFetched } = useQuery({
    queryKey: ['rel-vendas', dataInicio, dataFim],
    queryFn: () => relatoriosService.vendas({ dataInicio, dataFim }),
    enabled: false,
  })

  const l = lotes as any
  const v = vendas as any
  const ina = inadimplencia as any
  const rep = repasses as any

  const lotesStatusData = l ? [
    { name: 'Disponível', value: l.disponivel ?? 0, fill: '#16a34a' },
    { name: 'Vendido',    value: l.vendido    ?? 0, fill: '#1d4ed8' },
    { name: 'Reservado',  value: l.reservado  ?? 0, fill: '#d97706' },
    { name: 'Bloqueado',  value: l.bloqueado  ?? 0, fill: '#dc2626' },
  ].filter(d => d.value > 0) : []

  const vendasStatusData = v ? [
    { name: 'Ativas',     value: v.porStatus?.ativa      ?? 0, fill: '#1d4ed8' },
    { name: 'Quitadas',   value: v.porStatus?.quitada    ?? 0, fill: '#16a34a' },
    { name: 'Distratadas',value: v.porStatus?.distratada ?? 0, fill: '#f59e0b' },
    { name: 'Canceladas', value: v.porStatus?.cancelada  ?? 0, fill: '#dc2626' },
  ].filter(d => d.value > 0) : []

  const abas = [
    { id: 'lotes',         label: 'Lotes',         icon: Home },
    { id: 'vendas',        label: 'Vendas',         icon: TrendingUp },
    { id: 'inadimplencia', label: 'Inadimplência',  icon: AlertTriangle },
    { id: 'repasses',      label: 'Repasses',       icon: FileText },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Relatórios" description="Análises e indicadores do loteamento" />

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-200">
        {abas.map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${
              aba === a.id
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <a.icon size={15} />{a.label}
          </button>
        ))}
      </div>

      {/* ───── LOTES ───── */}
      {aba === 'lotes' && l && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-4 gap-4">
            <KpiCard label="Total de Lotes"  value={l.total ?? 0}      icon={Home}         color="border-l-4 border-gray-400"  />
            <KpiCard label="Disponíveis"      value={l.disponivel ?? 0} icon={CheckCircle}  color="border-l-4 border-green-600" sub="Para venda" />
            <KpiCard label="Vendidos"         value={l.vendido ?? 0}    icon={DollarSign}   color="border-l-4 border-blue-600"  sub="Comercializados" />
            <KpiCard label="Reservados"       value={l.reservado ?? 0}  icon={Clock}        color="border-l-4 border-yellow-500" />
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Gráfico de barras — mais legível que pizza com valores desiguais */}
            <Card>
              <CardHeader><CardTitle className="text-base">Lotes por Status</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={[
                      { name: 'Disponível', value: l.disponivel ?? 0, fill: '#16a34a' },
                      { name: 'Vendido',    value: l.vendido    ?? 0, fill: '#1d4ed8' },
                      { name: 'Reservado',  value: l.reservado  ?? 0, fill: '#d97706' },
                      { name: 'Bloqueado',  value: l.bloqueado  ?? 0, fill: '#dc2626' },
                    ]}
                    barSize={52}
                    margin={{ top: 16, right: 8, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: '#f9fafb' }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const d = payload[0]
                        const total = l.total ?? 1
                        const pct = total > 0 ? ((d.value as number) / total * 100).toFixed(1) : '0'
                        return (
                          <div className="bg-white border rounded-lg shadow-lg p-3 text-sm">
                            <p className="font-semibold text-gray-700 mb-1">{d.payload.name}</p>
                            <p style={{ color: d.payload.fill }}><strong>{d.value} lotes</strong> ({pct}%)</p>
                          </div>
                        )
                      }}
                    />
                    <Bar dataKey="value" name="Lotes" radius={[6, 6, 0, 0]}>
                      {[
                        { fill: '#16a34a' },
                        { fill: '#1d4ed8' },
                        { fill: '#d97706' },
                        { fill: '#dc2626' },
                      ].map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Resumo com barras de progresso */}
            <Card>
              <CardHeader><CardTitle className="text-base">Detalhamento</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                {[
                  { label: 'Disponíveis',  value: l.disponivel ?? 0, color: 'bg-green-500',  textColor: 'text-green-700' },
                  { label: 'Vendidos',      value: l.vendido    ?? 0, color: 'bg-blue-600',   textColor: 'text-blue-700'  },
                  { label: 'Reservados',    value: l.reservado  ?? 0, color: 'bg-yellow-500', textColor: 'text-yellow-700'},
                  { label: 'Bloqueados',    value: l.bloqueado  ?? 0, color: 'bg-red-500',    textColor: 'text-red-700'   },
                ].map(item => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{item.label}</span>
                      <span className={`font-bold ${item.textColor}`}>{item.value} lotes</span>
                    </div>
                    <ProgressBar value={item.value} max={l.total ?? 1} color={item.color} />
                  </div>
                ))}
                <div className="mt-4 pt-4 border-t space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Valor portfólio disponível</span>
                    <span className="font-bold text-green-700">{formatCurrency(l.valorTotalDisponivel ?? 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Valor total vendido</span>
                    <span className="font-bold text-blue-700">{formatCurrency(l.valorTotalVendido ?? 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ───── VENDAS ───── */}
      {aba === 'vendas' && (
        <div className="space-y-6">
          <div className="flex gap-3 items-end bg-gray-50 p-4 rounded-lg">
            <div className="space-y-1">
              <Label className="text-xs">Data início</Label>
              <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data fim</Label>
              <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="w-40" />
            </div>
            <Button onClick={() => refetchVendas()}>Filtrar</Button>
            {!vendasFetched && (
              <p className="text-sm text-gray-400 ml-2">Clique em Filtrar para carregar os dados</p>
            )}
          </div>

          {v && (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <KpiCard label="Total de Vendas"  value={v.total ?? 0}                        icon={TrendingUp}  color="border-l-4 border-blue-600" />
                <KpiCard label="Valor Total"       value={formatCurrency(v.valorTotal ?? 0)}   icon={DollarSign}  color="border-l-4 border-green-600" />
                <KpiCard label="Ativas"            value={v.porStatus?.ativa ?? 0}             icon={CheckCircle} color="border-l-4 border-blue-500"  />
                <KpiCard label="Quitadas"          value={v.porStatus?.quitada ?? 0}           icon={CheckCircle} color="border-l-4 border-green-500" />
              </div>

              {vendasStatusData.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Vendas por Status</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={vendasStatusData} barSize={48}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} allowDecimals={false} />
                        <Tooltip content={<CUSTOM_TOOLTIP />} />
                        <Bar dataKey="value" name="Vendas" radius={[4, 4, 0, 0]}>
                          {vendasStatusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* ───── INADIMPLÊNCIA ───── */}
      {aba === 'inadimplencia' && (
        <div className="space-y-6">
          {ina ? (
            <>
              <div className="grid grid-cols-3 gap-4">
                <KpiCard label="Parcelas Vencidas"   value={ina.total ?? 0}                          icon={AlertTriangle} color="border-l-4 border-red-600"    />
                <KpiCard label="Valor em Atraso"     value={formatCurrency(ina.valorTotal ?? 0)}     icon={DollarSign}    color="border-l-4 border-red-500"    sub="Total a receber" />
                <KpiCard label="Clientes Inadimpl."  value={ina.clientesAfetados ?? '—'}             icon={XCircle}       color="border-l-4 border-orange-500" />
              </div>
              {(ina.total ?? 0) === 0 && (
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="pt-6 text-center">
                    <CheckCircle size={40} className="text-green-500 mx-auto mb-2" />
                    <p className="text-green-700 font-semibold">Sem inadimplência!</p>
                    <p className="text-sm text-green-600">Todas as parcelas estão em dia.</p>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <div className="text-center text-gray-400 py-12">Carregando dados...</div>
          )}
        </div>
      )}

      {/* ───── REPASSES ───── */}
      {aba === 'repasses' && (
        <div className="space-y-6">
          {rep ? (
            <>
              <div className="grid grid-cols-4 gap-4">
                <KpiCard label="Total Repasses"   value={rep.total ?? 0}                        icon={FileText}    color="border-l-4 border-gray-500"    />
                <KpiCard label="Pendentes"        value={rep.pendentes ?? 0}                    icon={Clock}       color="border-l-4 border-yellow-500"  sub="Aguardando pagamento" />
                <KpiCard label="Pagos"            value={rep.pagos ?? 0}                        icon={CheckCircle} color="border-l-4 border-green-600"   />
                <KpiCard label="Valor Total"      value={formatCurrency(rep.valorTotal ?? 0)}   icon={DollarSign}  color="border-l-4 border-blue-600"    />
              </div>

              {(rep.total ?? 0) > 0 ? (
                <Card>
                  <CardHeader><CardTitle className="text-base">Status dos Repasses</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={[
                        { name: 'Pendentes', value: rep.pendentes ?? 0, fill: '#f59e0b' },
                        { name: 'Pagos',     value: rep.pagos     ?? 0, fill: '#16a34a' },
                      ]} barSize={60}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip content={<CUSTOM_TOOLTIP />} />
                        <Bar dataKey="value" name="Repasses" radius={[4, 4, 0, 0]}>
                          <Cell fill="#f59e0b" />
                          <Cell fill="#16a34a" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-gray-200 bg-gray-50">
                  <CardContent className="pt-6 text-center">
                    <FileText size={40} className="text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 font-semibold">Nenhum repasse registrado</p>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <div className="text-center text-gray-400 py-12">Carregando dados...</div>
          )}
        </div>
      )}
    </div>
  )
}
