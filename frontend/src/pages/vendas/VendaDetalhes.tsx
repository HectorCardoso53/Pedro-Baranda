import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { vendasService, parcelasService, pagamentosService } from '@/services/api.service'
import PageHeader from '@/components/common/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import StatusBadge from '@/components/common/StatusBadge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/utils/format'
import { FileText, Download, DollarSign, Receipt, ChevronLeft } from 'lucide-react'

export default function VendaDetalhes() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [pagamentoOpen, setPagamentoOpen] = useState(false)
  const [parcelaSelecionada, setParcelaSelecionada] = useState<any>(null)
  const [formPag, setFormPag] = useState({
    dataPagamento: new Date().toISOString().split('T')[0],
    formaPagamento: 'pix',
    observacoes: '',
  })

  const { data: venda } = useQuery({ queryKey: ['venda', id], queryFn: () => vendasService.buscar(id!) })
  const { data: parcelas = [] } = useQuery({ queryKey: ['parcelas', id], queryFn: () => vendasService.parcelas(id!) })

  const gerarContrato = useMutation({
    mutationFn: () => vendasService.gerarContrato(id!),
    onSuccess: (data) => {
      toast.success('Contrato gerado!')
      if (data.url) window.open(data.url, '_blank')
    },
    onError: (err) => toast.error(err.message),
  })

  const gerarPromissoria = useMutation({
    mutationFn: (parcelaId: string) => parcelasService.gerarPromissoria(parcelaId),
    onSuccess: (data) => {
      toast.success('Promissória gerada!')
      if (data.url) window.open(data.url, '_blank')
      qc.invalidateQueries({ queryKey: ['parcelas', id] })
    },
    onError: (err) => toast.error(err.message),
  })

  const registrarPagamento = useMutation({
    mutationFn: () => pagamentosService.registrar({
      parcelaId: parcelaSelecionada.id,
      valor: parcelaSelecionada.valor,
      ...formPag,
    }),
    onSuccess: () => {
      toast.success('Pagamento registrado com sucesso!')
      qc.invalidateQueries({ queryKey: ['parcelas', id] })
      qc.invalidateQueries({ queryKey: ['venda', id] })
      setPagamentoOpen(false)
      setParcelaSelecionada(null)
    },
    onError: (err) => toast.error(err.message),
  })

  if (!venda) return <div className="p-6">Carregando...</div>

  const v = venda as any
  const pagas = (parcelas as any[]).filter((p) => p.status === 'paga').length
  const progresso = parcelas.length > 0 ? (pagas / parcelas.length) * 100 : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ChevronLeft size={18} /></Button>
        <PageHeader title={`Venda #${id?.substring(0, 8)}`} description="Detalhes da venda e parcelas">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => gerarContrato.mutate()} disabled={gerarContrato.isPending}>
              <FileText size={14} className="mr-1" />Contrato
            </Button>
          </div>
        </PageHeader>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Valor Total', value: formatCurrency(v.valor) },
          { label: 'Entrada', value: formatCurrency(v.entrada) },
          { label: 'Saldo', value: formatCurrency(v.saldo) },
          { label: 'Status', value: <StatusBadge status={v.status} type="venda" /> },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="pt-4">
              <p className="text-xs text-gray-500">{item.label}</p>
              <div className="font-semibold mt-1">{item.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progresso */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Progresso de quitação</span>
            <span className="font-medium">{pagas}/{parcelas.length} parcelas pagas</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${progresso}%` }} />
          </div>
        </CardContent>
      </Card>

      {/* Parcelas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Parcelas ({parcelas.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Nº</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(parcelas as any[]).map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.numero}</TableCell>
                  <TableCell>{formatDate(p.vencimento)}</TableCell>
                  <TableCell>{formatCurrency(p.valor)}</TableCell>
                  <TableCell><StatusBadge status={p.status} type="parcela" /></TableCell>
                  <TableCell>{p.pagamento ? formatDate(p.pagamento) : '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {(p.status === 'pendente' || p.status === 'vencida') && (
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => { setParcelaSelecionada(p); setPagamentoOpen(true) }}
                        >
                          <DollarSign size={13} className="mr-1" />Pagar
                        </Button>
                      )}
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => gerarPromissoria.mutate(p.id)}
                        disabled={gerarPromissoria.isPending}
                      >
                        <Receipt size={13} className="mr-1" />Promissória
                      </Button>
                      {p.promissoriaUrl && (
                        <Button variant="ghost" size="icon" onClick={() => window.open(p.promissoriaUrl, '_blank')}>
                          <Download size={13} />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Pagamento */}
      <Dialog open={pagamentoOpen} onOpenChange={setPagamentoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Pagamento — Parcela {parcelaSelecionada?.numero}</DialogTitle>
          </DialogHeader>
          {parcelaSelecionada && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500">Valor da parcela</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(parcelaSelecionada.valor)}</p>
                <p className="text-xs text-gray-400">Vence em {formatDate(parcelaSelecionada.vencimento)}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Data do pagamento</Label>
                  <Input type="date" value={formPag.dataPagamento} onChange={(e) => setFormPag({ ...formPag, dataPagamento: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Forma de pagamento</Label>
                  <Select defaultValue="pix" onValueChange={(v) => setFormPag({ ...formPag, formaPagamento: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="transferencia">Transferência</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Observações</Label>
                <Input value={formPag.observacoes} onChange={(e) => setFormPag({ ...formPag, observacoes: e.target.value })} placeholder="Opcional" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPagamentoOpen(false)}>Cancelar</Button>
                <Button onClick={() => registrarPagamento.mutate()} disabled={registrarPagamento.isPending} className="bg-green-600 hover:bg-green-700">
                  {registrarPagamento.isPending ? 'Registrando...' : 'Confirmar Pagamento'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
