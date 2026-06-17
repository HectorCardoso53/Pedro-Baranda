import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inadimplenciaService } from '@/services/api.service'
import PageHeader from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/utils/format'
import { AlertTriangle, RefreshCw, DollarSign, Users } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'

export default function Inadimplencia() {
  const qc = useQueryClient()
  const { data: parcelas = [], isLoading } = useQuery({
    queryKey: ['inadimplencia'],
    queryFn: () => inadimplenciaService.listar(),
  })

  const { data: resumo } = useQuery({
    queryKey: ['inadimplencia-resumo'],
    queryFn: () => inadimplenciaService.resumo(),
  })

  const processar = useMutation({
    mutationFn: inadimplenciaService.processar,
    onSuccess: (data) => {
      toast.success(`${data.processadas} parcelas processadas`)
      qc.invalidateQueries({ queryKey: ['inadimplencia'] })
      qc.invalidateQueries({ queryKey: ['inadimplencia-resumo'] })
    },
    onError: (err) => toast.error(err.message),
  })

  const columns: ColumnDef<any>[] = [
    { accessorKey: 'cliente.nome', header: 'Cliente', cell: ({ row }) => row.original.cliente?.nome || '-' },
    { accessorKey: 'numero', header: 'Parcela Nº' },
    { accessorKey: 'valor', header: 'Valor', cell: ({ row }) => formatCurrency(row.original.valor) },
    { accessorKey: 'vencimento', header: 'Venceu em', cell: ({ row }) => formatDate(row.original.vencimento) },
    {
      id: 'atraso',
      header: 'Dias em atraso',
      cell: ({ row }) => {
        const dias = Math.floor((Date.now() - new Date(row.original.vencimento).getTime()) / 86400000)
        return <span className="font-medium text-red-600">{dias} dias</span>
      },
    },
    { accessorKey: 'cliente.celular', header: 'Contato', cell: ({ row }) => row.original.cliente?.celular || '-' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Inadimplência" description="Parcelas vencidas e em atraso">
        <Button variant="outline" onClick={() => processar.mutate()} disabled={processar.isPending}>
          <RefreshCw size={14} className={`mr-1 ${processar.isPending ? 'animate-spin' : ''}`} />
          Processar
        </Button>
      </PageHeader>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg"><AlertTriangle className="text-red-600 w-5 h-5" /></div>
            <div>
              <p className="text-xs text-gray-500">Parcelas vencidas</p>
              <p className="text-2xl font-bold">{(resumo as any)?.totalParcelas || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-lg"><DollarSign className="text-orange-600 w-5 h-5" /></div>
            <div>
              <p className="text-xs text-gray-500">Valor total em atraso</p>
              <p className="text-2xl font-bold">{formatCurrency((resumo as any)?.valorTotal || 0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="p-2 bg-yellow-50 rounded-lg"><Users className="text-yellow-600 w-5 h-5" /></div>
            <div>
              <p className="text-xs text-gray-500">Projetos afetados</p>
              <p className="text-2xl font-bold">{(resumo as any)?.porProjeto?.length || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <DataTable data={parcelas} columns={columns} searchPlaceholder="Buscar cliente ou parcela..." isLoading={isLoading} />
    </div>
  )
}
