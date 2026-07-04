import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { vendasService, pagamentosService, clientesService } from '@/services/api.service'
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
import { formatCurrency, formatDate, formatPhone, formatCPF, formatArea, statusEfetivoParcela } from '@/utils/format'
import { DollarSign, ChevronLeft, MessageCircle, Loader2, Receipt, RotateCcw, Pencil } from 'lucide-react'

export default function VendaDetalhes() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [pagamentoOpen, setPagamentoOpen] = useState(false)
  const [parcelaSelecionada, setParcelaSelecionada] = useState<any>(null)
  const [estornarId, setEstornarId] = useState<string | null>(null)
  const [editarDataPag, setEditarDataPag] = useState<{ id: string; data: string } | null>(null)
  const [editClienteOpen, setEditClienteOpen] = useState(false)
  const [editVendaOpen, setEditVendaOpen] = useState(false)
  const [formCliente, setFormCliente] = useState<any>({})
  const [formVenda, setFormVenda] = useState<any>({})
  const [formPag, setFormPag] = useState({
    dataPagamento: new Date().toISOString().split('T')[0],
    formaPagamento: 'pix',
    observacoes: '',
  })

  const { data: venda } = useQuery({ queryKey: ['venda', id], queryFn: () => vendasService.buscar(id!) })
  const { data: parcelas = [] } = useQuery({ queryKey: ['parcelas', id], queryFn: () => vendasService.parcelas(id!) })
  const { data: pagamentos = [] } = useQuery({ queryKey: ['pagamentos-venda', id], queryFn: () => pagamentosService.listar({ vendaId: id }) })

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
      qc.invalidateQueries({ queryKey: ['pagamentos-venda', id] })
      setPagamentoOpen(false)
      setParcelaSelecionada(null)
    },
    onError: (err: any) => toast.error(err.message),
  })

  const estornarPagamento = useMutation({
    mutationFn: (pagId: string) => pagamentosService.estornar(pagId),
    onSuccess: () => {
      toast.success('Pagamento estornado!')
      qc.invalidateQueries({ queryKey: ['parcelas', id] })
      qc.invalidateQueries({ queryKey: ['venda', id] })
      qc.invalidateQueries({ queryKey: ['pagamentos-venda', id] })
      setEstornarId(null)
    },
    onError: (err: any) => { toast.error(err.message); setEstornarId(null) },
  })

  const editarCliente = useMutation({
    mutationFn: () => clientesService.atualizar((venda as any)?.clienteId, formCliente),
    onSuccess: () => {
      toast.success('Cliente atualizado!')
      qc.invalidateQueries({ queryKey: ['venda', id] })
      setEditClienteOpen(false)
    },
    onError: (err: any) => toast.error(err.message),
  })

  const editarVenda = useMutation({
    mutationFn: () => vendasService.atualizar(id!, formVenda),
    onSuccess: () => {
      toast.success('Venda atualizada!')
      qc.invalidateQueries({ queryKey: ['venda', id] })
      setEditVendaOpen(false)
    },
    onError: (err: any) => toast.error(err.message),
  })

  const atualizarData = useMutation({
    mutationFn: ({ id, data }: { id: string; data: string }) => pagamentosService.atualizarData(id, data),
    onSuccess: () => {
      toast.success('Data atualizada!')
      qc.invalidateQueries({ queryKey: ['parcelas', id] })
      qc.invalidateQueries({ queryKey: ['pagamentos-venda', id] })
      setEditarDataPag(null)
    },
    onError: (err: any) => toast.error(err.message),
  })

  const gerarRecibo = useMutation({
    mutationFn: (pagId: string) => pagamentosService.gerarRecibo(pagId),
    onSuccess: (data: any) => { if (data?.url) window.open(data.url, '_blank') },
    onError: (err: any) => toast.error(err.message),
  })

  const gerarReciboVenda = useMutation({
    mutationFn: () => vendasService.gerarReciboVenda(id!),
    onSuccess: (data: any) => { if (data?.url) window.open(data.url, '_blank') },
    onError: (err: any) => toast.error(err.message),
  })

  if (!venda) return <div className="p-6">Carregando...</div>

  const v = venda as any
  const pagas = (parcelas as any[]).filter((p) => p.status === 'paga').length
  const progresso = parcelas.length > 0 ? (pagas / parcelas.length) * 100 : 0
  const saldoDevedor = (parcelas as any[])
    .filter((p) => p.status === 'pendente' || p.status === 'vencida')
    .reduce((acc, p) => acc + p.valor, 0)

  // mapa parcelaId → pagamento
  const pagMap = new Map<string, any>()
  for (const pag of pagamentos as any[]) pagMap.set(pag.parcelaId, pag)

  const FORMA_LABEL: Record<string, string> = {
    pix: 'PIX', transferencia: 'Transferência', dinheiro: 'Dinheiro', cheque: 'Cheque', debito: 'Débito',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ChevronLeft size={18} /></Button>
        <PageHeader
          title={v.cliente?.nome || `Venda #${id?.substring(0, 8)}`}
          description={`Lote ${v.lote?.numero || '-'} — ${v.projeto?.nome || ''}`}
        />
        <div className="ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => gerarReciboVenda.mutate()}
            disabled={gerarReciboVenda.isPending}
            className="gap-2"
          >
            {gerarReciboVenda.isPending ? <Loader2 size={14} className="animate-spin" /> : <Receipt size={14} />}
            Recibo de Compra e Venda
          </Button>
        </div>
      </div>

      {/* Cards de detalhes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Cliente */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Cliente</CardTitle>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700" onClick={() => {
                setFormCliente({ nome: v.cliente?.nome || '', cpfCnpj: v.cliente?.cpfCnpj || '', rg: v.cliente?.rg || '', estadoCivil: v.cliente?.estadoCivil || '', profissao: v.cliente?.profissao || '', telefone: v.cliente?.telefone || '', celular: v.cliente?.celular || '', email: v.cliente?.email || '' })
                setEditClienteOpen(true)
              }}><Pencil size={13} /></Button>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4 space-y-3">
            <div>
              <p className="text-xs text-gray-400">Nome completo</p>
              <p className="font-bold text-gray-900 text-base">{v.cliente?.nome || '-'}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-400">CPF / CNPJ</p>
                <p className="text-sm font-medium">{formatCPF(v.cliente?.cpfCnpj)}</p>
              </div>
              {v.cliente?.rg && (
                <div>
                  <p className="text-xs text-gray-400">RG</p>
                  <p className="text-sm font-medium">{v.cliente.rg}</p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {v.cliente?.estadoCivil && (
                <div>
                  <p className="text-xs text-gray-400">Estado Civil</p>
                  <p className="text-sm">{v.cliente.estadoCivil}</p>
                </div>
              )}
              {v.cliente?.profissao && (
                <div>
                  <p className="text-xs text-gray-400">Profissão</p>
                  <p className="text-sm">{v.cliente.profissao}</p>
                </div>
              )}
            </div>
            {(v.cliente?.celular || v.cliente?.telefone) && (
              <div>
                <p className="text-xs text-gray-400">Telefone / Celular</p>
                <p className="text-sm">📱 {formatPhone(v.cliente.celular || v.cliente.telefone)}</p>
              </div>
            )}
            {v.cliente?.email && (
              <div>
                <p className="text-xs text-gray-400">E-mail</p>
                <p className="text-sm">{v.cliente.email}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Imóvel */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Imóvel</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4 space-y-3">
            {/* Linha 1: Lote | Quadra | Rua */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-gray-400">Lote</p>
                <p className="font-bold text-gray-900 text-base">Lote {v.lote?.numero || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Quadra</p>
                <p className="text-sm font-medium">{v.lote?.quadra?.nome || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Rua</p>
                <p className="text-sm font-medium">{v.lote?.localizacao || v.lote?.quadra?.localizacao || '-'}</p>
              </div>
            </div>
            {/* Linha 2: Empreendimento | Área | Dimensões */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-gray-400">Empreendimento</p>
                <p className="text-sm font-semibold text-gray-800">{v.projeto?.nome || '-'}</p>
              </div>
              {v.lote?.area && (
                <div>
                  <p className="text-xs text-gray-400">Área</p>
                  <p className="text-sm">{formatArea(v.lote.area)}</p>
                </div>
              )}
              {v.lote?.dimensao && (
                <div>
                  <p className="text-xs text-gray-400">Dimensões</p>
                  <p className="text-sm font-mono">{v.lote.dimensao}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Venda */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Dados da Venda</CardTitle>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700" onClick={() => {
                setFormVenda({ observacoes: v.observacoes || '', dataVenda: v.dataVenda?.split('T')[0] || '', diaVencimento: v.diaVencimento || '' })
                setEditVendaOpen(true)
              }}><Pencil size={13} /></Button>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-400">Data da venda</p>
                <p className="text-sm font-medium">{formatDate(v.dataVenda)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Status</p>
                <StatusBadge status={v.status} type="venda" />
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400">Valor total</p>
              <p className="text-base font-bold text-gray-900">{formatCurrency(v.valor)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-400">Entrada</p>
                <p className="text-sm font-semibold text-green-700">{formatCurrency(v.entrada)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Saldo devedor</p>
                <p className="text-sm font-semibold text-blue-700">{formatCurrency(saldoDevedor)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-400">Parcelas</p>
                <p className="text-sm font-medium">{v.numeroParcelas}x {formatCurrency(v.valorParcela)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Vencimento</p>
                <p className="text-sm">Todo dia {v.diaVencimento}</p>
              </div>
            </div>
            {v.observacoes && (
              <div>
                <p className="text-xs text-gray-400">Observações</p>
                <p className="text-sm text-gray-600 italic">{v.observacoes}</p>
              </div>
            )}
          </CardContent>
        </Card>

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
              {v.entrada > 0 && (
                <TableRow className="bg-green-50/60">
                  <TableCell className="font-medium text-green-700">Entrada</TableCell>
                  <TableCell>{formatDate(v.dataVenda)}</TableCell>
                  <TableCell className="font-semibold text-green-700">{formatCurrency(v.entrada)}</TableCell>
                  <TableCell><StatusBadge status="paga" type="parcela" /></TableCell>
                  <TableCell>{formatDate(v.dataVenda)}</TableCell>
                  <TableCell>
                    <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-xs font-medium">
                      {FORMA_LABEL[v.formaEntrada] || v.formaEntrada || '—'}
                    </span>
                  </TableCell>
                </TableRow>
              )}
              {(parcelas as any[]).map((p) => {
                const pag = pagMap.get(p.id)
                const isPaga = p.status === 'paga'
                return (
                  <TableRow key={p.id} className={isPaga ? 'bg-green-50/40' : ''}>
                    <TableCell className="font-medium">{p.numero}</TableCell>
                    <TableCell>{formatDate(p.vencimento)}</TableCell>
                    <TableCell>{formatCurrency(p.valor)}</TableCell>
                    <TableCell><StatusBadge status={statusEfetivoParcela(p)} type="parcela" /></TableCell>
                    <TableCell>{p.pagamento ? formatDate(p.pagamento) : '-'}</TableCell>
                    <TableCell>
                      {isPaga && pag ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-medium">
                              {FORMA_LABEL[pag.formaPagamento] || pag.formaPagamento || '—'}
                            </span>
                            {(pag.juros > 0 || pag.multa > 0) && (
                              <span className="text-red-500">Juros/Multa: {formatCurrency((pag.juros || 0) + (pag.multa || 0))}</span>
                            )}
                            <span className="text-green-700 font-semibold">{formatCurrency(pag.valor)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost" size="sm"
                              className="h-6 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2"
                              onClick={() => gerarRecibo.mutate(pag.id)}
                              disabled={gerarRecibo.isPending && gerarRecibo.variables === pag.id}
                            >
                              {gerarRecibo.isPending && gerarRecibo.variables === pag.id
                                ? <Loader2 size={11} className="animate-spin mr-1" />
                                : <Receipt size={11} className="mr-1" />
                              }
                              Recibo
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              className="h-6 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 px-2"
                              onClick={() => setEditarDataPag({ id: pag.id, data: pag.dataPagamento })}
                              title="Editar data de pagamento"
                            >
                              <Pencil size={11} className="mr-1" />Editar data
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              className="h-6 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2"
                              onClick={() => setEstornarId(pag.id)}
                            >
                              <RotateCcw size={11} className="mr-1" />Estornar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          {(p.status === 'pendente' || p.status === 'vencida') && (
                            <Button variant="ghost" size="sm" onClick={() => { setParcelaSelecionada(p); setPagamentoOpen(true) }}>
                              <DollarSign size={13} className="mr-1" />Pagar
                            </Button>
                          )}
                          {(p.status === 'pendente' || p.status === 'vencida') && (v.cliente?.celular || v.cliente?.telefone) && (() => {
                            const fone = (v.cliente.celular || v.cliente.telefone).replace(/\D/g, '')
                            const telFull = fone.startsWith('55') ? fone : `55${fone}`
                            const stEfetivo = statusEfetivoParcela(p)
                            const msg = stEfetivo === 'vencida'
                              ? `Olá ${v.cliente.nome}, identificamos que sua ${p.numero}ª parcela do Lote ${v.lote?.numero} venceu em ${formatDate(p.vencimento)} no valor de ${formatCurrency(p.valor)}. Por favor regularize o pagamento o quanto antes para evitar multa e juros. Qualquer dúvida, estamos à disposição.`
                              : `Olá ${v.cliente.nome}, sua ${p.numero}ª parcela do Lote ${v.lote?.numero} vence em ${formatDate(p.vencimento)} no valor de ${formatCurrency(p.valor)}. Realize o pagamento até a data para evitar juros e multa. Obrigado!`
                            return (
                              <Button key="cobrar" variant="ghost" size="sm" className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => window.open(`https://wa.me/${telFull}?text=${encodeURIComponent(msg)}`, '_blank')}
                                title={`Cobrar via WhatsApp: ${formatPhone(v.cliente.celular || v.cliente.telefone)}`}>
                                <MessageCircle size={13} className="mr-1" />Cobrar
                              </Button>
                            )
                          })()}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog Editar Data de Pagamento */}
      <Dialog open={!!editarDataPag} onOpenChange={(v) => !v && setEditarDataPag(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Editar data de pagamento</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Nova data</Label>
              <Input
                type="date"
                value={editarDataPag?.data || ''}
                onChange={(e) => setEditarDataPag(prev => prev ? { ...prev, data: e.target.value } : null)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setEditarDataPag(null)}>Cancelar</Button>
            <Button
              onClick={() => editarDataPag && atualizarData.mutate({ id: editarDataPag.id, data: editarDataPag.data })}
              disabled={atualizarData.isPending || !editarDataPag?.data}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {atualizarData.isPending ? 'Salvando...' : 'Salvar data'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Estornar */}
      <Dialog open={!!estornarId} onOpenChange={(v) => !v && setEstornarId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Estornar pagamento?</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">A parcela voltará para o status <strong>Pendente</strong> e o pagamento será removido. Esta ação não pode ser desfeita.</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setEstornarId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => estornarPagamento.mutate(estornarId!)} disabled={estornarPagamento.isPending}>
              {estornarPagamento.isPending ? 'Estornando...' : 'Confirmar Estorno'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Cliente */}
      <Dialog open={editClienteOpen} onOpenChange={setEditClienteOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Editar dados do cliente</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2 space-y-1">
              <Label>Nome completo</Label>
              <Input value={formCliente.nome || ''} onChange={(e) => setFormCliente({ ...formCliente, nome: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>CPF / CNPJ</Label>
              <Input value={formCliente.cpfCnpj || ''} onChange={(e) => setFormCliente({ ...formCliente, cpfCnpj: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>RG</Label>
              <Input value={formCliente.rg || ''} onChange={(e) => setFormCliente({ ...formCliente, rg: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Estado Civil</Label>
              <Select value={formCliente.estadoCivil || ''} onValueChange={(v) => setFormCliente({ ...formCliente, estadoCivil: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                  <SelectItem value="casado">Casado(a)</SelectItem>
                  <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                  <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                  <SelectItem value="uniao_estavel">União Estável</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Profissão</Label>
              <Input value={formCliente.profissao || ''} onChange={(e) => setFormCliente({ ...formCliente, profissao: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Celular</Label>
              <Input value={formCliente.celular || ''} onChange={(e) => setFormCliente({ ...formCliente, celular: e.target.value })} placeholder="(99) 99999-9999" />
            </div>
            <div className="space-y-1">
              <Label>Telefone</Label>
              <Input value={formCliente.telefone || ''} onChange={(e) => setFormCliente({ ...formCliente, telefone: e.target.value })} placeholder="(99) 9999-9999" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>E-mail</Label>
              <Input type="email" value={formCliente.email || ''} onChange={(e) => setFormCliente({ ...formCliente, email: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setEditClienteOpen(false)}>Cancelar</Button>
            <Button onClick={() => editarCliente.mutate()} disabled={editarCliente.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
              {editarCliente.isPending ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Venda */}
      <Dialog open={editVendaOpen} onOpenChange={setEditVendaOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Editar dados da venda</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Data da venda</Label>
                <Input type="date" value={formVenda.dataVenda || ''} onChange={(e) => setFormVenda({ ...formVenda, dataVenda: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Dia de vencimento</Label>
                <Input
                  type="number" min={1} max={28}
                  value={formVenda.diaVencimento || ''}
                  onChange={(e) => setFormVenda({ ...formVenda, diaVencimento: Number(e.target.value) })}
                  placeholder="Ex: 10"
                />
                <p className="text-xs text-gray-400">Atualiza parcelas pendentes</p>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <Input value={formVenda.observacoes || ''} onChange={(e) => setFormVenda({ ...formVenda, observacoes: e.target.value })} placeholder="Opcional" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setEditVendaOpen(false)}>Cancelar</Button>
            <Button onClick={() => editarVenda.mutate()} disabled={editarVenda.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
              {editarVenda.isPending ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
