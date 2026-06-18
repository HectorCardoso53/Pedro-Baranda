import { Response, NextFunction } from 'express'
import { AuthRequest } from './auth.middleware'
import logger from '../utils/logger'

export function auditLog(action: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res)
    res.json = function (body) {
      if (req.user && res.statusCode < 400) {
        logger.info(`AUDIT: ${action} | user=${req.user.uid} (${req.user.nome}) | ${req.method} ${req.originalUrl} | status=${res.statusCode} | ip=${req.ip}`)
      }
      return originalJson(body)
    }
    next()
  }
}
