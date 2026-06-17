import { Router } from 'express'
import { FinanceiroController } from '../controllers/financeiro.controller'
import { authenticate } from '../middlewares/auth.middleware'
import { authorize, notProprietario } from '../middlewares/rbac.middleware'

const router = Router()
const controller = new FinanceiroController()

router.use(authenticate)
router.use(notProprietario)

router.get('/movimentacoes', controller.listarMovimentacoes)
router.get('/repasses', controller.listarRepasses)
router.get('/repasses/:id', controller.buscarRepasse)
router.get('/resumo', authorize('admin', 'financeiro', 'gerencia'), controller.resumo)
router.post('/repasses', authorize('admin', 'financeiro'), controller.criarRepasse)
router.patch('/repasses/:id/pagar', authorize('admin', 'financeiro'), controller.pagarRepasse)
router.post('/movimentacoes', authorize('admin', 'financeiro'), controller.criarMovimentacao)
router.delete('/movimentacoes/:id', authorize('admin', 'financeiro'), controller.deletarMovimentacao)
router.delete('/repasses/:id', authorize('admin', 'financeiro'), controller.deletarRepasse)

export default router
