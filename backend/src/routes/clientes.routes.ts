import { Router } from 'express'
import { ClientesController } from '../controllers/clientes.controller'
import { authenticate } from '../middlewares/auth.middleware'
import { authorize, notProprietario } from '../middlewares/rbac.middleware'

const router = Router()
const controller = new ClientesController()

router.use(authenticate)
router.use(notProprietario)

router.get('/', controller.listar)
router.get('/:id', controller.buscar)
router.get('/:id/vendas', controller.vendas)
router.post('/', authorize('admin', 'gerencia', 'atendimento', 'financeiro'), controller.criar)
router.put('/:id', authorize('admin', 'gerencia', 'atendimento', 'financeiro'), controller.atualizar)
router.patch('/:id/toggle-ativo', authorize('admin', 'gerencia'), controller.toggleAtivo)
router.delete('/:id', authorize('admin'), controller.deletar)

export default router
