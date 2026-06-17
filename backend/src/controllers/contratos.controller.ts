import { Response } from 'express'
import { AuthRequest } from '../middlewares/auth.middleware'
import { db } from '../firebase/admin'
import { VendasService } from '../services/vendas.service'
import { successResponse } from '../utils/response'

const vendasService = new VendasService()

export class ContratosController {
  async listar(req: AuthRequest, res: Response) {
    let query: FirebaseFirestore.Query = db.collection('documentos').where('tipo', '==', 'contrato')
    if (req.query.vendaId) query = query.where('vendaId', '==', req.query.vendaId)
    const snap = await query.orderBy('criadoEm', 'desc').get()
    return successResponse(res, snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  }

  async buscar(req: AuthRequest, res: Response) {
    const doc = await db.collection('documentos').doc(req.params.id).get()
    if (!doc.exists) throw Object.assign(new Error('Contrato não encontrado'), { statusCode: 404 })
    return successResponse(res, { id: doc.id, ...doc.data() })
  }

  async gerar(req: AuthRequest, res: Response) {
    const data = await vendasService.gerarContrato(req.params.vendaId)
    return successResponse(res, data, 'Contrato gerado com sucesso')
  }

  async baixarPDF(req: AuthRequest, res: Response) {
    const doc = await db.collection('documentos').doc(req.params.id).get()
    if (!doc.exists) throw Object.assign(new Error('Contrato não encontrado'), { statusCode: 404 })
    return successResponse(res, { url: doc.data()!.url })
  }

  async deletar(req: AuthRequest, res: Response) {
    const doc = await db.collection('documentos').doc(req.params.id).get()
    if (!doc.exists) throw Object.assign(new Error('Contrato não encontrado'), { statusCode: 404 })
    await db.collection('documentos').doc(req.params.id).delete()
    return successResponse(res, null, 'Contrato excluído com sucesso')
  }
}
