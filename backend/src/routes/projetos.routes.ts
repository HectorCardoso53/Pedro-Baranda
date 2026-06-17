import { Router } from 'express'
import { ProjetosController } from '../controllers/projetos.controller'
import { authenticate } from '../middlewares/auth.middleware'
import { authorize, notProprietario } from '../middlewares/rbac.middleware'

const router = Router()
const controller = new ProjetosController()

router.use(authenticate)
router.use(notProprietario)

router.get('/', controller.listar)
router.get('/:id', controller.buscar)
router.get('/:id/resumo', controller.resumo)
router.post('/', authorize('admin', 'gerencia'), controller.criar)
router.put('/:id', authorize('admin', 'gerencia'), controller.atualizar)
router.patch('/:id/status', authorize('admin', 'gerencia'), controller.alterarStatus)
router.delete('/:id', authorize('admin'), controller.deletar)

export default router
