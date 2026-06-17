import { db } from '../firebase/admin'
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns'

export class DashboardService {
  async geral() {
    const [lotesSnap, vendasSnap, parcelasSnap, repassesSnap] = await Promise.all([
      db.collection('lotes').get(),
      db.collection('vendas').get(),
      db.collection('parcelas').where('status', '==', 'vencida').get(),
      db.collection('movimentacoesFinanceiras')
        .where('tipo', '==', 'repasse')
        .where('status', '==', 'pendente')
        .get(),
    ])

    const lotes = lotesSnap.docs.map((d) => d.data())
    const vendas = vendasSnap.docs.map((d) => d.data())

    const mesAtual = format(new Date(), 'yyyy-MM')
    const vendasMes = vendas.filter((v) => v.criadoEm?.startsWith(mesAtual)).length

    const pagamentosMes = await db.collection('pagamentos')
      .where('dataPagamento', '>=', format(startOfMonth(new Date()), 'yyyy-MM-dd'))
      .where('dataPagamento', '<=', format(endOfMonth(new Date()), 'yyyy-MM-dd'))
      .get()

    const receitaMes = pagamentosMes.docs.reduce((acc, d) => acc + (d.data().valor || 0), 0)

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
      inadimplentes: parcelasSnap.size,
      repassesPendentes: repassesSnap.size,
    }
  }

  async vendasMes() {
    const meses = []
    const hoje = new Date()

    for (let i = 5; i >= 0; i--) {
      const mes = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
      const mesStr = format(mes, 'yyyy-MM')
      const snap = await db.collection('vendas')
        .where('status', 'in', ['ativa', 'quitada'])
        .get()
      const vendasMes = snap.docs.filter((d) => d.data().criadoEm?.startsWith(mesStr))
      meses.push({
        mes: format(mes, 'MMM/yy'),
        total: vendasMes.length,
        valor: vendasMes.reduce((acc, d) => acc + (d.data().valor || 0), 0),
      })
    }

    return meses
  }

  async lotesStatus() {
    const snap = await db.collection('lotes').get()
    const lotes = snap.docs.map((d) => d.data())

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
      const snap = await db.collection('pagamentos')
        .where('dataPagamento', '>=', inicio)
        .where('dataPagamento', '<=', fim)
        .get()
      const receita = snap.docs.reduce((acc, d) => acc + (d.data().valor || 0), 0)
      meses.push({ mes: format(mes, 'MMM/yy'), receita })
    }

    return meses
  }

  async inadimplencia() {
    const snap = await db.collection('parcelas').where('status', '==', 'vencida').get()
    return {
      total: snap.size,
      valor: snap.docs.reduce((acc, d) => acc + (d.data().valor || 0), 0),
    }
  }
}
