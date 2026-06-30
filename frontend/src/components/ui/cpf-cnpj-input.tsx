import { cn } from '@/lib/utils'

function applyMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 14)
  const len = digits.length

  if (len <= 11) {
    if (len <= 3) return digits
    if (len <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
    if (len <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
  }

  if (len <= 2) return digits
  if (len <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`
  if (len <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`
  if (len <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
}

interface CpfCnpjInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string
  onChange: (value: string) => void
}

export function CpfCnpjInput({ value, onChange, className, placeholder, ...props }: CpfCnpjInputProps) {
  const digits = value.replace(/\D/g, '')
  const ph = placeholder ?? (digits.length > 11 ? '00.000.000/0000-00' : '000.000.000-00')

  return (
    <input
      type="text"
      inputMode="numeric"
      value={value}
      placeholder={ph}
      onChange={(e) => onChange(applyMask(e.target.value))}
      className={cn(
        'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
}
