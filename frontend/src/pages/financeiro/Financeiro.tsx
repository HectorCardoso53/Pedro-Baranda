import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { financeiroService, proprietariosService, projetosService } from '@/services/api.service'
import PageHeader from '@/components/common/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { formatCurrency, formatDate, formatCPF, parseCurrencyValue } from '@/utils/format'
import { CurrencyInput } from '@/components/ui/currency-input'
import { DollarSign, TrendingUp, TrendingDown, Plus, CheckCircle, Trash2, Users, AlertTriangle, ChevronRight, Search } from 'lucide-react'

export default function Financeiro() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [abaAtiva, setAbaAtiva] = useState<'movimentacoes' | 'repasses' | 'clientes'>('movimentacoes')
  const [novoRepasseOpen, setNovoRepasseOpen] = useState(false)
  const [deletingMovId, setDeletingMovId] = useState<string | null>(null)
  const [deletingRepasseId, setDeletingRepasseId] = useState<string | null>(null)
  const [buscaCliente, setBuscaCliente] = useState('')
  const [filtroInadimplente, setFiltroInadimplente] = useState<'todos' | 'inadimplente' | 'emDia'>('todos')
  const [formRepasse, setFormRepasse] = useState({ proprietarioId: '', projetoId: '', periodo: '', totalRecebido: '', totalRepasse: '', percentualRepasse: '10' })

  const { data: resumo } = useQuery({ queryKey: ['financeiro-resumo'], queryFn: financeiroService.resumo })
  const { data: movimentacoes = [] } = useQuery({ queryKey: ['movimentacoes'], queryFn: () => financeiroService.movimentacoes() })
  const { data: repasses = [] } = useQuery({ queryKey: ['repasses'], queryFn: () => financeiroService.repasses() })
  const { data: clientesFinanceiro = [], isLoading: loadingClientes } = useQuery({
    queryKey: ['financeiro-por-cliente'],
    queryFn: financeiroService.porCliente,
    enabled: abaAtiva === 'clientes',
  })
  const { data: proprietarios = [] } = useQuery({ queryKey: ['proprietarios'], queryFn: proprietariosService.listar })
  const { data: projetos = [] } = useQuery({ queryKey: ['projetos'], queryFn: () => projetosService.listar() })

  const criarRepasse = useMutation({
    mutationFn: () => financeiroService.criarRepasse({
      ...formRepasse,
      totalRecebido: parseCurrencyValue(formRepasse.totalRecebido),
      totalRepasse: parseCurrencyValue(formRepasse.totalRepasse),
      percentualRepasse: parseFloat(formRepasse.percentualRepasse),
    }),
    onSuccess: () => {
      toast.success('Repasse criado!')
      qc.invalidateQueries({ queryKey: ['repasses'] })
      setNovoRepasseOpen(false)
    },
    onError: (err) => toast.error(err.message),
  })

  const deletarMovimentacao = useMutation({
    mutationFn: (id: string) => financeiroService.deletarMovimentacao(id),
    onSuccess: () => {
      toast.success('Movimentação excluída!')
      qc.invalidateQueries({ queryKey: ['movimentacoes'] })
      qc.invalidateQueries({ queryKey: ['financeiro-resumo'] })
      setDeletingMovId(null)
    },
    onError: (err) => { toast.error(err.message); setDeletingMovId(null) },
  })

  const deletarRepasse = useMutation({
    mutationFn: (id: string) => financeiroService.deletarRepasse(id),
    onSuccess: () => {
      toast.success('Repasse excluído!')
      qc.invalidateQueries({ queryKey: ['repasses'] })
      setDeletingRepasseId(null)
    },
    onError: (err) => { toast.error(err.message); setDeletingRepasseId(null) },
  })

  const pagarRepasse = useMutation({
    mutationFn: (id: string) => financeiroService.pagarRepasse(id, { dataPagamento: new Date().toISOString().split('T')[0] }),
    onSuccess: () => {
      toast.success('Repasse marcado como pago!')
      qc.invalidateQueries({ queryKey: ['repasses'] })
    },
    onError: (err) => toast.error(err.message),
  })

  const r = resumo as any

  const clientesFiltrados = (clientesFinanceiro as any[]).filter((c) => {
    const matchBusca = !buscaCliente || c.nome.toLowerCase().includes(buscaCliente.toLowerCase()) || (c.cpfCnpj || '').includes(buscaCliente)
    const matchFiltro =
      filtroInadimplente === 'todos' ||
      (filtroInadimplente === 'inadimplente' && c.inadimplente) ||
      (filtroInadimplente === 'emDia' && !c.inadimplente)
    return matchBusca && matchFiltro
  })

  const totalInadimplentes = (clientesFinanceiro as any[]).filter((c) => c.inadimplente).length
  const totalEmDia = (clientesFinanceiro as any[]).length - totalInadimplentes
  const totalVencidoGeral = (clientesFinanceiro as any[]).reduce((a, c) => a + c.totalVencido, 0)

  return (
    <div className="space-y-6">
      <PageHeader title="Financeiro" description="Movimentações, repasses e situação por cliente" />

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 flex gap-3 items-center">
            <div className="p-2 bg-green-50 rounded-lg"><TrendingUp className="text-green-600 w-5 h-5" /></div>
            <div>
              <p className="text-xs text-gray-500">Total entradas</p>
              <p className="text-xl font-bold text-green-700">{formatCurrency(r?.entradas || 0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex gap-3 items-center">
            <div className="p-2 bg-red-50 rounded-lg"><TrendingDown className="text-red-600 w-5 h-5" /></div>
            <div>
              <p className="text-xs text-gray-500">Total repasses</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(r?.repasses || 0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex gap-3 items-center">
            <div className="p-2 bg-blue-50 rounded-lg"><DollarSign className="text-blue-600 w-5 h-5" /></div>
            <div>
              <p className="text-xs text-gray-500">Saldo</p>
              <p className="text-xl font-bold text-blue-700">{formatCurrency(r?.saldo || 0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-200">
        {[
          { id: 'movimentacoes', label: 'Movimentações' },
          { id: 'repasses', label: 'Repasses' },
          { id: 'clientes', label: 'Por Cliente' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setAbaAtiva(tab.id as any)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-all ${
              abaAtiva === tab.id
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── MOVIMENTAÇÕES ── */}
      {abaAtiva === 'movimentacoes' && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(movimentacoes as any[]).slice(0, 50).map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{formatDate(m.data)}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m.tipo === 'entrada' ? 'bg-green-100 text-green-800' : m.tipo === 'saida' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                      {m.tipo}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm font-medium">{m.venda?.cliente?.nome || '-'}</TableCell>
                  <TableCell className="text-sm text-gray-500">{m.descricao}</TableCell>
                  <TableCell className={`text-right font-medium ${m.tipo === 'entrada' ? 'text-green-700' : 'text-red-600'}`}>
                    {m.tipo === 'entrada' ? '+' : '-'}{formatCurrency(m.valor)}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setDeletingMovId(m.id)}>
                      <Trash2 size={13} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(movimentacoes as any[]).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-400 py-10">Nenhuma movimentação registrada</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── REPASSES ── */}
      {abaAtiva === 'repasses' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => setNovoRepasseOpen(true)}><Plus size={14} className="mr-1" />Novo Repasse</Button>
          </div>
          <div className="bg-white rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Proprietário</TableHead>
                  <TableHead>Projeto</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Recebido</TableHead>
                  <TableHead>Repasse</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(repasses as any[]).map((rp) => (
                  <TableRow key={rp.id}>
                    <TableCell className="font-medium">{rp.proprietario?.nome || '-'}</TableCell>
                    <TableCell className="text-sm text-gray-500">{rp.projeto?.nome || '-'}</TableCell>
                    <TableCell>{rp.periodo}</TableCell>
                    <TableCell>{formatCurrency(rp.totalRecebido)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(rp.totalRepasse)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${rp.status === 'pago' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {rp.status === 'pago' ? 'Pago' : 'Pendente'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {rp.status === 'pendente' && (
                          <Button size="sm" variant="outline" onClick={() => pagarRepasse.mutate(rp.id)}>
                            <CheckCircle size={13} className="mr-1" />Marcar Pago
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setDeletingRepasseId(rp.id)}>
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(repasses as any[]).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-400 py-10">Nenhum repasse registrado</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ── POR CLIENTE ── */}
      {abaAtiva === 'clientes' && (
        <div className="space-y-4">
          {/* mini KPIs */}
          {!loadingClientes && (clientesFinanceiro as any[]).length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              <Card className="border-l-4 border-blue-500">
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Total de clientes</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">{(clientesFinanceiro as any[]).length}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-red-500">
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Inadimplentes</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">{totalInadimplentes}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Valor vencido: {formatCurrency(totalVencidoGeral)}</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-green-500">
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Em dia</p>
                  <p className="text-2xl font-bold text-green-700 mt-1">{totalEmDia}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filtros */}
          <div className="flex gap-3 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Buscar cliente ou CPF..."
                value={buscaCliente}
                onChange={(e) => setBuscaCliente(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-1">
              {(['todos', 'inadimplente', 'emDia'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFiltroInadimplente(f)}
                  className={`px-3 py-1.5 text-xs rounded-full font-medium transition-all ${
                    filtroInadimplente === f
                      ? f === 'inadimplente' ? 'bg-red-100 text-red-700' : f === 'emDia' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {f === 'todos' ? 'Todos' : f === 'inadimplente' ? 'Inadimplentes' : 'Em dia'}
                </button>
              ))}
            </div>
          </div>

          {/* Lista */}
          {loadingClientes ? (
            <div className="text-center text-gray-400 py-16">Carregando dados dos clientes...</div>
          ) : clientesFiltrados.length === 0 ? (
            <div className="text-center text-gray-400 py-16">
              <Users size={40} className="mx-auto mb-3 opacity-30" />
              <p>Nenhum cliente encontrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {clientesFiltrados.map((c: any) => (
                <Card
                  key={c.id}
                  className={`border transition-shadow hover:shadow-md ${c.inadimplente ? 'border-l-4 border-l-red-400' : 'border-l-4 border-l-green-400'}`}
                >
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      {/* Info principal */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-800">{c.nome}</span>
                          {c.cpfCnpj && <span className="text-xs text-gray-400">{formatCPF(c.cpfCnpj)}</span>}
                          {c.inadimplente ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              <AlertTriangle size={10} /> Inadimplente
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              <CheckCircle size={10} /> Em dia
                            </span>
                          )}
                        </div>
                        {/* Vendas como chips clicáveis */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {c.vendas.map((v: any) => (
                            <button
                              key={v.id}
                              onClick={() => navigate(`/vendas/${v.id}`)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                            >
                              Lote {v.lote} — {v.projeto}
                              <ChevronRight size={10} />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Valores */}
                      <div className="grid grid-cols-4 gap-6 text-right shrink-0">
                        <div>
                          <p className="text-xs text-gray-400 whitespace-nowrap">Valor total</p>
                          <p className="text-sm font-semibold text-gray-700">{formatCurrency(c.valorTotalVendas)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Pago</p>
                          <p className="text-sm font-semibold text-green-700">{formatCurrency(c.totalPago)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 whitespace-nowrap">Em aberto</p>
                          <p className="text-sm font-semibold text-blue-700">{formatCurrency(c.totalEmAberto)}</p>
                          <p className="text-xs text-gray-400">{c.parcelasPendentes} parcela{c.parcelasPendentes !== 1 ? 's' : ''}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Vencido</p>
                          <p className={`text-sm font-semibold ${c.totalVencido > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                            {c.totalVencido > 0 ? formatCurrency(c.totalVencido) : '—'}
                          </p>
                          {c.parcelasVencidas > 0 && (
                            <p className="text-xs text-red-400">{c.parcelasVencidas} vencida{c.parcelasVencidas !== 1 ? 's' : ''}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dialogs */}
      <Dialog open={!!deletingMovId} onOpenChange={(v) => !v && setDeletingMovId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Excluir movimentação?</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">Esta ação não pode ser desfeita.</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeletingMovId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deletarMovimentacao.mutate(deletingMovId!)} disabled={deletarMovimentacao.isPending}>
              {deletarMovimentacao.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingRepasseId} onOpenChange={(v) => !v && setDeletingRepasseId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Excluir repasse?</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">Esta ação não pode ser desfeita.</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeletingRepasseId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deletarRepasse.mutate(deletingRepasseId!)} disabled={deletarRepasse.isPending}>
              {deletarRepasse.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={novoRepasseOpen} onOpenChange={setNovoRepasseOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Repasse</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Proprietário</Label>
              <Select onValueChange={(v) => setFormRepasse({ ...formRepasse, proprietarioId: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {proprietarios.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Projeto</Label>
              <Select onValueChange={(v) => setFormRepasse({ ...formRepasse, projetoId: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {projetos.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Período (YYYY-MM)</Label>
              <Input placeholder="2024-01" value={formRepasse.periodo} onChange={(e) => setFormRepasse({ ...formRepasse, periodo: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>% Repasse</Label>
              <Input type="number" value={formRepasse.percentualRepasse} onChange={(e) => setFormRepasse({ ...formRepasse, percentualRepasse: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Total recebido</Label>
              <CurrencyInput value={formRepasse.totalRecebido} onChange={(v) => setFormRepasse({ ...formRepasse, totalRecebido: v })} placeholder="0,00" />
            </div>
            <div className="space-y-1">
              <Label>Valor do repasse</Label>
              <CurrencyInput value={formRepasse.totalRepasse} onChange={(v) => setFormRepasse({ ...formRepasse, totalRepasse: v })} placeholder="0,00" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setNovoRepasseOpen(false)}>Cancelar</Button>
            <Button onClick={() => criarRepasse.mutate()} disabled={criarRepasse.isPending}>
              {criarRepasse.isPending ? 'Criando...' : 'Criar Repasse'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
