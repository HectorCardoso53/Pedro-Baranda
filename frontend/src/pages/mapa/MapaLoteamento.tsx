import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { projetosService, quadrasService, lotesService } from '@/services/api.service'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import PageHeader from '@/components/common/PageHeader'
import { formatCurrency, LOTE_STATUS_LABEL } from '@/utils/format'
import { cn } from '@/lib/utils'
import type { Lote } from '@/types'

const STATUS_BG: Record<string, string> = {
  disponivel: 'bg-green-500 hover:bg-green-600',
  vendido:    'bg-blue-500 hover:bg-blue-600',
  reservado:  'bg-orange-400 hover:bg-orange-500',
  bloqueado:  'bg-gray-400 hover:bg-gray-500',
}

const STATUS_TEXT: Record<string, string> = {
  disponivel: 'text-green-700',
  vendido:    'text-blue-700',
  reservado:  'text-orange-600',
  bloqueado:  'text-gray-500',
}

export default function MapaLoteamento() {
  const [projetoId, setProjetoId] = useState('')
  const [loteAtivo, setLoteAtivo] = useState<Lote | null>(null)

  const { data: projetos = [] } = useQuery({
    queryKey: ['projetos'],
    queryFn: () => projetosService.listar(),
  })

  const { data: todasQuadras = [] } = useQuery({
    queryKey: ['quadras-mapa'],
    queryFn: () => quadrasService.listar(),
  })

  const { data: todosLotes = [] } = useQuery({
    queryKey: ['lotes-mapa'],
    queryFn: () => lotesService.listar(),
  })

  const quadras = projetoId ? todasQuadras.filter(q => q.projetoId === projetoId) : []
  const lotes   = projetoId ? todosLotes.filter(l => l.projetoId === projetoId) : []

  const lotesPorQuadra = lotes.reduce<Record<string, Lote[]>>((acc, lote) => {
    if (!acc[lote.quadraId]) acc[lote.quadraId] = []
    acc[lote.quadraId].push(lote)
    return acc
  }, {})

  Object.values(lotesPorQuadra).forEach(arr =>
    arr.sort((a, b) => Number(a.numero) - Number(b.numero))
  )

  const stats = {
    total:      lotes.length,
    disponivel: lotes.filter(l => l.status === 'disponivel').length,
    vendido:    lotes.filter(l => l.status === 'vendido').length,
    reservado:  lotes.filter(l => l.status === 'reservado').length,
    bloqueado:  lotes.filter(l => l.status === 'bloqueado').length,
  }

  return (
    <div>
      <PageHeader title="Mapa do Loteamento" description="Visualização dos lotes por quadra e status" />

      <div className="mb-6">
        <Select value={projetoId} onValueChange={v => { setProjetoId(v); setLoteAtivo(null) }}>
          <SelectTrigger className="w-72">
            <SelectValue placeholder="Selecione um projeto..." />
          </SelectTrigger>
          <SelectContent>
            {projetos.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!projetoId && (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-3">🗺️</div>
          <p className="text-sm">Selecione um projeto para visualizar o mapa</p>
        </div>
      )}

      {projetoId && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            {[
              { label: 'Total', value: stats.total, cls: 'bg-white border-gray-200 text-gray-800' },
              { label: 'Disponíveis', value: stats.disponivel, cls: 'bg-green-50 border-green-200 text-green-700' },
              { label: 'Vendidos', value: stats.vendido, cls: 'bg-blue-50 border-blue-200 text-blue-700' },
              { label: 'Reservados', value: stats.reservado, cls: 'bg-orange-50 border-orange-200 text-orange-600' },
              { label: 'Bloqueados', value: stats.bloqueado, cls: 'bg-gray-50 border-gray-200 text-gray-500' },
            ].map(s => (
              <div key={s.label} className={cn('rounded-xl border p-3 text-center', s.cls)}>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs opacity-80">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Legenda */}
          <div className="flex flex-wrap gap-4 mb-6">
            {Object.entries(LOTE_STATUS_LABEL).map(([key, label]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className={cn('w-4 h-4 rounded', STATUS_BG[key]?.split(' ')[0])} />
                <span className="text-xs text-gray-600">{label}</span>
              </div>
            ))}
          </div>

          {/* Grade de quadras */}
          {quadras.length === 0 ? (
            <p className="text-gray-500 text-sm">Nenhuma quadra cadastrada neste projeto.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {quadras.map(quadra => {
                const qlotes = lotesPorQuadra[quadra.id] || []
                const disponiveis = qlotes.filter(l => l.status === 'disponivel').length
                return (
                  <div key={quadra.id} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
                    <div className="flex items-center justify-between mb-2 border-b pb-1.5">
                      <h3 className="text-sm font-semibold text-gray-700">{quadra.nome}</h3>
                      <span className="text-xs text-gray-400">{disponiveis}/{qlotes.length} disp.</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {qlotes.map(lote => (
                        <button
                          key={lote.id}
                          onClick={() => setLoteAtivo(loteAtivo?.id === lote.id ? null : lote)}
                          title={`Lote ${lote.numero} — ${LOTE_STATUS_LABEL[lote.status]}`}
                          className={cn(
                            'w-8 h-8 rounded text-white text-[10px] font-bold transition-all duration-150 shadow-sm',
                            STATUS_BG[lote.status],
                            loteAtivo?.id === lote.id && 'ring-2 ring-offset-1 ring-gray-800 scale-110'
                          )}
                        >
                          {lote.numero}
                        </button>
                      ))}
                      {qlotes.length === 0 && (
                        <p className="text-xs text-gray-400 py-1">Sem lotes cadastrados</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Card flutuante do lote selecionado */}
      {loteAtivo && (
        <div className="fixed bottom-6 right-6 bg-white rounded-xl shadow-xl border border-gray-200 p-4 w-60 z-50 animate-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-800">Lote {loteAtivo.numero}</h4>
            <button
              onClick={() => setLoteAtivo(null)}
              className="text-gray-400 hover:text-gray-600 leading-none text-xl"
            >
              &times;
            </button>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <span className={cn('font-medium', STATUS_TEXT[loteAtivo.status])}>
                {LOTE_STATUS_LABEL[loteAtivo.status]}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Área</span>
              <span className="font-medium text-gray-700">{loteAtivo.area} m²</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Valor base</span>
              <span className="font-medium text-gray-700">{formatCurrency(loteAtivo.valorBase)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
