import { format, parseISO, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatCurrency(value: number | null | undefined): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0)
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

export function parseCurrencyValue(value: string | number | null | undefined): number {
  if (value == null) return 0
  if (typeof value === 'number') return value
  return parseFloat(String(value).replace(/\./g, '').replace(',', '.')) || 0
}

export function formatCPF(cpf: string | null | undefined): string {
  if (!cpf) return '—'
  const digits = cpf.replace(/\D/g, '')
  if (digits.length === 11) return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  if (digits.length === 14) return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  return cpf
}

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '—'
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  if (digits.length === 10) return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  return phone
}

export function formatArea(area: number | null | undefined): string {
  return `${new Intl.NumberFormat('pt-BR').format(area ?? 0)} m²`
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
  a_vencer: 'A Vencer',
  paga: 'Paga',
  vencida: 'Vencida',
  cancelada: 'Cancelada',
}

export const PARCELA_STATUS_COLOR: Record<string, string> = {
  pendente: 'bg-gray-100 text-gray-700',
  a_vencer: 'bg-orange-100 text-orange-800',
  paga: 'bg-green-100 text-green-800',
  vencida: 'bg-red-100 text-red-800',
  cancelada: 'bg-gray-100 text-gray-500',
}

export function statusEfetivoParcela(parcela: { status: string; vencimento?: string | null }): string {
  if (parcela.status !== 'pendente') return parcela.status
  if (!parcela.vencimento) return parcela.status
  try {
    const venc = parseISO(parcela.vencimento)
    if (!isValid(venc)) return parcela.status
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const diffDias = Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDias < 0) return 'vencida'
    if (diffDias <= 5) return 'a_vencer'
  } catch { /* ignore */ }
  return parcela.status
}

export const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrador',
  financeiro: 'Financeiro',
  atendimento: 'Atendimento',
  gerencia: 'Gerência',
  proprietario: 'Proprietário',
}
