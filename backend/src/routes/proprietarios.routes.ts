import { Router } from 'express'
import { ProprietariosController } from '../controllers/proprietarios.controller'
import { authenticate } from '../middlewares/auth.middleware'
import { authorize, notProprietario } from '../middlewares/rbac.middleware'

const router = Router()
const controller = new ProprietariosController()

router.use(authenticate)
router.use(notProprietario)

router.get('/', controller.listar)
router.get('/:id', controller.buscar)
router.post('/', authorize('admin', 'gerencia'), controller.criar)
router.put('/:id', authorize('admin', 'gerencia'), controller.atualizar)
router.patch('/:id/toggle-ativo', authorize('admin'), controller.toggleAtivo)
router.delete('/:id', authorize('admin'), controller.deletar)

export default router
