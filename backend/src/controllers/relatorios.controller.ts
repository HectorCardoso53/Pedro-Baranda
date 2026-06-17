import { Response } from 'express'
import { AuthRequest } from '../middlewares/auth.middleware'
import { db } from '../firebase/admin'
import { successResponse } from '../utils/response'

export class RelatoriosController {
  async vendas(req: AuthRequest, res: Response) {
    const { dataInicio, dataFim, projetoId } = req.query
    let query: FirebaseFirestore.Query = db.collection('vendas')
    if (projetoId) query = query.where('projetoId', '==', projetoId)
    if (dataInicio) query = query.where('criadoEm', '>=', dataInicio as string)
    if (dataFim) query = query.where('criadoEm', '<=', (dataFim as string) + 'T23:59:59')
    const snap = await query.get()
    const vendas = snap.docs.map((d) => d.data())
    return successResponse(res, {
      total: vendas.length,
      valorTotal: vendas.reduce((a, v) => a + (v.valor || 0), 0),
      porStatus: {
        ativa: vendas.filter((v) => v.status === 'ativa').length,
        quitada: vendas.filter((v) => v.status === 'quitada').length,
        cancelada: vendas.filter((v) => v.status === 'cancelada').length,
        distratada: vendas.filter((v) => v.status === 'distratada').length,
      },
      vendas,
    })
  }

  async financeiro(req: AuthRequest, res: Response) {
    const { dataInicio, dataFim } = req.query
    let query: FirebaseFirestore.Query = db.collection('pagamentos')
    if (dataInicio) query = query.where('dataPagamento', '>=', dataInicio as string)
    if (dataFim) query = query.where('dataPagamento', '<=', dataFim as string)
    const snap = await query.get()
    const pagamentos = snap.docs.map((d) => d.data())
    return successResponse(res, {
      total: pagamentos.length,
      valorTotal: pagamentos.reduce((a, p) => a + (p.valor || 0), 0),
      jurosTotal: pagamentos.reduce((a, p) => a + (p.juros || 0), 0),
      multaTotal: pagamentos.reduce((a, p) => a + (p.multa || 0), 0),
    })
  }

  async inadimplencia(_req: AuthRequest, res: Response) {
    const snap = await db.collection('parcelas').where('status', '==', 'vencida').get()
    const parcelas = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    return successResponse(res, {
      total: parcelas.length,
      valorTotal: parcelas.reduce((a: number, p: any) => a + (p.valor || 0), 0),
      parcelas,
    })
  }

  async lotes(_req: AuthRequest, res: Response) {
    const snap = await db.collection('lotes').get()
    const lotes = snap.docs.map((d) => d.data())
    return successResponse(res, {
      total: lotes.length,
      disponivel: lotes.filter((l) => l.status === 'disponivel').length,
      vendido: lotes.filter((l) => l.status === 'vendido').length,
      reservado: lotes.filter((l) => l.status === 'reservado').length,
      bloqueado: lotes.filter((l) => l.status === 'bloqueado').length,
      valorTotalDisponivel: lotes.filter((l) => l.status === 'disponivel').reduce((a, l) => a + (l.valorBase || 0), 0),
    })
  }

  async repasses(_req: AuthRequest, res: Response) {
    const snap = await db.collection('repasses').orderBy('criadoEm', 'desc').get()
    const repasses = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    return successResponse(res, {
      total: repasses.length,
      pendentes: repasses.filter((r: any) => r.status === 'pendente').length,
      pagos: repasses.filter((r: any) => r.status === 'pago').length,
      valorTotal: repasses.reduce((a: number, r: any) => a + (r.totalRepasse || 0), 0),
      repasses,
    })
  }
}
