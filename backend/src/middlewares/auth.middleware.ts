import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma'
import { errorResponse } from '../utils/response'
import logger from '../utils/logger'

export interface AuthRequest extends Request {
  user?: {
    uid: string
    email: string
    role: string
    nome: string
    proprietarioId?: string
  }
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse(res, 'Token de autenticação não fornecido', 401)
    }

    const token = authHeader.split('Bearer ')[1]
    const secret = process.env.JWT_SECRET
    if (!secret) {
      return errorResponse(res, 'Configuração de JWT ausente no servidor', 500)
    }

    let decoded: { sub: string; email: string; role: string; nome: string; proprietarioId?: string }
    try {
      decoded = jwt.verify(token, secret) as typeof decoded
    } catch {
      return errorResponse(res, 'Token inválido ou expirado', 401)
    }

    const usuario = await prisma.usuario.findUnique({ where: { id: decoded.sub } })
    if (!usuario) {
      return errorResponse(res, 'Usuário não encontrado no sistema', 401)
    }
    if (!usuario.ativo) {
      return errorResponse(res, 'Usuário inativo', 403)
    }

    req.user = {
      uid: usuario.id,
      email: usuario.email,
      role: usuario.role,
      nome: usuario.nome,
      proprietarioId: usuario.proprietarioId ?? undefined,
    }

    next()
  } catch (error) {
    logger.warn('Falha na autenticação:', error)
    return errorResponse(res, 'Token inválido ou expirado', 401)
  }
}
