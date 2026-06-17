import { Response } from 'express'
import { AuthRequest } from '../middlewares/auth.middleware'
import { BaseService } from '../services/base.service'
import { db } from '../firebase/admin'
import { successResponse } from '../utils/response'

const service = new BaseService('clientes')

export class ClientesController {
  async listar(req: AuthRequest, res: Response) {
    const filtros: Record<string, unknown> = {}
    if (req.query.ativo !== undefined) filtros.ativo = req.query.ativo === 'true'
    return successResponse(res, await service.listar(filtros))
  }

  async buscar(req: AuthRequest, res: Response) {
    return successResponse(res, await service.buscar(req.params.id))
  }

  async vendas(req: AuthRequest, res: Response) {
    const snap = await db.collection('vendas').where('clienteId', '==', req.params.id).get()
    return successResponse(res, snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  }

  async criar(req: AuthRequest, res: Response) {
    const data = await service.criar({ ...req.body, ativo: true })
    return successResponse(res, data, 'Cliente criado com sucesso', 201)
  }

  async atualizar(req: AuthRequest, res: Response) {
    return successResponse(res, await service.atualizar(req.params.id, req.body))
  }

  async toggleAtivo(req: AuthRequest, res: Response) {
    const current = await service.buscar(req.params.id)
    return successResponse(res, await service.atualizar(req.params.id, { ativo: !(current as any).ativo }))
  }

  async deletar(req: AuthRequest, res: Response) {
    await service.deletar(req.params.id)
    return successResponse(res, null, 'Cliente excluído com sucesso')
  }
}
