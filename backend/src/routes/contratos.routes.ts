import { Router } from 'express'
import { ContratosController } from '../controllers/contratos.controller'
import { authenticate } from '../middlewares/auth.middleware'
import { authorize, notProprietario } from '../middlewares/rbac.middleware'
import { pdfLimiter } from '../middlewares/rateLimit.middleware'

const router = Router()
const controller = new ContratosController()

router.use(authenticate)
router.use(notProprietario)

router.get('/', controller.listar)
router.get('/:id', controller.buscar)
router.post('/gerar/:vendaId', authorize('admin', 'financeiro', 'gerencia'), pdfLimiter, controller.gerar)
router.get('/:id/pdf', pdfLimiter, controller.baixarPDF)
router.delete('/:id', authorize('admin'), controller.deletar)

export default router
