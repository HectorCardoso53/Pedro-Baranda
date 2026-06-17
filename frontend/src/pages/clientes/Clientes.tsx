import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { clientesService } from '@/services/api.service'
import PageHeader from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { formatCPF, formatPhone } from '@/utils/format'
import type { ColumnDef } from '@tanstack/react-table'
import type { Cliente } from '@/types'

export default function Clientes() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Cliente | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState({ nome: '', cpfCnpj: '', rg: '', email: '', telefone: '', celular: '', estadoCivil: '', profissao: '', endereco: { cep: '', logradouro: '', numero: '', bairro: '', cidade: '', estado: '' } })

  const { data: clientes = [], isLoading } = useQuery({ queryKey: ['clientes'], queryFn: () => clientesService.listar() })

  const mutacao = useMutation({
    mutationFn: () => editing ? clientesService.atualizar(editing.id, form as any) : clientesService.criar(form as any),
    onSuccess: () => {
      toast.success(editing ? 'Cliente atualizado!' : 'Cliente criado!')
      qc.invalidateQueries({ queryKey: ['clientes'] })
      setOpen(false)
    },
    onError: (err) => toast.error(err.message),
  })

  const deleteMutacao = useMutation({
    mutationFn: (id: string) => clientesService.deletar(id),
    onSuccess: () => {
      toast.success('Cliente excluído!')
      qc.invalidateQueries({ queryKey: ['clientes'] })
      setDeletingId(null)
    },
    onError: (err) => { toast.error(err.message); setDeletingId(null) },
  })

  function handleEdit(c: Cliente) {
    setEditing(c)
    setForm({
      nome: c.nome, cpfCnpj: c.cpfCnpj, rg: c.rg || '', email: c.email,
      telefone: c.telefone, celular: c.celular, estadoCivil: c.estadoCivil, profissao: c.profissao,
      endereco: c.endereco || { cep: '', logradouro: '', numero: '', bairro: '', cidade: '', estado: '' },
    })
    setOpen(true)
  }

  const columns: ColumnDef<Cliente>[] = [
    { accessorKey: 'nome', header: 'Nome' },
    { accessorKey: 'cpfCnpj', header: 'CPF/CNPJ', cell: ({ row }) => formatCPF(row.original.cpfCnpj) },
    { accessorKey: 'celular', header: 'Celular', cell: ({ row }) => formatPhone(row.original.celular) },
    { accessorKey: 'email', header: 'E-mail' },
    { accessorKey: 'estadoCivil', header: 'Est. Civil' },
    { id: 'ativo', header: 'Status', cell: ({ row }) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${row.original.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
        {row.original.ativo ? 'Ativo' : 'Inativo'}
      </span>
    )},
    { id: 'acoes', header: '', cell: ({ row }) => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)}><Pencil size={14} /></Button>
        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setDeletingId(row.original.id)}><Trash2 size={14} /></Button>
      </div>
    )},
  ]

  return (
    <div>
      <PageHeader title="Clientes" description="Cadastro de compradores">
        <Button onClick={() => { setEditing(null); setOpen(true) }}><Plus size={16} className="mr-1" />Novo Cliente</Button>
      </PageHeader>
      <DataTable data={clientes} columns={columns} searchPlaceholder="Buscar cliente..." isLoading={isLoading} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Nome completo *', key: 'nome', placeholder: 'Nome completo', col: 2 },
              { label: 'CPF/CNPJ *', key: 'cpfCnpj', placeholder: '000.000.000-00' },
              { label: 'RG', key: 'rg', placeholder: 'RG' },
              { label: 'E-mail *', key: 'email', placeholder: 'email@exemplo.com', col: 2 },
              { label: 'Telefone', key: 'telefone', placeholder: '(00) 0000-0000' },
              { label: 'Celular *', key: 'celular', placeholder: '(00) 90000-0000' },
              { label: 'Profissão', key: 'profissao', placeholder: 'Profissão' },
            ].map((f) => (
              <div key={f.key} className={`${f.col === 2 ? 'col-span-2' : ''} space-y-1`}>
                <Label>{f.label}</Label>
                <Input placeholder={f.placeholder} value={(form as any)[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
              </div>
            ))}
            <div className="space-y-1">
              <Label>Estado Civil</Label>
              <Select value={form.estadoCivil} onValueChange={(v) => setForm({ ...form, estadoCivil: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União Estável'].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>CEP</Label>
              <Input placeholder="00000-000" value={form.endereco.cep} onChange={(e) => setForm({ ...form, endereco: { ...form.endereco, cep: e.target.value } })} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Logradouro</Label>
              <Input placeholder="Rua, Av..." value={form.endereco.logradouro} onChange={(e) => setForm({ ...form, endereco: { ...form.endereco, logradouro: e.target.value } })} />
            </div>
            <div className="space-y-1">
              <Label>Número</Label>
              <Input value={form.endereco.numero} onChange={(e) => setForm({ ...form, endereco: { ...form.endereco, numero: e.target.value } })} />
            </div>
            <div className="space-y-1">
              <Label>Bairro</Label>
              <Input value={form.endereco.bairro} onChange={(e) => setForm({ ...form, endereco: { ...form.endereco, bairro: e.target.value } })} />
            </div>
            <div className="space-y-1">
              <Label>Cidade</Label>
              <Input value={form.endereco.cidade} onChange={(e) => setForm({ ...form, endereco: { ...form.endereco, cidade: e.target.value } })} />
            </div>
            <div className="space-y-1">
              <Label>Estado</Label>
              <Input maxLength={2} placeholder="UF" value={form.endereco.estado} onChange={(e) => setForm({ ...form, endereco: { ...form.endereco, estado: e.target.value.toUpperCase() } })} />
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

      <Dialog open={!!deletingId} onOpenChange={(v) => !v && setDeletingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Excluir cliente?</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">Esta ação não pode ser desfeita.</p>
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
