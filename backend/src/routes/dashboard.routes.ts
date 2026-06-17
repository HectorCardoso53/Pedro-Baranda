import { Router } from 'express'
import { DashboardController } from '../controllers/dashboard.controller'
import { authenticate } from '../middlewares/auth.middleware'
import { notProprietario } from '../middlewares/rbac.middleware'

const router = Router()
const controller = new DashboardController()

router.use(authenticate)
router.use(notProprietario)

router.get('/', controller.geral)
router.get('/vendas-mes', controller.vendasMes)
router.get('/receita-mes', controller.receitaMes)
router.get('/lotes-status', controller.lotesStatus)
router.get('/inadimplencia', controller.inadimplencia)

export default router
