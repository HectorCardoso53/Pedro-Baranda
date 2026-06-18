import { Response } from 'express'
import { AuthRequest } from '../middlewares/auth.middleware'
import prisma from '../lib/prisma'
import { successResponse } from '../utils/response'

export class RelatoriosController {
  async vendas(req: AuthRequest, res: Response) {
    const { dataInicio, dataFim, projetoId } = req.query
    const where: Record<string, any> = {}
    if (projetoId) where.projetoId = projetoId
    if (dataInicio || dataFim) {
      where.criadoEm = {}
      if (dataInicio) where.criadoEm.gte = new Date(dataInicio as string)
      if (dataFim) where.criadoEm.lte = new Date((dataFim as string) + 'T23:59:59')
    }
    const vendas = await prisma.venda.findMany({ where })
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
    const where: Record<string, any> = {}
    if (dataInicio || dataFim) {
      where.dataPagamento = {}
      if (dataInicio) where.dataPagamento.gte = dataInicio as string
      if (dataFim) where.dataPagamento.lte = dataFim as string
    }
    const pagamentos = await prisma.pagamento.findMany({ where })
    return successResponse(res, {
      total: pagamentos.length,
      valorTotal: pagamentos.reduce((a, p) => a + (p.valor || 0), 0),
      jurosTotal: pagamentos.reduce((a, p) => a + (p.juros || 0), 0),
      multaTotal: pagamentos.reduce((a, p) => a + (p.multa || 0), 0),
    })
  }

  async inadimplencia(_req: AuthRequest, res: Response) {
    const parcelas = await prisma.parcela.findMany({ where: { status: 'vencida' } })
    return successResponse(res, {
      total: parcelas.length,
      valorTotal: parcelas.reduce((a, p) => a + (p.valor || 0), 0),
      parcelas,
    })
  }

  async lotes(_req: AuthRequest, res: Response) {
    const lotes = await prisma.lote.findMany()
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
    const repasses = await prisma.repasse.findMany({ orderBy: { criadoEm: 'desc' } })
    return successResponse(res, {
      total: repasses.length,
      pendentes: repasses.filter((r) => r.status === 'pendente').length,
      pagos: repasses.filter((r) => r.status === 'pago').length,
      valorTotal: repasses.reduce((a, r) => a + (r.totalRepasse || 0), 0),
      repasses,
    })
  }
}
