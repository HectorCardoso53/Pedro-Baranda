import { Response } from 'express'
import { AuthRequest } from '../middlewares/auth.middleware'
import { BaseService } from '../services/base.service'
import prisma from '../lib/prisma'
import { successResponse } from '../utils/response'

const service = new BaseService('projetos')

export class ProjetosController {
  async listar(req: AuthRequest, res: Response) {
    const filtros: Record<string, unknown> = {}
    if (req.query.regiaoId) filtros.regiaoId = req.query.regiaoId
    if (req.query.proprietarioId) filtros.proprietarioId = req.query.proprietarioId
    if (req.query.status) filtros.status = req.query.status
    const data = await service.listar(filtros)
    return successResponse(res, data)
  }

  async buscar(req: AuthRequest, res: Response) {
    const data = await service.buscar(req.params.id)
    return successResponse(res, data)
  }

  async resumo(req: AuthRequest, res: Response) {
    const projeto = await service.buscar(req.params.id)
    const [lotes, vendas] = await Promise.all([
      prisma.lote.findMany({ where: { projetoId: req.params.id } }),
      prisma.venda.findMany({ where: { projetoId: req.params.id } }),
    ])
    return successResponse(res, {
      ...projeto,
      totalLotes: lotes.length,
      lotesDisponiveis: lotes.filter((l) => l.status === 'disponivel').length,
      lotesVendidos: lotes.filter((l) => l.status === 'vendido').length,
      totalVendas: vendas.length,
      valorTotalVendas: vendas.reduce((a, v) => a + (v.valor || 0), 0),
    })
  }

  async criar(req: AuthRequest, res: Response) {
    const data = await service.criar({ ...req.body, status: 'ativo' })
    return successResponse(res, data, 'Projeto criado com sucesso', 201)
  }

  async atualizar(req: AuthRequest, res: Response) {
    const data = await service.atualizar(req.params.id, req.body)
    return successResponse(res, data)
  }

  async alterarStatus(req: AuthRequest, res: Response) {
    const data = await service.atualizar(req.params.id, { status: req.body.status })
    return successResponse(res, data)
  }

  async deletar(req: AuthRequest, res: Response) {
    await service.deletar(req.params.id)
    return successResponse(res, null, 'Projeto excluído com sucesso')
  }
}
