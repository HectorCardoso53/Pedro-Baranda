import { Response } from 'express'
import { AuthRequest } from '../middlewares/auth.middleware'
import { BaseService } from '../services/base.service'
import { successResponse } from '../utils/response'

const service = new BaseService('proprietarios')

export class ProprietariosController {
  async listar(req: AuthRequest, res: Response) {
    const filtros: Record<string, unknown> = {}
    if (req.query.ativo !== undefined) filtros.ativo = req.query.ativo === 'true'
    const data = await service.listar(filtros)
    return successResponse(res, data)
  }

  async buscar(req: AuthRequest, res: Response) {
    const data = await service.buscar(req.params.id)
    return successResponse(res, data)
  }

  async criar(req: AuthRequest, res: Response) {
    const data = await service.criar({ ...req.body, ativo: true })
    return successResponse(res, data, 'Proprietário criado com sucesso', 201)
  }

  async atualizar(req: AuthRequest, res: Response) {
    const data = await service.atualizar(req.params.id, req.body)
    return successResponse(res, data)
  }

  async toggleAtivo(req: AuthRequest, res: Response) {
    const current = await service.buscar(req.params.id)
    const data = await service.atualizar(req.params.id, { ativo: !(current as any).ativo })
    return successResponse(res, data)
  }

  async deletar(req: AuthRequest, res: Response) {
    await service.deletar(req.params.id)
    return successResponse(res, null, 'Proprietário excluído com sucesso')
  }
}
