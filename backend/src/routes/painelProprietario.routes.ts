import { Router } from 'express'
import { PainelProprietarioController } from '../controllers/painelProprietario.controller'
import { authenticate } from '../middlewares/auth.middleware'
import { authorizeProprietario } from '../middlewares/rbac.middleware'

const router = Router()
const controller = new PainelProprietarioController()

router.use(authenticate)
router.use(authorizeProprietario)

router.get('/resumo', controller.resumo)
router.get('/lotes', controller.lotes)
router.get('/financeiro', controller.financeiro)
router.get('/repasses', controller.repasses)
router.get('/inadimplencia', controller.inadimplencia)

export default router
