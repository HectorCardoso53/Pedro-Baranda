import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { vendasService, projetosService } from '@/services/api.service'
import PageHeader from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import StatusBadge from '@/components/common/StatusBadge'
import { formatCurrency, formatDate, parseCurrencyValue } from '@/utils/format'
import { toast } from 'sonner'
import { Plus, Eye, Trash2, Pencil } from 'lucide-react'
import { CurrencyInput } from '@/components/ui/currency-input'
import type { ColumnDef } from '@tanstack/react-table'
import type { Venda } from '@/types'
import NovaVendaModal from './NovaVendaModal'

export default function Vendas() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingVenda, setEditingVenda] = useState<any | null>(null)
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroProjetoId, setFiltroProjetoId] = useState('')

  const [editTipo, setEditTipo] = useState('')
  const [editObservacoes, setEditObservacoes] = useState('')
  const [editValor, setEditValor] = useState('')
  const [editEntrada, setEditEntrada] = useState('')
  const [editNumeroParcelas, setEditNumeroParcelas] = useState(12)
  const [editDiaVencimento, setEditDiaVencimento] = useState(10)
  const [editFormaEntrada, setEditFormaEntrada] = useState('pix')

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
    onError: (err: any) => { toast.error(err.message); setDeletingId(null) },
  })

  const atualizarMutacao = useMutation({
    mutationFn: (payload: any) => vendasService.atualizar(editingVenda!.id, payload),
    onSuccess: () => {
      toast.success('Venda atualizada!')
      qc.invalidateQueries({ queryKey: ['vendas'] })
      fecharEdicao()
    },
    onError: (err: any) => toast.error(err.message),
  })

  function abrirEdicao(venda: any) {
    setEditingVenda(venda)
    setEditTipo(venda.tipo || 'normal')
    setEditObservacoes(venda.observacoes || '')
    setEditValor('')
    setEditEntrada('')
    setEditNumeroParcelas(12)
    setEditDiaVencimento(10)
    setEditFormaEntrada('pix')
  }

  function fecharEdicao() {
    setEditingVenda(null)
    setEditTipo('')
    setEditObservacoes('')
    setEditValor('')
    setEditEntrada('')
    setEditNumeroParcelas(12)
    setEditDiaVencimento(10)
    setEditFormaEntrada('pix')
  }

  const convertendoParaNormal = editingVenda?.tipo === 'reservado' && editTipo === 'normal'
  const editValorNum = parseCurrencyValue(editValor)
  const editEntradaNum = parseCurrencyValue(editEntrada)
  const editSaldo = Math.max(0, editValorNum - editEntradaNum)
  const editValorParcela = editNumeroParcelas > 0 ? editSaldo / editNumeroParcelas : 0

  function salvarEdicao() {
    if (!editingVenda) return
    const payload: any = { tipo: editTipo, observacoes: editObservacoes }
    if (convertendoParaNormal && editValorNum > 0) {
      payload.valor = editValorNum
      payload.entrada = editEntradaNum
      payload.numeroParcelas = editNumeroParcelas
      payload.diaVencimento = editDiaVencimento
      payload.formaEntrada = editFormaEntrada
    }
    atualizarMutacao.mutate(payload)
  }

  const columns: ColumnDef<Venda>[] = [
    { accessorKey: 'dataVenda', header: 'Data', cell: ({ row }) => formatDate(row.original.dataVenda) },
    { id: 'cliente', header: 'Cliente', cell: ({ row }) => (row.original as any).cliente?.nome || '-' },
    { id: 'projeto', header: 'Projeto', cell: ({ row }) => (row.original as any).projeto?.nome || '-' },
    { id: 'lote', header: 'Lote', cell: ({ row }) => `Lote ${(row.original as any).lote?.numero || '-'}` },
    {
      id: 'tipo',
      header: 'Tipo',
      cell: ({ row }) => {
        const t = (row.original as any).tipo
        return t === 'reservado'
          ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Reservado</span>
          : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Normal</span>
      },
    },
    { accessorKey: 'valor', header: 'Valor', cell: ({ row }) => (row.original as any).tipo === 'reservado' ? <span className="text-gray-400 text-xs">—</span> : formatCurrency(row.original.valor) },
    { accessorKey: 'numeroParcelas', header: 'Parcelas', cell: ({ row }) => (row.original as any).tipo === 'reservado' ? <span className="text-gray-400 text-xs">—</span> : `${row.original.numeroParcelas}x de ${formatCurrency(row.original.valorParcela)}` },
    { id: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} type="venda" /> },
    {
      id: 'acoes',
      header: 'Ações',
      meta: { className: 'w-px whitespace-nowrap' },
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Link to={`/vendas/${row.original.id}`}>
            <Button variant="ghost" size="icon" title="Ver detalhes"><Eye size={14} /></Button>
          </Link>
          <Button variant="ghost" size="icon" title="Editar" onClick={() => abrirEdicao(row.original)}>
            <Pencil size={14} />
          </Button>
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

      {/* Modal editar venda */}
      <Dialog open={!!editingVenda} onOpenChange={(v) => !v && fecharEdicao()}>
        <DialogContent className={convertendoParaNormal ? 'max-w-lg' : 'max-w-sm'}>
          <DialogHeader>
            <DialogTitle>Editar Venda</DialogTitle>
            <p className="text-sm text-gray-500">{editingVenda?.cliente?.nome} — Lote {editingVenda?.lote?.numero}</p>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Tipo de venda</Label>
              <Select value={editTipo} onValueChange={setEditTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="reservado">Reservado (pré-sistema)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Campos financeiros — só aparecem ao converter Reservado → Normal */}
            {convertendoParaNormal && (
              <div className="grid grid-cols-2 gap-3 border-t pt-3">
                <p className="col-span-2 text-xs text-gray-500">Preencha os dados financeiros da venda:</p>

                <div className="space-y-1">
                  <Label>Valor total *</Label>
                  <CurrencyInput value={editValor} onChange={setEditValor} placeholder="50.000,00" />
                </div>

                <div className="space-y-1">
                  <Label>Entrada</Label>
                  <CurrencyInput value={editEntrada} onChange={setEditEntrada} placeholder="0,00" />
                </div>

                <div className="space-y-1">
                  <Label>Nº de parcelas *</Label>
                  <Input type="number" value={editNumeroParcelas} onChange={(e) => setEditNumeroParcelas(Number(e.target.value))} min="1" max="240" />
                </div>

                <div className="space-y-1">
                  <Label>Dia de vencimento *</Label>
                  <Input type="number" value={editDiaVencimento} onChange={(e) => setEditDiaVencimento(Number(e.target.value))} min="1" max="28" />
                </div>

                <div className="col-span-2 space-y-1">
                  <Label>Forma de pagamento da entrada</Label>
                  <Select value={editFormaEntrada} onValueChange={setEditFormaEntrada}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="transferencia">Transferência</SelectItem>
                      <SelectItem value="debito">Débito</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {editValorNum > 0 && (
                  <div className="col-span-2 bg-blue-50 rounded-lg p-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-xs text-gray-500">Saldo</p>
                        <p className="font-bold text-sm">{formatCurrency(editSaldo)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Parcelas</p>
                        <p className="font-bold text-sm">{editNumeroParcelas}x</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Por parcela</p>
                        <p className="font-bold text-sm text-green-700">{formatCurrency(editValorParcela)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1">
              <Label>Observações</Label>
              <Input value={editObservacoes} onChange={(e) => setEditObservacoes(e.target.value)} placeholder="Observações sobre a venda" />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={fecharEdicao}>Cancelar</Button>
            <Button onClick={salvarEdicao} disabled={atualizarMutacao.isPending}>
              {atualizarMutacao.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal confirmar exclusão */}
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
