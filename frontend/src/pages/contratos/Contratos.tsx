import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contratosService } from '@/services/api.service'
import PageHeader from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { formatDate } from '@/utils/format'
import { Download, Trash2 } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'

export default function Contratos() {
  const qc = useQueryClient()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data: contratos = [], isLoading } = useQuery({
    queryKey: ['contratos'],
    queryFn: () => contratosService.listar(),
  })

  const deleteMutacao = useMutation({
    mutationFn: (id: string) => contratosService.deletar(id),
    onSuccess: () => {
      toast.success('Contrato excluído!')
      qc.invalidateQueries({ queryKey: ['contratos'] })
      setDeletingId(null)
    },
    onError: (err) => { toast.error(err.message); setDeletingId(null) },
  })

  const columns: ColumnDef<any>[] = [
    { id: 'vendaId', header: 'Venda ID', cell: ({ row }) => <span className="font-mono text-xs">{row.original.vendaId?.substring(0, 8)}</span> },
    { accessorKey: 'criadoEm', header: 'Gerado em', cell: ({ row }) => formatDate(row.original.criadoEm) },
    {
      id: 'acoes',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {row.original.url && (
            <Button variant="ghost" size="sm" onClick={() => window.open(row.original.url, '_blank')}>
              <Download size={14} className="mr-1" />Baixar
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
      <PageHeader title="Contratos" description="Contratos de compra e venda gerados">
        <p className="text-sm text-gray-500">Gere contratos a partir da página de Detalhes da Venda</p>
      </PageHeader>
      <DataTable data={contratos} columns={columns} searchPlaceholder="Buscar contrato..." isLoading={isLoading} />

      <Dialog open={!!deletingId} onOpenChange={(v) => !v && setDeletingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Excluir contrato?</DialogTitle></DialogHeader>
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
