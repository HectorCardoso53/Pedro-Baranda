import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import logger from '../utils/logger'

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  logger.error('Erro não tratado:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  })

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos',
      errors: err.errors.map((e) => ({ campo: e.path.join('.'), mensagem: e.message })),
    })
  }

  const statusCode = (err as { statusCode?: number }).statusCode || 500
  const message = statusCode === 500 ? 'Erro interno do servidor' : err.message

  return res.status(statusCode).json({ success: false, message })
}
