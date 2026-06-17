import { Router } from 'express'
import { UsuariosController } from '../controllers/usuarios.controller'
import { authenticate } from '../middlewares/auth.middleware'
import { authorize } from '../middlewares/rbac.middleware'

const router = Router()
const controller = new UsuariosController()

router.use(authenticate)
router.use(authorize('admin'))

router.get('/', controller.listar)
router.get('/:id', controller.buscar)
router.put('/:id', controller.atualizar)
router.patch('/:id/toggle-ativo', controller.toggleAtivo)
router.patch('/:id/role', controller.alterarRole)

export default router
