import { Request, Response } from 'express'
import { AuthRequest } from '../middlewares/auth.middleware'
import { AuthService } from '../services/auth.service'
import { successResponse, errorResponse } from '../utils/response'

const service = new AuthService()

export class AuthController {
  async login(req: Request, res: Response) {
    const { idToken } = req.body
    if (!idToken) return errorResponse(res, 'Token Firebase obrigatório', 400)
    const data = await service.login(idToken)
    return successResponse(res, data, 'Login realizado com sucesso')
  }

  async me(req: AuthRequest, res: Response) {
    const data = await service.buscarPerfil(req.user!.uid)
    return successResponse(res, data)
  }

  async logout(_req: Request, res: Response) {
    return successResponse(res, null, 'Logout realizado com sucesso')
  }

  async criarUsuario(req: AuthRequest, res: Response) {
    if (req.user!.role !== 'admin') return errorResponse(res, 'Somente admin pode criar usuários', 403)
    const data = await service.criarUsuario(req.body)
    return successResponse(res, data, 'Usuário criado com sucesso', 201)
  }

  async alterarSenha(req: AuthRequest, res: Response) {
    await service.alterarSenha(req.user!.uid, req.body.novaSenha)
    return successResponse(res, null, 'Senha alterada com sucesso')
  }
}
