import { Response } from 'express'
import { AuthRequest } from '../middlewares/auth.middleware'
import { BaseService } from '../services/base.service'
import { successResponse } from '../utils/response'

const service = new BaseService('regioes')

export class RegioesController {
  async listar(_req: AuthRequest, res: Response) {
    const data = await service.listar()
    return successResponse(res, data)
  }

  async buscar(req: AuthRequest, res: Response) {
    const data = await service.buscar(req.params.id)
    return successResponse(res, data)
  }

  async criar(req: AuthRequest, res: Response) {
    const data = await service.criar(req.body)
    return successResponse(res, data, 'Região criada com sucesso', 201)
  }

  async atualizar(req: AuthRequest, res: Response) {
    const data = await service.atualizar(req.params.id, req.body)
    return successResponse(res, data)
  }

  async deletar(req: AuthRequest, res: Response) {
    await service.deletar(req.params.id)
    return successResponse(res, null, 'Região removida com sucesso')
  }
}
