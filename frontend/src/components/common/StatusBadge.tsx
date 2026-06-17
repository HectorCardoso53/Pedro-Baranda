import { cn } from '@/lib/utils'
import {
  LOTE_STATUS_COLOR, LOTE_STATUS_LABEL,
  VENDA_STATUS_COLOR, VENDA_STATUS_LABEL,
  PARCELA_STATUS_COLOR, PARCELA_STATUS_LABEL,
} from '@/utils/format'

type StatusType = 'lote' | 'venda' | 'parcela'

interface StatusBadgeProps {
  status: string
  type: StatusType
  className?: string
}

export default function StatusBadge({ status, type, className }: StatusBadgeProps) {
  const colorMap = { lote: LOTE_STATUS_COLOR, venda: VENDA_STATUS_COLOR, parcela: PARCELA_STATUS_COLOR }
  const labelMap = { lote: LOTE_STATUS_LABEL, venda: VENDA_STATUS_LABEL, parcela: PARCELA_STATUS_LABEL }

  const color = colorMap[type][status] || 'bg-gray-100 text-gray-600'
  const label = labelMap[type][status] || status

  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', color, className)}>
      {label}
    </span>
  )
}
