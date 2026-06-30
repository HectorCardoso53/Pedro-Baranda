import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { quadrasService, projetosService, lotesService } from '@/services/api.service'
import PageHeader from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Home, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import { formatCurrency } from '@/utils/format'
import type { ColumnDef } from '@tanstack/react-table'
import type { Quadra } from '@/types'

type FormState = {
  nome: string
  projetoId: string
  localizacao: string
  areaM2: string
  valorEstimado: string
  quantidadeLotesPrev: string
}

const emptyForm = (projetoId = ''): FormState => ({
  nome: '',
  projetoId,
  localizacao: '',
  areaM2: '',
  valorEstimado: '',
  quantidadeLotesPrev: '',
})

export default function Quadras() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const projetoIdFiltro = searchParams.get('projetoId') || ''

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm(projetoIdFiltro))

  const { data: quadras = [], isLoading } = useQuery({
    queryKey: ['quadras', projetoIdFiltro],
    queryFn: () => quadrasService.listar(projetoIdFiltro ? { projetoId: projetoIdFiltro } : {}),
  })
  const { data: projetos = [] } = useQuery({ queryKey: ['projetos'], queryFn: () => projetosService.listar() })
  const { data: todosLotes = [] } = useQuery({
    queryKey: ['lotes', projetoIdFiltro],
    queryFn: () => lotesService.listar(projetoIdFiltro ? { projetoId: projetoIdFiltro } : {}),
    enabled: quadras.length > 0,
  })

  const projetoAtual = projetos.find((p: any) => p.id === projetoIdFiltro) as any

  const lotesPorQuadra = (quadraId: string) =>
    (todosLotes as any[]).filter((l: any) => l.quadraId === quadraId)

  const mutacao = useMutation({
    mutationFn: () => {
      const payload = {
        nome: form.nome,
        projetoId: form.projetoId,
        localizacao: form.localizacao || null,
        areaM2: form.areaM2 ? parseFloat(form.areaM2) : null,
        valorEstimado: form.valorEstimado ? parseFloat(form.valorEstimado.replace(/\./g, '').replace(',', '.')) : null,
        quantidadeLotesPrev: form.quantidadeLotesPrev ? parseInt(form.quantidadeLotesPrev) : null,
      }
      return editingId
        ? quadrasService.atualizar(editingId, payload)
        : quadrasService.criar({ ...payload, ativo: true })
    },
    onSuccess: () => {
      toast.success(editingId ? 'Quadra atualizada!' : 'Quadra criada!')
      qc.invalidateQueries({ queryKey: ['quadras'] })
      setOpen(false)
      setEditingId(null)
    },
    onError: (err) => toast.error(err.message),
  })

  const deleteMutacao = useMutation({
    mutationFn: (id: string) => quadrasService.deletar(id),
    onSuccess: () => {
      toast.success('Quadra excluída!')
      qc.invalidateQueries({ queryKey: ['quadras'] })
      setDeletingId(null)
    },
    onError: (err) => { toast.error(err.message); setDeletingId(null) },
  })

  function abrirEdicao(q: Quadra) {
    setEditingId(q.id)
    setForm({
      nome: q.nome,
      projetoId: q.projetoId,
      localizacao: q.localizacao || '',
      areaM2: q.areaM2 != null ? String(q.areaM2) : '',
      valorEstimado: q.valorEstimado != null ? String(q.valorEstimado) : '',
      quantidadeLotesPrev: q.quantidadeLotesPrev != null ? String(q.quantidadeLotesPrev) : '',
    })
    setOpen(true)
  }

  // Totais para o rodapé da tabela
  const totalAreaM2 = (quadras as Quadra[]).reduce((s, q) => s + (q.areaM2 || 0), 0)
  const totalLotesPrev = (quadras as Quadra[]).reduce((s, q) => s + (q.quantidadeLotesPrev || 0), 0)
  const totalValorEstimado = (quadras as Quadra[]).reduce((s, q) => s + (q.valorEstimado || 0), 0)
  const totalLotesCriados = (todosLotes as any[]).length

  const columns: ColumnDef<Quadra>[] = [
    {
      accessorKey: 'nome',
      header: 'Quadra',
      cell: ({ row }) => <span className="font-semibold text-blue-700">{row.original.nome}</span>,
    },
    {
      id: 'areaM2',
      header: 'Área (m²)',
      meta: { className: 'w-px whitespace-nowrap text-right' },
      cell: ({ row }) => row.original.areaM2
        ? <span className="text-sm">{row.original.areaM2.toLocaleString('pt-BR')}</span>
        : <span className="text-gray-300">—</span>,
    },
    {
      id: 'lotes',
      header: 'Lotes (criados / previstos)',
      meta: { className: 'w-px whitespace-nowrap text-center' },
      cell: ({ row }) => {
        const criados = lotesPorQuadra(row.original.id).length
        const prev = row.original.quantidadeLotesPrev
        return (
          <div className="flex items-center justify-center gap-1 text-sm">
            <span className="font-medium text-blue-700">{criados}</span>
            {prev != null && (
              <>
                <span className="text-gray-400">/</span>
                <span className="text-gray-500">{prev}</span>
              </>
            )}
          </div>
        )
      },
    },
    {
      id: 'valorEstimado',
      header: 'Valor Estimado',
      meta: { className: 'w-px whitespace-nowrap text-right' },
      cell: ({ row }) => row.original.valorEstimado
        ? <span className="text-sm font-medium text-green-700">{formatCurrency(row.original.valorEstimado)}</span>
        : <span className="text-gray-300">—</span>,
    },
    {
      id: 'localizacao',
      header: 'Localização',
      cell: ({ row }) => row.original.localizacao
        ? <span className="text-sm text-gray-600">{row.original.localizacao}</span>
        : <span className="text-gray-300">—</span>,
    },
    {
      id: 'acoes',
      header: '',
      meta: { className: 'w-px whitespace-nowrap' },
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost" size="sm"
            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 gap-1 text-xs"
            onClick={() => navigate(`/lotes?quadraId=${row.original.id}&projetoId=${row.original.projetoId}`)}
          >
            <Home size={13} />Ver Lotes
          </Button>
          <Button variant="ghost" size="icon" onClick={() => abrirEdicao(row.original)}>
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

  return (
    <div>
      {projetoAtual && (
        <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-3">
          <button onClick={() => navigate('/projetos')} className="hover:text-blue-600 transition-colors">Projetos</button>
          <ChevronRight size={14} />
          <span className="text-gray-800 font-medium">{projetoAtual.nome}</span>
          <ChevronRight size={14} />
          <span className="text-blue-600 font-medium">Quadras</span>
          <button onClick={() => setSearchParams({})} className="ml-2 text-xs text-gray-400 hover:text-gray-600 underline">
            ver todas
          </button>
        </div>
      )}

      <PageHeader
        title="Quadras"
        description={projetoAtual ? `Quadras do projeto ${projetoAtual.nome}` : 'Quadras dos projetos de loteamento'}
      >
        <Button onClick={() => { setEditingId(null); setForm(emptyForm(projetoIdFiltro)); setOpen(true) }}>
          <Plus size={16} className="mr-1" />Nova Quadra
        </Button>
      </PageHeader>

      {!projetoIdFiltro && (
        <div className="flex gap-3 mb-4">
          <Select value={projetoIdFiltro || 'todos'} onValueChange={(v) => setSearchParams(v === 'todos' ? {} : { projetoId: v })}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Filtrar por projeto" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os projetos</SelectItem>
              {projetos.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <DataTable data={quadras} columns={columns} searchPlaceholder="Buscar quadra..." isLoading={isLoading} />

      {/* Linha de totais */}
      {(quadras as Quadra[]).length > 0 && (
        <div className="mt-1 border-t-2 border-blue-200 bg-blue-50 rounded-b-lg px-4 py-3 flex flex-wrap gap-6 text-sm">
          <div>
            <span className="text-gray-500">Total Quadras:</span>{' '}
            <strong className="text-blue-800">{(quadras as Quadra[]).length}</strong>
          </div>
          {totalAreaM2 > 0 && (
            <div>
              <span className="text-gray-500">Área Total:</span>{' '}
              <strong className="text-blue-800">{totalAreaM2.toLocaleString('pt-BR')} m²</strong>
            </div>
          )}
          <div>
            <span className="text-gray-500">Lotes Criados:</span>{' '}
            <strong className="text-blue-800">{totalLotesCriados}</strong>
            {totalLotesPrev > 0 && (
              <span className="text-gray-500"> / {totalLotesPrev} previstos</span>
            )}
          </div>
          {totalValorEstimado > 0 && (
            <div>
              <span className="text-gray-500">Valor Estimado Total:</span>{' '}
              <strong className="text-green-700">{formatCurrency(totalValorEstimado)}</strong>
            </div>
          )}
        </div>
      )}

      {/* Modal criar/editar */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditingId(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? 'Editar Quadra' : 'Nova Quadra'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <Label>Projeto *</Label>
              <Select value={form.projetoId} onValueChange={(v) => setForm({ ...form, projetoId: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o projeto" /></SelectTrigger>
                <SelectContent>
                  {projetos.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Nome da Quadra *</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: A1, B1" />
            </div>
            <div className="space-y-1">
              <Label>Qtd. Lotes Prevista</Label>
              <Input type="number" value={form.quantidadeLotesPrev} onChange={(e) => setForm({ ...form, quantidadeLotesPrev: e.target.value })} placeholder="Ex: 28" />
            </div>
            <div className="space-y-1">
              <Label>Área Total (m²)</Label>
              <Input type="number" value={form.areaM2} onChange={(e) => setForm({ ...form, areaM2: e.target.value })} placeholder="Ex: 9600" />
            </div>
            <div className="space-y-1">
              <Label>Valor Estimado (R$)</Label>
              <Input type="number" value={form.valorEstimado} onChange={(e) => setForm({ ...form, valorEstimado: e.target.value })} placeholder="Ex: 420000" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Localização / Referência</Label>
              <Input value={form.localizacao} onChange={(e) => setForm({ ...form, localizacao: e.target.value })} placeholder="Ex: Próxima ao Balneário Brilho" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => mutacao.mutate()} disabled={mutacao.isPending || !form.nome || !form.projetoId}>
              {mutacao.isPending ? 'Salvando...' : editingId ? 'Salvar' : 'Criar Quadra'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal confirmar exclusão */}
      <Dialog open={!!deletingId} onOpenChange={(v) => !v && setDeletingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Excluir quadra?</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">Esta ação não pode ser desfeita. Lotes vinculados serão removidos.</p>
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
