import { db } from '../firebase/admin'
import { v4 as uuid } from 'uuid'
import { addMonths, format, parseISO } from 'date-fns'
import { gerarPDF } from '../utils/pdf'
import logger from '../utils/logger'

export class VendasService {
  async listar(filtros: Record<string, unknown> = {}) {
    let query: FirebaseFirestore.Query = db.collection('vendas')
    for (const [k, v] of Object.entries(filtros)) {
      if (v !== undefined && v !== null && v !== '') query = query.where(k, '==', v)
    }
    const snap = await query.orderBy('criadoEm', 'desc').get()
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  }

  async buscar(id: string) {
    const doc = await db.collection('vendas').doc(id).get()
    if (!doc.exists) throw Object.assign(new Error('Venda não encontrada'), { statusCode: 404 })
    return { id: doc.id, ...doc.data() }
  }

  async buscarParcelas(vendaId: string) {
    const snap = await db.collection('parcelas')
      .where('vendaId', '==', vendaId)
      .orderBy('numero')
      .get()
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  }

  async criar(data: {
    loteId: string
    clienteId: string
    vendedorId: string
    valor: number
    entrada: number
    numeroParcelas: number
    diaVencimento: number
    primeiroVencimento: string
    observacoes?: string
  }) {
    const loteDoc = await db.collection('lotes').doc(data.loteId).get()
    if (!loteDoc.exists) throw Object.assign(new Error('Lote não encontrado'), { statusCode: 404 })

    const lote = loteDoc.data()!
    if (lote.status !== 'disponivel' && lote.status !== 'reservado') {
      throw Object.assign(new Error(`Lote não disponível para venda (status: ${lote.status})`), { statusCode: 409 })
    }

    const agora = new Date().toISOString()
    const saldo = data.valor - data.entrada
    const valorParcela = saldo / data.numeroParcelas

    const vendaId = uuid()
    const venda = {
      id: vendaId,
      loteId: data.loteId,
      clienteId: data.clienteId,
      proprietarioId: lote.proprietarioId,
      projetoId: lote.projetoId,
      quadraId: lote.quadraId,
      vendedorId: data.vendedorId,
      valor: data.valor,
      entrada: data.entrada,
      saldo,
      numeroParcelas: data.numeroParcelas,
      valorParcela: parseFloat(valorParcela.toFixed(2)),
      diaVencimento: data.diaVencimento,
      primeiroVencimento: data.primeiroVencimento,
      dataVenda: agora,
      status: 'ativa',
      observacoes: data.observacoes || null,
      criadoEm: agora,
      atualizadoEm: agora,
    }

    const batch = db.batch()
    batch.set(db.collection('vendas').doc(vendaId), venda)

    // Gerar parcelas
    const parcelas = []
    for (let i = 1; i <= data.numeroParcelas; i++) {
      const vencimento = addMonths(parseISO(data.primeiroVencimento), i - 1)
      const parcelaId = uuid()
      const parcela = {
        id: parcelaId,
        vendaId,
        loteId: data.loteId,
        clienteId: data.clienteId,
        proprietarioId: lote.proprietarioId,
        projetoId: lote.projetoId,
        numero: i,
        valor: parseFloat(valorParcela.toFixed(2)),
        valorPago: null,
        vencimento: format(vencimento, 'yyyy-MM-dd'),
        pagamento: null,
        status: 'pendente',
        juros: 0,
        multa: 0,
        desconto: 0,
        promissoriaUrl: null,
        criadoEm: agora,
        atualizadoEm: agora,
      }
      batch.set(db.collection('parcelas').doc(parcelaId), parcela)
      parcelas.push(parcela)
    }

    // Atualizar status do lote
    batch.update(db.collection('lotes').doc(data.loteId), {
      status: 'vendido',
      vendaId,
      atualizadoEm: agora,
    })

    // Registrar entrada como movimentação
    if (data.entrada > 0) {
      const movId = uuid()
      batch.set(db.collection('movimentacoesFinanceiras').doc(movId), {
        id: movId,
        tipo: 'entrada',
        categoria: 'entrada_venda',
        descricao: `Entrada - Venda ${vendaId.substring(0, 8)}`,
        valor: data.entrada,
        data: agora,
        vendaId,
        proprietarioId: lote.proprietarioId,
        projetoId: lote.projetoId,
        registradoPor: data.vendedorId,
        criadoEm: agora,
      })
    }

    await batch.commit()
    logger.info(`Venda criada: ${vendaId} - Lote: ${data.loteId}`)
    return { ...venda, parcelas }
  }

