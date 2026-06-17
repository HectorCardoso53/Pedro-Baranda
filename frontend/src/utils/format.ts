import { format, parseISO, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(d)) return '-'
    return format(d, 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return '-'
  }
}

export function formatDatetime(date: string | Date | null | undefined): string {
  if (!date) return '-'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(d)) return '-'
    return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
  } catch {
    return '-'
  }
}

export function formatCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, '')
  if (digits.length === 11) return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  if (digits.length === 14) return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  return cpf
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  if (digits.length === 10) return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  return phone
}

export function formatArea(area: number): string {
  return `${new Intl.NumberFormat('pt-BR').format(area)} m²`
}

export const LOTE_STATUS_LABEL: Record<string, string> = {
  disponivel: 'Disponível',
  reservado: 'Reservado',
  vendido: 'Vendido',
  bloqueado: 'Bloqueado',
}

export const LOTE_STATUS_COLOR: Record<string, string> = {
  disponivel: 'bg-green-100 text-green-800',
  reservado: 'bg-yellow-100 text-yellow-800',
  vendido: 'bg-blue-100 text-blue-800',
  bloqueado: 'bg-red-100 text-red-800',
}

export const VENDA_STATUS_LABEL: Record<string, string> = {
  ativa: 'Ativa',
  quitada: 'Quitada',
  distratada: 'Distratada',
  cancelada: 'Cancelada',
}

export const VENDA_STATUS_COLOR: Record<string, string> = {
  ativa: 'bg-blue-100 text-blue-800',
  quitada: 'bg-green-100 text-green-800',
  distratada: 'bg-orange-100 text-orange-800',
  cancelada: 'bg-red-100 text-red-800',
}

export const PARCELA_STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente',
  paga: 'Paga',
  vencida: 'Vencida',
  cancelada: 'Cancelada',
}

export const PARCELA_STATUS_COLOR: Record<string, string> = {
  pendente: 'bg-yellow-100 text-yellow-800',
  paga: 'bg-green-100 text-green-800',
  vencida: 'bg-red-100 text-red-800',
  cancelada: 'bg-gray-100 text-gray-600',
}

export const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrador',
  financeiro: 'Financeiro',
  atendimento: 'Atendimento',
  gerencia: 'Gerência',
  proprietario: 'Proprietário',
}
