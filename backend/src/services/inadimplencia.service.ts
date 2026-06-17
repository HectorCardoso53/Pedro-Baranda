import { db } from '../firebase/admin'
import { format, isBefore, parseISO } from 'date-fns'
import logger from '../utils/logger'

export class InadimplenciaService {
  async processar() {
    const hoje = format(new Date(), 'yyyy-MM-dd')
    const batch = db.batch()
    let count = 0

    const parcelasSnap = await db.collection('parcelas')
      .where('status', '==', 'pendente')
      .get()

    const agora = new Date().toISOString()
    for (const doc of parcelasSnap.docs) {
      const parcela = doc.data()
      if (isBefore(parseISO(parcela.vencimento), parseISO(hoje))) {
        batch.update(doc.ref, { status: 'vencida', atualizadoEm: agora })

        // Atualizar promissórias ativas
        const promSnap = await db.collection('promissorias')
          .where('parcelaId', '==', doc.id)
          .where('status', '==', 'ativa')
          .get()
        promSnap.docs.forEach((p) => {
          batch.update(p.ref, { status: 'vencida', atualizadoEm: agora })
        })

        count++
      }
    }

    if (count > 0) await batch.commit()
    logger.info(`Inadimplência processada: ${count} parcelas marcadas como vencidas`)
    return { processadas: count }
  }

  async listar(filtros: Record<string, unknown> = {}) {
    let query: FirebaseFirestore.Query = db.collection('parcelas')
      .where('status', '==', 'vencida')

    for (const [k, v] of Object.entries(filtros)) {
      if (v !== undefined && v !== null && v !== '') query = query.where(k, '==', v)
    }

    const snap = await query.orderBy('vencimento').get()
    const parcelas = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

    // Enriquecer com dados do cliente
    const clienteIds = [...new Set(parcelas.map((p: any) => p.clienteId))]
    const clientes: Record<string, any> = {}

    await Promise.all(
      clienteIds.map(async (id) => {
        const doc = await db.collection('clientes').doc(id as string).get()
        if (doc.exists) clientes[id as string] = doc.data()
      })
    )

    return parcelas.map((p: any) => ({
      ...p,
      cliente: clientes[p.clienteId] ? { nome: clientes[p.clienteId].nome, celular: clientes[p.clienteId].celular } : null,
    }))
  }

  async resumo() {
    const snap = await db.collection('parcelas').where('status', '==', 'vencida').get()
    const parcelas = snap.docs.map((d) => d.data())

    const totalParcelas = parcelas.length
    const valorTotal = parcelas.reduce((acc, p) => acc + (p.valor || 0), 0)

    const porProjeto: Record<string, { count: number; valor: number; projetoId: string }> = {}
    for (const p of parcelas) {
      if (!porProjeto[p.projetoId]) porProjeto[p.projetoId] = { count: 0, valor: 0, projetoId: p.projetoId }
      porProjeto[p.projetoId].count++
      porProjeto[p.projetoId].valor += p.valor || 0
    }

    return { totalParcelas, valorTotal, porProjeto: Object.values(porProjeto) }
  }

  async porProjeto() {
    const snap = await db.collection('parcelas').where('status', '==', 'vencida').get()
    const parcelas = snap.docs.map((d) => d.data())

    const agrupado: Record<string, any> = {}
    for (const p of parcelas) {
      if (!agrupado[p.projetoId]) {
        agrupado[p.projetoId] = { projetoId: p.projetoId, total: 0, valor: 0, clientes: new Set() }
      }
      agrupado[p.projetoId].total++
      agrupado[p.projetoId].valor += p.valor || 0
      agrupado[p.projetoId].clientes.add(p.clienteId)
    }

    return Object.values(agrupado).map((g: any) => ({
      ...g,
      clientesUnicos: g.clientes.size,
      clientes: undefined,
    }))
  }
}