  async cancelar(id: string, motivo: string) {
    const vendaDoc = await db.collection('vendas').doc(id).get()
    if (!vendaDoc.exists) throw Object.assign(new Error('Venda não encontrada'), { statusCode: 404 })

    const venda = vendaDoc.data()!
    if (venda.status !== 'ativa') {
      throw Object.assign(new Error('Somente vendas ativas podem ser canceladas'), { statusCode: 409 })
    }

    const agora = new Date().toISOString()
    const batch = db.batch()

    batch.update(db.collection('vendas').doc(id), {
      status: 'cancelada',
      motivoCancelamento: motivo,
      canceladoEm: agora,
      atualizadoEm: agora,
    })

    // Cancelar parcelas pendentes
    const parcelasSnap = await db.collection('parcelas')
      .where('vendaId', '==', id)
      .where('status', 'in', ['pendente', 'vencida'])
      .get()

    parcelasSnap.docs.forEach((p) => {
      batch.update(p.ref, { status: 'cancelada', atualizadoEm: agora })
    })

    // Liberar lote
    batch.update(db.collection('lotes').doc(venda.loteId), {
      status: 'disponivel',
      vendaId: null,
      atualizadoEm: agora,
    })

    await batch.commit()
    return { id, status: 'cancelada' }
  }

  async distratar(id: string, motivo: string) {
    const vendaDoc = await db.collection('vendas').doc(id).get()
    if (!vendaDoc.exists) throw Object.assign(new Error('Venda não encontrada'), { statusCode: 404 })

    const venda = vendaDoc.data()!
    if (venda.status !== 'ativa') {
      throw Object.assign(new Error('Somente vendas ativas podem ser distratadas'), { statusCode: 409 })
    }

    const agora = new Date().toISOString()
    const batch = db.batch()

    batch.update(db.collection('vendas').doc(id), {
      status: 'distratada',
      motivoDistrato: motivo,
      distratatoEm: agora,
      atualizadoEm: agora,
    })

    const parcelasSnap = await db.collection('parcelas')
      .where('vendaId', '==', id)
      .where('status', 'in', ['pendente', 'vencida'])
      .get()

    parcelasSnap.docs.forEach((p) => {
      batch.update(p.ref, { status: 'cancelada', atualizadoEm: agora })
    })

    batch.update(db.collection('lotes').doc(venda.loteId), {
      status: 'disponivel',
      vendaId: null,
      atualizadoEm: agora,
    })

    await batch.commit()
    return { id, status: 'distratada' }
  }

  async deletar(id: string) {
    const vendaDoc = await db.collection('vendas').doc(id).get()
    if (!vendaDoc.exists) throw Object.assign(new Error('Venda não encontrada'), { statusCode: 404 })
    const venda = vendaDoc.data()!
    const batch = db.batch()
    batch.delete(db.collection('vendas').doc(id))
    if (venda.loteId) {
      batch.update(db.collection('lotes').doc(venda.loteId), {
        status: 'disponivel', vendaId: null, atualizadoEm: new Date().toISOString(),
      })
    }
    const parcelasSnap = await db.collection('parcelas').where('vendaId', '==', id).get()
    parcelasSnap.docs.forEach((p) => batch.delete(p.ref))
    await batch.commit()
  }

  async gerarContrato(vendaId: string) {
    const vendaDoc = await db.collection('vendas').doc(vendaId).get()
    if (!vendaDoc.exists) throw Object.assign(new Error('Venda não encontrada'), { statusCode: 404 })

    const venda = vendaDoc.data()!
    const [loteDoc, clienteDoc] = await Promise.all([
      db.collection('lotes').doc(venda.loteId).get(),
      db.collection('clientes').doc(venda.clienteId).get(),
    ])

    const lote = loteDoc.data()!
    const cliente = clienteDoc.data()!

    let quadraNome = '', projetoNome = ''
    const quadraDoc = await db.collection('quadras').doc(lote.quadraId).get()
    if (quadraDoc.exists) quadraNome = quadraDoc.data()!.nome
    const projetoDoc = await db.collection('projetos').doc(lote.projetoId).get()
    if (projetoDoc.exists) projetoNome = projetoDoc.data()!.nome

    const url = await gerarPDF('contrato', {
      venda: { ...venda, id: vendaId },
      lote: { ...lote, quadraNome, projetoNome },
      cliente,
      dataGeracao: new Date().toLocaleDateString('pt-BR'),
    }, `contrato-${vendaId}.pdf`)

    await db.collection('vendas').doc(vendaId).update({
      contratoUrl: url,
      atualizadoEm: new Date().toISOString(),
    })

    await db.collection('documentos').add({
      tipo: 'contrato',
      vendaId,
      clienteId: venda.clienteId,
      url,
      criadoEm: new Date().toISOString(),
    })

    return { url }
  }
}
