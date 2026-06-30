import { Response } from 'express'
import { AuthRequest } from '../middlewares/auth.middleware'
import { VendasService } from '../services/vendas.service'
import { successResponse, paginatedResponse } from '../utils/response'

const service = new VendasService()

export class VendasController {
  async listar(req: AuthRequest, res: Response) {
    const { clienteId, loteId, projetoId, status } = req.query
    const filtros: Record<string, unknown> = {}
    if (clienteId) filtros.clienteId = clienteId
    if (loteId) filtros.loteId = loteId
    if (projetoId) filtros.projetoId = projetoId
    if (status) filtros.status = status
    const data = await service.listar(filtros)
    return paginatedResponse(res, data, { page: 1, limit: data.length, total: data.length })
  }

  async buscar(req: AuthRequest, res: Response) {
    const data = await service.buscar(req.params.id)
    return successResponse(res, data)
  }

  async parcelas(req: AuthRequest, res: Response) {
    const data = await service.buscarParcelas(req.params.id)
    return successResponse(res, data)
  }

  async criar(req: AuthRequest, res: Response) {
    const data = await service.criar({ ...req.body, vendedorId: req.user!.uid })
    return successResponse(res, data, 'Venda criada com sucesso', 201)
  }

  async atualizar(req: AuthRequest, res: Response) {
    const { observacoes, dataVenda, diaVencimento } = req.body
    const data = await service.atualizar(req.params.id, {
      observacoes,
      dataVenda,
      diaVencimento: diaVencimento ? Number(diaVencimento) : undefined,
    })
    return successResponse(res, data, 'Venda atualizada com sucesso')
  }

  async cancelar(req: AuthRequest, res: Response) {
    const data = await service.cancelar(req.params.id, req.body.motivo || 'Cancelamento solicitado')
    return successResponse(res, data, 'Venda cancelada com sucesso')
  }

  async distratar(req: AuthRequest, res: Response) {
    const data = await service.distratar(req.params.id, req.body.motivo || 'Distrato solicitado')
    return successResponse(res, data, 'Distrato realizado com sucesso')
  }

  async gerarContrato(req: AuthRequest, res: Response) {
    const data = await service.gerarContrato(req.params.id)
    return successResponse(res, data, 'Contrato gerado com sucesso')
  }

  async gerarPromissorias(req: AuthRequest, res: Response) {
    const data = await service.gerarPromissorias(req.params.id)
    return successResponse(res, data, 'Promissórias geradas com sucesso')
  }

  async gerarCarne(req: AuthRequest, res: Response) {
    const data = await service.gerarCarne(req.params.id)
    return successResponse(res, data, 'Carnê gerado com sucesso')
  }

  async gerarPromissoriaDigital(req: AuthRequest, res: Response) {
    const data = await service.gerarPromissoriaDigital(req.params.id, req.params.parcelaId)
    return successResponse(res, data, 'Promissória digital gerada com sucesso')
  }

  async deletar(req: AuthRequest, res: Response) {
    await service.deletar(req.params.id)
    return successResponse(res, null, 'Venda excluída com sucesso')
  }
}
