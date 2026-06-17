import { Router } from 'express'
import { ParcelasController } from '../controllers/parcelas.controller'
import { authenticate } from '../middlewares/auth.middleware'
import { authorize, notProprietario } from '../middlewares/rbac.middleware'

const router = Router()
const controller = new ParcelasController()

router.use(authenticate)
router.use(notProprietario)

router.get('/', controller.listar)
router.get('/vencidas', controller.vencidas)
router.get('/:id', controller.buscar)
router.put('/:id', authorize('admin', 'financeiro'), controller.atualizar)
router.post('/:id/gerar-promissoria', authorize('admin', 'financeiro', 'gerencia'), controller.gerarPromissoria)

export default router
