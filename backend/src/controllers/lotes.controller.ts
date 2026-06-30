import { Response } from 'express'
import { AuthRequest } from '../middlewares/auth.middleware'
import { LotesService } from '../services/lotes.service'
import { successResponse, paginatedResponse } from '../utils/response'

const service = new LotesService()

export class LotesController {
  async listar(req: AuthRequest, res: Response) {
    const filtros: Record<string, unknown> = {}
    const { projetoId, quadraId, status, proprietarioId } = req.query
    if (projetoId) filtros.projetoId = projetoId
    if (quadraId) filtros.quadraId = quadraId
    if (status) filtros.status = status
    if (proprietarioId) filtros.proprietarioId = proprietarioId
    const data = await service.listar(filtros)
    return paginatedResponse(res, data, { page: 1, limit: data.length, total: data.length })
  }

  async listarDisponiveis(req: AuthRequest, res: Response) {
    const data = await service.listarDisponiveis(
      req.query.projetoId as string,
      req.query.quadraId as string
    )
    return successResponse(res, data)
  }

  async buscar(req: AuthRequest, res: Response) {
    const data = await service.buscar(req.params.id)
    return successResponse(res, data)
  }

  async criar(req: AuthRequest, res: Response) {
    const data = await service.criar(req.body)
    return successResponse(res, data, 'Lote criado com sucesso', 201)
  }

  async criarEmLote(req: AuthRequest, res: Response) {
    const data = await service.criarEmLote(req.body.lotes)
    return successResponse(res, data, `${data.length} lotes criados com sucesso`, 201)
  }

  async atualizar(req: AuthRequest, res: Response) {
    const data = await service.atualizar(req.params.id, req.body)
    return successResponse(res, data)
  }

  async alterarStatus(req: AuthRequest, res: Response) {
    const data = await service.alterarStatus(req.params.id, req.body.status, req.body.motivo)
    return successResponse(res, data)
  }

  async deletar(req: AuthRequest, res: Response) {
    await service.deletar(req.params.id)
    return successResponse(res, null, 'Lote removido com sucesso')
  }
}
