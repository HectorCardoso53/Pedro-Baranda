import { Response } from 'express'
import { AuthRequest } from '../middlewares/auth.middleware'
import { db } from '../firebase/admin'
import { successResponse } from '../utils/response'

export class PainelProprietarioController {
  private getProprietarioId(req: AuthRequest) {
    const id = req.user!.proprietarioId
    if (!id) throw Object.assign(new Error('Usuário sem proprietário vinculado'), { statusCode: 403 })
    return id
  }

  async resumo(req: AuthRequest, res: Response) {
    const proprietarioId = this.getProprietarioId(req)
    const [lotesSnap, vendasSnap, parcelasVencidasSnap, repassesSnap] = await Promise.all([
      db.collection('lotes').where('proprietarioId', '==', proprietarioId).get(),
      db.collection('vendas').where('proprietarioId', '==', proprietarioId).get(),
      db.collection('parcelas').where('proprietarioId', '==', proprietarioId).where('status', '==', 'vencida').get(),
      db.collection('repasses').where('proprietarioId', '==', proprietarioId).get(),
    ])

    const lotes = lotesSnap.docs.map((d) => d.data())
    const vendas = vendasSnap.docs.map((d) => d.data())
    const repasses = repassesSnap.docs.map((d) => d.data())

    const parcelaspagas = await db.collection('parcelas')
      .where('proprietarioId', '==', proprietarioId)
      .where('status', '==', 'paga')
      .get()

    return successResponse(res, {
      totalLotes: lotes.length,
      lotesDisponiveis: lotes.filter((l) => l.status === 'disponivel').length,
      lotesVendidos: lotes.filter((l) => l.status === 'vendido').length,
      totalVendas: vendas.length,
      vendasAtivas: vendas.filter((v) => v.status === 'ativa').length,
      inadimplentes: parcelasVencidasSnap.size,
      valorRecebido: parcelaspagas.docs.reduce((a, d) => a + (d.data().valor || 0), 0),
      valorRepasses: repasses.reduce((a, r) => a + (r.totalRepasse || 0), 0),
      repassesPendentes: repasses.filter((r) => r.status === 'pendente').length,
    })
  }

  async lotes(req: AuthRequest, res: Response) {
    const proprietarioId = this.getProprietarioId(req)
    const snap = await db.collection('lotes')
      .where('proprietarioId', '==', proprietarioId)
      .orderBy('criadoEm', 'desc')
      .get()
    return successResponse(res, snap.docs.map((d) => {
      const data = d.data()
      return { id: d.id, numero: data.numero, area: data.area, valorBase: data.valorBase, status: data.status, projetoId: data.projetoId }
    }))
  }

  async financeiro(req: AuthRequest, res: Response) {
    const proprietarioId = this.getProprietarioId(req)
    const snap = await db.collection('movimentacoesFinanceiras')
      .where('proprietarioId', '==', proprietarioId)
      .orderBy('criadoEm', 'desc')
      .limit(100)
      .get()
    return successResponse(res, snap.docs.map((d) => {
      const data = d.data()
      return { id: d.id, tipo: data.tipo, categoria: data.categoria, valor: data.valor, data: data.data, descricao: data.descricao }
    }))
  }

  async repasses(req: AuthRequest, res: Response) {
    const proprietarioId = this.getProprietarioId(req)
    const snap = await db.collection('repasses')
      .where('proprietarioId', '==', proprietarioId)
      .orderBy('criadoEm', 'desc')
      .get()
    return successResponse(res, snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  }

  async inadimplencia(req: AuthRequest, res: Response) {
    const proprietarioId = this.getProprietarioId(req)
    const snap = await db.collection('parcelas')
      .where('proprietarioId', '==', proprietarioId)
      .where('status', '==', 'vencida')
      .get()
    return successResponse(res, {
      total: snap.size,
      valorTotal: snap.docs.reduce((a, d) => a + (d.data().valor || 0), 0),
    })
  }
}
