import { Router } from 'express'
import { AuthController } from '../controllers/auth.controller'
import { authenticate } from '../middlewares/auth.middleware'
import { authLimiter } from '../middlewares/rateLimit.middleware'

const router = Router()
const controller = new AuthController()

router.post('/login', authLimiter, controller.login)
router.post('/logout', authenticate, controller.logout)
router.get('/me', authenticate, controller.me)
router.post('/criar-usuario', authenticate, controller.criarUsuario)
router.put('/alterar-senha', authenticate, controller.alterarSenha)

export default router
