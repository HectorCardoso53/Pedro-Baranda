import { Router } from 'express'
import { DemarcacaoController } from '../controllers/demarcacao.controller'
import { authenticate } from '../middlewares/auth.middleware'

const router = Router()
const controller = new DemarcacaoController()

router.use(authenticate)
router.post('/analisar-mapa', (req, res) => controller.analisarMapa(req as any, res))

export default router
