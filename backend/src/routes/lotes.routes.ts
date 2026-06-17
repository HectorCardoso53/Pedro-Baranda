import { Router } from 'express'
import { LotesController } from '../controllers/lotes.controller'
import { authenticate } from '../middlewares/auth.middleware'
import { authorize, notProprietario } from '../middlewares/rbac.middleware'

const router = Router()
const controller = new LotesController()

router.use(authenticate)
router.use(notProprietario)

router.get('/', controller.listar)
router.get('/disponiveis', controller.listarDisponiveis)
router.get('/:id', controller.buscar)
router.post('/', authorize('admin', 'gerencia'), controller.criar)
router.post('/bulk', authorize('admin', 'gerencia'), controller.criarEmLote)
router.put('/:id', authorize('admin', 'gerencia'), controller.atualizar)
router.patch('/:id/status', authorize('admin', 'gerencia', 'financeiro'), controller.alterarStatus)
router.delete('/:id', authorize('admin'), controller.deletar)

export default router
