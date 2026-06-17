import { Response } from 'express'
import { AuthRequest } from '../middlewares/auth.middleware'
import { PagamentosService } from '../services/pagamentos.service'
import { successResponse } from '../utils/response'

const service = new PagamentosService()

export class PagamentosController {
  async listar(req: AuthRequest, res: Response) {
    const { vendaId, parcelaId, clienteId } = req.query
    const filtros: Record<string, unknown> = {}
    if (vendaId) filtros.vendaId = vendaId
    if (parcelaId) filtros.parcelaId = parcelaId
    if (clienteId) filtros.clienteId = clienteId
    const data = await service.listar(filtros)
    return successResponse(res, data)
  }

  async buscar(req: AuthRequest, res: Response) {
    const snap = await service['listar']({ id: req.params.id })
    return successResponse(res, snap[0] || null)
  }

  async registrar(req: AuthRequest, res: Response) {
    const data = await service.registrar({ ...req.body, registradoPor: req.user!.uid })
    return successResponse(res, data, 'Pagamento registrado com sucesso', 201)
  }

  async estornar(req: AuthRequest, res: Response) {
    const data = await service.estornar(req.params.id)
    return successResponse(res, data, 'Pagamento estornado com sucesso')
  }

  async gerarRecibo(req: AuthRequest, res: Response) {
    const data = await service.gerarRecibo(req.params.id)
    return successResponse(res, data, 'Recibo gerado com sucesso')
  }
}
