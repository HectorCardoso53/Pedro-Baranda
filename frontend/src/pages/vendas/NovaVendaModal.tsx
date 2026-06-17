import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { vendasService, lotesService, clientesService } from '@/services/api.service'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { formatCurrency } from '@/utils/format'
import { useState } from 'react'

const schema = z.object({
  loteId: z.string().min(1, 'Selecione o lote'),
  clienteId: z.string().min(1, 'Selecione o cliente'),
  valor: z.coerce.number().positive('Valor obrigatório'),
  entrada: z.coerce.number().min(0),
  numeroParcelas: z.coerce.number().int().min(1).max(240),
  diaVencimento: z.coerce.number().int().min(1).max(28),
  primeiroVencimento: z.string().min(1, 'Data obrigatória'),
  observacoes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props { open: boolean; onClose: () => void }

export default function NovaVendaModal({ open, onClose }: Props) {
  const qc = useQueryClient()
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { entrada: 0, diaVencimento: 10, numeroParcelas: 12 },
  })

  const valor = watch('valor') || 0
  const entrada = watch('entrada') || 0
  const numeroParcelas = watch('numeroParcelas') || 1
  const saldo = Math.max(0, valor - entrada)
  const valorParcela = numeroParcelas > 0 ? saldo / numeroParcelas : 0

  const { data: lotes = [] } = useQuery({
    queryKey: ['lotes-disponiveis'],
    queryFn: () => lotesService.listarDisponiveis(),
    enabled: open,
  })

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => clientesService.listar(),
    enabled: open,
  })

  const mutacao = useMutation({
    mutationFn: vendasService.criar,
    onSuccess: () => {
      toast.success('Venda criada! Parcelas geradas automaticamente.')
      qc.invalidateQueries({ queryKey: ['vendas'] })
      qc.invalidateQueries({ queryKey: ['lotes'] })
      qc.invalidateQueries({ queryKey: ['lotes-disponiveis'] })
      onClose()
      reset()
    },
    onError: (err) => toast.error(err.message),
  })

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Nova Venda</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((d) => mutacao.mutate(d))} className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Lote disponível *</Label>
            <Select onValueChange={(v) => setValue('loteId', v)}>
              <SelectTrigger><SelectValue placeholder="Selecione o lote" /></SelectTrigger>
              <SelectContent>
                {lotes.map((l: any) => (
                  <SelectItem key={l.id} value={l.id}>
                    Lote {l.numero} — {formatCurrency(l.valorBase)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.loteId && <p className="text-xs text-red-500">{errors.loteId.message}</p>}
          </div>

          <div className="space-y-1">
            <Label>Cliente *</Label>
            <Select onValueChange={(v) => setValue('clienteId', v)}>
              <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
              <SelectContent>
                {clientes.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.clienteId && <p className="text-xs text-red-500">{errors.clienteId.message}</p>}
          </div>

          <div className="space-y-1">
            <Label>Valor total (R$) *</Label>
            <Input type="number" step="0.01" {...register('valor')} placeholder="50000" />
            {errors.valor && <p className="text-xs text-red-500">{errors.valor.message}</p>}
          </div>

          <div className="space-y-1">
            <Label>Entrada (R$)</Label>
            <Input type="number" step="0.01" {...register('entrada')} placeholder="0" />
          </div>

          <div className="space-y-1">
            <Label>Número de parcelas *</Label>
            <Input type="number" {...register('numeroParcelas')} placeholder="12" />
            {errors.numeroParcelas && <p className="text-xs text-red-500">{errors.numeroParcelas.message}</p>}
          </div>

          <div className="space-y-1">
            <Label>Dia de vencimento *</Label>
            <Input type="number" {...register('diaVencimento')} placeholder="10" min="1" max="28" />
          </div>

          <div className="col-span-2 space-y-1">
            <Label>Primeiro vencimento *</Label>
            <Input type="date" {...register('primeiroVencimento')} />
          </div>

          {/* Resumo */}
          {valor > 0 && (
            <div className="col-span-2 bg-blue-50 rounded-lg p-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-gray-500">Saldo</p>
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
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={mutacao.isPending} className="bg-green-600 hover:bg-green-700">
              {mutacao.isPending ? 'Criando...' : 'Criar Venda'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
