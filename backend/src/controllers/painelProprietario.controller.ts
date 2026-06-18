import { Response } from 'express'
import { AuthRequest } from '../middlewares/auth.middleware'
import prisma from '../lib/prisma'
import { successResponse } from '../utils/response'

export class PainelProprietarioController {
  private getProprietarioId(req: AuthRequest) {
    const id = req.user!.proprietarioId
    if (!id) throw Object.assign(new Error('Usuário sem proprietário vinculado'), { statusCode: 403 })
    return id
  }

  async resumo(req: AuthRequest, res: Response) {
    const proprietarioId = this.getProprietarioId(req)
    const [lotes, vendas, inadimplentes, repasses, parcelasPagas] = await Promise.all([
      prisma.lote.findMany({ where: { proprietarioId } }),
      prisma.venda.findMany({ where: { proprietarioId } }),
      prisma.parcela.count({ where: { proprietarioId, status: 'vencida' } }),
      prisma.repasse.findMany({ where: { proprietarioId } }),
      prisma.parcela.findMany({ where: { proprietarioId, status: 'paga' } }),
    ])

    return successResponse(res, {
      totalLotes: lotes.length,
      lotesDisponiveis: lotes.filter((l) => l.status === 'disponivel').length,
      lotesVendidos: lotes.filter((l) => l.status === 'vendido').length,
      totalVendas: vendas.length,
      vendasAtivas: vendas.filter((v) => v.status === 'ativa').length,
      inadimplentes,
      valorRecebido: parcelasPagas.reduce((a, p) => a + (p.valor || 0), 0),
      valorRepasses: repasses.reduce((a, r) => a + (r.totalRepasse || 0), 0),
      repassesPendentes: repasses.filter((r) => r.status === 'pendente').length,
    })
  }

  async lotes(req: AuthRequest, res: Response) {
    const proprietarioId = this.getProprietarioId(req)
    const lotes = await prisma.lote.findMany({
      where: { proprietarioId },
      orderBy: { criadoEm: 'desc' },
    })
    return successResponse(res, lotes.map((l) => ({
      id: l.id,
      numero: l.numero,
      area: l.area,
      valorBase: l.valorBase,
      status: l.status,
      projetoId: l.projetoId,
    })))
  }

  async financeiro(req: AuthRequest, res: Response) {
    const proprietarioId = this.getProprietarioId(req)
    const movs = await prisma.movimentacaoFinanceira.findMany({
      where: { proprietarioId },
      orderBy: { criadoEm: 'desc' },
      take: 100,
    })
    return successResponse(res, movs.map((m) => ({
      id: m.id,
      tipo: m.tipo,
      categoria: m.categoria,
      valor: m.valor,
      data: m.data,
      descricao: m.descricao,
    })))
  }

  async repasses(req: AuthRequest, res: Response) {
    const proprietarioId = this.getProprietarioId(req)
    const repasses = await prisma.repasse.findMany({
      where: { proprietarioId },
      orderBy: { criadoEm: 'desc' },
    })
    return successResponse(res, repasses)
  }

  async inadimplencia(req: AuthRequest, res: Response) {
    const proprietarioId = this.getProprietarioId(req)
    const parcelas = await prisma.parcela.findMany({
      where: { proprietarioId, status: 'vencida' },
    })
    return successResponse(res, {
      total: parcelas.length,
      valorTotal: parcelas.reduce((a, p) => a + (p.valor || 0), 0),
    })
  }
}
