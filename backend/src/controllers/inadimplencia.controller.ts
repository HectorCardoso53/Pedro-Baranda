import { Response } from 'express'
import { AuthRequest } from '../middlewares/auth.middleware'
import { InadimplenciaService } from '../services/inadimplencia.service'
import { successResponse } from '../utils/response'

const service = new InadimplenciaService()

export class InadimplenciaController {
  async listar(req: AuthRequest, res: Response) {
    const { projetoId, proprietarioId } = req.query
    const filtros: Record<string, unknown> = {}
    if (projetoId) filtros.projetoId = projetoId
    if (proprietarioId) filtros.proprietarioId = proprietarioId
    const data = await service.listar(filtros)
    return successResponse(res, data)
  }

  async resumo(_req: AuthRequest, res: Response) {
    const data = await service.resumo()
    return successResponse(res, data)
  }

  async porProjeto(_req: AuthRequest, res: Response) {
    const data = await service.porProjeto()
    return successResponse(res, data)
  }

  async processarInadimplencia(_req: AuthRequest, res: Response) {
    const data = await service.processar()
    return successResponse(res, data, `${data.processadas} parcelas processadas`)
  }
}
