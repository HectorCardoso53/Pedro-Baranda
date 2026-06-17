import { Response, NextFunction } from 'express'
import { AuthRequest } from './auth.middleware'
import { errorResponse } from '../utils/response'

type Role = 'admin' | 'financeiro' | 'atendimento' | 'gerencia' | 'proprietario'

export function authorize(...roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return errorResponse(res, 'Não autenticado', 401)
    }
    if (!roles.includes(req.user.role as Role)) {
      return errorResponse(res, 'Acesso não autorizado para este recurso', 403)
    }
    next()
  }
}

export function authorizeProprietario(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) return errorResponse(res, 'Não autenticado', 401)
  if (req.user.role !== 'proprietario') {
    return errorResponse(res, 'Acesso restrito a proprietários', 403)
  }
  next()
}

export function notProprietario(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) return errorResponse(res, 'Não autenticado', 401)
  if (req.user.role === 'proprietario') {
    return errorResponse(res, 'Proprietários não têm acesso a este recurso', 403)
  }
  next()
}
