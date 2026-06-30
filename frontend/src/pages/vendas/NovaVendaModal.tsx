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

const schema = z.object({
  loteId: z.string().min(1, 'Selecione o lote'),
  clienteId: z.string().min(1, 'Selecione o cliente'),
  valor: z.string().min(1, 'Valor obrigatório'),
  entrada: z.string().optional().default(''),
  numeroParcelas: z.coerce.number().int().min(1).max(240),
  diaVencimento: z.coerce.number().int().min(1).max(28),
  primeiroVencimento: z.string().min(1, 'Data obrigatória'),
  observacoes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props { open: boolean; onClose: () => void }

export default function NovaVendaModal({ open, onClose }: Props) {
  const qc = useQueryClient()
  const [projetoId, setProjetoId] = useState('')
  const [quadraId, setQuadraId] = useState('')

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { entrada: '', diaVencimento: 10, numeroParcelas: 12 },
  })

  const valorStr = watch('valor') || ''
  const entradaStr = watch('entrada') || ''
  const valor = parseCurrencyValue(valorStr)
  const entrada = parseCurrencyValue(entradaStr)
  const numeroParcelas = watch('numeroParcelas') || 1
  const saldo = Math.max(0, valor - entrada)
  const valorParcela = numeroParcelas > 0 ? saldo / numeroParcelas : 0

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
    setValue('loteId', '')
  }

  function handleQuadraChange(id: string) {
    setQuadraId(id)
    setValue('loteId', '')
  }

  function handleLoteChange(id: string) {
    setValue('loteId', id)
    const lote = (lotes as any[]).find((l) => l.id === id)
    if (lote?.valorBase) {
      const formatted = (lote.valorBase as number).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      setValue('valor', formatted)
    }
  }

  function handleClose() {
    setProjetoId('')
    setQuadraId('')
    reset()
    onClose()
  }

  const mutacao = useMutation({
    mutationFn: vendasService.criar,
    onSuccess: () => {
      toast.success('Venda criada! Parcelas geradas automaticamente.')
      qc.invalidateQueries({ queryKey: ['vendas'] })
      qc.invalidateQueries({ queryKey: ['lotes'] })
      qc.invalidateQueries({ queryKey: ['lotes-disponiveis'] })
      handleClose()
    },
    onError: (err) => toast.error(err.message),
  })

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Nova Venda</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((d) => mutacao.mutate({
          ...d,
          valor: parseCurrencyValue(d.valor),
          entrada: parseCurrencyValue(d.entrada || ''),
        }))} className="grid grid-cols-2 gap-4">

          {/* Projeto */}
          <div className="space-y-1">
            <Label>Projeto *</Label>
            <Select value={projetoId} onValueChange={handleProjetoChange}>
              <SelectTrigger><SelectValue placeholder="Selecione o projeto" /></SelectTrigger>
              <SelectContent>
                {(projetos as any[]).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quadra */}
          <div className="space-y-1">
            <Label>Quadra *</Label>
            <Select value={quadraId} onValueChange={handleQuadraChange} disabled={!projetoId}>
              <SelectTrigger><SelectValue placeholder={projetoId ? 'Selecione a quadra' : 'Selecione o projeto primeiro'} /></SelectTrigger>
              <SelectContent>
                {(quadras as any[]).map((q) => (
                  <SelectItem key={q.id} value={q.id}>{q.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Lote */}
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
            {errors.loteId && <p className="text-xs text-red-500">{errors.loteId.message}</p>}
          </div>

          {/* Cliente */}
          <div className="space-y-1">
            <Label>Cliente *</Label>
            <Select onValueChange={(v) => setValue('clienteId', v)}>
              <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
              <SelectContent>
                {(clientes as any[]).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.clienteId && <p className="text-xs text-red-500">{errors.clienteId.message}</p>}
          </div>

          {/* Valor */}
          <div className="space-y-1">
            <Label>Valor total *</Label>
            <CurrencyInput value={valorStr} onChange={(v) => setValue('valor', v)} placeholder="50.000,00" />
            {errors.valor && <p className="text-xs text-red-500">{errors.valor.message}</p>}
          </div>

          {/* Entrada */}
          <div className="space-y-1">
            <Label>Entrada</Label>
            <CurrencyInput value={entradaStr} onChange={(v) => setValue('entrada', v)} placeholder="0,00" />
          </div>

          {/* Parcelas */}
          <div className="space-y-1">
            <Label>Número de parcelas *</Label>
            <Input type="number" {...register('numeroParcelas')} placeholder="12" />
            {errors.numeroParcelas && <p className="text-xs text-red-500">{errors.numeroParcelas.message}</p>}
          </div>

          {/* Dia vencimento */}
          <div className="space-y-1">
            <Label>Dia de vencimento *</Label>
            <Input type="number" {...register('diaVencimento')} placeholder="10" min="1" max="28" />
          </div>

          {/* Primeiro vencimento */}
          <div className="col-span-2 space-y-1">
            <Label>Primeiro vencimento *</Label>
            <Input type="date" {...register('primeiroVencimento')} />
          </div>

          {/* Resumo */}
          {valor > 0 && (
            <div className="col-span-2 bg-blue-50 rounded-lg p-4 grid grid-cols-3 gap-4 text-center">
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
          )}

          <div className="col-span-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button type="submit" disabled={mutacao.isPending} className="bg-green-600 hover:bg-green-700">
              {mutacao.isPending ? 'Criando...' : 'Criar Venda'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
