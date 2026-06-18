import { Response } from 'express'
import { AuthRequest } from '../middlewares/auth.middleware'
import prisma from '../lib/prisma'
import { VendasService } from '../services/vendas.service'
import { successResponse } from '../utils/response'

const vendasService = new VendasService()

export class ContratosController {
  async listar(req: AuthRequest, res: Response) {
    const where: Record<string, any> = { tipo: 'contrato' }
    if (req.query.vendaId) where.vendaId = req.query.vendaId
    const contratos = await prisma.contrato.findMany({ where, orderBy: { criadoEm: 'desc' } })
    return successResponse(res, contratos)
  }

  async buscar(req: AuthRequest, res: Response) {
    const contrato = await prisma.contrato.findUnique({ where: { id: req.params.id } })
    if (!contrato) throw Object.assign(new Error('Contrato não encontrado'), { statusCode: 404 })
    return successResponse(res, contrato)
  }

  async gerar(req: AuthRequest, res: Response) {
    const data = await vendasService.gerarContrato(req.params.vendaId)
    return successResponse(res, data, 'Contrato gerado com sucesso')
  }

  async baixarPDF(req: AuthRequest, res: Response) {
    const contrato = await prisma.contrato.findUnique({ where: { id: req.params.id } })
    if (!contrato) throw Object.assign(new Error('Contrato não encontrado'), { statusCode: 404 })
    return successResponse(res, { url: contrato.url })
  }

  async deletar(req: AuthRequest, res: Response) {
    const contrato = await prisma.contrato.findUnique({ where: { id: req.params.id } })
    if (!contrato) throw Object.assign(new Error('Contrato não encontrado'), { statusCode: 404 })
    await prisma.contrato.delete({ where: { id: req.params.id } })
    return successResponse(res, null, 'Contrato excluído com sucesso')
  }
}
