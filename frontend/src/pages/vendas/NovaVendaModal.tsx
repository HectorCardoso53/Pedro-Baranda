import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { vendasService, lotesService, clientesService, projetosService, quadrasService } from '@/services/api.service'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CurrencyInput } from '@/components/ui/currency-input'
import { toast } from 'sonner'
import { formatCurrency, parseCurrencyValue } from '@/utils/format'
import { useState } from 'react'

const schemaNormal = z.object({
  loteId: z.string().min(1, 'Selecione o lote'),
  clienteId: z.string().min(1, 'Selecione o cliente'),
  valor: z.string().min(1, 'Valor obrigatório'),
  entrada: z.string().optional().default(''),
  formaEntrada: z.string().optional(),
  numeroParcelas: z.coerce.number().int().min(1).max(240),
  diaVencimento: z.coerce.number().int().min(1).max(28),
  observacoes: z.string().optional(),
})

const schemaReservado = z.object({
  loteId: z.string().min(1, 'Selecione o lote'),
  clienteId: z.string().min(1, 'Selecione o cliente'),
  observacoes: z.string().optional(),
})

type FormNormal = z.infer<typeof schemaNormal>
type FormReservado = z.infer<typeof schemaReservado>

interface Props { open: boolean; onClose: () => void }

export default function NovaVendaModal({ open, onClose }: Props) {
  const qc = useQueryClient()
  const [projetoId, setProjetoId] = useState('')
  const [quadraId, setQuadraId] = useState('')
  const [tipo, setTipo] = useState<'normal' | 'reservado'>('normal')

  const formNormal = useForm<FormNormal>({
    resolver: zodResolver(schemaNormal),
    defaultValues: { entrada: '', formaEntrada: 'pix', diaVencimento: 10, numeroParcelas: 12 },
  })

  const formReservado = useForm<FormReservado>({
    resolver: zodResolver(schemaReservado),
    defaultValues: {},
  })

  const valorStr = formNormal.watch('valor') || ''
  const entradaStr = formNormal.watch('entrada') || ''
  const valor = parseCurrencyValue(valorStr)
  const entrada = parseCurrencyValue(entradaStr)
  const numeroParcelas = formNormal.watch('numeroParcelas') || 1
  const diaVencimentoWatch = formNormal.watch('diaVencimento') || 10
  const saldo = Math.max(0, valor - entrada)
  const valorParcela = numeroParcelas > 0 ? saldo / numeroParcelas : 0
  const temEntrada = entrada > 0

  function calcularPrimeiroVencimento(dia: number): string {
    const hoje = new Date()
    const diaHoje = hoje.getDate()
    let mes = hoje.getMonth()
    let ano = hoje.getFullYear()
    if (dia <= diaHoje) { mes += 1; if (mes > 11) { mes = 0; ano += 1 } }
    return new Date(ano, mes, dia).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const { data: projetos = [] } = useQuery({
    queryKey: ['projetos'],
    queryFn: () => projetosService.listar(),
    enabled: open,
  })

  const { data: quadras = [] } = useQuery({
    queryKey: ['quadras', projetoId],
    queryFn: () => quadrasService.listar({ projetoId }),
    enabled: open && !!projetoId,
  })

  const { data: lotes = [] } = useQuery({
    queryKey: ['lotes-disponiveis', projetoId, quadraId],
    queryFn: () => lotesService.listarDisponiveis(projetoId, quadraId),
    enabled: open && !!quadraId,
  })

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => clientesService.listar(),
    enabled: open,
  })

  function handleProjetoChange(id: string) {
    setProjetoId(id)
    setQuadraId('')
    formNormal.setValue('loteId', '')
    formReservado.setValue('loteId', '')
  }

  function handleQuadraChange(id: string) {
    setQuadraId(id)
    formNormal.setValue('loteId', '')
    formReservado.setValue('loteId', '')
  }

  function handleLoteChange(id: string) {
    formNormal.setValue('loteId', id)
    formReservado.setValue('loteId', id)
    if (tipo === 'normal') {
      const lote = (lotes as any[]).find((l) => l.id === id)
      if (lote?.valorBase) {
        const formatted = (lote.valorBase as number).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        formNormal.setValue('valor', formatted)
      }
    }
  }

  function handleClose() {
    setProjetoId('')
    setQuadraId('')
    setTipo('normal')
    formNormal.reset()
    formReservado.reset()
    onClose()
  }

  function handleTipoChange(novoTipo: 'normal' | 'reservado') {
    setTipo(novoTipo)
    formNormal.setValue('loteId', '')
    formReservado.setValue('loteId', '')
    setQuadraId('')
  }

  const mutacao = useMutation({
    mutationFn: vendasService.criar,
    onSuccess: () => {
      const msg = tipo === 'reservado' ? 'Venda reservada registrada!' : 'Venda criada! Parcelas geradas automaticamente.'
      toast.success(msg)
      qc.invalidateQueries({ queryKey: ['vendas'] })
      qc.invalidateQueries({ queryKey: ['lotes'] })
      qc.invalidateQueries({ queryKey: ['lotes-disponiveis'] })
      handleClose()
    },
    onError: (err) => toast.error(err.message),
  })

  const loteSelect = (
    <div className="space-y-1">
      <Label>Lote disponível *</Label>
      <Select onValueChange={handleLoteChange} disabled={!quadraId}>
        <SelectTrigger>
          <SelectValue placeholder={quadraId ? (lotes.length === 0 ? 'Nenhum lote disponível' : 'Selecione o lote') : 'Selecione a quadra primeiro'} />
        </SelectTrigger>
        <SelectContent>
          {(lotes as any[]).map((l) => (
            <SelectItem key={l.id} value={l.id}>
              Lote {l.numero} — {formatCurrency(l.valorBase)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Nova Venda</DialogTitle></DialogHeader>

        {/* Tipo de venda */}
        <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
          <button
            type="button"
            onClick={() => handleTipoChange('normal')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${tipo === 'normal' ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Venda Normal
          </button>
          <button
            type="button"
            onClick={() => handleTipoChange('reservado')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${tipo === 'reservado' ? 'bg-white shadow text-amber-700' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Reservado (pré-sistema)
          </button>
        </div>

        {tipo === 'reservado' && (
          <p className="text-xs text-gray-500 px-1">
            Venda realizada antes do sistema. O lote será marcado como vendido, mas sem gerar parcelas, promissórias ou movimentação financeira.
          </p>
        )}

        {/* Formulário Normal */}
        {tipo === 'normal' && (
          <form onSubmit={formNormal.handleSubmit((d) => mutacao.mutate({
            ...d,
            tipo: 'normal',
            valor: parseCurrencyValue(d.valor),
            entrada: parseCurrencyValue(d.entrada || ''),
          }))} className="grid grid-cols-2 gap-4">

            <div className="space-y-1">
              <Label>Projeto *</Label>
              <Select value={projetoId} onValueChange={handleProjetoChange}>
                <SelectTrigger><SelectValue placeholder="Selecione o projeto" /></SelectTrigger>
                <SelectContent>
                  {(projetos as any[]).map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Quadra *</Label>
              <Select value={quadraId} onValueChange={handleQuadraChange} disabled={!projetoId}>
                <SelectTrigger><SelectValue placeholder={projetoId ? 'Selecione a quadra' : 'Selecione o projeto primeiro'} /></SelectTrigger>
                <SelectContent>
                  {(quadras as any[]).map((q) => <SelectItem key={q.id} value={q.id}>{q.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {loteSelect}
            {formNormal.formState.errors.loteId && <p className="text-xs text-red-500">{formNormal.formState.errors.loteId.message}</p>}

            <div className="space-y-1">
              <Label>Cliente *</Label>
              <Select onValueChange={(v) => formNormal.setValue('clienteId', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>
                  {(clientes as any[]).map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              {formNormal.formState.errors.clienteId && <p className="text-xs text-red-500">{formNormal.formState.errors.clienteId.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>Valor total *</Label>
              <CurrencyInput value={valorStr} onChange={(v) => formNormal.setValue('valor', v)} placeholder="50.000,00" />
              {formNormal.formState.errors.valor && <p className="text-xs text-red-500">{formNormal.formState.errors.valor.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>Entrada</Label>
              <CurrencyInput value={entradaStr} onChange={(v) => formNormal.setValue('entrada', v)} placeholder="0,00" />
            </div>

            <div className="space-y-1">
              <Label>Número de parcelas *</Label>
              <Input type="number" {...formNormal.register('numeroParcelas')} placeholder="12" />
            </div>

            <div className="space-y-1">
              <Label>Dia de vencimento *</Label>
              <Input type="number" {...formNormal.register('diaVencimento')} placeholder="10" min="1" max="28" />
            </div>

            {temEntrada && (
              <div className="space-y-1">
                <Label>Forma de pagamento da entrada *</Label>
                <Select defaultValue="pix" onValueChange={(v) => formNormal.setValue('formaEntrada', v)}>
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
            )}

            {valor > 0 && (
              <div className="col-span-2 bg-blue-50 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-gray-500">Saldo a financiar</p>
                    <p className="font-bold text-gray-900">{formatCurrency(saldo)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Parcelas</p>
                    <p className="font-bold text-gray-900">{numeroParcelas}x</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Valor/Parcela</p>
                    <p className="font-bold text-green-700">{formatCurrency(valorParcela)}</p>
                  </div>
                </div>
                <div className="border-t border-blue-100 pt-2 flex justify-between text-xs text-gray-500">
                  <span>Entrada paga hoje: <strong className="text-gray-700">{new Date().toLocaleDateString('pt-BR')}</strong></span>
                  <span>1ª parcela em: <strong className="text-blue-700">{calcularPrimeiroVencimento(diaVencimentoWatch)}</strong></span>
                </div>
              </div>
            )}

            <div className="col-span-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button type="submit" disabled={mutacao.isPending} className="bg-green-600 hover:bg-green-700">
                {mutacao.isPending ? 'Criando...' : 'Criar Venda'}
              </Button>
            </div>
          </form>
        )}

        {/* Formulário Reservado */}
        {tipo === 'reservado' && (
          <form onSubmit={formReservado.handleSubmit((d) => mutacao.mutate({
            ...d,
            tipo: 'reservado',
            valor: 0,
            entrada: 0,
            numeroParcelas: 1,
            diaVencimento: 1,
          }))} className="grid grid-cols-2 gap-4">

            <div className="space-y-1">
              <Label>Projeto *</Label>
              <Select value={projetoId} onValueChange={handleProjetoChange}>
                <SelectTrigger><SelectValue placeholder="Selecione o projeto" /></SelectTrigger>
                <SelectContent>
                  {(projetos as any[]).map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Quadra *</Label>
              <Select value={quadraId} onValueChange={handleQuadraChange} disabled={!projetoId}>
                <SelectTrigger><SelectValue placeholder={projetoId ? 'Selecione a quadra' : 'Selecione o projeto primeiro'} /></SelectTrigger>
                <SelectContent>
                  {(quadras as any[]).map((q) => <SelectItem key={q.id} value={q.id}>{q.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {loteSelect}
            {formReservado.formState.errors.loteId && <p className="text-xs text-red-500">{formReservado.formState.errors.loteId.message}</p>}

            <div className="space-y-1">
              <Label>Cliente *</Label>
              <Select onValueChange={(v) => formReservado.setValue('clienteId', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>
                  {(clientes as any[]).map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              {formReservado.formState.errors.clienteId && <p className="text-xs text-red-500">{formReservado.formState.errors.clienteId.message}</p>}
            </div>

            <div className="col-span-2 space-y-1">
              <Label>Observações</Label>
              <Input {...formReservado.register('observacoes')} placeholder="Ex: Negociação realizada em jan/2024 com o proprietário" />
            </div>

            <div className="col-span-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button type="submit" disabled={mutacao.isPending} className="bg-amber-600 hover:bg-amber-700">
                {mutacao.isPending ? 'Registrando...' : 'Registrar Reservado'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
