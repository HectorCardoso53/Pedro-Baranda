import { Router } from 'express'
import { PagamentosController } from '../controllers/pagamentos.controller'
import { authenticate } from '../middlewares/auth.middleware'
import { authorize, notProprietario } from '../middlewares/rbac.middleware'
import { auditLog } from '../middlewares/audit.middleware'

const router = Router()
const controller = new PagamentosController()

router.use(authenticate)
router.use(notProprietario)

router.get('/', controller.listar)
router.get('/:id', controller.buscar)
router.post('/', authorize('admin', 'financeiro', 'gerencia'), auditLog('REGISTRAR_PAGAMENTO'), controller.registrar)
router.patch('/:id/data', authorize('admin', 'financeiro', 'gerencia'), controller.atualizarData)
router.delete('/:id', authorize('admin'), auditLog('ESTORNAR_PAGAMENTO'), controller.estornar)
router.post('/:id/recibo', controller.gerarRecibo)

export default router
