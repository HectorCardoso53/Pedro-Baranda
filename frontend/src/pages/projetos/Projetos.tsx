import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projetosService, proprietariosService } from '@/services/api.service'
import PageHeader from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Pencil, SquareStack, Trash2 } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import type { Projeto } from '@/types'

export default function Projetos() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Projeto | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState({ nome: '', descricao: '', proprietarioId: '' })

  const { data: projetos = [], isLoading } = useQuery({ queryKey: ['projetos'], queryFn: () => projetosService.listar() })
  const { data: proprietarios = [] } = useQuery({ queryKey: ['proprietarios'], queryFn: proprietariosService.listar })

  const mutacao = useMutation({
    mutationFn: () => editing ? projetosService.atualizar(editing.id, form) : projetosService.criar(form),
    onSuccess: () => {
      toast.success(editing ? 'Projeto atualizado!' : 'Projeto criado!')
      qc.invalidateQueries({ queryKey: ['projetos'] })
      setOpen(false)
      setEditing(null)
    },
    onError: (err) => toast.error(err.message),
  })

  const deleteMutacao = useMutation({
    mutationFn: (id: string) => projetosService.deletar(id),
    onSuccess: () => {
      toast.success('Projeto excluído!')
      qc.invalidateQueries({ queryKey: ['projetos'] })
      setDeletingId(null)
    },
    onError: (err) => { toast.error(err.message); setDeletingId(null) },
  })

  const columns: ColumnDef<Projeto>[] = [
    { accessorKey: 'nome', header: 'Nome do Projeto' },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${row.original.status === 'ativo' ? 'bg-green-100 text-green-800' : row.original.status === 'suspenso' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'}`}>
        {row.original.status}
      </span>
    )},
    { id: 'acoes', header: '', cell: ({ row }) => (
      <div className="flex items-center gap-1">
        <Button
          variant="ghost" size="sm"
          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 gap-1 text-xs"
          onClick={() => navigate(`/quadras?projetoId=${row.original.id}`)}
        >
          <SquareStack size={13} />Ver Quadras
        </Button>
        <Button variant="ghost" size="icon" onClick={() => {
          setEditing(row.original)
          setForm({ nome: row.original.nome, descricao: row.original.descricao || '', proprietarioId: row.original.proprietarioId })
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
      <PageHeader title="Projetos" description="Projetos de loteamento">
        <Button onClick={() => { setEditing(null); setForm({ nome: '', descricao: '', proprietarioId: '' }); setOpen(true) }}>
          <Plus size={16} className="mr-1" />Novo Projeto
        </Button>
      </PageHeader>

      <DataTable data={projetos} columns={columns} searchPlaceholder="Buscar projeto..." isLoading={isLoading} />

      {/* Formulário */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar Projeto' : 'Novo Projeto'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Nome do Projeto *</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Proprietário *</Label>
              <Select value={form.proprietarioId} onValueChange={(v) => setForm({ ...form, proprietarioId: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o proprietário" /></SelectTrigger>
                <SelectContent>
                  {proprietarios.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Descrição</Label>
              <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Descrição opcional" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => mutacao.mutate()} disabled={mutacao.isPending}>
              {mutacao.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <Dialog open={!!deletingId} onOpenChange={(v) => !v && setDeletingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Excluir projeto?</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">Esta ação não pode ser desfeita. Áreas, quadras e lotes vinculados podem ser afetados.</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeletingId(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutacao.mutate(deletingId!)}
              disabled={deleteMutacao.isPending}
            >
              {deleteMutacao.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
