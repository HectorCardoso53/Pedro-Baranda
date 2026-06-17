import { Router } from 'express'
import { QuadrasController } from '../controllers/quadras.controller'
import { authenticate } from '../middlewares/auth.middleware'
import { authorize, notProprietario } from '../middlewares/rbac.middleware'

const router = Router()
const controller = new QuadrasController()

router.use(authenticate)
router.use(notProprietario)

router.get('/', controller.listar)
router.get('/:id', controller.buscar)
router.post('/', authorize('admin', 'gerencia'), controller.criar)
router.put('/:id', authorize('admin', 'gerencia'), controller.atualizar)
router.delete('/:id', authorize('admin'), controller.deletar)

export default router
