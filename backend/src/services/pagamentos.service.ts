import { db } from '../firebase/admin'
import { v4 as uuid } from 'uuid'
import { differenceInDays, parseISO, format } from 'date-fns'
import { gerarPDF } from '../utils/pdf'
import logger from '../utils/logger'

const JUROS_MES = 0.01
const MULTA = 0.02

export class PagamentosService {
  async listar(filtros: Record<string, unknown> = {}) {
    let query: FirebaseFirestore.Query = db.collection('pagamentos')
    for (const [k, v] of Object.entries(filtros)) {
      if (v !== undefined && v !== null && v !== '') query = query.where(k, '==', v)
    }
    const snap = await query.orderBy('criadoEm', 'desc').get()
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  }

  async registrar(data: {
    parcelaId: string
    valor: number
    formaPagamento: string
    dataPagamento: string
    comprovante?: string
    observacoes?: string
    registradoPor: string
  }) {
    const parcelaDoc = await db.collection('parcelas').doc(data.parcelaId).get()
    if (!parcelaDoc.exists) throw Object.assign(new Error('Parcela não encontrada'), { statusCode: 404 })

    const parcela = parcelaDoc.data()!
    if (parcela.status === 'paga') {
      throw Object.assign(new Error('Parcela já está paga'), { statusCode: 409 })
    }
    if (parcela.status === 'cancelada') {
      throw Object.assign(new Error('Parcela cancelada não pode ser paga'), { statusCode: 409 })
    }

    const vencimento = parseISO(parcela.vencimento)
    const pagamento = parseISO(data.dataPagamento)
    const diasAtraso = Math.max(0, differenceInDays(pagamento, vencimento))
    const juros = diasAtraso > 0 ? parcela.valor * JUROS_MES * (diasAtraso / 30) : 0
    const multa = diasAtraso > 0 ? parcela.valor * MULTA : 0
    const valorTotal = parcela.valor + juros + multa

    const agora = new Date().toISOString()
    const pagamentoId = uuid()
    const pagamentoData = {
      id: pagamentoId,
      parcelaId: data.parcelaId,
      vendaId: parcela.vendaId,
      clienteId: parcela.clienteId,
      proprietarioId: parcela.proprietarioId,
      projetoId: parcela.projetoId,
      valor: parseFloat(valorTotal.toFixed(2)),
      valorPrincipal: parcela.valor,
      juros: parseFloat(juros.toFixed(2)),
      multa: parseFloat(multa.toFixed(2)),
      diasAtraso,
      dataPagamento: data.dataPagamento,
      formaPagamento: data.formaPagamento,
      comprovante: data.comprovante || null,
      observacoes: data.observacoes || null,
      registradoPor: data.registradoPor,
      criadoEm: agora,
    }

    const batch = db.batch()
    batch.set(db.collection('pagamentos').doc(pagamentoId), pagamentoData)

    batch.update(db.collection('parcelas').doc(data.parcelaId), {
      status: 'paga',
      valorPago: parseFloat(valorTotal.toFixed(2)),
      pagamento: data.dataPagamento,
      juros: parseFloat(juros.toFixed(2)),
      multa: parseFloat(multa.toFixed(2)),
      pagamentoId,
      atualizadoEm: agora,
    })

    // Atualizar promissória se existir
    const promSnap = await db.collection('promissorias')
      .where('parcelaId', '==', data.parcelaId)
      .where('status', '==', 'ativa')
      .get()
    promSnap.docs.forEach((p) => {
      batch.update(p.ref, { status: 'quitada', atualizadoEm: agora })
    })

    // Movimentação financeira
    const movId = uuid()
    batch.set(db.collection('movimentacoesFinanceiras').doc(movId), {
      id: movId,
      tipo: 'entrada',
      categoria: 'pagamento_parcela',
      descricao: `Parcela ${parcela.numero} - Venda ${parcela.vendaId.substring(0, 8)}`,
      valor: parseFloat(valorTotal.toFixed(2)),
      data: data.dataPagamento,
      vendaId: parcela.vendaId,
      parcelaId: data.parcelaId,
      pagamentoId,
      proprietarioId: parcela.proprietarioId,
      projetoId: parcela.projetoId,
      registradoPor: data.registradoPor,
      criadoEm: agora,
    })

    await batch.commit()

    // Verificar se todas as parcelas foram pagas
    await this.verificarQuitacao(parcela.vendaId)

    logger.info(`Pagamento registrado: parcela ${data.parcelaId}`)
    return pagamentoData
  }

  private async verificarQuitacao(vendaId: string) {
    const parcelasSnap = await db.collection('parcelas')
      .where('vendaId', '==', vendaId)
      .get()

    const todas = parcelasSnap.docs.map((d) => d.data())
    const todasPagas = todas.every((p) => p.status === 'paga' || p.status === 'cancelada')

    if (todasPagas) {
      await db.collection('vendas').doc(vendaId).update({
        status: 'quitada',
        quitadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
      })
      logger.info(`Venda quitada: ${vendaId}`)
    }
  }

  async estornar(pagamentoId: string) {
    const pagDoc = await db.collection('pagamentos').doc(pagamentoId).get()
    if (!pagDoc.exists) throw Object.assign(new Error('Pagamento não encontrado'), { statusCode: 404 })

    const pagamento = pagDoc.data()!
    const agora = new Date().toISOString()
    const batch = db.batch()

    batch.delete(db.collection('pagamentos').doc(pagamentoId))

    batch.update(db.collection('parcelas').doc(pagamento.parcelaId), {
      status: 'pendente',
      valorPago: null,
      pagamento: null,
      juros: 0,
      multa: 0,
      pagamentoId: null,
      atualizadoEm: agora,
    })

    // Reverter promissória
    const promSnap = await db.collection('promissorias')
      .where('parcelaId', '==', pagamento.parcelaId)
      .where('status', '==', 'quitada')
      .get()
    promSnap.docs.forEach((p) => {
      batch.update(p.ref, { status: 'ativa', atualizadoEm: agora })
    })

    // Reverter status da venda se estava quitada
    const vendaDoc = await db.collection('vendas').doc(pagamento.vendaId).get()
    if (vendaDoc.exists && vendaDoc.data()!.status === 'quitada') {
      batch.update(db.collection('vendas').doc(pagamento.vendaId), {
        status: 'ativa',
        quitadoEm: null,
        atualizadoEm: agora,
      })
    }

    await batch.commit()
    return { estornado: true }
  }

  async gerarRecibo(pagamentoId: string) {
    const pagDoc = await db.collection('pagamentos').doc(pagamentoId).get()
    if (!pagDoc.exists) throw Object.assign(new Error('Pagamento não encontrado'), { statusCode: 404 })

    const pagamento = pagDoc.data()!
    const parcelaDoc = await db.collection('parcelas').doc(pagamento.parcelaId).get()
    const clienteDoc = await db.collection('clientes').doc(pagamento.clienteId).get()

    const url = await gerarPDF('recibo', {
      pagamento: { ...pagamento, id: pagamentoId },
      parcela: parcelaDoc.data(),
      cliente: clienteDoc.data(),
      dataGeracao: new Date().toLocaleDateString('pt-BR'),
    }, `recibo-${pagamentoId}.pdf`)

    return { url }
  }
}
