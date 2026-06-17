import { Request, Response, NextFunction } from 'express'
import { auth, db } from '../firebase/admin'
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
    const decoded = await auth.verifyIdToken(token)

    const userDoc = await db.collection('usuarios').doc(decoded.uid).get()
    if (!userDoc.exists) {
      return errorResponse(res, 'Usuário não encontrado no sistema', 401)
    }

    const userData = userDoc.data()!
    if (!userData.ativo) {
      return errorResponse(res, 'Usuário inativo', 403)
    }

    req.user = {
      uid: decoded.uid,
      email: decoded.email!,
      role: userData.role,
      nome: userData.nome,
      proprietarioId: userData.proprietarioId,
    }

    next()
  } catch (error) {
    logger.warn('Falha na autenticação:', error)
    return errorResponse(res, 'Token inválido ou expirado', 401)
  }
}
