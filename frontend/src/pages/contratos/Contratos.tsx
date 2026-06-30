import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { vendasService, contratosService } from '@/services/api.service'
import PageHeader from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import StatusBadge from '@/components/common/StatusBadge'
import { toast } from 'sonner'
import { formatDate } from '@/utils/format'
import { Download, Trash2, FileText, Loader2, CheckCircle, Clock, Upload, PenLine } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'

export default function Contratos() {
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [deletingContratoId, setDeletingContratoId] = useState<string | null>(null)
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null)

  const { data: vendas = [], isLoading: loadingVendas } = useQuery({
    queryKey: ['vendas'],
    queryFn: () => vendasService.listar(),
  })

  const { data: contratos = [], isLoading: loadingContratos } = useQuery({
    queryKey: ['contratos'],
    queryFn: () => contratosService.listar(),
  })

  const gerarMutacao = useMutation({
    mutationFn: (vendaId: string) => vendasService.gerarContrato(vendaId),
    onSuccess: (data: any) => {
      toast.success('Contrato gerado com sucesso!')
      qc.invalidateQueries({ queryKey: ['contratos'] })
      qc.invalidateQueries({ queryKey: ['vendas'] })
      if (data?.url) window.open(data.url, '_blank')
    },
    onError: (err: any) => toast.error(err.message),
  })

  const uploadMutacao = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      contratosService.uploadAssinado(id, file),
    onSuccess: () => {
      toast.success('Contrato assinado anexado!')
      qc.invalidateQueries({ queryKey: ['contratos'] })
      setUploadTargetId(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    onError: (err: any) => {
      toast.error(err.message)
      setUploadTargetId(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
  })

  const deletarMutacao = useMutation({
    mutationFn: (id: string) => contratosService.deletar(id),
    onSuccess: () => {
      toast.success('Contrato excluído!')
      qc.invalidateQueries({ queryKey: ['contratos'] })
      setDeletingContratoId(null)
    },
    onError: (err: any) => { toast.error(err.message); setDeletingContratoId(null) },
  })

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !uploadTargetId) return
    uploadMutacao.mutate({ id: uploadTargetId, file })
  }

  function triggerUpload(contratoId: string) {
    setUploadTargetId(contratoId)
    fileInputRef.current?.click()
  }

  const contratoMap = new Map<string, any>()
  for (const c of contratos as any[]) contratoMap.set(c.vendaId, c)

  const vendasAtivas = (vendas as any[]).filter(
    (v) => v.status !== 'cancelada' && v.status !== 'distratada'
  )

  const columns: ColumnDef<any>[] = [
    {
      id: 'cliente',
      header: 'Cliente',
      cell: ({ row }) => {
        const v = row.original
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
        const v = row.original
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
      meta: { className: 'w-px whitespace-nowrap' },
      cell: ({ row }) => formatDate(row.original.dataVenda),
    },
    {
      id: 'statusVenda',
      header: 'Status',
      meta: { className: 'w-px whitespace-nowrap' },
      cell: ({ row }) => <StatusBadge status={row.original.status} type="venda" />,
    },
    {
      id: 'contrato',
      header: 'Contrato',
      meta: { className: 'w-px whitespace-nowrap' },
      cell: ({ row }) => {
        const contrato = contratoMap.get(row.original.id)
        if (!contrato) {
          return (
            <span className="inline-flex items-center gap-1 text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full text-xs">
              <Clock size={11} /> Pendente
            </span>
          )
        }
        return (
          <div className="flex flex-col gap-1">
            <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 px-2 py-0.5 rounded-full text-xs font-medium">
              <CheckCircle size={11} /> Gerado em {formatDate(contrato.criadoEm)}
            </span>
            {contrato.urlAssinado ? (
              <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full text-xs font-medium">
                <PenLine size={11} /> Assinado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full text-xs">
                <Clock size={11} /> Aguardando assinatura
              </span>
            )}
          </div>
        )
      },
    },
    {
      id: 'acoes',
      header: 'Ações',
      meta: { className: 'w-px whitespace-nowrap' },
      cell: ({ row }) => {
        const vendaId = row.original.id
        const contrato = contratoMap.get(vendaId)
        const isGenerating = gerarMutacao.isPending && gerarMutacao.variables === vendaId
        const isUploading = uploadMutacao.isPending && uploadTargetId === contrato?.id

        if (contrato) {
          return (
            <div className="flex items-center gap-1 flex-wrap">
              {contrato.url && (
                <Button variant="outline" size="sm" onClick={() => window.open(contrato.url, '_blank')} title="Baixar contrato gerado">
                  <Download size={13} className="mr-1" /> Baixar
                </Button>
              )}
              {contrato.urlAssinado ? (
                <Button
                  variant="outline" size="sm"
                  className="border-blue-200 text-blue-700 hover:bg-blue-50"
                  onClick={() => window.open(contrato.urlAssinado, '_blank')}
                  title="Baixar contrato assinado"
                >
                  <Download size={13} className="mr-1" /> Assinado
                </Button>
              ) : (
                <Button
                  variant="outline" size="sm"
                  className="border-amber-200 text-amber-700 hover:bg-amber-50"
                  onClick={() => triggerUpload(contrato.id)}
                  disabled={isUploading}
                  title="Anexar contrato assinado"
                >
                  {isUploading
                    ? <><Loader2 size={13} className="mr-1 animate-spin" />Enviando...</>
                    : <><Upload size={13} className="mr-1" />Anexar Assinado</>
                  }
                </Button>
              )}
              {contrato.urlAssinado && (
                <Button
                  variant="outline" size="sm"
                  className="border-amber-200 text-amber-700 hover:bg-amber-50"
                  onClick={() => triggerUpload(contrato.id)}
                  disabled={isUploading}
                  title="Substituir contrato assinado"
                >
                  {isUploading
                    ? <><Loader2 size={13} className="mr-1 animate-spin" />Enviando...</>
                    : <><Upload size={13} className="mr-1" />Substituir</>
                  }
                </Button>
              )}
              <Button
                variant="ghost" size="icon"
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={() => setDeletingContratoId(contrato.id)}
                title="Excluir contrato"
              >
                <Trash2 size={14} />
              </Button>
            </div>
          )
        }

        return (
          <Button
            variant="outline" size="sm"
            onClick={() => gerarMutacao.mutate(vendaId)}
            disabled={gerarMutacao.isPending}
          >
            {isGenerating
              ? <><Loader2 size={13} className="mr-1 animate-spin" />Gerando...</>
              : <><FileText size={13} className="mr-1" />Gerar Contrato</>
            }
          </Button>
        )
      },
    },
  ]

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={handleFileChange}
      />

      <PageHeader
        title="Contratos"
        description="Gerencie os contratos de compra e venda — gere, baixe e anexe assinados"
      />
      <DataTable
        data={vendasAtivas}
        columns={columns}
        searchPlaceholder="Buscar por cliente, lote ou projeto..."
        isLoading={loadingVendas || loadingContratos}
      />

      <Dialog open={!!deletingContratoId} onOpenChange={(v) => !v && setDeletingContratoId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Excluir contrato?</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">O contrato será removido permanentemente. Esta ação não pode ser desfeita.</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeletingContratoId(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => deletarMutacao.mutate(deletingContratoId!)}
              disabled={deletarMutacao.isPending}
            >
              {deletarMutacao.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
