import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { promissoriasService } from '@/services/api.service'
import PageHeader from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/utils/format'
import { Download, Trash2 } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import type { Promissoria } from '@/types'

const STATUS_COLOR: Record<string, string> = {
  ativa: 'bg-blue-100 text-blue-800',
  quitada: 'bg-green-100 text-green-800',
  vencida: 'bg-red-100 text-red-800',
  cancelada: 'bg-gray-100 text-gray-600',
}

export default function Promissorias() {
  const qc = useQueryClient()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data: promissorias = [], isLoading } = useQuery({
    queryKey: ['promissorias'],
    queryFn: () => promissoriasService.listar(),
  })

  const deleteMutacao = useMutation({
    mutationFn: (id: string) => promissoriasService.deletar(id),
    onSuccess: () => {
      toast.success('Promissória excluída!')
      qc.invalidateQueries({ queryKey: ['promissorias'] })
      setDeletingId(null)
    },
    onError: (err) => { toast.error(err.message); setDeletingId(null) },
  })

  const columns: ColumnDef<Promissoria>[] = [
    { accessorKey: 'numero', header: 'Nº Parcela' },
    { accessorKey: 'valor', header: 'Valor', cell: ({ row }) => formatCurrency(row.original.valor) },
    { accessorKey: 'vencimento', header: 'Vencimento', cell: ({ row }) => formatDate(row.original.vencimento) },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[row.original.status] || 'bg-gray-100 text-gray-600'}`}>
          {row.original.status}
        </span>
      ),
    },
    {
      id: 'acoes',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {row.original.pdfUrl && (
            <Button variant="ghost" size="icon" onClick={() => window.open(row.original.pdfUrl, '_blank')}>
              <Download size={14} />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setDeletingId(row.original.id)}>
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="Promissórias" description="Cédulas de crédito imobiliário geradas" />
      <DataTable data={promissorias} columns={columns} searchPlaceholder="Buscar promissória..." isLoading={isLoading} />

      <Dialog open={!!deletingId} onOpenChange={(v) => !v && setDeletingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Excluir promissória?</DialogTitle></DialogHeader>
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
