import { Response, NextFunction } from 'express'
import { AuthRequest } from './auth.middleware'
import { db } from '../firebase/admin'
import logger from '../utils/logger'

export function auditLog(action: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res)
    res.json = function (body) {
      if (req.user && res.statusCode < 400) {
        db.collection('logs').add({
          acao: action,
          usuarioId: req.user.uid,
          usuarioNome: req.user.nome,
          ip: req.ip,
          metodo: req.method,
          rota: req.originalUrl,
          statusCode: res.statusCode,
          timestamp: new Date().toISOString(),
        }).catch((err) => logger.error('Erro ao gravar audit log:', err))
      }
      return originalJson(body)
    }
    next()
  }
}
