import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { regioesService } from '@/services/api.service'
import PageHeader from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Pencil } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import type { Regiao } from '@/types'

export default function Regioes() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Regiao | null>(null)
  const [form, setForm] = useState({ nome: '', estado: '', cidade: '', descricao: '' })

  const { data: regioes = [], isLoading } = useQuery({ queryKey: ['regioes'], queryFn: regioesService.listar })

  const mutacao = useMutation({
    mutationFn: () => editing ? regioesService.atualizar(editing.id, form) : regioesService.criar(form),
    onSuccess: () => {
      toast.success(editing ? 'Região atualizada!' : 'Região criada!')
      qc.invalidateQueries({ queryKey: ['regioes'] })
      setOpen(false)
      setEditing(null)
    },
    onError: (err) => toast.error(err.message),
  })

  const columns: ColumnDef<Regiao>[] = [
    { accessorKey: 'nome', header: 'Nome' },
    { accessorKey: 'cidade', header: 'Cidade' },
    { accessorKey: 'estado', header: 'Estado' },
    { id: 'acoes', header: '', cell: ({ row }) => (
      <Button variant="ghost" size="icon" onClick={() => {
        setEditing(row.original)
        setForm({ nome: row.original.nome, estado: row.original.estado, cidade: row.original.cidade, descricao: row.original.descricao || '' })
        setOpen(true)
      }}><Pencil size={14} /></Button>
    )},
  ]

  return (
    <div>
      <PageHeader title="Regiões" description="Regiões geográficas dos projetos">
        <Button onClick={() => { setEditing(null); setForm({ nome: '', estado: '', cidade: '', descricao: '' }); setOpen(true) }}>
          <Plus size={16} className="mr-1" />Nova Região
        </Button>
      </PageHeader>
      <DataTable data={regioes} columns={columns} searchPlaceholder="Buscar região..." isLoading={isLoading} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar Região' : 'Nova Região'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Cidade *</Label>
                <Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Estado (UF) *</Label>
                <Input maxLength={2} value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value.toUpperCase() })} />
              </div>
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
    </div>
  )
}
