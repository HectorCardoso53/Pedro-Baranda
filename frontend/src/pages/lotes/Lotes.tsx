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
import LoteTipoBadge from '@/components/common/LoteTipoBadge'
import { toast } from 'sonner'
import { Plus, ChevronRight, UserCheck, Trash2, Eye, LayoutGrid, Pencil } from 'lucide-react'
import { formatCurrency, formatArea, parseCurrencyValue } from '@/utils/format'
import { CurrencyInput } from '@/components/ui/currency-input'
import type { ColumnDef } from '@tanstack/react-table'
import type { Lote } from '@/types'

export default function Lotes() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const quadraIdFiltro = searchParams.get('quadraId') || ''
  const projetoIdFiltro = searchParams.get('projetoId') || ''

  const [open, setOpen] = useState(false)
  const [openLote, setOpenLote] = useState(false)
  const [filtroStatus, setFiltroStatus] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [viewingLote, setViewingLote] = useState<Lote | null>(null)
  const [editingLote, setEditingLote] = useState<Lote | null>(null)
  const [editForm, setEditForm] = useState({ numero: '', area: '', dimensao: '', localizacao: '', valorBase: '', observacoes: '' })

  const { data: lotes = [], isLoading } = useQuery({
    queryKey: ['lotes', filtroStatus, quadraIdFiltro, projetoIdFiltro],
    queryFn: () => lotesService.listar({
      ...(filtroStatus && { status: filtroStatus }),
      ...(quadraIdFiltro && { quadraId: quadraIdFiltro }),
      ...(!quadraIdFiltro && projetoIdFiltro && { projetoId: projetoIdFiltro }),
    }),
    enabled: !!quadraIdFiltro,
  })

  const { data: projetos = [] } = useQuery({ queryKey: ['projetos'], queryFn: () => projetosService.listar() })
  const { data: quadras = [] } = useQuery({ queryKey: ['quadras'], queryFn: () => quadrasService.listar() })
  const { data: proprietarios = [] } = useQuery({ queryKey: ['proprietarios'], queryFn: proprietariosService.listar })
  const { data: vendas = [] } = useQuery({ queryKey: ['vendas'], queryFn: () => vendasService.listar() })
  const { data: clientes = [] } = useQuery({ queryKey: ['clientes'], queryFn: () => clientesService.listar() })

  const quadraAtual = (quadras as any[]).find((q) => q.id === quadraIdFiltro) as any
  const projetoAtual = projetos.find((p: any) => p.id === (quadraAtual?.projetoId || projetoIdFiltro)) as any

  // Form lote único
  const [form, setForm] = useState({
    numero: '', area: '', dimensao: '', localizacao: '', valorBase: '',
    quadraId: quadraIdFiltro, projetoId: projetoIdFiltro, proprietarioId: '', observacoes: '',
  })

  // Form criação em lote
  const [loteForm, setLoteForm] = useState({
    projetoId: projetoIdFiltro,
    quadraId: quadraIdFiltro,
    proprietarioId: '',
    prefixo: '',
    inicio: '1',
    fim: '10',
    dimensao: '',
    area: '',
    localizacao: '',
    valorBase: '',
  })

  const atualizarMutacao = useMutation({
    mutationFn: () => lotesService.atualizar(editingLote!.id, {
      numero: editForm.numero,
      area: parseFloat(editForm.area),
      valorBase: parseCurrencyValue(editForm.valorBase),
      dimensao: editForm.dimensao || null,
      localizacao: editForm.localizacao || null,
      observacoes: editForm.observacoes || null,
    }),
    onSuccess: () => {
      toast.success('Lote atualizado!')
      qc.invalidateQueries({ queryKey: ['lotes'] })
      setEditingLote(null)
    },
    onError: (err) => toast.error(err.message),
  })

  function abrirEdicao(lote: Lote) {
    setEditingLote(lote)
    setEditForm({
      numero: lote.numero,
      area: lote.area != null ? String(lote.area) : '',
      dimensao: lote.dimensao || '',
      localizacao: lote.localizacao || '',
      valorBase: lote.valorBase != null ? String(lote.valorBase) : '',
      observacoes: (lote as any).observacoes || '',
    })
  }

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
      valorBase: parseCurrencyValue(form.valorBase),
      dimensao: form.dimensao || null,
      localizacao: form.localizacao || null,
    }),
    onSuccess: () => {
      toast.success('Lote criado com sucesso!')
      qc.invalidateQueries({ queryKey: ['lotes'] })
      setOpen(false)
    },
    onError: (err) => toast.error(err.message),
  })

  const criarEmLoteMutacao = useMutation({
    mutationFn: () => {
      const inicio = parseInt(loteForm.inicio)
      const fim = parseInt(loteForm.fim)
      if (isNaN(inicio) || isNaN(fim) || inicio > fim) throw new Error('Intervalo inválido')
      const lotesParaCriar = Array.from({ length: fim - inicio + 1 }, (_, i) => ({
        quadraId: loteForm.quadraId,
        projetoId: loteForm.projetoId,
        proprietarioId: loteForm.proprietarioId,
        numero: loteForm.prefixo ? `${loteForm.prefixo}${inicio + i}` : String(inicio + i),
        area: parseFloat(loteForm.area) || 0,
        dimensao: loteForm.dimensao || null,
        localizacao: loteForm.localizacao || null,
        valorBase: parseCurrencyValue(loteForm.valorBase),
      }))
      return lotesService.criarEmLote(lotesParaCriar)
    },
    onSuccess: (data: any) => {
      toast.success(`${data?.length || ''} lotes criados com sucesso!`)
      qc.invalidateQueries({ queryKey: ['lotes'] })
      setOpenLote(false)
    },
    onError: (err) => toast.error(err.message),
  })

  function getClienteDoLote(loteId: string) {
    const venda = (vendas as any[]).find((v) => v.loteId === loteId)
    if (!venda) return null
    return (clientes as any[]).find((c) => c.id === venda.clienteId) || null
  }

  const previewLotes = () => {
    const inicio = parseInt(loteForm.inicio)
    const fim = parseInt(loteForm.fim)
    if (isNaN(inicio) || isNaN(fim) || inicio > fim) return []
    return Array.from({ length: Math.min(fim - inicio + 1, 5) }, (_, i) =>
      loteForm.prefixo ? `${loteForm.prefixo}${inicio + i}` : String(inicio + i)
    )
  }

  const columns: ColumnDef<Lote>[] = [
    {
      accessorKey: 'numero',
      header: 'Lote',
      meta: { className: 'w-px whitespace-nowrap' },
      cell: ({ row }) => <span className="font-semibold text-blue-700">{row.original.numero}</span>,
    },
    {
      id: 'dimensao',
      header: 'Tipo / Dim.',
      meta: { className: 'w-px whitespace-nowrap' },
      cell: ({ row }) => <LoteTipoBadge dimensao={row.original.dimensao} />,
    },
    {
      accessorKey: 'area',
      header: 'Área (m²)',
      meta: { className: 'w-px whitespace-nowrap' },
      cell: ({ row }) => <span className="text-sm">{formatArea(row.original.area)}</span>,
    },
    {
      id: 'localizacao',
      header: 'Localização',
      cell: ({ row }) => row.original.localizacao
        ? <span className="text-sm text-gray-600">{row.original.localizacao}</span>
        : <span className="text-gray-300">—</span>,
    },
    {
      accessorKey: 'valorBase',
      header: 'Valor',
      meta: { className: 'w-px whitespace-nowrap' },
      cell: ({ row }) => <span className="text-sm font-medium text-green-700">{formatCurrency(row.original.valorBase)}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      meta: { className: 'w-px whitespace-nowrap' },
      cell: ({ row }) => <StatusBadge status={row.original.status} type="lote" />,
    },
    {
      id: 'cliente',
      header: 'Cliente',
      cell: ({ row }) => {
        const cliente = getClienteDoLote(row.original.id)
        if (!cliente) return <span className="text-gray-300 text-xs">—</span>
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
      meta: { className: 'w-px whitespace-nowrap' },
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost" size="icon"
            className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
            onClick={() => setViewingLote(row.original)}
          >
            <Eye size={14} />
          </Button>
          <Button
            variant="ghost" size="icon"
            onClick={() => abrirEdicao(row.original)}
          >
            <Pencil size={14} />
          </Button>
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

  const quadrasFiltradas = (quadras as any[]).filter((q) =>
    !loteForm.projetoId || q.projetoId === loteForm.projetoId
  )

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
        <div className="flex gap-2">
          <Button onClick={() => {
            setForm({ numero: '', area: '', dimensao: '', localizacao: '', valorBase: '', quadraId: quadraIdFiltro, projetoId: projetoIdFiltro, proprietarioId: '', observacoes: '' })
            setOpen(true)
          }}>
            <Plus size={16} className="mr-1" />Novo Lote
          </Button>
        </div>
      </PageHeader>

      <div className="flex gap-3 mb-4 flex-wrap">
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

      {!quadraIdFiltro ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="bg-blue-50 rounded-full p-5 mb-4">
            <LayoutGrid size={36} className="text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">Selecione uma quadra</h3>
          <p className="text-sm text-gray-400 mb-5 max-w-xs">
            Os lotes só podem ser visualizados dentro da quadra à qual pertencem.
          </p>
          <Button variant="outline" onClick={() => navigate('/quadras')}>
            <LayoutGrid size={14} className="mr-2" />Ir para Quadras
          </Button>
        </div>
      ) : (
        <DataTable data={lotes} columns={columns} searchPlaceholder="Buscar lote, localização..." isLoading={isLoading} />
      )}

      {/* Totais */}
      {quadraIdFiltro && (lotes as Lote[]).length > 0 && (
        <div className="mt-1 border-t-2 border-blue-200 bg-blue-50 rounded-b-lg px-4 py-3 flex flex-wrap gap-6 text-sm">
          <div><span className="text-gray-500">Total Lotes:</span> <strong className="text-blue-800">{(lotes as Lote[]).length}</strong></div>
          <div>
            <span className="text-gray-500">Disponíveis:</span>{' '}
            <strong className="text-green-700">{(lotes as Lote[]).filter(l => l.status === 'disponivel').length}</strong>
          </div>
          <div>
            <span className="text-gray-500">Vendidos:</span>{' '}
            <strong className="text-red-600">{(lotes as Lote[]).filter(l => l.status === 'vendido').length}</strong>
          </div>
          <div>
            <span className="text-gray-500">Valor Total:</span>{' '}
            <strong className="text-green-700">{formatCurrency((lotes as Lote[]).reduce((s, l) => s + (l.valorBase || 0), 0))}</strong>
          </div>
        </div>
      )}

      {/* Modal criar lote único */}
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
                  {(proprietarios as any[]).map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
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
              <Label>Nome / Número *</Label>
              <Input placeholder="Ex: A1, R5" value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Dimensão</Label>
              <Input placeholder="Ex: 10X30, 15X30" value={form.dimensao} onChange={(e) => setForm({ ...form, dimensao: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Área (m²) *</Label>
              <Input type="number" placeholder="300" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Valor Base *</Label>
              <CurrencyInput value={form.valorBase} onChange={(v) => setForm({ ...form, valorBase: v })} placeholder="12.000,00" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Localização</Label>
              <Input placeholder="Ex: Rua 15, Travessa 01" value={form.localizacao} onChange={(e) => setForm({ ...form, localizacao: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => criarMutacao.mutate()} disabled={criarMutacao.isPending || !form.numero || !form.quadraId}>
              {criarMutacao.isPending ? 'Criando...' : 'Criar Lote'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal criar em lote */}
      <Dialog open={openLote} onOpenChange={setOpenLote}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Criar Lotes em Série</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-500 -mt-2">Cria múltiplos lotes de uma vez com as mesmas características.</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Projeto *</Label>
              <Select value={loteForm.projetoId} onValueChange={(v) => setLoteForm({ ...loteForm, projetoId: v, quadraId: '' })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {projetos.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Proprietário *</Label>
              <Select value={loteForm.proprietarioId} onValueChange={(v) => setLoteForm({ ...loteForm, proprietarioId: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {(proprietarios as any[]).map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Quadra *</Label>
              <Select value={loteForm.quadraId} onValueChange={(v) => setLoteForm({ ...loteForm, quadraId: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione a quadra" /></SelectTrigger>
                <SelectContent>
                  {quadrasFiltradas.map((q: any) => <SelectItem key={q.id} value={q.id}>{q.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <div className="border rounded-lg p-3 bg-gray-50 space-y-3">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Numeração dos Lotes</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Prefixo</Label>
                    <Input placeholder="Ex: A, R" value={loteForm.prefixo} onChange={(e) => setLoteForm({ ...loteForm, prefixo: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Do número</Label>
                    <Input type="number" min="1" value={loteForm.inicio} onChange={(e) => setLoteForm({ ...loteForm, inicio: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Até número</Label>
                    <Input type="number" min="1" value={loteForm.fim} onChange={(e) => setLoteForm({ ...loteForm, fim: e.target.value })} />
                  </div>
                </div>
                {previewLotes().length > 0 && (
                  <p className="text-xs text-blue-600">
                    Lotes: <strong>{previewLotes().join(', ')}{parseInt(loteForm.fim) - parseInt(loteForm.inicio) >= 5 ? `... (${parseInt(loteForm.fim) - parseInt(loteForm.inicio) + 1} no total)` : ''}</strong>
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label>Dimensão</Label>
              <Input placeholder="Ex: 10X30, 15X30" value={loteForm.dimensao} onChange={(e) => setLoteForm({ ...loteForm, dimensao: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Área (m²) *</Label>
              <Input type="number" placeholder="300" value={loteForm.area} onChange={(e) => setLoteForm({ ...loteForm, area: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Valor Base por Lote *</Label>
              <CurrencyInput value={loteForm.valorBase} onChange={(v) => setLoteForm({ ...loteForm, valorBase: v })} placeholder="12.000,00" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Localização</Label>
              <Input placeholder="Ex: Rua 15, Travessa 01, Rodovia PA 441" value={loteForm.localizacao} onChange={(e) => setLoteForm({ ...loteForm, localizacao: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setOpenLote(false)}>Cancelar</Button>
            <Button
              onClick={() => criarEmLoteMutacao.mutate()}
              disabled={criarEmLoteMutacao.isPending || !loteForm.quadraId || !loteForm.proprietarioId || !loteForm.area}
            >
              {criarEmLoteMutacao.isPending
                ? 'Criando...'
                : `Criar ${!isNaN(parseInt(loteForm.inicio)) && !isNaN(parseInt(loteForm.fim)) ? parseInt(loteForm.fim) - parseInt(loteForm.inicio) + 1 : ''} Lotes`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal detalhes do lote */}
      {viewingLote && (() => {
        const quadra = (quadras as any[]).find((q) => q.id === viewingLote.quadraId)
        const projeto = (projetos as any[]).find((p) => p.id === viewingLote.projetoId)
        const proprietario = (proprietarios as any[]).find((p) => p.id === viewingLote.proprietarioId)
        const venda = (vendas as any[]).find((v) => v.loteId === viewingLote.id && v.status !== 'cancelada' && v.status !== 'distratada')
        const cliente = venda ? (clientes as any[]).find((c) => c.id === venda.clienteId) : null
        return (
          <Dialog open={!!viewingLote} onOpenChange={(v) => !v && setViewingLote(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  Lote {viewingLote.numero}
                  <StatusBadge status={viewingLote.status} type="lote" />
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                {/* Localização */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                  <div className="text-gray-500">Projeto</div>
                  <div className="font-medium">{projeto?.nome || '—'}</div>
                  <div className="text-gray-500">Quadra</div>
                  <div className="font-medium">{quadra?.nome || '—'}</div>
                  <div className="text-gray-500">Proprietário</div>
                  <div className="font-medium">{proprietario?.nome || '—'}</div>
                </div>

                <hr />

                {/* Características */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                  <div className="text-gray-500">Tipo / Dimensão</div>
                  <div><LoteTipoBadge dimensao={viewingLote.dimensao} /></div>
                  <div className="text-gray-500">Área</div>
                  <div className="font-medium">{formatArea(viewingLote.area)}</div>
                  <div className="text-gray-500">Localização</div>
                  <div className="font-medium">{viewingLote.localizacao || '—'}</div>
                  <div className="text-gray-500">Valor Base</div>
                  <div className="font-medium text-green-700">{formatCurrency(viewingLote.valorBase)}</div>
                  {viewingLote.observacoes && (
                    <>
                      <div className="text-gray-500">Observações</div>
                      <div className="font-medium">{viewingLote.observacoes}</div>
                    </>
                  )}
                </div>

                {/* Venda */}
                {venda && cliente && (
                  <>
                    <hr />
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Venda Ativa</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                      <div className="text-gray-500">Cliente</div>
                      <div className="font-medium text-blue-700">{cliente.nome}</div>
                      <div className="text-gray-500">Valor da Venda</div>
                      <div className="font-medium">{formatCurrency(venda.valor)}</div>
                      <div className="text-gray-500">Entrada</div>
                      <div className="font-medium">{formatCurrency(venda.entrada)}</div>
                      <div className="text-gray-500">Saldo / Parcelas</div>
                      <div className="font-medium">{formatCurrency(venda.saldo)} em {venda.numeroParcelas}x</div>
                      <div className="text-gray-500">Status da Venda</div>
                      <div><StatusBadge status={venda.status} type="venda" /></div>
                    </div>
                    <Button
                      variant="outline" size="sm" className="w-full mt-1"
                      onClick={() => { setViewingLote(null); navigate(`/vendas/${venda.id}`) }}
                    >
                      Ver detalhes da venda
                    </Button>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )
      })()}

      {/* Modal editar lote */}
      <Dialog open={!!editingLote} onOpenChange={(v) => !v && setEditingLote(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Editar Lote {editingLote?.numero}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Nome / Número *</Label>
              <Input value={editForm.numero} onChange={(e) => setEditForm({ ...editForm, numero: e.target.value })} placeholder="Ex: A1, R5" />
            </div>
            <div className="space-y-1">
              <Label>Dimensão</Label>
              <Input value={editForm.dimensao} onChange={(e) => setEditForm({ ...editForm, dimensao: e.target.value })} placeholder="Ex: 10X30, 15X30" />
            </div>
            <div className="space-y-1">
              <Label>Área (m²) *</Label>
              <Input type="number" value={editForm.area} onChange={(e) => setEditForm({ ...editForm, area: e.target.value })} placeholder="300" />
            </div>
            <div className="space-y-1">
              <Label>Valor Base *</Label>
              <CurrencyInput value={editForm.valorBase} onChange={(v) => setEditForm({ ...editForm, valorBase: v })} placeholder="12.000,00" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Localização</Label>
              <Input value={editForm.localizacao} onChange={(e) => setEditForm({ ...editForm, localizacao: e.target.value })} placeholder="Ex: Rua 15, Travessa 01" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Observações</Label>
              <Input value={editForm.observacoes} onChange={(e) => setEditForm({ ...editForm, observacoes: e.target.value })} placeholder="Opcional" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setEditingLote(null)}>Cancelar</Button>
            <Button onClick={() => atualizarMutacao.mutate()} disabled={atualizarMutacao.isPending || !editForm.numero || !editForm.area}>
              {atualizarMutacao.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal excluir */}
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
