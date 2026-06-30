const TIPOS: Record<string, { label: string; className: string }> = {
  '10X5':  { label: 'B', className: 'bg-white border border-gray-400 text-gray-800' },
  '10X30': { label: 'A', className: 'bg-blue-600 text-white' },
  '15X20': { label: 'V', className: 'bg-green-600 text-white' },
  '15X5':  { label: 'L', className: 'bg-orange-500 text-white' },
  '15X30': { label: 'R', className: 'bg-red-600 text-white' },
}

function normalizeDim(dim: string): string {
  return dim.trim().toUpperCase().replace(/[,\s]/g, 'X').replace(/XX+/g, 'X')
}

interface Props {
  dimensao: string | null | undefined
  showDim?: boolean
}

export default function LoteTipoBadge({ dimensao, showDim = true }: Props) {
  if (!dimensao) return <span className="text-gray-300">—</span>

  const key = normalizeDim(dimensao)
  const tipo = TIPOS[key]

  return (
    <div className="flex items-center gap-1.5">
      {tipo && (
        <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold shrink-0 ${tipo.className}`}>
          {tipo.label}
        </span>
      )}
      {showDim && (
        <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">{dimensao}</span>
      )}
    </div>
  )
}
