import { Response } from 'express'
import { AuthRequest } from '../middlewares/auth.middleware'
import { db } from '../firebase/admin'
import { successResponse } from '../utils/response'

export class PromissoriasController {
  async listar(req: AuthRequest, res: Response) {
    let query: FirebaseFirestore.Query = db.collection('promissorias')
    const { status, vendaId, clienteId } = req.query
    if (status) query = query.where('status', '==', status)
    if (vendaId) query = query.where('vendaId', '==', vendaId)
    if (clienteId) query = query.where('clienteId', '==', clienteId)
    const snap = await query.orderBy('criadoEm', 'desc').get()
    return successResponse(res, snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  }

  async buscar(req: AuthRequest, res: Response) {
    const doc = await db.collection('promissorias').doc(req.params.id).get()
    if (!doc.exists) throw Object.assign(new Error('Promissória não encontrada'), { statusCode: 404 })
    return successResponse(res, { id: doc.id, ...doc.data() })
  }

  async gerarLote(req: AuthRequest, res: Response) {
    const { vendaId } = req.body
    const parcelasSnap = await db.collection('parcelas')
      .where('vendaId', '==', vendaId)
      .where('status', 'in', ['pendente', 'vencida'])
      .get()
    return successResponse(res, { total: parcelasSnap.size, message: 'Use o endpoint de parcela individual para gerar cada promissória' })
  }

  async cancelar(req: AuthRequest, res: Response) {
    await db.collection('promissorias').doc(req.params.id).update({
      status: 'cancelada',
      atualizadoEm: new Date().toISOString(),
    })
    return successResponse(res, null, 'Promissória cancelada')
  }

  async baixarPDF(req: AuthRequest, res: Response) {
    const doc = await db.collection('promissorias').doc(req.params.id).get()
    if (!doc.exists) throw Object.assign(new Error('Promissória não encontrada'), { statusCode: 404 })
    const data = doc.data()!
    if (!data.pdfUrl) throw Object.assign(new Error('PDF ainda não gerado'), { statusCode: 404 })
    return successResponse(res, { url: data.pdfUrl })
  }

  async deletar(req: AuthRequest, res: Response) {
    const doc = await db.collection('promissorias').doc(req.params.id).get()
    if (!doc.exists) throw Object.assign(new Error('Promissória não encontrada'), { statusCode: 404 })
    await db.collection('promissorias').doc(req.params.id).delete()
    return successResponse(res, null, 'Promissória excluída com sucesso')
  }
}
