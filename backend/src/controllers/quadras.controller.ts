import { Response } from 'express'
import { AuthRequest } from '../middlewares/auth.middleware'
import { BaseService } from '../services/base.service'
import { successResponse } from '../utils/response'

const service = new BaseService('quadras')

export class QuadrasController {
  async listar(req: AuthRequest, res: Response) {
    const filtros: Record<string, unknown> = {}
    if (req.query.projetoId) filtros.projetoId = req.query.projetoId
    return successResponse(res, await service.listar(filtros))
  }

  async buscar(req: AuthRequest, res: Response) {
    return successResponse(res, await service.buscar(req.params.id))
  }

  async criar(req: AuthRequest, res: Response) {
    const data = await service.criar({ ...req.body, ativo: true })
    return successResponse(res, data, 'Quadra criada com sucesso', 201)
  }

  async atualizar(req: AuthRequest, res: Response) {
    return successResponse(res, await service.atualizar(req.params.id, req.body))
  }

  async deletar(req: AuthRequest, res: Response) {
    await service.deletar(req.params.id)
    return successResponse(res, null, 'Quadra removida com sucesso')
  }
}
