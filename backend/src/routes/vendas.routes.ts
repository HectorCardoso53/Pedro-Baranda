import { Router } from 'express'
import { VendasController } from '../controllers/vendas.controller'
import { authenticate } from '../middlewares/auth.middleware'
import { authorize, notProprietario } from '../middlewares/rbac.middleware'
import { auditLog } from '../middlewares/audit.middleware'

const router = Router()
const controller = new VendasController()

router.use(authenticate)
router.use(notProprietario)

router.get('/', controller.listar)
router.get('/:id', controller.buscar)
router.get('/:id/parcelas', controller.parcelas)
router.post('/', authorize('admin', 'gerencia', 'financeiro', 'atendimento'), auditLog('CRIAR_VENDA'), controller.criar)
router.put('/:id', authorize('admin', 'gerencia', 'financeiro'), controller.atualizar)
router.patch('/:id/cancelar', authorize('admin', 'gerencia'), auditLog('CANCELAR_VENDA'), controller.cancelar)
router.patch('/:id/distratar', authorize('admin', 'gerencia'), auditLog('DISTRATAR_VENDA'), controller.distratar)
router.post('/:id/gerar-contrato', authorize('admin', 'gerencia', 'financeiro'), controller.gerarContrato)
router.delete('/:id', authorize('admin'), controller.deletar)

export default router
