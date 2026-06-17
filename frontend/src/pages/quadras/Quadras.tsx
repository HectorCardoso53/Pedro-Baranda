import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { quadrasService, projetosService } from '@/services/api.service'
import PageHeader from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Home, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import type { Quadra } from '@/types'

export default function Quadras() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const projetoIdFiltro = searchParams.get('projetoId') || ''

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState({ nome: '', projetoId: projetoIdFiltro })

  const { data: quadras = [], isLoading } = useQuery({
    queryKey: ['quadras', projetoIdFiltro],
    queryFn: () => quadrasService.listar(projetoIdFiltro ? { projetoId: projetoIdFiltro } : {}),
  })
  const { data: projetos = [] } = useQuery({ queryKey: ['projetos'], queryFn: () => projetosService.listar() })

  const projetoAtual = projetos.find((p: any) => p.id === projetoIdFiltro) as any

  const mutacao = useMutation({
    mutationFn: () => editingId
      ? quadrasService.atualizar(editingId, form)
      : quadrasService.criar({ ...form, ativo: true }),
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

  const columns: ColumnDef<Quadra>[] = [
    { accessorKey: 'nome', header: 'Quadra' },
    { id: 'projeto', header: 'Projeto', cell: ({ row }) => (projetos.find((p: any) => p.id === row.original.projetoId) as any)?.nome || '-' },
    { id: 'acoes', header: '', cell: ({ row }) => (
      <div className="flex items-center gap-1">
        <Button
          variant="ghost" size="sm"
          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 gap-1 text-xs"
          onClick={() => navigate(`/lotes?quadraId=${row.original.id}&projetoId=${row.original.projetoId}`)}
        >
          <Home size={13} />Ver Lotes
        </Button>
        <Button variant="ghost" size="icon" onClick={() => {
          setEditingId(row.original.id)
          setForm({ nome: row.original.nome, projetoId: row.original.projetoId })
          setOpen(true)
        }}>
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
    )},
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
        <Button onClick={() => { setEditingId(null); setForm({ nome: '', projetoId: projetoIdFiltro }); setOpen(true) }}>
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

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditingId(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? 'Editar Quadra' : 'Nova Quadra'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
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
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Quadra A, Quadra 1" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => mutacao.mutate()} disabled={mutacao.isPending}>
              {mutacao.isPending ? 'Salvando...' : editingId ? 'Salvar' : 'Criar Quadra'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingId} onOpenChange={(v) => !v && setDeletingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Excluir quadra?</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">Esta ação não pode ser desfeita. Lotes vinculados podem ser afetados.</p>
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
