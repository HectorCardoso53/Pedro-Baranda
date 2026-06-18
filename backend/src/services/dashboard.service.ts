import prisma from '../lib/prisma'
import { format, startOfMonth, endOfMonth } from 'date-fns'

export class DashboardService {
  async geral() {
    const [lotes, vendas, inadimplentes, repassesPendentes] = await Promise.all([
      prisma.lote.findMany(),
      prisma.venda.findMany(),
      prisma.parcela.count({ where: { status: 'vencida' } }),
      prisma.repasse.count({ where: { status: 'pendente' } }),
    ])

    const mesAtual = format(new Date(), 'yyyy-MM')
    const vendasMes = vendas.filter((v) => v.criadoEm.toISOString().startsWith(mesAtual)).length

    const inicio = format(startOfMonth(new Date()), 'yyyy-MM-dd')
    const fim = format(endOfMonth(new Date()), 'yyyy-MM-dd')
    const pagamentosMes = await prisma.pagamento.findMany({
      where: { dataPagamento: { gte: inicio, lte: fim } },
    })
    const receitaMes = pagamentosMes.reduce((acc, p) => acc + (p.valor || 0), 0)

    return {
      totalLotes: lotes.length,
      lotesDisponiveis: lotes.filter((l) => l.status === 'disponivel').length,
      lotesVendidos: lotes.filter((l) => l.status === 'vendido').length,
      lotesReservados: lotes.filter((l) => l.status === 'reservado').length,
      lotesBloqueados: lotes.filter((l) => l.status === 'bloqueado').length,
      totalVendas: vendas.length,
      vendasAtivas: vendas.filter((v) => v.status === 'ativa').length,
      vendasQuitadas: vendas.filter((v) => v.status === 'quitada').length,
      vendasMes,
      receitaMes,
      inadimplentes,
      repassesPendentes,
    }
  }

  async vendasMes() {
    const meses = []
    const hoje = new Date()

    for (let i = 5; i >= 0; i--) {
      const mes = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
      const mesStr = format(mes, 'yyyy-MM')
      const vendas = await prisma.venda.findMany({
        where: { status: { in: ['ativa', 'quitada'] } },
      })
      const vendasMes = vendas.filter((v) => v.criadoEm.toISOString().startsWith(mesStr))
      meses.push({
        mes: format(mes, 'MMM/yy'),
        total: vendasMes.length,
        valor: vendasMes.reduce((acc, v) => acc + (v.valor || 0), 0),
      })
    }

    return meses
  }

  async lotesStatus() {
    const lotes = await prisma.lote.findMany()
    return [
      { status: 'Disponível', total: lotes.filter((l) => l.status === 'disponivel').length, fill: '#16a34a' },
      { status: 'Vendido', total: lotes.filter((l) => l.status === 'vendido').length, fill: '#1e3a6e' },
      { status: 'Reservado', total: lotes.filter((l) => l.status === 'reservado').length, fill: '#f59e0b' },
      { status: 'Bloqueado', total: lotes.filter((l) => l.status === 'bloqueado').length, fill: '#ef4444' },
    ]
  }

  async receitaMes() {
    const meses = []
    const hoje = new Date()

    for (let i = 5; i >= 0; i--) {
      const mes = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
      const inicio = format(startOfMonth(mes), 'yyyy-MM-dd')
      const fim = format(endOfMonth(mes), 'yyyy-MM-dd')
      const pagamentos = await prisma.pagamento.findMany({
        where: { dataPagamento: { gte: inicio, lte: fim } },
      })
      const receita = pagamentos.reduce((acc, p) => acc + (p.valor || 0), 0)
      meses.push({ mes: format(mes, 'MMM/yy'), receita })
    }

    return meses
  }

  async inadimplencia() {
    const parcelas = await prisma.parcela.findMany({ where: { status: 'vencida' } })
    return {
      total: parcelas.length,
      valor: parcelas.reduce((acc, p) => acc + (p.valor || 0), 0),
    }
  }
}
