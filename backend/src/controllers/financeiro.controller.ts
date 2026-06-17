import { Response } from 'express'
import { AuthRequest } from '../middlewares/auth.middleware'
import { db } from '../firebase/admin'
import { v4 as uuid } from 'uuid'
import { successResponse } from '../utils/response'

export class FinanceiroController {
  async listarMovimentacoes(req: AuthRequest, res: Response) {
    let query: FirebaseFirestore.Query = db.collection('movimentacoesFinanceiras')
    const { tipo, proprietarioId, projetoId } = req.query
    if (tipo) query = query.where('tipo', '==', tipo)
    if (proprietarioId) query = query.where('proprietarioId', '==', proprietarioId)
    if (projetoId) query = query.where('projetoId', '==', projetoId)
    const snap = await query.orderBy('criadoEm', 'desc').limit(200).get()
    return successResponse(res, snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  }

  async resumo(_req: AuthRequest, res: Response) {
    const snap = await db.collection('movimentacoesFinanceiras').get()
    const movs = snap.docs.map((d) => d.data())
    const entradas = movs.filter((m) => m.tipo === 'entrada').reduce((a, m) => a + (m.valor || 0), 0)
    const saidas = movs.filter((m) => m.tipo === 'saida').reduce((a, m) => a + (m.valor || 0), 0)
    const repasses = movs.filter((m) => m.tipo === 'repasse').reduce((a, m) => a + (m.valor || 0), 0)
    return successResponse(res, { entradas, saidas, repasses, saldo: entradas - saidas - repasses })
  }

  async listarRepasses(req: AuthRequest, res: Response) {
    let query: FirebaseFirestore.Query = db.collection('repasses')
    if (req.query.proprietarioId) query = query.where('proprietarioId', '==', req.query.proprietarioId)
    if (req.query.status) query = query.where('status', '==', req.query.status)
    const snap = await query.orderBy('criadoEm', 'desc').get()
    return successResponse(res, snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  }

  async buscarRepasse(req: AuthRequest, res: Response) {
    const doc = await db.collection('repasses').doc(req.params.id).get()
    if (!doc.exists) throw Object.assign(new Error('Repasse não encontrado'), { statusCode: 404 })
    return successResponse(res, { id: doc.id, ...doc.data() })
  }

  async criarRepasse(req: AuthRequest, res: Response) {
    const agora = new Date().toISOString()
    const id = uuid()
    const data = { id, ...req.body, status: 'pendente', criadoEm: agora, atualizadoEm: agora }
    await db.collection('repasses').doc(id).set(data)
    return successResponse(res, data, 'Repasse criado com sucesso', 201)
  }

  async pagarRepasse(req: AuthRequest, res: Response) {
    const agora = new Date().toISOString()
    await db.collection('repasses').doc(req.params.id).update({
      status: 'pago',
      pagamento: req.body.dataPagamento || agora,
      comprovante: req.body.comprovante || null,
      atualizadoEm: agora,
    })

    const movId = uuid()
    const repasseDoc = await db.collection('repasses').doc(req.params.id).get()
    const repasse = repasseDoc.data()!
    await db.collection('movimentacoesFinanceiras').doc(movId).set({
      id: movId,
      tipo: 'repasse',
      categoria: 'repasse_proprietario',
      descricao: `Repasse proprietário - ${repasse.periodo}`,
      valor: repasse.totalRepasse,
      data: req.body.dataPagamento || agora,
      proprietarioId: repasse.proprietarioId,
      repasseId: req.params.id,
      registradoPor: req.user!.uid,
      criadoEm: agora,
    })

    return successResponse(res, null, 'Repasse registrado como pago')
  }

  async criarMovimentacao(req: AuthRequest, res: Response) {
    const agora = new Date().toISOString()
    const id = uuid()
    const data = { id, ...req.body, registradoPor: req.user!.uid, criadoEm: agora }
    await db.collection('movimentacoesFinanceiras').doc(id).set(data)
    return successResponse(res, data, 'Movimentação registrada', 201)
  }

  async deletarMovimentacao(req: AuthRequest, res: Response) {
    const doc = await db.collection('movimentacoesFinanceiras').doc(req.params.id).get()
    if (!doc.exists) throw Object.assign(new Error('Movimentação não encontrada'), { statusCode: 404 })
    await db.collection('movimentacoesFinanceiras').doc(req.params.id).delete()
    return successResponse(res, null, 'Movimentação excluída com sucesso')
  }

  async deletarRepasse(req: AuthRequest, res: Response) {
    const doc = await db.collection('repasses').doc(req.params.id).get()
    if (!doc.exists) throw Object.assign(new Error('Repasse não encontrado'), { statusCode: 404 })
    await db.collection('repasses').doc(req.params.id).delete()
    return successResponse(res, null, 'Repasse excluído com sucesso')
  }
}
