import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { vendasService, projetosService } from '@/services/api.service'
import PageHeader from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import StatusBadge from '@/components/common/StatusBadge'
import { formatCurrency, formatDate } from '@/utils/format'
import { toast } from 'sonner'
import { Plus, Eye, Trash2 } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import type { Venda } from '@/types'
import NovaVendaModal from './NovaVendaModal'

export default function Vendas() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroProjetoId, setFiltroProjetoId] = useState('')

  const { data: vendas = [], isLoading } = useQuery({
    queryKey: ['vendas', filtroStatus, filtroProjetoId],
    queryFn: () => vendasService.listar({
      ...(filtroStatus && { status: filtroStatus }),
      ...(filtroProjetoId && { projetoId: filtroProjetoId }),
    }),
  })

  const { data: projetos = [] } = useQuery({ queryKey: ['projetos'], queryFn: () => projetosService.listar() })

  const deleteMutacao = useMutation({
    mutationFn: (id: string) => vendasService.deletar(id),
    onSuccess: () => {
      toast.success('Venda excluída!')
      qc.invalidateQueries({ queryKey: ['vendas'] })
      setDeletingId(null)
    },
    onError: (err) => { toast.error(err.message); setDeletingId(null) },
  })

  const columns: ColumnDef<Venda>[] = [
    { accessorKey: 'dataVenda', header: 'Data', cell: ({ row }) => formatDate(row.original.dataVenda) },
    { id: 'cliente', header: 'Cliente', cell: ({ row }) => (row.original as any).cliente?.nome || '-' },
    { id: 'projeto', header: 'Projeto', cell: ({ row }) => (row.original as any).projeto?.nome || '-' },
    { id: 'lote', header: 'Lote', cell: ({ row }) => `Lote ${(row.original as any).lote?.numero || '-'}` },
    { accessorKey: 'valor', header: 'Valor', cell: ({ row }) => formatCurrency(row.original.valor) },
    { accessorKey: 'numeroParcelas', header: 'Parcelas', cell: ({ row }) => `${row.original.numeroParcelas}x de ${formatCurrency(row.original.valorParcela)}` },
    { id: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} type="venda" /> },
    {
      id: 'acoes',
      header: 'Ações',
      meta: { className: 'w-px whitespace-nowrap' },
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Link to={`/vendas/${row.original.id}`}>
            <Button variant="ghost" size="icon"><Eye size={14} /></Button>
          </Link>
          <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setDeletingId(row.original.id)}>
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="Vendas" description="Contratos de compra e venda">
        <Button onClick={() => setOpen(true)}><Plus size={16} className="mr-1" />Nova Venda</Button>
      </PageHeader>

      <div className="flex gap-3 mb-4">
        <Select value={filtroStatus || 'todos'} onValueChange={(v) => setFiltroStatus(v === 'todos' ? '' : v)}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ativa">Ativa</SelectItem>
            <SelectItem value="quitada">Quitada</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
            <SelectItem value="distratada">Distratada</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroProjetoId || 'todos'} onValueChange={(v) => setFiltroProjetoId(v === 'todos' ? '' : v)}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Projeto" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {projetos.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <DataTable data={vendas} columns={columns} searchPlaceholder="Buscar venda..." isLoading={isLoading} />

      <NovaVendaModal open={open} onClose={() => setOpen(false)} />

      <Dialog open={!!deletingId} onOpenChange={(v) => !v && setDeletingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Excluir venda?</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">Esta ação remove a venda permanentemente e libera o lote. As parcelas também serão excluídas.</p>
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
