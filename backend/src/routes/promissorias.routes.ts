import { Router } from 'express'
import { PromissoriasController } from '../controllers/promissorias.controller'
import { authenticate } from '../middlewares/auth.middleware'
import { authorize, notProprietario } from '../middlewares/rbac.middleware'
import { pdfLimiter } from '../middlewares/rateLimit.middleware'

const router = Router()
const controller = new PromissoriasController()

router.use(authenticate)
router.use(notProprietario)

router.get('/', controller.listar)
router.get('/:id', controller.buscar)
router.post('/gerar-lote', authorize('admin', 'financeiro', 'gerencia'), pdfLimiter, controller.gerarLote)
router.patch('/:id/cancelar', authorize('admin', 'financeiro'), controller.cancelar)
router.get('/:id/pdf', pdfLimiter, controller.baixarPDF)
router.delete('/:id', authorize('admin'), controller.deletar)

export default router
