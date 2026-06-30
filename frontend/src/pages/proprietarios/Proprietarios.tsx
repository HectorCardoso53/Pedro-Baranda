import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { proprietariosService } from '@/services/api.service'
import PageHeader from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { formatCPF, formatPhone } from '@/utils/format'
import { CpfCnpjInput } from '@/components/ui/cpf-cnpj-input'
import type { ColumnDef } from '@tanstack/react-table'
import type { Proprietario } from '@/types'

const schema = z.object({
  nome: z.string().min(3, 'Nome obrigatório'),
  cpfCnpj: z.string().optional().or(z.literal('')),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  telefone: z.string().optional().or(z.literal('')),
  pixChave: z.string().optional().or(z.literal('')),
  pixTipo: z.enum(['cpf', 'cnpj', 'email', 'telefone', 'aleatoria']).optional(),
})

type FormData = z.infer<typeof schema>

export default function Proprietarios() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Proprietario | null>(null)
  const [excluindo, setExcluindo] = useState<Proprietario | null>(null)

  const { data: proprietarios = [], isLoading } = useQuery({
    queryKey: ['proprietarios'],
    queryFn: proprietariosService.listar,
  })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { pixTipo: 'cpf' },
  })

  const deletarMutacao = useMutation({
    mutationFn: (id: string) => proprietariosService.deletar(id),
    onSuccess: () => {
      toast.success('Proprietário excluído!')
      qc.invalidateQueries({ queryKey: ['proprietarios'] })
      setExcluindo(null)
    },
    onError: (err) => toast.error(err.message),
  })

  const mutacao = useMutation({
    mutationFn: (data: FormData) =>
      editing ? proprietariosService.atualizar(editing.id, data) : proprietariosService.criar(data),
    onSuccess: () => {
      toast.success(editing ? 'Proprietário atualizado!' : 'Proprietário criado!')
      qc.invalidateQueries({ queryKey: ['proprietarios'] })
      setOpen(false)
      reset()
      setEditing(null)
    },
    onError: (err) => toast.error(err.message),
  })

  function handleEdit(p: Proprietario) {
    setEditing(p)
    reset({
      nome: p.nome, cpfCnpj: formatCPF(p.cpfCnpj), email: p.email || '',
      telefone: p.telefone || '', pixChave: p.pixChave || '', pixTipo: (p.pixTipo as any) || 'cpf',
    })
    setOpen(true)
  }

  function handleNew() {
    setEditing(null)
    reset({ pixTipo: 'cpf' })
    setOpen(true)
  }

  const columns: ColumnDef<Proprietario>[] = [
    { accessorKey: 'nome', header: 'Nome' },
    { accessorKey: 'cpfCnpj', header: 'CPF/CNPJ', cell: ({ row }) => formatCPF(row.original.cpfCnpj) },
    { accessorKey: 'email', header: 'E-mail' },
    { accessorKey: 'telefone', header: 'Telefone', cell: ({ row }) => formatPhone(row.original.telefone) },
    { accessorKey: 'pixChave', header: 'Chave PIX' },
    {
      id: 'ativo',
      header: 'Status',
      cell: ({ row }) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${row.original.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {row.original.ativo ? 'Ativo' : 'Inativo'}
        </span>
      ),
    },
    {
      id: 'acoes',
      header: 'Ações',
      meta: { className: 'w-px whitespace-nowrap' },
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)} title="Editar">
            <Pencil size={14} />
          </Button>
          <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setExcluindo(row.original)} title="Excluir">
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="Proprietários" description="Gerencie os proprietários dos terrenos">
        <Button onClick={handleNew}><Plus size={16} className="mr-1" />Novo Proprietário</Button>
      </PageHeader>

      <DataTable data={proprietarios} columns={columns} searchPlaceholder="Buscar proprietário..." isLoading={isLoading} />

      <Dialog open={!!excluindo} onOpenChange={(v) => !v && setExcluindo(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Proprietário</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir <strong>{excluindo?.nome}</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setExcluindo(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={deletarMutacao.isPending} onClick={() => excluindo && deletarMutacao.mutate(excluindo.id)}>
              {deletarMutacao.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Proprietário' : 'Novo Proprietário'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((d) => mutacao.mutate(d))} className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <Label>Nome completo *</Label>
              <Input {...register('nome')} placeholder="Nome do proprietário" />
              {errors.nome && <p className="text-xs text-red-500">{errors.nome.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>CPF/CNPJ</Label>
              <CpfCnpjInput
                value={watch('cpfCnpj') || ''}
                onChange={(v) => setValue('cpfCnpj', v, { shouldValidate: true })}
              />
              {errors.cpfCnpj && <p className="text-xs text-red-500">{errors.cpfCnpj.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Telefone</Label>
              <Input {...register('telefone')} placeholder="(00) 90000-0000" />
              {errors.telefone && <p className="text-xs text-red-500">{errors.telefone.message}</p>}
            </div>
            <div className="col-span-2 space-y-1">
              <Label>E-mail</Label>
              <Input {...register('email')} placeholder="email@exemplo.com" />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Tipo de Chave PIX</Label>
              <Select defaultValue="cpf" onValueChange={(v) => setValue('pixTipo', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cpf">CPF</SelectItem>
                  <SelectItem value="cnpj">CNPJ</SelectItem>
                  <SelectItem value="email">E-mail</SelectItem>
                  <SelectItem value="telefone">Telefone</SelectItem>
                  <SelectItem value="aleatoria">Chave Aleatória</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Chave PIX</Label>
              <Input {...register('pixChave')} placeholder="Chave PIX para repasses" />
              {errors.pixChave && <p className="text-xs text-red-500">{errors.pixChave.message}</p>}
            </div>
            <div className="col-span-2 flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={mutacao.isPending}>
                {mutacao.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
