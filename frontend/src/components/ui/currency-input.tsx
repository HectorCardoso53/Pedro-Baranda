import { cn } from '@/lib/utils'

function applyMask(raw: string): string {
  let cleaned = raw.replace(/[^\d,]/g, '')
  if (!cleaned) return ''
  if (cleaned.startsWith(',')) cleaned = '0' + cleaned
  const commaIdx = cleaned.indexOf(',')
  if (commaIdx !== -1) {
    cleaned = cleaned.slice(0, commaIdx + 1) + cleaned.slice(commaIdx + 1).replace(/,/g, '')
  }
  const [intPart, decPart] = cleaned.split(',')
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  if (cleaned.includes(',')) {
    return `${formattedInt},${(decPart ?? '').slice(0, 2)}`
  }
  return formattedInt
}

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string
  onChange: (value: string) => void
}

export function CurrencyInput({ value = '', onChange, className, ...props }: CurrencyInputProps) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 select-none pointer-events-none">
        R$
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(applyMask(e.target.value))}
        className={cn(
          'flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      />
    </div>
  )
}
