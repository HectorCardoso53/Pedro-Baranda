import { useMutation, useQuery } from '@tanstack/react-query'
import { vendasService } from '@/services/api.service'
import PageHeader from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { Button } from '@/components/ui/button'
import StatusBadge from '@/components/common/StatusBadge'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/utils/format'
import { FileText, Loader2 } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import type { Venda } from '@/types'

export default function Promissorias() {
  const { data: vendas = [], isLoading } = useQuery({
    queryKey: ['vendas'],
    queryFn: () => vendasService.listar(),
  })

  const gerarMutation = useMutation({
    mutationFn: (vendaId: string) => vendasService.gerarPromissorias(vendaId),
    onSuccess: (data: any) => {
      toast.success('Promissórias geradas!')
      if (data?.url) window.open(data.url, '_blank')
    },
    onError: (err: any) => toast.error(err.message),
  })

  const columns: ColumnDef<Venda>[] = [
    {
      id: 'cliente',
      header: 'Cliente',
      cell: ({ row }) => {
        const v = row.original as any
        return (
          <div>
            <p className="font-medium text-sm">{v.cliente?.nome || '-'}</p>
            <p className="text-xs text-gray-400">{v.cliente?.cpfCnpj || ''}</p>
          </div>
        )
      },
    },
    {
      id: 'lote',
      header: 'Lote / Projeto',
      cell: ({ row }) => {
        const v = row.original as any
        return (
          <div>
            <p className="text-sm">Lote {v.lote?.numero || '-'}</p>
            <p className="text-xs text-gray-400">{v.projeto?.nome || ''}</p>
          </div>
        )
      },
    },
    {
      accessorKey: 'dataVenda',
      header: 'Data da Venda',
      cell: ({ row }) => formatDate(row.original.dataVenda),
      meta: { className: 'w-px whitespace-nowrap' },
    },
    {
      id: 'parcelas',
      header: 'Parcelas',
      meta: { className: 'w-px whitespace-nowrap' },
      cell: ({ row }) => (
        <span className="text-sm">
          <strong>{row.original.numeroParcelas}x</strong> {formatCurrency(row.original.valorParcela)}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      meta: { className: 'w-px whitespace-nowrap' },
      cell: ({ row }) => <StatusBadge status={row.original.status} type="venda" />,
    },
    {
      id: 'acoes',
      header: 'Ações',
      meta: { className: 'w-px whitespace-nowrap' },
      cell: ({ row }) => {
        const vendaId = row.original.id
        const isPending = gerarMutation.isPending && gerarMutation.variables === vendaId
        return (
          <Button
            variant="outline" size="sm"
            onClick={() => gerarMutation.mutate(vendaId)}
            disabled={gerarMutation.isPending}
          >
            {isPending
              ? <><Loader2 size={13} className="mr-1 animate-spin" />Gerando...</>
              : <><FileText size={13} className="mr-1" />Gerar Promissórias</>
            }
          </Button>
        )
      },
    },
  ]

  return (
    <div>
      <PageHeader
        title="Promissórias"
        description="Gera o bloco completo de promissórias por venda — 4 por folha A4 com QR code PIX"
      />
      <DataTable
        data={vendas}
        columns={columns}
        searchPlaceholder="Buscar por cliente, lote ou projeto..."
        isLoading={isLoading}
      />
    </div>
  )
}
