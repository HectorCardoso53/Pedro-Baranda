import { Response } from 'express'

export function successResponse<T>(
  res: Response,
  data: T,
  message = 'Operação realizada com sucesso',
  statusCode = 200
) {
  return res.status(statusCode).json({ success: true, message, data })
}

export function errorResponse(
  res: Response,
  message: string,
  statusCode = 400,
  error?: unknown
) {
  const errorMsg = error instanceof Error ? error.message : undefined
  return res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && errorMsg ? { error: errorMsg } : {}),
  })
}

export function paginatedResponse<T>(
  res: Response,
  data: T[],
  pagination: { page: number; limit: number; total: number }
) {
  return res.status(200).json({
    success: true,
    data,
    pagination: {
      ...pagination,
      totalPages: Math.ceil(pagination.total / pagination.limit),
    },
  })
}
