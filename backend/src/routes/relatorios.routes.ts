import { Router } from 'express'
import { RelatoriosController } from '../controllers/relatorios.controller'
import { authenticate } from '../middlewares/auth.middleware'
import { authorize, notProprietario } from '../middlewares/rbac.middleware'

const router = Router()
const controller = new RelatoriosController()

router.use(authenticate)
router.use(notProprietario)

router.get('/vendas', authorize('admin', 'financeiro', 'gerencia'), controller.vendas)
router.get('/financeiro', authorize('admin', 'financeiro', 'gerencia'), controller.financeiro)
router.get('/inadimplencia', authorize('admin', 'financeiro', 'gerencia'), controller.inadimplencia)
router.get('/lotes', authorize('admin', 'financeiro', 'gerencia'), controller.lotes)
router.get('/repasses', authorize('admin', 'financeiro', 'gerencia'), controller.repasses)

export default router
