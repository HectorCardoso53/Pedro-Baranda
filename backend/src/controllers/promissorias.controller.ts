import { Response } from 'express'
import { AuthRequest } from '../middlewares/auth.middleware'
import prisma from '../lib/prisma'
import { successResponse } from '../utils/response'

export class PromissoriasController {
  async listar(req: AuthRequest, res: Response) {
    const where: Record<string, any> = {}
    const { status, vendaId, clienteId } = req.query
    if (status) where.status = status
    if (vendaId) where.vendaId = vendaId
    if (clienteId) where.clienteId = clienteId
    const promissorias = await prisma.promissoria.findMany({ where, orderBy: { criadoEm: 'desc' } })
    return successResponse(res, promissorias)
  }

  async buscar(req: AuthRequest, res: Response) {
    const promissoria = await prisma.promissoria.findUnique({ where: { id: req.params.id } })
    if (!promissoria) throw Object.assign(new Error('Promissória não encontrada'), { statusCode: 404 })
    return successResponse(res, promissoria)
  }

  async gerarLote(req: AuthRequest, res: Response) {
    const { vendaId } = req.body
    const total = await prisma.parcela.count({
      where: { vendaId, status: { in: ['pendente', 'vencida'] } },
    })
    return successResponse(res, { total, message: 'Use o endpoint de parcela individual para gerar cada promissória' })
  }

  async cancelar(req: AuthRequest, res: Response) {
    await prisma.promissoria.update({
      where: { id: req.params.id },
      data: { status: 'cancelada' },
    })
    return successResponse(res, null, 'Promissória cancelada')
  }

  async baixarPDF(req: AuthRequest, res: Response) {
    const promissoria = await prisma.promissoria.findUnique({ where: { id: req.params.id } })
    if (!promissoria) throw Object.assign(new Error('Promissória não encontrada'), { statusCode: 404 })
    if (!promissoria.pdfUrl) throw Object.assign(new Error('PDF ainda não gerado'), { statusCode: 404 })
    return successResponse(res, { url: promissoria.pdfUrl })
  }

  async deletar(req: AuthRequest, res: Response) {
    const promissoria = await prisma.promissoria.findUnique({ where: { id: req.params.id } })
    if (!promissoria) throw Object.assign(new Error('Promissória não encontrada'), { statusCode: 404 })
    await prisma.promissoria.delete({ where: { id: req.params.id } })
    return successResponse(res, null, 'Promissória excluída com sucesso')
  }
}
