import { Response } from 'express'
import { AuthRequest } from '../middlewares/auth.middleware'
import prisma from '../lib/prisma'
import { successResponse } from '../utils/response'

export class UsuariosController {
  async listar(_req: AuthRequest, res: Response) {
    const usuarios = await prisma.usuario.findMany({
      orderBy: { criadoEm: 'desc' },
      select: { id: true, nome: true, email: true, role: true, ativo: true, proprietarioId: true, criadoEm: true, atualizadoEm: true, ultimoLogin: true },
    })
    return successResponse(res, usuarios)
  }

  async buscar(req: AuthRequest, res: Response) {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.params.id },
      select: { id: true, nome: true, email: true, role: true, ativo: true, proprietarioId: true, criadoEm: true, atualizadoEm: true, ultimoLogin: true },
    })
    if (!usuario) throw Object.assign(new Error('Usuário não encontrado'), { statusCode: 404 })
    return successResponse(res, usuario)
  }

  async atualizar(req: AuthRequest, res: Response) {
    const { senha: _senha, ...safeData } = req.body
    const usuario = await prisma.usuario.update({
      where: { id: req.params.id },
      data: safeData,
      select: { id: true, nome: true, email: true, role: true, ativo: true, proprietarioId: true, criadoEm: true, atualizadoEm: true },
    })
    return successResponse(res, usuario)
  }

  async toggleAtivo(req: AuthRequest, res: Response) {
    const current = await prisma.usuario.findUnique({ where: { id: req.params.id } })
    if (!current) throw Object.assign(new Error('Usuário não encontrado'), { statusCode: 404 })
    const usuario = await prisma.usuario.update({
      where: { id: req.params.id },
      data: { ativo: !current.ativo },
      select: { id: true, ativo: true },
    })
    return successResponse(res, { ativo: usuario.ativo })
  }

  async alterarRole(req: AuthRequest, res: Response) {
    await prisma.usuario.update({
      where: { id: req.params.id },
      data: { role: req.body.role },
    })
    return successResponse(res, null, 'Role atualizada com sucesso')
  }
}
