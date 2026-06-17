import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { lotesService, projetosService, quadrasService, proprietariosService, vendasService, clientesService } from '@/services/api.service'
import PageHeader from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import StatusBadge from '@/components/common/StatusBadge'
import { toast } from 'sonner'
import { Plus, ChevronRight, UserCheck, Trash2 } from 'lucide-react'
import { formatCurrency, formatArea } from '@/utils/format'
import type { ColumnDef } from '@tanstack/react-table'
import type { Lote } from '@/types'

export default function Lotes() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const quadraIdFiltro = searchParams.get('quadraId') || ''
  const projetoIdFiltro = searchParams.get('projetoId') || ''

  const [open, setOpen] = useState(false)
  const [filtroStatus, setFiltroStatus] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data: lotes = [], isLoading } = useQuery({
    queryKey: ['lotes', filtroStatus, quadraIdFiltro, projetoIdFiltro],
    queryFn: () => lotesService.listar({
      ...(filtroStatus && { status: filtroStatus }),
      ...(quadraIdFiltro && { quadraId: quadraIdFiltro }),
      ...(!quadraIdFiltro && projetoIdFiltro && { projetoId: projetoIdFiltro }),
    }),
  })

  const { data: projetos = [] } = useQuery({ queryKey: ['projetos'], queryFn: () => projetosService.listar() })
  const { data: quadras = [] } = useQuery({ queryKey: ['quadras'], queryFn: () => quadrasService.listar() })
  const { data: proprietarios = [] } = useQuery({ queryKey: ['proprietarios'], queryFn: proprietariosService.listar })
  const { data: vendas = [] } = useQuery({ queryKey: ['vendas'], queryFn: () => vendasService.listar() })
  const { data: clientes = [] } = useQuery({ queryKey: ['clientes'], queryFn: () => clientesService.listar() })

  const quadraAtual = quadras.find((q: any) => q.id === quadraIdFiltro) as any
  const projetoAtual = projetos.find((p: any) => p.id === (quadraAtual?.projetoId || projetoIdFiltro)) as any

  const [form, setForm] = useState({
    numero: '', area: '', valorBase: '',
    quadraId: quadraIdFiltro, projetoId: projetoIdFiltro, proprietarioId: '', observacoes: '',
  })

  const deleteMutacao = useMutation({
    mutationFn: (id: string) => lotesService.deletar(id),
    onSuccess: () => {
      toast.success('Lote excluído!')
      qc.invalidateQueries({ queryKey: ['lotes'] })
      setDeletingId(null)
    },
    onError: (err) => { toast.error(err.message); setDeletingId(null) },
  })

  const criarMutacao = useMutation({
    mutationFn: () => lotesService.criar({
      ...form,
      area: parseFloat(form.area),
      valorBase: parseFloat(form.valorBase),
    }),
    onSuccess: () => {
      toast.success('Lote criado com sucesso!')
      qc.invalidateQueries({ queryKey: ['lotes'] })
      setOpen(false)
    },
    onError: (err) => toast.error(err.message),
  })

  function getClienteDoLote(loteId: string) {
    const venda = (vendas as any[]).find((v) => v.loteId === loteId)
    if (!venda) return null
    return (clientes as any[]).find((c) => c.id === venda.clienteId) || null
  }

  const columns: ColumnDef<Lote>[] = [
    { accessorKey: 'numero', header: 'Lote Nº' },
    { accessorKey: 'area', header: 'Área', cell: ({ row }) => formatArea(row.original.area) },
    { accessorKey: 'valorBase', header: 'Valor Base', cell: ({ row }) => formatCurrency(row.original.valorBase) },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} type="lote" />,
    },
    {
      id: 'cliente',
      header: 'Cliente Final',
      cell: ({ row }) => {
        const cliente = getClienteDoLote(row.original.id)
        if (!cliente) return <span className="text-gray-400 text-xs">—</span>
        return (
          <div className="flex items-center gap-1.5">
            <UserCheck size={13} className="text-green-600 shrink-0" />
            <span className="text-sm font-medium text-gray-800">{cliente.nome}</span>
          </div>
        )
      },
    },
    {
      id: 'acoes',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {row.original.status === 'disponivel' && (
            <Button variant="ghost" size="sm" onClick={() => {
              lotesService.alterarStatus(row.original.id, 'reservado').then(() => {
                toast.success('Lote reservado')
                qc.invalidateQueries({ queryKey: ['lotes'] })
              })
            }}>Reservar</Button>
          )}
          <Button
            variant="ghost" size="icon"
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={() => setDeletingId(row.original.id)}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      {(quadraAtual || projetoAtual) && (
        <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-3">
          <button onClick={() => navigate('/projetos')} className="hover:text-blue-600 transition-colors">Projetos</button>
          {projetoAtual && (
            <>
              <ChevronRight size={14} />
              <button onClick={() => navigate(`/quadras?projetoId=${projetoAtual.id}`)} className="hover:text-blue-600 transition-colors">
                {projetoAtual.nome}
              </button>
            </>
          )}
          {quadraAtual && (
            <>
              <ChevronRight size={14} />
              <span className="text-gray-800 font-medium">{quadraAtual.nome}</span>
            </>
          )}
          <ChevronRight size={14} />
          <span className="text-blue-600 font-medium">Lotes</span>
          <button onClick={() => setSearchParams({})} className="ml-2 text-xs text-gray-400 hover:text-gray-600 underline">
            ver todos
          </button>
        </div>
      )}

      <PageHeader
        title="Lotes"
        description={quadraAtual ? `Lotes da quadra ${quadraAtual.nome}` : 'Gestão de lotes do patrimônio'}
      >
        <Button onClick={() => {
          setForm({ numero: '', area: '', valorBase: '', quadraId: quadraIdFiltro, projetoId: projetoIdFiltro, proprietarioId: '', observacoes: '' })
          setOpen(true)
        }}>
          <Plus size={16} className="mr-1" />Novo Lote
        </Button>
      </PageHeader>

      <div className="flex gap-3 mb-4">
        <Select value={filtroStatus || 'todos'} onValueChange={(v) => setFiltroStatus(v === 'todos' ? '' : v)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="disponivel">Disponível</SelectItem>
            <SelectItem value="reservado">Reservado</SelectItem>
            <SelectItem value="vendido">Vendido</SelectItem>
            <SelectItem value="bloqueado">Bloqueado</SelectItem>
          </SelectContent>
        </Select>
        {!quadraIdFiltro && (
          <Select value={projetoIdFiltro || 'todos'} onValueChange={(v) => setSearchParams(v === 'todos' ? {} : { projetoId: v })}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Projeto" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os projetos</SelectItem>
              {projetos.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      <DataTable data={lotes} columns={columns} searchPlaceholder="Buscar lote..." isLoading={isLoading} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Novo Lote</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Projeto *</Label>
              <Select value={form.projetoId} onValueChange={(v) => setForm({ ...form, projetoId: v, quadraId: '' })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {projetos.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Proprietário *</Label>
              <Select value={form.proprietarioId} onValueChange={(v) => setForm({ ...form, proprietarioId: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {proprietarios.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Quadra *</Label>
              <Select value={form.quadraId} onValueChange={(v) => setForm({ ...form, quadraId: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {(quadras as any[]).filter((q) => !form.projetoId || q.projetoId === form.projetoId).map((q: any) => (
                    <SelectItem key={q.id} value={q.id}>{q.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Número do Lote *</Label>
              <Input placeholder="Ex: 01" value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Área (m²) *</Label>
              <Input type="number" placeholder="300" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Valor Base (R$) *</Label>
              <Input type="number" placeholder="50000" value={form.valorBase} onChange={(e) => setForm({ ...form, valorBase: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => criarMutacao.mutate()} disabled={criarMutacao.isPending}>
              {criarMutacao.isPending ? 'Criando...' : 'Criar Lote'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingId} onOpenChange={(v) => !v && setDeletingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Excluir lote?</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">Esta ação não pode ser desfeita. Vendas vinculadas a este lote podem ser afetadas.</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeletingId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteMutacao.mutate(deletingId!)} disabled={deleteMutacao.isPending}>
              {deleteMutacao.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
