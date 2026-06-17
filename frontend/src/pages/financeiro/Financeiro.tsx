import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { financeiroService, proprietariosService, projetosService } from '@/services/api.service'
import PageHeader from '@/components/common/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/utils/format'
import { DollarSign, TrendingUp, TrendingDown, Plus, CheckCircle, Trash2 } from 'lucide-react'

export default function Financeiro() {
  const qc = useQueryClient()
  const [abaAtiva, setAbaAtiva] = useState<'movimentacoes' | 'repasses'>('movimentacoes')
  const [novoRepasseOpen, setNovoRepasseOpen] = useState(false)
  const [deletingMovId, setDeletingMovId] = useState<string | null>(null)
  const [deletingRepasseId, setDeletingRepasseId] = useState<string | null>(null)
  const [formRepasse, setFormRepasse] = useState({ proprietarioId: '', projetoId: '', periodo: '', totalRecebido: '', totalRepasse: '', percentualRepasse: '10' })

  const { data: resumo } = useQuery({ queryKey: ['financeiro-resumo'], queryFn: financeiroService.resumo })
  const { data: movimentacoes = [] } = useQuery({ queryKey: ['movimentacoes'], queryFn: () => financeiroService.movimentacoes() })
  const { data: repasses = [] } = useQuery({ queryKey: ['repasses'], queryFn: () => financeiroService.repasses() })
  const { data: proprietarios = [] } = useQuery({ queryKey: ['proprietarios'], queryFn: proprietariosService.listar })
  const { data: projetos = [] } = useQuery({ queryKey: ['projetos'], queryFn: () => projetosService.listar() })

  const criarRepasse = useMutation({
    mutationFn: () => financeiroService.criarRepasse({
      ...formRepasse,
      totalRecebido: parseFloat(formRepasse.totalRecebido),
      totalRepasse: parseFloat(formRepasse.totalRepasse),
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

  return (
    <div className="space-y-6">
      <PageHeader title="Financeiro" description="Movimentações e repasses de proprietários" />

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
      <div className="flex gap-2 border-b">
        {[
          { id: 'movimentacoes', label: 'Movimentações' },
          { id: 'repasses', label: 'Repasses' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setAbaAtiva(tab.id as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${abaAtiva === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {abaAtiva === 'movimentacoes' && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
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
                  <TableCell className="text-sm">{m.descricao}</TableCell>
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
            </TableBody>
          </Table>
        </div>
      )}

      {abaAtiva === 'repasses' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => setNovoRepasseOpen(true)}><Plus size={14} className="mr-1" />Novo Repasse</Button>
          </div>
          <div className="bg-white rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Período</TableHead>
                  <TableHead>Recebido</TableHead>
                  <TableHead>Repasse</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(repasses as any[]).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.periodo}</TableCell>
                    <TableCell>{formatCurrency(r.totalRecebido)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(r.totalRepasse)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.status === 'pago' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {r.status === 'pago' ? 'Pago' : 'Pendente'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {r.status === 'pendente' && (
                          <Button size="sm" variant="outline" onClick={() => pagarRepasse.mutate(r.id)}>
                            <CheckCircle size={13} className="mr-1" />Marcar Pago
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setDeletingRepasseId(r.id)}>
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

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
              <Label>Total recebido (R$)</Label>
              <Input type="number" value={formRepasse.totalRecebido} onChange={(e) => setFormRepasse({ ...formRepasse, totalRecebido: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Valor do repasse (R$)</Label>
              <Input type="number" value={formRepasse.totalRepasse} onChange={(e) => setFormRepasse({ ...formRepasse, totalRepasse: e.target.value })} />
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
